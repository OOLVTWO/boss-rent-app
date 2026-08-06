import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth, readJsonBody, missingFields, toNonNegativeNumber } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

const VALID_STATUS = ['active', 'completed', 'cancelled'];
const VALID_PAYMENT = ['paid', 'unpaid'];

// GET /api/transactions
export async function GET(request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const supabase = await createAdminClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  let query = supabase
    .from('transactions')
    .select(`*, vehicles(id, name, plate_number, rate_per_day)`)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') query = query.eq('status', status);
  // Terima ISO penuh (sudah tz-aware dari client) atau tanggal polos YYYY-MM-DD (legacy, dianggap UTC)
  if (startDate) query = query.gte('created_at', startDate.includes('T') ? startDate : `${startDate}T00:00:00Z`);
  if (endDate) query = query.lte('created_at', endDate.includes('T') ? endDate : `${endDate}T23:59:59Z`);

  const { data, error } = await query;
  if (error) {
    // PERUBAHAN: jangan sembunyikan error sebagai []
    console.error('GET /api/transactions error:', error.message);
    return NextResponse.json(
      { error: 'Gagal mengambil data transaksi.', detail: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json(Array.isArray(data) ? data : []);
}

// POST /api/transactions
export async function POST(request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const supabase = await createAdminClient();
  const body = await readJsonBody(request);
  if (!body) return NextResponse.json({ error: 'Body request bukan JSON valid.' }, { status: 400 });

  const missing = missingFields(body, ['vehicle_id', 'renter_name', 'start_date', 'end_date']);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Field wajib kosong: ${missing.join(', ')}` }, { status: 400 });
  }

  if (isNaN(Date.parse(body.start_date)) || isNaN(Date.parse(body.end_date))) {
    return NextResponse.json({ error: 'Tanggal sewa tidak valid.' }, { status: 400 });
  }
  if (new Date(body.end_date) < new Date(body.start_date)) {
    return NextResponse.json({ error: 'Tanggal selesai sebelum tanggal mulai.' }, { status: 400 });
  }

  const status = body.status || 'active';
  if (!VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: `Status tidak valid: ${status}` }, { status: 400 });
  }
  const paymentStatus = body.payment_status || 'paid';
  if (!VALID_PAYMENT.includes(paymentStatus)) {
    return NextResponse.json({ error: `payment_status tidak valid: ${paymentStatus}` }, { status: 400 });
  }

  const { duration_days, deposit, total_price, damage_fee, discount, km_start, km_end, vehicles, payment_status, ...insertData } = body;

  // Clean empty strings for UUID fields (id, vehicle_id, etc.)
  Object.keys(insertData).forEach(key => {
    if ((key === 'id' || key.endsWith('_id')) && typeof insertData[key] === 'string' && !insertData[key].trim()) {
      delete insertData[key];
    }
  });

  if (!insertData.vehicle_id) {
    return NextResponse.json({ error: 'Unit motor wajib dipilih!' }, { status: 400 });
  }

  // Validasi motor benar-benar ada (cegah transaksi ke motor fiktif)
  const { data: veh } = await supabase
    .from('vehicles')
    .select('id')
    .eq('id', insertData.vehicle_id)
    .maybeSingle();
  if (!veh) {
    return NextResponse.json({ error: 'Motor tidak ditemukan. Pilih unit yang valid.' }, { status: 400 });
  }

  const payload = {
    ...insertData,
    duration_days: toNonNegativeNumber(duration_days, 1) || 1,
    deposit: toNonNegativeNumber(deposit, 0),
    total_price: toNonNegativeNumber(total_price, 0),
    damage_fee: toNonNegativeNumber(damage_fee, 0),
    discount: toNonNegativeNumber(discount, 0),
    km_start: toNonNegativeNumber(km_start, 0),
    km_end: toNonNegativeNumber(km_end, 0),
    payment_status: paymentStatus,
  };

  if (!payload.id) delete payload.id;

  let { data: tx, error } = await supabase
    .from('transactions')
    .insert([payload])
    .select(`*, vehicles(id, name, plate_number, rate_per_day)`)
    .single();

  // Smart Fallback jika kolom baru belum di-migrate di database Supabase
  if (error && (error.message.includes('Could not find the') || error.message.includes('schema cache'))) {
    console.warn('Fallback insertion without unmigrated columns:', error.message);
    const { customer_image_url, handover_image_url: _hou, renter_address: _ra, discount: _d, damage_fee: _df, km_start: _ks, km_end: _ke, issues_reported: _ir, ...fallbackPayload } = payload;

    const retry = await supabase
      .from('transactions')
      .insert([fallbackPayload])
      .select(`*, vehicles(id, name, plate_number, rate_per_day)`)
      .single();

    tx = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('Transaction insert error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update status motor menjadi 'rented'
  await supabase
    .from('vehicles')
    .update({ status: 'rented' })
    .eq('id', insertData.vehicle_id);

  return NextResponse.json(tx, { status: 201 });
}
