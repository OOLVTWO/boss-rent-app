'use client';

import { useState, useEffect } from 'react';
import StatCards from '@/components/dashboard/StatCards';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import Link from 'next/link';
import { analyzeVehicleHealth } from '@/lib/aiDiagnostic';

function formatRupiah(amount) {
  const cleanAmount = Math.round(Number(amount || 0));
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cleanAmount);
}

const statusBadge = (status) => {
  const map = {
    active: (
      <span className="tx-status-pill active">
        <i className="fa-solid fa-bolt" style={{ fontSize: '11px' }}></i> Sewa Aktif
      </span>
    ),
    completed: (
      <span className="tx-status-pill completed">
        <i className="fa-solid fa-circle-check" style={{ fontSize: '11px' }}></i> Selesai
      </span>
    ),
    cancelled: (
      <span className="tx-status-pill cancelled">
        <i className="fa-solid fa-circle-xmark" style={{ fontSize: '11px' }}></i> Dibatalkan
      </span>
    ),
  };
  return map[status] || <span className="tx-status-pill">{status}</span>;
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
  const checkIsIncome = (e) => {
    if (!e) return false;
    if (e.type === 'income') return true;
    if (typeof e.category === 'string' && (e.category.startsWith('income_') || e.category.includes('income'))) return true;
    return false;
  };

  const rentalRevenue = safeTx.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.total_price || 0), 0);
  const depositClaimIncome = safeTx.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.damage_fee || 0), 0);
  const financialIncome = safeExpenses.filter(e => checkIsIncome(e)).reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalRevenue = rentalRevenue + depositClaimIncome + financialIncome;
  const totalExpenses = safeExpenses.filter(e => !checkIsIncome(e)).reduce((s, e) => s + Number(e.amount || 0), 0);
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
                <span>Pemasukan Kotor</span>
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
              <div className="bento-card-subtitle">Monitoring garansi & klaim denda kerusakan</div>
            </div>
          </div>

          <div className="bento-deposit-grid">
            <div className="bento-deposit-box held">
              <div className="dep-box-top">
                <i className="fa-solid fa-vault" style={{ color: '#F59E0B' }}></i>
                <span>Deposit Ditahan (Aktif)</span>
              </div>
              <div className="dep-box-val" style={{ color: '#F59E0B' }}>{formatRupiah(totalDepositHeld)}</div>
              <div className="dep-box-sub">
                <span style={{ color: '#F59E0B', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fa-solid fa-clock-rotate-left"></i> {activeTx.length} Transaksi Aktif Berjalan
                </span>
              </div>
            </div>

            <div className="bento-deposit-box damage">
              <div className="dep-box-top">
                <i className="fa-solid fa-shield-halved" style={{ color: '#A855F7' }}></i>
                <span>Klaim Denda Ganti Rugi</span>
              </div>
              <div className="dep-box-val" style={{ color: '#A855F7' }}>+{formatRupiah(totalDepositDamage)}</div>
              <div className="dep-box-sub">
                <span style={{ color: '#A855F7', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fa-solid fa-circle-plus"></i> Masuk Pemasukan & Laba
                </span>
              </div>
            </div>

            <div className="bento-deposit-box returned">
              <div className="dep-box-top">
                <i className="fa-solid fa-hand-holding-dollar" style={{ color: '#3B82F6' }}></i>
                <span>Deposit Dikembalikan</span>
              </div>
              <div className="dep-box-val" style={{ color: '#3B82F6' }}>{formatRupiah(totalDepositReturned)}</div>
              <div className="dep-box-sub">
                <span style={{ color: '#3B82F6', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fa-solid fa-arrow-rotate-left"></i> Pengembalian Kas ke Customer
                </span>
              </div>
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
          <div className="table-wrapper">
            <table className="table" style={{ minWidth: '650px' }}>
              <thead>
                <tr>
                  <th>Penyewa</th>
                  <th>Motor</th>
                  <th>Tanggal Sewa</th>
                  <th>Total Harga</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{tx.renter_name}</strong>
                        {tx.renter_phone && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            <i className="fa-solid fa-phone" style={{ marginRight: '4px', fontSize: '10px' }}></i>{tx.renter_phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '160px' }}>
                        <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.35 }}>{tx.vehicles?.name || '-'}</strong>
                        {tx.vehicles?.plate_number && (
                          <div>
                            <span className="tx-info-pill" style={{ color: 'var(--brand-primary-light)', borderColor: 'rgba(232, 93, 4, 0.35)', background: 'rgba(232, 93, 4, 0.12)', padding: '3px 8px' }}>
                              <i className="fa-solid fa-motorcycle" style={{ fontSize: '10px', marginRight: '5px' }}></i>
                              {tx.vehicles.plate_number}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                        <div style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          <i className="fa-solid fa-calendar-plus" style={{ marginRight: '5px', fontSize: '11px', color: '#22C55E' }}></i>
                          {new Date(tx.start_date).toLocaleDateString('id-ID')}
                        </div>
                        <div style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          <i className="fa-solid fa-calendar-check" style={{ marginRight: '5px', fontSize: '11px', color: '#3B82F6' }}></i>
                          {new Date(tx.end_date).toLocaleDateString('id-ID')}
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong style={{ fontSize: '14px', color: '#22C55E' }}>{formatRupiah(tx.total_price)}</strong>
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>{statusBadge(tx.status)}</td>
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
