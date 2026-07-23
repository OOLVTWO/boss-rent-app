'use client';

import { useState, useEffect } from 'react';
import StatCards from '@/components/dashboard/StatCards';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import Link from 'next/link';
import { analyzeVehicleHealth } from '@/lib/aiDiagnostic';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

const statusBadge = (status) => {
  const map = {
    active: <span className="badge badge-info"><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '4px' }}></i> Aktif</span>,
    completed: <span className="badge badge-success"><i className="fa-solid fa-circle-check" style={{ marginRight: '4px' }}></i> Selesai</span>,
    cancelled: <span className="badge badge-danger"><i className="fa-solid fa-circle-xmark" style={{ marginRight: '4px' }}></i> Dibatalkan</span>,
  };
  return map[status] || <span className="badge badge-muted">{status}</span>;
};

export default function DashboardClient({ transactions, vehicles }) {
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    fetch('/api/expenses')
      .then(res => res.json())
      .then(data => setExpenses(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Fetch expenses error:', err);
        setExpenses([]);
      });
  }, []);

  const safeTx = Array.isArray(transactions) ? transactions : [];
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  const recentTx = safeTx.slice(0, 5);

  // AI Diagnostic Warnings Calculation
  const diagnostics = safeVehicles.map(v => analyzeVehicleHealth(v, safeTx));
  const urgentVehicles = diagnostics.filter(d => d.healthScore < 60 || d.recentIssues.length > 0);

  // Financial calculations
  const totalRevenue = safeTx.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.total_price || 0), 0);
  const totalExpenses = safeExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  // Deposit calculations
  const activeTx = safeTx.filter(t => t.status === 'active');
  const completedTx = safeTx.filter(t => t.status === 'completed');
  const totalDepositHeld = activeTx.reduce((s, t) => s + Number(t.deposit || 0), 0);
  const totalDepositDamage = completedTx.reduce((s, t) => s + Number(t.damage_fee || 0), 0);
  const totalDepositReturned = completedTx.reduce((s, t) => {
    const dep = Number(t.deposit || 0);
    const dmg = Number(t.damage_fee || 0);
    return s + Math.max(0, dep - dmg);
  }, 0);

  return (
    <div className="bento-dashboard-wrapper fade-in">
      {/* Bento Header */}
      <div className="page-header mb-6">
        <h2><i className="fa-solid fa-border-all" style={{ marginRight: '8px', color: 'var(--brand-primary)' }}></i> Dashboard Bento Analytics</h2>
        <p>Ringkasan performa finansial, status armada, dan ketersediaan sewa motor Boss Rent Pererenan</p>
      </div>

      {/* AI Diagnostic Warning Bento Alert */}
      {urgentVehicles.length > 0 && (
        <div className="bento-card bento-alert-card mb-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="bento-alert-icon">
              <i className="fa-solid fa-robot fa-bounce"></i>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#F59E0B' }}>
                AI Maintenance Alert: {urgentVehicles.length} Unit Motor Perlu Perhatian!
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {urgentVehicles.map(v => `${v.vehicleName} (${v.plateNumber})`).join(', ')}
              </div>
            </div>
          </div>
          <Link href="/maintenance" className="btn btn-warning btn-sm">
            Diagnosa AI <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px' }}></i>
          </Link>
        </div>
      )}

      {/* ── BENTO GRID LAYOUT ── */}
      <div className="bento-grid-container mb-6">
        {/* 1. Hero Bento Card: Financial Summary (Large Span) */}
        <div className="bento-card bento-hero-card">
          <div className="bento-card-bg-glow"></div>
          <div className="bento-hero-content">
            <div className="bento-hero-badge">
              <i className="fa-solid fa-sparkles"></i> Financial Intelligence
            </div>
            <div className="bento-hero-label">Laba Bersih (Net Profit)</div>
            <div className="bento-hero-value" style={{ color: netProfit >= 0 ? '#22C55E' : '#EF4444' }}>
              {formatRupiah(netProfit)}
            </div>
            <div className="bento-hero-stats">
              <div className="bento-stat-sub">
                <span className="sub-label"><i className="fa-solid fa-arrow-down-left" style={{ color: '#22C55E' }}></i> Pemasukan</span>
                <span className="sub-val" style={{ color: '#22C55E' }}>{formatRupiah(totalRevenue)}</span>
              </div>
              <div className="bento-stat-divider"></div>
              <div className="bento-stat-sub">
                <span className="sub-label"><i className="fa-solid fa-arrow-up-right" style={{ color: '#EF4444' }}></i> Pengeluaran</span>
                <span className="sub-val" style={{ color: '#EF4444' }}>{formatRupiah(totalExpenses)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Deposit Overview Bento Card */}
        <div className="bento-card bento-deposit-card">
          <div className="bento-card-title">
            <i className="fa-solid fa-vault" style={{ color: '#FAA307' }}></i>
            <span>Deposit Jaminan</span>
          </div>
          <div className="bento-deposit-list">
            <div className="deposit-item">
              <span className="dep-label">Ditahan (Aktif)</span>
              <span className="dep-val" style={{ color: '#FAA307' }}>{formatRupiah(totalDepositHeld)}</span>
            </div>
            <div className="deposit-item">
              <span className="dep-label">Dipotong Denda</span>
              <span className="dep-val" style={{ color: '#EF4444' }}>{formatRupiah(totalDepositDamage)}</span>
            </div>
            <div className="deposit-item">
              <span className="dep-label">Dikembalikan</span>
              <span className="dep-val" style={{ color: '#22C55E' }}>{formatRupiah(totalDepositReturned)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Metrics Stat Bento Cards */}
      <StatCards transactions={safeTx} vehicles={safeVehicles} />

      {/* 4. Analytics Bento Grid (Charts) */}
      <DashboardCharts transactions={safeTx} vehicles={safeVehicles} />

      {/* 5. Recent Transactions Table Bento Card */}
      <div className="bento-card bento-table-card">
        <div className="card-header mb-4">
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-receipt" style={{ color: 'var(--brand-primary)' }}></i>
              Transaksi Terbaru
            </div>
            <div className="card-subtitle">5 riwayat transaksi sewa motor terkini</div>
          </div>
          <Link href="/transactions" className="btn btn-secondary btn-sm">
            Lihat Semua <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px' }}></i>
          </Link>
        </div>

        {recentTx.length === 0 ? (
          <div className="table-empty" style={{ padding: '40px 16px' }}>
            <div className="table-empty-icon"><i className="fa-solid fa-receipt"></i></div>
            <p>Belum ada transaksi terdaftar. <Link href="/transactions">Catat transaksi pertama</Link></p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Penyewa</th>
                  <th>Motor</th>
                  <th>Tgl Mulai</th>
                  <th>Tgl Selesai</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <strong style={{ color: 'var(--text-primary)' }}>{tx.renter_name}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.renter_phone}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{tx.vehicles?.name || '-'}</span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.vehicles?.plate_number}</div>
                    </td>
                    <td>{new Date(tx.start_date).toLocaleDateString('id-ID')}</td>
                    <td>{new Date(tx.end_date).toLocaleDateString('id-ID')}</td>
                    <td><strong style={{ color: 'var(--brand-primary-light)' }}>{formatRupiah(tx.total_price)}</strong></td>
                    <td>{statusBadge(tx.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
