'use client';

import { usePathname } from 'next/navigation';

const pageMeta = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Ringkasan statistik usaha rental' },
  '/transactions': { title: 'Transaksi', subtitle: 'Kelola pencatatan sewa motor' },
  '/vehicles': { title: 'Data Motor', subtitle: 'Manajemen armada kendaraan' },
  '/tracking': { title: 'Tracking Sewa', subtitle: 'Monitoring durasi sewa & pengingat WA' },
  '/availability': { title: 'Ketersediaan', subtitle: 'Ketersediaan armada motor real-time' },
  '/expenses': { title: 'Pengeluaran', subtitle: 'Catat biaya servis, bahan bakar & gaji' },
  '/maintenance': { title: 'AI Diagnostic', subtitle: 'Deteksi dini kesehatan motor' },
  '/gallery': { title: 'Galeri Foto', subtitle: 'Arsip foto identitas & kendaraan' },
  '/reports': { title: 'Laporan', subtitle: 'Export dan analisis pendapatan' },
  '/settings': { title: 'Pengaturan', subtitle: 'Koneksi database & template WA' },
  '/fleet': { title: 'Website Publik', subtitle: 'Katalog sewa motor publik (/fleet)' },
};

export default function Header({ onToggleMobile }) {
  const pathname = usePathname();
  const matchedKey = Object.keys(pageMeta).find(key => pathname.startsWith(key));
  const meta = pageMeta[matchedKey] || { title: 'Boss Rent', subtitle: 'Admin Panel' };

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Mobile & Tablet Hamburger Navigation Button */}
        <button
          type="button"
          className="mobile-hamburger-btn"
          onClick={onToggleMobile}
          aria-label="Buka Menu Navigasi"
        >
          <i className="fa-solid fa-bars"></i>
        </button>

        <div className="header-left">
          <h2>{meta.title}</h2>
          <p>{meta.subtitle}</p>
        </div>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img
          src="/images/logoCompany.png"
          alt="Boss Rent Pererenan"
          style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
        />
        <div className="header-date">
          <i className="fa-regular fa-calendar-days" style={{ marginRight: '6px' }}></i>
          {dateStr}
        </div>
      </div>
    </header>
  );
}
