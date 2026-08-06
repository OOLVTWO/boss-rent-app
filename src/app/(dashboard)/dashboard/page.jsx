import { createAdminClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

// Ambil SEMUA baris dengan pagination (Supabase JS default limit = 1000 baris,
// jadi tanpa loop ini transaksi lama TIDAK PERNAH sampai ke dashboard —
// inilah salah satu penyebab data "hilang" dari statistik & laporan).
async function fetchAllRows(query, pageSize = 1000) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) {
      console.error('fetchAllRows error:', error.message);
      throw error;
    }
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

export default async function DashboardPage() {
  // Admin client (service role) — halaman ini sudah diproteksi layout (auth),
  // jadi data dijamin lengkap & konsisten terlepas dari RLS.
  const supabase = await createAdminClient();

  const [transactions, vehicles] = await Promise.all([
    fetchAllRows(
      supabase
        .from('transactions')
        .select(`*, vehicles(name, plate_number, rate_per_day)`)
        .order('created_at', { ascending: false })
    ),
    fetchAllRows(
      supabase.from('vehicles').select('*').order('created_at', { ascending: false })
    ),
  ]);

  return (
    <DashboardClient
      transactions={transactions || []}
      vehicles={vehicles || []}
    />
  );
}
