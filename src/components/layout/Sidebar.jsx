/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/dashboard',    iconClass: 'fa-solid fa-chart-pie',           label: 'Dashboard' },
  { href: '/transactions', iconClass: 'fa-solid fa-file-invoice-dollar', label: 'Transaksi' },
  { href: '/customers',    iconClass: 'fa-solid fa-users',               label: 'Data Customer' },
  { href: '/vehicles',     iconClass: 'fa-solid fa-motorcycle',          label: 'Data Motor' },
  { href: '/tracking',     iconClass: 'fa-solid fa-clock-rotate-left',   label: 'Tracking Sewa',  badge: 'tracking' },
  { href: '/availability', iconClass: 'fa-solid fa-circle-half-stroke',  label: 'Ketersediaan',   badge: 'availability' },
  { href: '/expenses',     iconClass: 'fa-solid fa-wallet',              label: 'Keuangan' },
  { href: '/maintenance',  iconClass: 'fa-solid fa-robot',               label: 'AI Diagnostic' },
  { href: '/gallery',      iconClass: 'fa-solid fa-images',              label: 'Galeri Foto' },
  {
    href: '/reports',
    iconClass: 'fa-solid fa-chart-line',
    label: 'Laporan',
    isDropdown: true,
    children: [
      { href: '/reports?tab=income',      iconClass: 'fa-solid fa-sack-dollar',         label: 'Pemasukan (Sewa)' },
      { href: '/reports?tab=expenses',    iconClass: 'fa-solid fa-money-bill-transfer', label: 'Pengeluaran Operasional' },
      { href: '/reports?tab=profit_loss', iconClass: 'fa-solid fa-calculator',          label: 'Ringkasan Laba Rugi' },
      { href: '/reports?tab=investor',    iconClass: 'fa-solid fa-crown',               label: 'Bagi Hasil Investor' },
    ],
  },
  { href: '/settings', iconClass: 'fa-solid fa-gear',  label: 'Pengaturan' },
  { href: '/fleet',    iconClass: 'fa-solid fa-globe', label: 'Website Publik (/fleet)' },
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
  const [logoUrl, setLogoUrl] = useState('/images/logoCompany.png');
  const [laporanOpen, setLaporanOpen] = useState(false);

  // Auto-buka dropdown jika sedang di halaman /reports
  useEffect(() => {
    if (pathname.startsWith('/reports')) setLaporanOpen(true);
  }, [pathname]);

  useEffect(() => {
    try {
      const savedBiz = localStorage.getItem('boss_rent_biz_settings');
      if (savedBiz) {
        const parsed = JSON.parse(savedBiz);
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
      {/* Mobile Close Button */}
      <button
        type="button"
        className="mobile-sidebar-close-btn"
        onClick={onClose}
        aria-label="Tutup Menu"
      >
        <i className="fa-solid fa-xmark"></i>
      </button>

      {/* Logo */}
      <div className="sidebar-logo">
        <img
          src={logoUrl}
          alt="BOSS RENT PERERENAN Logo"
          style={{ height: '48px', width: 'auto', objectFit: 'contain', marginBottom: '6px' }}
        />
        <h1>Boss Rent</h1>
        <p>Pererenan — Admin Panel</p>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Menu Utama</div>

        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href.split('?')[0]);
          const badgeCount = item.badge === 'tracking' ? alertCounts.tracking
            : item.badge === 'availability' ? alertCounts.availability
            : 0;

          // ── DROPDOWN: Laporan ──
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
                      fontSize: '11px',
                      transition: 'transform 0.22s ease',
                      transform: laporanOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      opacity: 0.55,
                    }}
                  />
                </button>

                {/* Animated children */}
                <div style={{
                  overflow: 'hidden',
                  maxHeight: laporanOpen ? '220px' : '0px',
                  transition: 'max-height 0.28s ease',
                }}>
                  {item.children.map((child) => {
                    const childActive = pathname.startsWith('/reports') && typeof window !== 'undefined'
                      && window.location.search.includes(child.href.split('?tab=')[1] || '__');
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`sidebar-nav-item sidebar-child-item ${childActive ? 'active' : ''}`}
                        onClick={onClose}
                      >
                        <span className="nav-icon" style={{ fontSize: '13px', width: '18px' }}>
                          <i className={child.iconClass}></i>
                        </span>
                        <span style={{ fontSize: '12.5px' }}>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          // ── Regular item ──
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
      </nav>

      {/* Footer */}
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
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }}
          onClick={handleLogout}
        >
          <i className="fa-solid fa-right-from-bracket" style={{ marginRight: '6px' }}></i>
          Keluar
        </button>
      </div>
    </aside>
  );
}
