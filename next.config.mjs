/**
 * Konfigurasi Next.js — Boss Rent Pererenan.
 *
 * PERUBAHAN: env Supabase TIDAK lagi di-hardcode sebagai fallback.
 * Jika NEXT_PUBLIC_SUPABASE_URL / ANON_KEY tidak di-set, supabase-js
 * melempar error (fail LOUDLY) alih-alih diam-diam memakai value hardcode
 * yang bisa mengarah ke project yang salah.
 * Isi env di .env.local (dev) dan Vercel Environment Variables (prod).
 */
const nextConfig = {
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
