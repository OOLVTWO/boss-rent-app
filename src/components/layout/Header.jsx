'use client';

import { usePathname } from 'next/navigation';

const pageMeta = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Ringkasan statistik usaha rental' },
  '/transactions': { title: 'Transaksi', subtitle: 'Kelola pencatatan sewa motor' },
  '/vehicles': { title: 'Data Motor', subtitle: 'Manajemen armada kendaraan' },
  '/expenses': { title: 'Pengeluaran Operasional', subtitle: 'Catat biaya servis, bahan bakar, gaji & sparepart' },
  '/maintenance': { title: 'AI Maintenance & Diagnosis', subtitle: 'Deteksi dini kesehatan motor & jadwal servis' },
  '/gallery': { title: 'Galeri Foto', subtitle: 'Arsip foto identitas penyewa & kendaraan' },
  '/reports': { title: 'Laporan', subtitle: 'Export dan analisis pendapatan' },
};

export default function Header() {
  const pathname = usePathname();
  const matchedKey = Object.keys(pageMeta).find(key => pathname.startsWith(key));
  const meta = pageMeta[matchedKey] || { title: 'Boss Rent', subtitle: 'Admin Panel' };

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="header">
      <div className="header-left">
        <h2>{meta.title}</h2>
        <p>{meta.subtitle}</p>
      </div>
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <img
          src="/images/logoCompany.png"
          alt="Boss Rent Pererenan"
          style={{ height: '34px', width: 'auto', objectFit: 'contain' }}
        />
        <div className="header-date">
          <i className="fa-regular fa-calendar-days" style={{ marginRight: '6px' }}></i>
          {dateStr}
        </div>
      </div>
    </header>
  );
}
