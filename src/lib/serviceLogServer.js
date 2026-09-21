/**
 * Helper server-side untuk API Servis Motor (dipakai route handler).
 * Menggunakan admin client (service_role) — panggil HANYA setelah requireAuth.
 */
import { buildServiceExpenseTitle } from '@/lib/serviceLog';

export const SERVICE_LOG_SELECT =
  'id, vehicle_id, service_date, km, items, workshop, cost, notes, expense_id, created_at, updated_at, vehicles(id, name, plate_number)';

/** Tanggal servis (YYYY-MM-DD) → timestamptz tengah hari WITA (hindari geser tanggal). */
function serviceDateToTimestamp(date) {
  return `${date}T12:00:00+08:00`;
}

export async function getVehicleBasic(supabase, vehicleId) {
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, name, plate_number, current_km')
    .eq('id', vehicleId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Buat / ubah / hapus pengeluaran Keuangan yang terhubung ke catatan servis. */
export async function syncServiceExpense(supabase, { expenseId, recordExpense, vehicle, input }) {
  const wantsExpense = recordExpense && input.cost > 0;
  const payload = {
    title: buildServiceExpenseTitle(vehicle, input.items),
    category: 'service',
    amount: input.cost,
    expense_date: input.service_date,
    notes: [input.workshop && `Bengkel: ${input.workshop}`, input.km !== null && `KM: ${input.km}`, input.notes]
      .filter(Boolean).join('\n'),
    type: 'expense',
    vehicle_id: vehicle.id,
  };

  if (expenseId && !wantsExpense) {
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
    if (error) throw new Error(`Gagal menghapus pengeluaran terkait: ${error.message}`);
    return null;
  }
  if (expenseId && wantsExpense) {
    const { error } = await supabase.from('expenses').update(payload).eq('id', expenseId);
    if (error) throw new Error(`Gagal memperbarui pengeluaran terkait: ${error.message}`);
    return expenseId;
  }
  if (!expenseId && wantsExpense) {
    const { data, error } = await supabase.from('expenses').insert([payload]).select('id').single();
    if (error) throw new Error(`Gagal mencatat biaya ke Keuangan: ${error.message}`);
    return data.id;
  }
  return null;
}

/**
 * Samakan kolom ringkasan di tabel vehicles dengan catatan servis terbaru:
 * last_serviced_at, last_service_km, dan current_km (kalau KM servis lebih tinggi).
 * Kalau motor tidak punya catatan servis sama sekali, kolom dibiarkan apa adanya.
 */
export async function syncVehicleServiceInfo(supabase, vehicleId) {
  if (!vehicleId) return;
  const [{ data: latest }, { data: latestKm }, { data: vehicle }] = await Promise.all([
    supabase.from('service_logs').select('service_date')
      .eq('vehicle_id', vehicleId)
      .order('service_date', { ascending: false }).order('created_at', { ascending: false })
      .limit(1).maybeSingle(),
    supabase.from('service_logs').select('km')
      .eq('vehicle_id', vehicleId).not('km', 'is', null)
      .order('service_date', { ascending: false }).order('km', { ascending: false })
      .limit(1).maybeSingle(),
    supabase.from('vehicles').select('current_km').eq('id', vehicleId).maybeSingle(),
  ]);
  if (!latest) return;

  const update = { last_serviced_at: serviceDateToTimestamp(latest.service_date) };
  if (latestKm && Number.isFinite(latestKm.km)) {
    update.last_service_km = latestKm.km;
    if (!Number.isFinite(vehicle?.current_km) || latestKm.km > vehicle.current_km) {
      update.current_km = latestKm.km;
    }
  }
  const { error } = await supabase.from('vehicles').update(update).eq('id', vehicleId);
  if (error) console.error('syncVehicleServiceInfo error:', error.message);
}

export function isMissingTableError(error) {
  const msg = String(error?.message || '');
  return error?.code === '42P01' || error?.code === 'PGRST205'
    || (/service_logs/.test(msg) && /does not exist|schema cache/i.test(msg));
}
