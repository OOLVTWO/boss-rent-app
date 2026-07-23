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
        {/* 1. Hero Bento Card: Financial Intelligence */}
        <div className="bento-card bento-hero-card">
          <div className="bento-hero-top">
            <div className="tx-status-pill active">
              <span className="bento-live-pulse" style={{ margin: 0 }}></span>
              <i className="fa-solid fa-wand-magic-sparkles" style={{ color: 'var(--brand-primary-light)' }}></i>
              AI Financial Intelligence
            </div>
            <div className={`tx-status-pill ${netProfit >= 0 ? 'completed' : 'cancelled'}`}>
              <i className={`fa-solid ${netProfit >= 0 ? 'fa-chart-line' : 'fa-chart-line-down'}`}></i>
              <span>{netProfit >= 0 ? 'Surplus Laba Operasional' : 'Defisit Operasional'}</span>
            </div>
          </div>

          <div className="bento-hero-main" style={{ margin: '18px 0 20px 0' }}>
            <div className="bento-hero-label" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-sack-dollar" style={{ color: 'var(--brand-primary-light)' }}></i> Total Laba Bersih (Net Profit)
            </div>
            <div className="bento-hero-value-wrap" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <span className="bento-hero-value" style={{ fontSize: '36px', fontWeight: 900, color: netProfit >= 0 ? '#22C55E' : '#EF4444', letterSpacing: '-0.5px' }}>
                {formatRupiah(netProfit)}
              </span>
              {totalRevenue > 0 && (
                <span className="tx-status-pill completed">
                  <i className="fa-solid fa-arrow-trend-up"></i> Profit Margin {Math.round((netProfit / totalRevenue) * 100)}%
                </span>
              )}
            </div>
          </div>

          <div className="bento-hero-stats">
            <div className="bento-stat-sub income">
              <div className="sub-head">
                <div className="sub-icon income-icon">
                  <i className="fa-solid fa-arrow-down-left"></i>
                </div>
                <span>Pemasukan Kotor (Sewa)</span>
              </div>
              <div className="sub-val income-val">{formatRupiah(totalRevenue)}</div>
            </div>

            <div className="bento-stat-sub expense">
              <div className="sub-head">
                <div className="sub-icon expense-icon">
                  <i className="fa-solid fa-arrow-up-right"></i>
                </div>
                <span>Pengeluaran Operasional</span>
              </div>
              <div className="sub-val expense-val">{formatRupiah(totalExpenses)}</div>
            </div>
          </div>
        </div>

        {/* 2. Deposit Overview Bento Card (3D Vault Glass Aesthetics) */}
        <div className="bento-card bento-deposit-card">
          <div className="bento-vault-header">
            <div className="bento-vault-badge">
              <i className="fa-solid fa-vault"></i>
            </div>
            <div>
              <div className="bento-card-title">Rekap Deposit Jaminan</div>
              <div className="bento-card-subtitle">Monitoring garansi & denda kerusakan</div>
            </div>
          </div>

          <div className="bento-deposit-grid">
            <div className="bento-deposit-box held">
              <div className="dep-box-top">
                <i className="fa-solid fa-lock-keyhole" style={{ color: '#FAA307' }}></i>
                <span>Deposit Ditahan (Aktif)</span>
              </div>
              <div className="dep-box-val" style={{ color: '#FAA307' }}>{formatRupiah(totalDepositHeld)}</div>
              <div className="dep-box-sub">{activeTx.length} transaksi aktif berjalan</div>
            </div>

            <div className="bento-deposit-box damage">
              <div className="dep-box-top">
                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#EF4444' }}></i>
                <span>Dipotong Denda</span>
              </div>
              <div className="dep-box-val" style={{ color: '#EF4444' }}>{formatRupiah(totalDepositDamage)}</div>
              <div className="dep-box-sub">Klaim ganti rugi fisik</div>
            </div>

            <div className="bento-deposit-box returned">
              <div className="dep-box-top">
                <i className="fa-solid fa-circle-check" style={{ color: '#22C55E' }}></i>
                <span>Deposit Dikembalikan</span>
              </div>
              <div className="dep-box-val" style={{ color: '#22C55E' }}>{formatRupiah(totalDepositReturned)}</div>
              <div className="dep-box-sub">Telah ditransfer ke customer</div>
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
