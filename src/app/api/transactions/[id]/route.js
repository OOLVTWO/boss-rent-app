import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// PUT /api/transactions/[id]
export async function PUT(request, { params }) {
  const { id } = await params;
  const supabase = await createAdminClient();
  const body = await request.json();

  const {
    id: _id,
    created_at,
    updated_at,
    duration_days,
    vehicles,
    ...rawUpdateData
  } = body;

  const updateData = { ...rawUpdateData };

  if ('deposit' in updateData) updateData.deposit = parseFloat(updateData.deposit) || 0;
  if ('total_price' in updateData) updateData.total_price = parseFloat(updateData.total_price) || 0;
  if ('discount' in updateData) updateData.discount = parseFloat(updateData.discount) || 0;
  if ('damage_fee' in updateData) updateData.damage_fee = parseFloat(updateData.damage_fee) || 0;
  if ('km_start' in updateData) updateData.km_start = parseInt(updateData.km_start) || 0;
  if ('km_end' in updateData) updateData.km_end = parseInt(updateData.km_end) || 0;

  let { data, error } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', id)
    .select(`*, vehicles(id, name, plate_number, rate_per_day)`)
    .single();

  // Smart Fallback jika kolom baru belum di-migrate di Supabase database
  if (error && (error.message.includes('Could not find the') || error.message.includes('schema cache'))) {
    console.warn('Fallback update without unmigrated columns due to Supabase schema cache:', error.message);
    const { customer_image_url, discount: _d, damage_fee: _df, km_start: _ks, km_end: _ke, issues_reported: _ir, ...fallbackUpdate } = updateData;

    const retry = await supabase
      .from('transactions')
      .update(fallbackUpdate)
      .eq('id', id)
      .select(`*, vehicles(id, name, plate_number, rate_per_day)`)
      .single();

    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('Update transaction error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.status === 'completed' || body.status === 'cancelled') {
    if (data && data.vehicle_id) {
      await supabase
        .from('vehicles')
        .update({ status: 'available' })
        .eq('id', data.vehicle_id);
    }
  }

  return NextResponse.json(data);
}

// DELETE /api/transactions/[id]
export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createAdminClient();

  const { data: tx } = await supabase
    .from('transactions')
    .select('vehicle_id, status')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (tx && tx.status === 'active') {
    await supabase
      .from('vehicles')
      .update({ status: 'available' })
      .eq('id', tx.vehicle_id);
  }

  return NextResponse.json({ success: true });
}
