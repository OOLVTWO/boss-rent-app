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

      <div className="header-right-wrap" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {/* LUNAS BUTTONS */}
        <a
          href="/invoice-boss-rent-500k-lunas.pdf"
          download="INVOICE_PROYEK_BOSS_RENT_500K_LUNAS.pdf"
          className="btn btn-sm"
          title="Download Invoice Rp 500.000 (Status LUNAS)"
          style={{
            background: 'linear-gradient(135deg, #16A34A, #22C55E)',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '11px',
            padding: '5px 10px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            textDecoration: 'none',
            boxShadow: '0 2px 6px rgba(22,163,74,0.3)',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fa-solid fa-circle-check" style={{ fontSize: '12px' }}></i>
          <span>Invoice 500k (LUNAS)</span>
        </a>

        <a
          href="/invoice-boss-rent-7.5jt-lunas.pdf"
          download="INVOICE_PROYEK_BOSS_RENT_7.5JT_LUNAS.pdf"
          className="btn btn-sm"
          title="Download Invoice Rp 7.500.000 (Status LUNAS)"
          style={{
            background: 'linear-gradient(135deg, #059669, #10B981)',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '11px',
            padding: '5px 10px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            textDecoration: 'none',
            boxShadow: '0 2px 6px rgba(5,150,105,0.3)',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fa-solid fa-circle-check" style={{ fontSize: '12px' }}></i>
          <span>Invoice 7.5jt (LUNAS)</span>
        </a>

        {/* PENDING BUTTONS */}
        <a
          href="/invoice-boss-rent-500k-belum-lunas.pdf"
          download="INVOICE_PROYEK_BOSS_RENT_500K_BELUM_LUNAS.pdf"
          className="btn btn-sm"
          title="Download Invoice Rp 500.000 (Status Belum Lunas)"
          style={{
            background: 'linear-gradient(135deg, #EA580C, #F97316)',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '11px',
            padding: '5px 10px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            textDecoration: 'none',
            boxShadow: '0 2px 6px rgba(234,88,12,0.3)',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fa-solid fa-clock" style={{ fontSize: '12px' }}></i>
          <span>500k (Belum Lunas)</span>
        </a>

        <a
          href="/invoice-boss-rent-7.5jt-belum-lunas.pdf"
          download="INVOICE_PROYEK_BOSS_RENT_7.5JT_BELUM_LUNAS.pdf"
          className="btn btn-sm"
          title="Download Invoice Rp 7.500.000 (Status Belum Lunas)"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #9333EA)',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '11px',
            padding: '5px 10px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            textDecoration: 'none',
            boxShadow: '0 2px 6px rgba(124,58,237,0.3)',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fa-solid fa-clock" style={{ fontSize: '12px' }}></i>
          <span>7.5jt (Belum Lunas)</span>
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
