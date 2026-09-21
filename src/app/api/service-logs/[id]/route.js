import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth, readJsonBody } from '@/lib/apiAuth';
import { normalizeServiceLogInput } from '@/lib/serviceLog';
import {
  SERVICE_LOG_SELECT,
  getVehicleBasic,
  syncServiceExpense,
  syncVehicleServiceInfo,
} from '@/lib/serviceLogServer';
import { NextResponse } from 'next/server';

async function getLog(supabase, id) {
  const { data, error } = await supabase
    .from('service_logs')
    .select('id, vehicle_id, expense_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// PUT /api/service-logs/:id
export async function PUT(request, { params }) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
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
    const existing = await getLog(supabase, id);
    if (!existing) return NextResponse.json({ error: 'Catatan servis tidak ditemukan.' }, { status: 404 });

    const vehicle = await getVehicleBasic(supabase, input.vehicle_id);
    if (!vehicle) return NextResponse.json({ error: 'Motor tidak ditemukan.' }, { status: 404 });

    const expenseId = await syncServiceExpense(supabase, {
      expenseId: existing.expense_id,
      recordExpense: body.record_expense !== false,
      vehicle,
      input,
    });

    const { data, error } = await supabase
      .from('service_logs')
      .update({ ...input, expense_id: expenseId })
      .eq('id', id)
      .select(SERVICE_LOG_SELECT)
      .single();
    if (error) throw new Error(error.message);

    await syncVehicleServiceInfo(supabase, input.vehicle_id);
    if (existing.vehicle_id && existing.vehicle_id !== input.vehicle_id) {
      await syncVehicleServiceInfo(supabase, existing.vehicle_id);
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('PUT /api/service-logs error:', err.message);
    return NextResponse.json({ error: err.message || 'Gagal memperbarui catatan servis.' }, { status: 500 });
  }
}

// DELETE /api/service-logs/:id?keep_expense=1
export async function DELETE(request, { params }) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const keepExpense = new URL(request.url).searchParams.get('keep_expense') === '1';
  const supabase = await createAdminClient();
  try {
    const existing = await getLog(supabase, id);
    if (!existing) return NextResponse.json({ error: 'Catatan servis tidak ditemukan.' }, { status: 404 });

    const { error } = await supabase.from('service_logs').delete().eq('id', id);
    if (error) throw new Error(error.message);

    if (existing.expense_id && !keepExpense) {
      const { error: expErr } = await supabase.from('expenses').delete().eq('id', existing.expense_id);
      if (expErr) console.error('DELETE service-log: gagal hapus expense terkait:', expErr.message);
    }

    await syncVehicleServiceInfo(supabase, existing.vehicle_id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/service-logs error:', err.message);
    return NextResponse.json({ error: err.message || 'Gagal menghapus catatan servis.' }, { status: 500 });
  }
}
