import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rateLimit';

/**
 * Guard keamanan untuk SEMUA API route admin
 * (/api/vehicles, /api/transactions, /api/expenses).
 *
 * Route API memakai createAdminClient() (service role → bypass RLS), jadi WAJIB
 * diverifikasi dulu bahwa request datang dari user yang sudah login.
 *
 * PERUBAHAN:
 *  - requireAuth(request) kini menerima request → rate limiting (429).
 *  - Fail CLOSED: kesalahan konfigurasi pun menolak request (401).
 */
export async function requireAuth(request) {
  // 1) Rate limit (best-effort, per instance)
  const rl = rateLimit(request);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan. Silakan coba lagi beberapa saat.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  // 2) Auth check — fail CLOSED
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized — silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }
    return null;
  } catch (err) {
    console.error('requireAuth error:', err);
    return NextResponse.json(
      { error: 'Unauthorized — silakan login terlebih dahulu.' },
      { status: 401 }
    );
  }
}

/** Ambil body JSON dengan aman → null jika tidak valid (400). */
export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** Angka non-negatif; fallback jika kosong / NaN / negatif. */
export function toNonNegativeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Daftar field wajib yang kosong. */
export function missingFields(body, fields) {
  return fields.filter(
    (f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === ''
  );
}
