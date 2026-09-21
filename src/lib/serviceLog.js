/**
 * Jejak servis motor — helper murni (tanpa I/O) supaya mudah dites.
 */

export const DEFAULT_SERVICE_INTERVAL_KM = 2000;
export const DEFAULT_SERVICE_INTERVAL_DAYS = 60;
const SOON_RATIO = 0.8;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Pilihan cepat item servis (tersimpan sebagai teks di kolom items). */
export const SERVICE_ITEM_OPTIONS = [
  'Ganti oli mesin',
  'Oli gardan',
  'Servis CVT / V-belt',
  'Kampas / minyak rem',
  'Ban',
  'Aki',
  'Busi',
  'Filter udara',
  'Servis rutin / tune-up',
  'Kelistrikan / lampu',
  'Body / spion',
];

const BIZ_SETTINGS_KEY = 'boss_rent_biz_settings';

function positiveInt(value, fallback) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Interval servis dari Pengaturan → Profil Bisnis (localStorage browser admin). */
export function getServiceIntervals(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  let saved = {};
  try {
    saved = JSON.parse(storage?.getItem(BIZ_SETTINGS_KEY) || '{}') || {};
  } catch {
    saved = {};
  }
  return {
    km: positiveInt(saved.serviceIntervalKm ?? saved.oilInterval, DEFAULT_SERVICE_INTERVAL_KM),
    days: positiveInt(saved.serviceIntervalDays, DEFAULT_SERVICE_INTERVAL_DAYS),
  };
}

function toDate(value) {
  if (!value) return null;
  // "YYYY-MM-DD" → tanggal lokal (bukan UTC) supaya selisih hari tidak meleset.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Status servis satu motor.
 * level: 'due' (lewat batas) | 'soon' (≥80% batas) | 'ok' | 'unknown' (belum pernah dicatat)
 */
export function getServiceStatus(vehicle, intervals = {}, now = new Date()) {
  const intervalKm = positiveInt(intervals.km, DEFAULT_SERVICE_INTERVAL_KM);
  const intervalDays = positiveInt(intervals.days, DEFAULT_SERVICE_INTERVAL_DAYS);

  const lastKm = Number(vehicle?.last_service_km);
  const currentKm = Number(vehicle?.current_km);
  const hasKm = Number.isFinite(lastKm) && lastKm > 0 && Number.isFinite(currentKm);
  const kmSince = hasKm ? Math.max(0, currentKm - lastKm) : null;

  const lastDate = toDate(vehicle?.last_serviced_at);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastDay = lastDate ? new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()) : null;
  const daysSince = lastDay ? Math.max(0, Math.round((today - lastDay) / DAY_MS)) : null;

  if (kmSince === null && daysSince === null) {
    return { level: 'unknown', kmSince, daysSince, kmLeft: null, daysLeft: null, intervalKm, intervalDays };
  }

  const ratios = [];
  if (kmSince !== null) ratios.push(kmSince / intervalKm);
  if (daysSince !== null) ratios.push(daysSince / intervalDays);
  const ratio = Math.max(...ratios);
  const level = ratio >= 1 ? 'due' : ratio >= SOON_RATIO ? 'soon' : 'ok';

  return {
    level,
    kmSince,
    daysSince,
    kmLeft: kmSince === null ? null : intervalKm - kmSince,
    daysLeft: daysSince === null ? null : intervalDays - daysSince,
    intervalKm,
    intervalDays,
  };
}

/** Normalisasi input form → payload aman untuk database. */
export function normalizeServiceLogInput(body = {}) {
  const items = Array.isArray(body.items)
    ? [...new Set(body.items.map((s) => String(s || '').trim()).filter(Boolean))].slice(0, 30)
    : [];
  const kmNum = body.km === '' || body.km === null || body.km === undefined ? null : Math.round(Number(body.km));
  const costNum = Number(body.cost);
  return {
    vehicle_id: body.vehicle_id ? String(body.vehicle_id) : null,
    service_date: typeof body.service_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.service_date)
      ? body.service_date
      : null,
    km: Number.isFinite(kmNum) && kmNum >= 0 ? kmNum : null,
    items,
    workshop: String(body.workshop || '').trim().slice(0, 120),
    cost: Number.isFinite(costNum) && costNum > 0 ? Math.round(costNum) : 0,
    notes: String(body.notes || '').trim().slice(0, 2000),
  };
}

/** Judul pengeluaran otomatis di menu Keuangan. Plat nomor disertakan agar
 *  tetap terhubung ke motor (lihat expenseMatchesVehicle di finance.js). */
export function buildServiceExpenseTitle(vehicle, items) {
  const name = [vehicle?.name, vehicle?.plate_number ? `(${vehicle.plate_number})` : '']
    .filter(Boolean).join(' ');
  const what = items && items.length ? items.join(', ') : 'Servis';
  return `Servis Motor: ${name || 'Motor'} - ${what}`.slice(0, 200);
}
