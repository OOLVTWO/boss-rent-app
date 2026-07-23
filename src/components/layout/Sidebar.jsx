'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/dashboard', iconClass: 'fa-solid fa-chart-pie', label: 'Dashboard' },
  { href: '/transactions', iconClass: 'fa-solid fa-file-invoice-dollar', label: 'Transaksi' },
  { href: '/vehicles', iconClass: 'fa-solid fa-motorcycle', label: 'Data Motor' },
  { href: '/tracking', iconClass: 'fa-solid fa-clock-rotate-left', label: 'Tracking Sewa', badge: 'tracking' },
  { href: '/availability', iconClass: 'fa-solid fa-circle-half-stroke', label: 'Ketersediaan', badge: 'availability' },
  { href: '/expenses', iconClass: 'fa-solid fa-money-bill-transfer', label: 'Pengeluaran' },
  { href: '/maintenance', iconClass: 'fa-solid fa-robot', label: 'AI Diagnostic' },
  { href: '/gallery', iconClass: 'fa-solid fa-images', label: 'Galeri Foto' },
  { href: '/reports', iconClass: 'fa-solid fa-chart-line', label: 'Laporan' },
  { href: '/settings', iconClass: 'fa-solid fa-gear', label: 'Pengaturan' },
  { href: '/fleet', iconClass: 'fa-solid fa-globe', label: 'Website Publik (/fleet)' },
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

        // Count overdue + expiring today
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
          const isActive = pathname.startsWith(item.href);
          const badgeCount = item.badge === 'tracking' ? alertCounts.tracking
            : item.badge === 'availability' ? alertCounts.availability
              : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">
                <i className={item.iconClass}></i>
              </span>
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

      {/* Footer / User */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{userInitial}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{userEmail}</div>
            <div className="sidebar-user-role">Administrator</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-block mt-2"
          style={{ fontSize: '12px', padding: '8px 12px' }}
        >
          <i className="fa-solid fa-right-from-bracket"></i> Keluar
        </button>
      </div>
    </aside>
  );
}
