import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

/**
 * POST /api/auth/login
 *
 * Login sekarang lewat route ini (bukan langsung dari browser ke Supabase)
 * supaya bisa dipasangi rate limit di sisi server sebelum percobaan
 * password dikirim ke Supabase Auth. Login dari browser langsung tidak
 * punya proteksi apa pun selain limit bawaan Supabase — brute-force di
 * app level tidak tercegah.
 *
 * Limit lebih ketat dari API data (10 percobaan / 10 menit per IP) karena
 * ini titik masuk paling sensitif di seluruh aplikasi. Dinaikkan dari 5/5
 * menit — terlalu ketat untuk penggunaan nyata: satu kantor/WiFi dipakai
 * bersama oleh beberapa staff, jadi beberapa kali salah ketik password dari
 * orang berbeda bisa mengunci SEMUA orang di jaringan yang sama sekaligus.
 * 10/10 menit masih memberi proteksi brute-force yang berarti (jauh dari
 * cukup untuk menebak password acak) sambil memberi ruang wajar untuk
 * kesalahan normal.
 */
export async function POST(request) {
  const rl = rateLimit(request, { windowMs: 10 * 60_000, max: 10 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan login. Silakan coba lagi beberapa menit lagi.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const body = await readJsonBody(request);
  if (!body || !body.email || !body.password) {
    return NextResponse.json({ error: 'Email dan password wajib diisi.' }, { status: 400 });
  }

  // Normalize the email server-side regardless of what the client sends —
  // mobile keyboards can auto-capitalize the first letter of a text field
  // even with type="email", and autofill/typing can leave a stray leading
  // or trailing space. Trimming + lowercasing here means a login can never
  // silently fail just because of that, independent of whatever the
  // client-side input attributes do.
  const email = body.email.trim().toLowerCase();
  const password = body.password;

  const supabase = await createClient();
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

  if (authError) {
    // Pesan generik ke client — jangan bocorkan apakah email terdaftar atau
    // tidak. Tapi log alasan ASLI di server (mis. "Invalid login
    // credentials" vs "Email not confirmed" vs lainnya) supaya bisa
    // didiagnosis lewat Vercel function logs kalau user melapor tidak bisa
    // login padahal yakin password benar.
    console.error('Login failed:', authError.message || authError);
    return NextResponse.json({ error: 'Email atau password salah.' }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
