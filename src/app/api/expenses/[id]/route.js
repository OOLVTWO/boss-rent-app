import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// PUT /api/expenses/[id]
export async function PUT(request, { params }) {
  const { id } = await params;
  const supabase = await createAdminClient();
  const body = await request.json();

  const { id: _id, created_at, updated_at, ...rawUpdateData } = body;
  const updateData = { ...rawUpdateData };

  if ('amount' in updateData) updateData.amount = parseFloat(updateData.amount) || 0;

  const { data, error } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Update expense error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// DELETE /api/expenses/[id]
export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createAdminClient();

  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
