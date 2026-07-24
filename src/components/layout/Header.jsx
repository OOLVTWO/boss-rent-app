/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import VuiVoiceControl from '@/components/dashboard/VuiVoiceControl';

const pageMeta = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Ringkasan statistik usaha rental' },
  '/transactions': { title: 'Transaksi', subtitle: 'Kelola pencatatan sewa motor' },
  '/vehicles': { title: 'Data Motor', subtitle: 'Manajemen armada kendaraan' },
  '/tracking': { title: 'Tracking Sewa', subtitle: 'Monitoring durasi sewa & pengingat WA' },
  '/availability': { title: 'Ketersediaan', subtitle: 'Ketersediaan armada motor real-time' },
  '/expenses': { title: 'Keuangan', subtitle: 'Catat pemasukan, pengeluaran & saldo bersih' },
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
  const [logoUrl, setLogoUrl] = useState('/images/logoCompany.png');

  useEffect(() => {
    try {
      const savedBiz = localStorage.getItem('boss_rent_biz_settings');
      if (savedBiz) {
        const parsed = JSON.parse(savedBiz);
        if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
      }
    } catch { /* ignore */ }
  }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="header">
      <div className="header-left-wrap">
        <button
          type="button"
          className="mobile-hamburger-btn"
          onClick={onToggleMobile}
          aria-label="Buka Menu Navigasi"
        >
          <i className="fa-solid fa-bars"></i>
        </button>

        <div className="header-title-box">
          <h2>{meta.title}</h2>
          <p className="header-subtitle">{meta.subtitle}</p>
        </div>
      </div>

      <div className="header-right-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <a
          href="/invoice-boss-rent-500k.pdf"
          download="INVOICE_PROYEK_BOSS_RENT_500K.pdf"
          className="btn btn-sm"
          style={{
            background: 'linear-gradient(135deg, #E85D04, #F97316)',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '11.5px',
            padding: '6px 12px',
            borderRadius: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(232,93,4,0.3)',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fa-solid fa-file-pdf" style={{ fontSize: '13px' }}></i>
          <span>Invoice Rp 500k (Sahabat)</span>
        </a>

        <a
          href="/invoice-boss-rent-7.5jt.pdf"
          download="INVOICE_PROYEK_BOSS_RENT_7.5JT.pdf"
          className="btn btn-sm"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '11.5px',
            padding: '6px 12px',
            borderRadius: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fa-solid fa-file-pdf" style={{ fontSize: '13px' }}></i>
          <span>Invoice Rp 7.5jt (Standard)</span>
        </a>

        <VuiVoiceControl />
        <img
          src={logoUrl}
          alt="Boss Rent Pererenan"
          className="header-logo-img"
        />
        <div className="header-date">
          <i className="fa-regular fa-calendar-days" style={{ marginRight: '6px' }}></i>
          {dateStr}
        </div>
      </div>
    </header>
  );
}
