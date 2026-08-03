import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Guard keamanan untuk SEMUA API route admin
 * (/api/vehicles, /api/transactions, /api/expenses).
 *
 * Route API memakai createAdminClient() (service role → bypass RLS), jadi WAJIB
 * diverifikasi dulu bahwa request datang dari user yang sudah login.
 * Tanpa guard ini, siapa pun di internet yang tahu URL bisa membaca / mengubah /
 * menghapus data customer (nama, HP, alamat, foto identitas).
 *
 * Cara pakai di awal setiap route handler:
 *   const authError = await requireAuth();
 *   if (authError) return authError;
 *
 * @returns {Promise<null|NextResponse>} null jika authenticated, atau NextResponse 401 jika belum login.
 */
export async function requireAuth() {
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
    // Fail CLOSED: kesalahan konfigurasi (mis. env hilang) pun harus menolak
    // request — tidak boleh ada celah data bocor lewat service role.
    console.error('requireAuth error:', err);
    return NextResponse.json(
      { error: 'Unauthorized — silakan login terlebih dahulu.' },
      { status: 401 }
    );
  }
}
