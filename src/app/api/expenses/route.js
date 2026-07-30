import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/expenses
export async function GET(request) {
  const supabase = await createAdminClient();
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const typeFilter = searchParams.get('type');

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
  if (typeFilter && typeFilter !== 'all') query = query.eq('type', typeFilter);

  const { data, error } = await query;
  if (error) {
    console.warn('Expenses query error:', error.message);
    return NextResponse.json([], { status: 200 });
  }

  // Ensure type is properly normalized even if type column is missing in Supabase schema
  const normalizedData = (Array.isArray(data) ? data : []).map(item => {
    let type = item.type;
    if (!type) {
      if (typeof item.category === 'string' && (item.category.startsWith('income_') || item.category.includes('income'))) {
        type = 'income';
      } else {
        type = 'expense';
      }
    }
    return {
      ...item,
      type
    };
  });

  return NextResponse.json(normalizedData);
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
    type: body.type || 'expense',
    title: body.title,
    category: body.category || (body.type === 'income' ? 'other_income' : 'service'),
    amount: Math.round(Number(String(body.amount || 0).replace(/[,.]/g, ''))) || 0,
    expense_date: body.expense_date || new Date().toISOString().split('T')[0],
    notes: body.notes || ''
  };

  if (!payload.id) delete payload.id;

  let { data, error } = await supabase
    .from('expenses')
    .insert([payload])
    .select()
    .single();

  // Fallback if 'type' column does not exist in Supabase schema yet
  if (error && (error.message.includes('column "type"') || error.message.includes('type'))) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.type;
    const retry = await supabase
      .from('expenses')
      .insert([fallbackPayload])
      .select()
      .single();
    data = retry.data ? { ...retry.data, type: payload.type } : null;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
