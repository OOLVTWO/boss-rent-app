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
        {/* 1. Hero Bento Card: Financial Intelligence (Ultra Modern Holographic 3D Glass) */}
        <div className="bento-card bento-hero-card" style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.98))',
          border: '1.5px solid rgba(232, 93, 4, 0.4)',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div className="bento-card-bg-glow" style={{
            position: 'absolute',
            top: '-50%',
            left: '-20%',
            width: '140%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(232, 93, 4, 0.15) 0%, rgba(245, 158, 11, 0.05) 50%, transparent 70%)',
            pointerEvents: 'none'
          }}></div>

          <div className="bento-hero-content" style={{ position: 'relative', zIndex: 2, padding: '24px' }}>
            <div className="bento-hero-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div className="bento-hero-badge" style={{ background: 'rgba(232, 93, 4, 0.15)', border: '1px solid rgba(232, 93, 4, 0.4)', color: '#FF8A00', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span className="bento-live-pulse" style={{ background: '#22C55E', boxShadow: '0 0 10px #22C55E' }}></span>
                <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#F59E0B' }}></i> AI Financial Intelligence
              </div>
              <div className="bento-profit-tag" style={{ background: netProfit >= 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${netProfit >= 0 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`, color: netProfit >= 0 ? '#22C55E' : '#EF4444', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <i className={`fa-solid ${netProfit >= 0 ? 'fa-chart-line' : 'fa-chart-line-down'}`}></i>
                <span>{netProfit >= 0 ? 'Surplus Laba Operasional' : 'Defisit Operasional'}</span>
              </div>
            </div>

            <div className="bento-hero-main" style={{ marginBottom: '22px' }}>
              <div className="bento-hero-label" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-sack-dollar" style={{ color: 'var(--brand-primary-light)' }}></i> Total Laba Bersih (Net Profit)
              </div>
              <div className="bento-hero-value-wrap" style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap' }}>
                <span className="bento-hero-value" style={{ fontSize: '38px', fontWeight: 900, color: netProfit >= 0 ? '#22C55E' : '#EF4444', letterSpacing: '-1px', textShadow: '0 4px 20px rgba(34,197,94,0.3)' }}>
                  {formatRupiah(netProfit)}
                </span>
                {totalRevenue > 0 && (
                  <span className="bento-margin-chip" style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#22C55E', padding: '6px 14px', borderRadius: '20px', fontWeight: 800, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-arrow-trend-up"></i> Profit Margin {Math.round((netProfit / totalRevenue) * 100)}%
                  </span>
                )}
              </div>
            </div>

            <div className="bento-hero-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '14px', border: '1px solid var(--bg-border)' }}>
              <div className="bento-stat-sub income">
                <div className="sub-head" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                  <div className="sub-icon" style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-arrow-down-left"></i>
                  </div>
                  <span>Pemasukan Kotor (Sewa)</span>
                </div>
                <div className="sub-val" style={{ fontSize: '18px', fontWeight: 900, color: '#22C55E' }}>{formatRupiah(totalRevenue)}</div>
              </div>

              <div className="bento-stat-sub expense" style={{ borderLeft: '1px solid var(--bg-border)', paddingLeft: '16px' }}>
                <div className="sub-head" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                  <div className="sub-icon" style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-arrow-up-right"></i>
                  </div>
                  <span>Pengeluaran Operasional</span>
                </div>
                <div className="sub-val" style={{ fontSize: '18px', fontWeight: 900, color: '#EF4444' }}>{formatRupiah(totalExpenses)}</div>
              </div>
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
