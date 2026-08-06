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
 * Admin client untuk API route.
 *  - Jika SUPABASE_SERVICE_ROLE_KEY di-set → service role (bypass RLS). Disarankan.
 *  - Jika TIDAK di-set → fallback ke session user yang login.
 *    (PERUBAHAN: sebelumnya fail-loud yang membuat dashboard/API mati saat env
 *    belum di-set di Vercel. Keamanan tetap dijaga oleh RLS policies —
 *    lihat supabase/migrations/001_schema.sql.)
 */
export async function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    console.warn(
      'createAdminClient: SUPABASE_SERVICE_ROLE_KEY belum di-set — fallback ke session user. ' +
      'Set env tsb di Vercel untuk mode admin penuh (bypass RLS).'
    );
    return createClient();
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
