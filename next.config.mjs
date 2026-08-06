/**
 * Konfigurasi Next.js — Boss Rent Pererenan.
 *
 * NEXT_PUBLIC_* di-inject saat build (nilainya PUBLIK — memang dikirim ke browser).
 * Fallback di bawah mencegah situs mati total jika env belum di-set di Vercel.
 * Best practice tetap: set Environment Variables di Vercel.
 * SUPABASE_SERVICE_ROLE_KEY TIDAK pernah di-hardcode — server-side only.
 */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eedrziblypwrufdzctvd.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_zUqMMF85DjjkO4HMiiZcvQ_ZWdKiFpF',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default nextConfig;
