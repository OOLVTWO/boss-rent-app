import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/vehicles
export async function GET(request) {
  const supabase = await createAdminClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = supabase.from('vehicles').select('*').order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(Array.isArray(data) ? data : []);
}

// POST /api/vehicles
export async function POST(request) {
  const supabase = await createAdminClient();
  const body = await request.json();

  const payload = {
    name: body.name,
    plate_number: body.plate_number,
    year: parseInt(body.year) || new Date().getFullYear(),
    color: body.color,
    category: body.category || 'honda',
    rate_per_day:   parseFloat(body.rate_per_day) || 0,
    rate_per_week:  parseFloat(body.rate_per_week) || 0,
    rate_per_month: parseFloat(body.rate_per_month) || 0,
    status: body.status || 'available',
    image_url: body.image_url || null,
    current_km: parseInt(body.current_km) || 15000,
    notes: body.notes || '',
    // Investor & Ownership Privacy Fields
    owner_type: body.owner_type || 'internal',
    owner_name: body.owner_name || '',
    owner_contact: body.owner_contact || '',
    revenue_share_percentage: parseInt(body.revenue_share_percentage) || 70,
    purchase_date: body.purchase_date || null,
    purchase_price: parseFloat(body.purchase_price) || 0,
  };

  if (!payload.id) delete payload.id;

  let { data, error } = await supabase
    .from('vehicles')
    .insert([payload])
    .select()
    .single();

  if (error && (error.message.includes('Could not find') || error.message.includes('column') || error.message.includes('schema cache') || error.code === 'PGRST204')) {
    console.warn('Fallback vehicle insert without unmigrated columns:', error.message);
    const { owner_type: _ot, owner_name: _on, owner_contact: _oc, revenue_share_percentage: _rsp, purchase_date: _pd, purchase_price: _pp, image_url: _i, current_km: _ck, ...fallbackPayload } = payload;

    const retry = await supabase
      .from('vehicles')
      .insert([fallbackPayload])
      .select()
      .single();

    data = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
