import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — cookie set akan ditangani proxy
          }
        },
      },
    }
  );
}

/**
 * Admin client memakai SERVICE ROLE key (bypass RLS) — HANYA server-side.
 *
 * PERUBAHAN: tidak ada lagi fallback ke anon key. Jika
 * SUPABASE_SERVICE_ROLE_KEY hilang → throw error (fail LOUD), karena
 * fallback diam-diam membuat admin client kehilangan privilege:
 *  - saat RLS aktif  → data tampak "hilang" (keluhan utama dashboard)
 *  - saat RLS mati   → akses tak terkendali ke data customer (PII)
 */
export async function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'createAdminClient: NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY ' +
      'wajib di-set (Vercel Environment Variables / .env.local). ' +
      'Jangan gunakan anon key untuk admin client.'
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
