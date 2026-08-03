import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: transactions }, { data: vehicles }] = await Promise.all([
    supabase
      .from('transactions')
      .select(`*, vehicles(name, plate_number, rate_per_day)`)
      .order('created_at', { ascending: false })
      // Ambil seluruh riwayat (batas default Supabase) agar filter periode
      // bulanan/tahunan, deposit aktif & diagnosa AI tetap akurat di client.
      .limit(1000),
    supabase.from('vehicles').select('*'),
  ]);

  return (
    <DashboardClient
      transactions={transactions || []}
      vehicles={vehicles || []}
    />
  );
}
