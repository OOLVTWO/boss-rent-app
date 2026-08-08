/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

// ── Nav grouped by section ──
const NAV_SECTIONS = [
  {
    label: 'Operasional',
    items: [
      { href: '/dashboard',    iconClass: 'fa-solid fa-chart-pie',           label: 'Dashboard' },
      { href: '/transactions', iconClass: 'fa-solid fa-file-invoice-dollar', label: 'Transaksi',      badge: null },
      { href: '/customers',    iconClass: 'fa-solid fa-users',               label: 'Data Customer' },
      { href: '/vehicles',     iconClass: 'fa-solid fa-motorcycle',          label: 'Data Motor' },
      { href: '/tracking',     iconClass: 'fa-solid fa-clock-rotate-left',   label: 'Tracking Sewa', badge: 'tracking' },
      { href: '/availability', iconClass: 'fa-solid fa-circle-half-stroke',  label: 'Ketersediaan',  badge: 'availability' },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      { href: '/expenses', iconClass: 'fa-solid fa-wallet',     label: 'Keuangan' },
      {
        href: '/reports',
        iconClass: 'fa-solid fa-chart-line',
        label: 'Laporan',
        isDropdown: true,
        children: [
          { href: '/reports?tab=income',      iconClass: 'fa-solid fa-sack-dollar',         label: 'Pemasukan (Sewa)' },
          { href: '/reports?tab=expenses',    iconClass: 'fa-solid fa-money-bill-transfer', label: 'Pengeluaran' },
          { href: '/reports?tab=profit_loss', iconClass: 'fa-solid fa-calculator',          label: 'Laba Rugi' },
          { href: '/reports?tab=investor',    iconClass: 'fa-solid fa-crown',               label: 'Bagi Hasil Investor' },
        ],
      },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/maintenance', iconClass: 'fa-solid fa-robot',  label: 'AI Diagnostic' },
      { href: '/gallery',     iconClass: 'fa-solid fa-images', label: 'Galeri Foto' },
    ],
  },
  {
    label: 'Lainnya',
    items: [
      { href: '/settings', iconClass: 'fa-solid fa-gear',  label: 'Pengaturan' },
      { href: '/fleet',    iconClass: 'fa-solid fa-globe', label: 'Website Publik' },
    ],
  },
];

function getDaysLeft(endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return Math.floor((end - today) / (1000 * 60 * 60 * 24));
}

export default function Sidebar({ user, mobileOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const [alertCounts, setAlertCounts] = useState({ tracking: 0, availability: 0 });
  const [laporanOpen, setLaporanOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState('/images/logoCompany.png');

  // Auto-expand laporan dropdown if on /reports
  useEffect(() => {
    if (pathname.startsWith('/reports')) setLaporanOpen(true);
  }, [pathname]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('boss_rent_biz_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const supabase = createClient();
        const { data: activeTx } = await supabase
          .from('transactions')
          .select('end_date, vehicle_id')
          .eq('status', 'active');
        if (!activeTx) return;
        const alertCount = activeTx.filter(tx => getDaysLeft(tx.end_date) <= 0).length;
        setAlertCounts({ tracking: alertCount, availability: alertCount });
      } catch { /* ignore */ }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const userEmail = user?.email || 'admin@bossrent.com';
  const userInitial = userEmail.charAt(0).toUpperCase();

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-active' : ''}`}>

      {/* Mobile close button */}
      <button
        type="button"
        className="mobile-sidebar-close-btn"
        onClick={onClose}
        aria-label="Tutup Menu"
      >
        <i className="fa-solid fa-xmark"></i>
      </button>

      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <i className="fa-solid fa-motorcycle"></i>
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">Boss Rent</span>
          <span className="sidebar-brand-sub">Pererenan, Bali</span>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="sidebar-section">
            <div className="sidebar-section-label">{section.label}</div>

            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/') ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href.split('?')[0]));
              const badgeCount =
                item.badge === 'tracking' ? alertCounts.tracking
                : item.badge === 'availability' ? alertCounts.availability
                : 0;

              // Dropdown (Laporan)
              if (item.isDropdown) {
                const isDropdownActive = pathname.startsWith('/reports');
                return (
                  <div key={item.href}>
                    <button
                      type="button"
                      onClick={() => setLaporanOpen(prev => !prev)}
                      className={`sidebar-nav-item sidebar-dropdown-trigger ${isDropdownActive ? 'active' : ''}`}
                    >
                      <span className="nav-icon"><i className={item.iconClass}></i></span>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      <i
                        className="fa-solid fa-chevron-down"
                        style={{
                          fontSize: '10px',
                          transition: 'transform 0.22s ease',
                          transform: laporanOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          opacity: 0.45,
                        }}
                      />
                    </button>
                    <div style={{
                      overflow: 'hidden',
                      maxHeight: laporanOpen ? '240px' : '0px',
                      transition: 'max-height 0.28s ease',
                    }}>
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="sidebar-nav-item sidebar-child-item"
                          onClick={onClose}
                          style={{ paddingLeft: '36px' }}
                        >
                          <span className="nav-icon" style={{ fontSize: '12px', width: '16px' }}>
                            <i className={child.iconClass}></i>
                          </span>
                          <span style={{ fontSize: '12px' }}>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }

              // Regular item
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="nav-icon"><i className={item.iconClass}></i></span>
                  {item.label}
                  {badgeCount > 0 && (
                    <span className="sidebar-alert-badge">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer: user + logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{userInitial}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{userEmail}</div>
            <div className="sidebar-user-role">Administrator</div>
          </div>
        </div>
        <button
          type="button"
          className="sidebar-signout-btn"
          onClick={handleLogout}
        >
          <i className="fa-solid fa-right-from-bracket"></i>
          Keluar
        </button>
      </div>
    </aside>
  );
}
