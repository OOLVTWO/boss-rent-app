import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/expenses
export async function GET(request) {
  const supabase = await createAdminClient();
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  // First check if table exists
  const { error: checkError } = await supabase.from('expenses').select('id').limit(1);
  if (checkError && (checkError.message.includes('schema cache') || checkError.message.includes('does not exist') || checkError.message.includes('table') || checkError.code === '42P01' || checkError.code === 'PGRST204')) {
    console.warn('Expenses table missing. Run SQL migration first:', checkError.message);
    return NextResponse.json([], { status: 200 });
  }

  let query = supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false });

  if (startDate) query = query.gte('expense_date', startDate);
  if (endDate) query = query.lte('expense_date', endDate);

  const { data, error } = await query;
  if (error) {
    console.warn('Expenses query error:', error.message);
    return NextResponse.json([], { status: 200 });
  }
  return NextResponse.json(Array.isArray(data) ? data : []);
}

// POST /api/expenses
export async function POST(request) {
  const supabase = await createAdminClient();
  const body = await request.json();

  // Check if table exists first
  const { error: checkError } = await supabase.from('expenses').select('id').limit(1);
  if (checkError && (checkError.message.includes('schema cache') || checkError.message.includes('does not exist') || checkError.code === '42P01' || checkError.code === 'PGRST204')) {
    return NextResponse.json({
      error: 'Tabel expenses belum dibuat. Jalankan SQL migration di Supabase SQL Editor terlebih dahulu.',
      needsMigration: true
    }, { status: 503 });
  }

  const payload = {
    title: body.title,
    category: body.category || 'service',
    amount: parseFloat(body.amount) || 0,
    expense_date: body.expense_date || new Date().toISOString().split('T')[0],
    notes: body.notes || ''
  };

  const { data, error } = await supabase
    .from('expenses')
    .insert([payload])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
