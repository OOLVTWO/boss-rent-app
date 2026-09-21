import { createClient } from '@/lib/supabase/server';
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
  // Session user (bukan service role) — layout sudah proteksi auth + RLS
  // policy "authenticated = full access" (migration 001) menjamin data lengkap.
  const supabase = await createClient();

  // PERBAIKAN PERFORMA: sebelumnya fetchAllRows() menarik SELURUH transaksi
  // sejak hari pertama bisnis berjalan, setiap kali dashboard dibuka atau
  // di-refresh — padahal tampilan defaultnya cuma butuh data bulan/tahun
  // berjalan. Untuk bisnis yang sudah berjalan lama dengan ribuan transaksi,
  // ini artinya setiap buka dashboard = download ulang seluruh riwayat dari
  // awal, yang bikin loading lambat DAN termasuk penyebab kuota egress
  // Supabase cepat habis. Dibatasi ke tahun berjalan saja — cukup untuk
  // toggle Bulanan/Tahunan tahun ini tanpa fetch tambahan; kalau user pilih
  // tahun lain, DashboardClient fetch data tahun itu on-demand lewat
  // /api/transactions (lihat useEffect di DashboardClient.jsx).
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01T00:00:00Z`;
  const yearEnd = `${currentYear}-12-31T23:59:59Z`;

  const [transactions, vehicles] = await Promise.all([
    fetchAllRows(
      supabase
        .from('transactions')
        .select(`*, vehicles(name, plate_number, rate_per_day)`)
        .gte('created_at', yearStart)
        .lte('created_at', yearEnd)
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
      loadedYear={currentYear}
    />
  );
}
