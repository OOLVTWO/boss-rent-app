import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth, readJsonBody } from '@/lib/apiAuth';
import { fetchAllRows } from '@/lib/queryColumns';
import { normalizeServiceLogInput } from '@/lib/serviceLog';
import {
  SERVICE_LOG_SELECT,
  getVehicleBasic,
  syncServiceExpense,
  syncVehicleServiceInfo,
  isMissingTableError,
} from '@/lib/serviceLogServer';
import { NextResponse } from 'next/server';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/service-logs?vehicle_id=&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
export async function GET(request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const supabase = await createAdminClient();
  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get('vehicle_id');
  const start = searchParams.get('start_date');
  const end = searchParams.get('end_date');

  const build = () => {
    let q = supabase.from('service_logs').select(SERVICE_LOG_SELECT)
      .order('service_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (vehicleId) q = q.eq('vehicle_id', vehicleId);
    if (start && DATE_RE.test(start)) q = q.gte('service_date', start);
    if (end && DATE_RE.test(end)) q = q.lte('service_date', end);
    return q;
  };

  const { data, error } = await fetchAllRows(build);
  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: 'Tabel service_logs belum dibuat.', needsMigration: true }, { status: 503 });
    }
    console.error('GET /api/service-logs error:', error.message);
    return NextResponse.json({ error: 'Gagal mengambil catatan servis.', detail: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST /api/service-logs  body: { vehicle_id, service_date, km, items[], workshop, cost, notes, record_expense }
export async function POST(request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const body = await readJsonBody(request);
  if (!body) return NextResponse.json({ error: 'Body request bukan JSON valid.' }, { status: 400 });

  const input = normalizeServiceLogInput(body);
  if (!input.vehicle_id) return NextResponse.json({ error: 'Pilih motor terlebih dahulu.' }, { status: 400 });
  if (!input.service_date) return NextResponse.json({ error: 'Tanggal servis wajib diisi (YYYY-MM-DD).' }, { status: 400 });
  if (input.items.length === 0 && !input.notes) {
    return NextResponse.json({ error: 'Isi minimal satu item servis atau catatan.' }, { status: 400 });
  }

  const supabase = await createAdminClient();
  try {
    const vehicle = await getVehicleBasic(supabase, input.vehicle_id);
    if (!vehicle) return NextResponse.json({ error: 'Motor tidak ditemukan.' }, { status: 404 });

    const expenseId = await syncServiceExpense(supabase, {
      expenseId: null,
      recordExpense: body.record_expense !== false,
      vehicle,
      input,
    });

    const { data, error } = await supabase
      .from('service_logs')
      .insert([{ ...input, expense_id: expenseId }])
      .select(SERVICE_LOG_SELECT)
      .single();

    if (error) {
      // Rollback pengeluaran yang terlanjur dibuat supaya tidak ada biaya yatim.
      if (expenseId) await supabase.from('expenses').delete().eq('id', expenseId);
      if (isMissingTableError(error)) {
        return NextResponse.json({ error: 'Tabel service_logs belum dibuat.', needsMigration: true }, { status: 503 });
      }
      throw new Error(error.message);
    }

    await syncVehicleServiceInfo(supabase, input.vehicle_id);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('POST /api/service-logs error:', err.message);
    return NextResponse.json({ error: err.message || 'Gagal menyimpan catatan servis.' }, { status: 500 });
  }
}
