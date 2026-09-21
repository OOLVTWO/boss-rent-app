/**
 * Rate limiter in-memory sederhana (best-effort, per instance).
 *
 * CATATAN: di Vercel serverless setiap instance punya Map sendiri, jadi ini
 * proteksi ringan — untuk proteksi produksi yang ketat (anti brute-force
 * login / API abuse) gunakan Redis/Upstash, lihat DEPLOY-GUIDE.md.
 */
const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 120;

const hits = new Map();

export function rateLimit(request, { windowMs = DEFAULT_WINDOW_MS, max = DEFAULT_MAX } = {}) {
  const now = Date.now();

  // Prune malas agar Map tidak membengkak (hapus bucket yang sudah kadaluarsa)
  if (hits.size > 1000) {
    for (const [k, b] of hits) {
      if (b.resetAt <= now) hits.delete(k);
    }
  }

  // request bisa undefined (route [id] memanggil requireAuth() tanpa arg) — jangan crash
  const ip =
    request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request?.headers?.get('x-real-ip') ||
    null;

  // PERBAIKAN: kalau IP tidak bisa dideteksi (header proxy tidak ada/beda
  // di host tertentu), JANGAN fallback ke satu key bersama ('unknown') —
  // itu artinya SEMUA pengunjung berbagi satu limit yang sama, jadi
  // percobaan login siapa pun (termasuk bot/orang lain) bisa mengunci
  // SEMUA orang keluar, termasuk pemilik sendiri, walau baru percobaan
  // pertama mereka hari itu. Kondisi persis yang dilaporkan: halaman
  // login tampil normal, tapi tidak pernah berhasil connect akun.
  // Lebih aman fail-open (skip rate limit) untuk kasus yang jarang ini
  // daripada fail-closed yang mengunci semua orang sekaligus.
  if (!ip) {
    return { ok: true, remaining: max };
  }

  const bucket = hits.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, remaining: max - bucket.count };
}

/** Hanya untuk test */
export function resetRateLimiter() {
  hits.clear();
}
