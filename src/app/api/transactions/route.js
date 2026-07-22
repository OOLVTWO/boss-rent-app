import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/transactions
export async function GET(request) {
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
  if (startDate) query = query.gte('created_at', `${startDate}T00:00:00Z`);
  if (endDate) query = query.lte('created_at', `${endDate}T23:59:59Z`);

  const { data, error } = await query;
  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(Array.isArray(data) ? data : []);
}

// POST /api/transactions
export async function POST(request) {
  const supabase = await createAdminClient();
  const body = await request.json();

  const { duration_days, deposit, total_price, damage_fee, discount, km_start, km_end, vehicles, ...insertData } = body;

  let payload = {
    ...insertData,
    total_price: parseFloat(total_price) || 0,
    deposit: parseFloat(deposit) || 0,
    damage_fee: parseFloat(damage_fee) || 0,
    discount: parseFloat(discount) || 0,
    km_start: parseInt(km_start) || 0,
    km_end: parseInt(km_end) || 0,
  };

  let { data: tx, error } = await supabase
    .from('transactions')
    .insert([payload])
    .select(`*, vehicles(id, name, plate_number, rate_per_day)`)
    .single();

  // Smart Fallback jika kolom baru belum di-migrate di database Supabase
  if (error && (error.message.includes('Could not find the') || error.message.includes('schema cache'))) {
    console.warn('Fallback insertion without unmigrated columns due to Supabase schema cache:', error.message);
    const { customer_image_url, discount: _d, damage_fee: _df, km_start: _ks, km_end: _ke, issues_reported: _ir, ...fallbackPayload } = payload;

    const retry = await supabase
      .from('transactions')
      .insert([fallbackPayload])
      .select(`*, vehicles(id, name, plate_number, rate_per_day)`)
      .single();

    tx = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('Transaction insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update status motor menjadi 'rented'
  await supabase
    .from('vehicles')
    .update({ status: 'rented' })
    .eq('id', body.vehicle_id);

  return NextResponse.json(tx, { status: 201 });
}
