/**
 * Daftar kolom "ringan" untuk query list/agregasi di panel admin.
 *
 * Kolom foto (transactions.customer_image_url, transactions.handover_image_url,
 * vehicles.image_url, customers.customer_image_url) SENGAJA tidak disertakan:
 * sebelumnya berisi base64 beberapa MB per baris dan ikut terbawa di setiap
 * select('*') → penyebab utama "exceed_egress_quota". Foto hanya diambil
 * per-transaksi saat benar-benar dibuka (lihat GET /api/transactions/[id]).
 *
 * PENTING: kalau menambah kolom baru di database dan kolom itu dipakai UI,
 * tambahkan juga di sini — kolom yang tidak ada di daftar tidak akan terkirim.
 */

export const TX_LIGHT_COLUMNS = [
  'id', 'vehicle_id', 'renter_name', 'renter_phone', 'renter_id_number', 'renter_address',
  'start_date', 'end_date', 'duration_days', 'total_price', 'deposit', 'discount', 'damage_fee',
  'km_start', 'km_end', 'payment_method', 'payment_status', 'status', 'issues_reported', 'notes',
  'created_at', 'updated_at',
].join(', ');

export const TX_VEHICLE_JOIN = 'vehicles(id, name, plate_number, rate_per_day, category)';

/** select() string transaksi ringan + relasi motor (dipakai API & fallback client). */
export const TX_LIGHT_SELECT = `${TX_LIGHT_COLUMNS}, ${TX_VEHICLE_JOIN}`;

export const VEHICLE_LIGHT_COLUMNS = [
  'id', 'name', 'plate_number', 'year', 'color', 'category', 'status', 'notes',
  'rate_per_day', 'rate_per_week', 'rate_per_month',
  'current_km', 'last_service_km', 'last_serviced_at',
  'owner_type', 'owner_name', 'owner_contact', 'revenue_share_percentage',
  'purchase_date', 'purchase_price', 'created_at', 'updated_at',
].join(', ');

export const CUSTOMER_LIGHT_COLUMNS = 'id, name, phone, id_number, address, notes, created_at, updated_at';

/**
 * Ambil SEMUA baris dengan paging .range(). PostgREST Supabase memotong
 * hasil di 1000 baris tanpa error — tanpa paging, data di atas 1000 baris
 * hilang diam-diam. `buildQuery` harus membuat query BARU setiap dipanggil.
 */
export async function fetchAllRows(buildQuery, pageSize = 1000) {
  const all = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) return { data: null, error };
    const rows = Array.isArray(data) ? data : [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return { data: all, error: null };
}
