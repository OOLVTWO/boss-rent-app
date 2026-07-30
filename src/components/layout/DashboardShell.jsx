/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { updateFavicon } from '@/lib/favicon';

export default function DashboardShell({ user, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Sync favicon dynamically from saved brand logo settings
  useEffect(() => {
    try {
      const savedBiz = localStorage.getItem('boss_rent_biz_settings');
      if (savedBiz) {
        const parsed = JSON.parse(savedBiz);
        if (parsed.logoUrl) {
          updateFavicon(parsed.logoUrl);
        }
      }
    } catch (e) {
      console.error('Favicon sync error:', e);
    }
  }, []);

  // Close mobile navigation drawer automatically on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <div className="app-layout">
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        user={user}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Header
          user={user}
          onToggleMobile={() => setMobileOpen(prev => !prev)}
        />
        <main className="page-content fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
