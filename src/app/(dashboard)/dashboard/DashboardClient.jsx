'use client';

import { useState, useEffect, useMemo } from 'react';
import StatCards from '@/components/dashboard/StatCards';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { analyzeVehicleHealth } from '@/lib/aiDiagnostic';
import { calcFinancialSummary, formatRupiah, getLocalMonthStr, toLocalDateStr } from '@/lib/finance';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const statusBadge = (status, paymentStatus) => {
  if (status === 'active' && paymentStatus === 'unpaid') {
    return (
      <span className="tx-status-pill" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', borderColor: 'rgba(245,158,11,0.4)' }}>
        <i className="fa-solid fa-clock" style={{ fontSize: '11px' }}></i> Belum Bayar
      </span>
    );
  }
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
  const [periodMode, setPeriodMode] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(getLocalMonthStr());
  const [selectedYear, setSelectedYear] = useState(getLocalMonthStr().substring(0, 4));
  const [viewPhotoUrl, setViewPhotoUrl] = useState(null);

  useEffect(() => {
    (async () => {
      let list = null;
      try {
        const res = await fetch('/api/expenses');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) list = data;
        } else {
          console.warn('API /api/expenses HTTP ' + res.status + ' — fallback ke Supabase langsung.');
        }
      } catch (err) {
        console.error('Fetch expenses via API error:', err);
      }
      if (list === null) {
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .order('expense_date', { ascending: false });
          if (!error) list = data || [];
        } catch (err) {
          console.error('Fetch expenses via Supabase error:', err);
        }
      }
      setExpenses(list || []);
    })();
  }, []);

  const safeTx = Array.isArray(transactions) ? transactions : [];
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  const periodRange = useMemo(() => {
    const currentYear = getLocalMonthStr().substring(0, 4);
    if (periodMode === 'year') {
      return {
        start: `${selectedYear}-01-01`,
        end: `${selectedYear}-12-31`,
        label: `Tahun ${selectedYear}`,
        isCurrent: selectedYear === currentYear,
      };
    }
    const [y, m] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return {
      start: `${selectedMonth}-01`,
      end: `${selectedMonth}-${String(lastDay).padStart(2, '0')}`,
      label: `${MONTH_NAMES[m - 1]} ${y}`,
      isCurrent: selectedMonth === getLocalMonthStr(),
    };
  }, [periodMode, selectedMonth, selectedYear]);

  const filteredTx = safeTx.filter(t => {
    const d = toLocalDateStr(t.created_at);
    return d >= periodRange.start && d <= periodRange.end;
  });

  const filteredExpenses = safeExpenses.filter(e => {
    const d = e.expense_date || toLocalDateStr(e.created_at);
    return d >= periodRange.start && d <= periodRange.end;
  });

  const yearOptions = useMemo(() => {
    const arr = Array.isArray(transactions) ? transactions : [];
    const years = new Set([Number(getLocalMonthStr().substring(0, 4))]);
    arr.forEach(t => {
      const y = Number(toLocalDateStr(t.created_at).substring(0, 4));
      if (y) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  const handleResetPeriod = () => {
    setSelectedMonth(getLocalMonthStr());
    setSelectedYear(getLocalMonthStr().substring(0, 4));
  };

  const recentTx = filteredTx.slice(0, 5);

  // AI Diagnostic — pakai SELURUH riwayat, bukan hanya periode terpilih
  const diagnostics = safeVehicles.map(v => analyzeVehicleHealth(v, safeTx));
  const urgentVehicles = diagnostics.filter(d => d.healthScore < 60 || d.recentIssues.length > 0);

  // ── Financial summary (shared engine — konsisten dgn halaman Laporan) ──
  const summary = calcFinancialSummary({
    transactions: filteredTx,
    expenses: filteredExpenses,
    vehicles: safeVehicles,
  });
  const totalRevenue   = summary.totalRevenue;
  const totalExpenses  = summary.totalExpenses;
  const investorDeduction = summary.investorPayout;
  const netProfit      = summary.netProfit;

  // Apakah ada motor investor? (untuk kondisi tampil/sembunyi kartu investor)
  const hasInvestor = safeVehicles.some(v =>
    v.owner_type === 'investor' || v.ownership_type === 'investor'
  );

  // Deposit
  const activeTx = safeTx.filter(t => t.status === 'active');
  const completedTx = filteredTx.filter(t => t.status === 'completed');
  const totalDepositHeld     = activeTx.reduce((s, t) => s + Number(t.deposit || 0), 0);
  const totalDepositDamage   = completedTx.reduce((s, t) => s + Number(t.damage_fee || 0), 0);
  const totalDepositReturned = completedTx.reduce((s, t) => {
    const dep = Number(t.deposit || 0);
    const dmg = Number(t.damage_fee || 0);
    return s + Math.max(0, dep - dmg);
  }, 0);

  // Piutang
  const unpaidTx    = safeTx.filter(t => t.status === 'active' && t.payment_status === 'unpaid');
  const totalUnpaid = unpaidTx.reduce((s, t) => s + Number(t.total_price || 0), 0);

  return (
    <div className="bento-dashboard-wrapper fade-in">

      {/* ── Header ── */}
      <div className="page-header mb-6">
        <h2>
          <i className="fa-solid fa-border-all" style={{ marginRight: '8px', color: 'var(--brand-primary)' }}></i>
          Dashboard Bento Analytics
        </h2>
        <p>Ringkasan performa finansial, status armada, dan ketersediaan sewa motor Boss Rent Pererenan — {periodRange.label}</p>
      </div>

      {/* ── 1. Filter Periode — v4 style ── */}
      <div className="period-bar-v4">
        {/* Pill tabs: Bulanan / Tahunan */}
        <div className="period-tabs-v4">
          <button
            type="button"
            className={`ptab-v4 ${periodMode === 'month' ? 'on' : ''}`}
            onClick={() => setPeriodMode('month')}
          >
            Bulanan
          </button>
          <button
            type="button"
            className={`ptab-v4 ${periodMode === 'year' ? 'on' : ''}`}
            onClick={() => setPeriodMode('year')}
          >
            Tahunan
          </button>
        </div>

        {/* Select bulan (hanya tampil di mode bulanan) */}
        {periodMode === 'month' && (
          <select
            className="period-select-v4"
            value={selectedMonth.substring(5, 7)}
            onChange={e => setSelectedMonth(`${selectedMonth.substring(0, 4)}-${e.target.value}`)}
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i} value={String(i + 1).padStart(2, '0')}>{name}</option>
            ))}
          </select>
        )}

        {/* Select tahun */}
        <select
          className="period-select-v4"
          value={periodMode === 'year' ? selectedYear : selectedMonth.substring(0, 4)}
          onChange={e => {
            if (periodMode === 'year') setSelectedYear(e.target.value);
            else setSelectedMonth(`${e.target.value}-${selectedMonth.substring(5, 7)}`);
          }}
        >
          {yearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>

        {/* Chip periode aktif */}
        <div className="period-chip-v4">
          <i className="fa-solid fa-calendar-check"></i>
          {periodRange.label}
        </div>

        {/* Reset ke periode berjalan */}
        {!periodRange.isCurrent && (
          <button type="button" className="period-reset-v4" onClick={handleResetPeriod}>
            <i className="fa-solid fa-rotate-left"></i> Periode Berjalan
          </button>
        )}
      </div>

      {/* ── 2. AI Diagnostic Alert ── */}
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

      {/* ── 3. StatCards (Motor KPI) ── */}
      <StatCards
        transactions={filteredTx}
        vehicles={safeVehicles}
        periodLabel={periodRange.label}
        isCurrentPeriod={periodRange.isCurrent}
        periodMode={periodMode}
      />

      {/* ── 3b. Finance KPI Cards (Laporan terintegrasi) ── */}
      <div className="mb-6">
        <div className="finance-kpi-section-label">
          <i className="fa-solid fa-chart-line" style={{ color: 'var(--brand-primary)' }}></i>
          Ringkasan Keuangan — {periodRange.label}
        </div>

        {/* Row 1: Pemasukan · Pengeluaran · Laba Bersih */}
        <div className="grid-3 mb-4">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
              <i className="fa-solid fa-sack-dollar"></i>
            </div>
            <div className="stat-info">
              <div className="stat-label">Total Pemasukan</div>
              <div className="stat-value" style={{ color: '#22C55E' }}>{formatRupiah(totalRevenue)}</div>
              <div className="stat-change">
                {filteredTx.filter(t =>
                  t.status === 'completed' ||
                  (t.status === 'active' && t.payment_status === 'paid')
                ).length} transaksi terbayar
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
              <i className="fa-solid fa-money-bill-transfer"></i>
            </div>
            <div className="stat-info">
              <div className="stat-label">Total Pengeluaran</div>
              <div className="stat-value" style={{ color: '#EF4444' }}>{formatRupiah(totalExpenses)}</div>
              <div className="stat-change">{filteredExpenses.length} item pengeluaran</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
              <i className="fa-solid fa-chart-pie"></i>
            </div>
            <div className="stat-info">
              <div className="stat-label">Laba Bersih (Net Profit)</div>
              <div className="stat-value" style={{ color: netProfit >= 0 ? '#3B82F6' : '#EF4444' }}>
                {formatRupiah(netProfit)}
              </div>
              <div className="stat-change">Pemasukan − Pengeluaran − Bagi Hasil</div>
            </div>
          </div>
        </div>

        {/* Row 2: Investor cards — hanya muncul jika ada motor investor */}
        {hasInvestor && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
            <div className="stat-card" style={{ border: '2px solid rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.06)' }}>
              <div className="stat-icon" style={{ background: 'rgba(168,85,247,0.2)', color: '#A855F7' }}>
                <i className="fa-solid fa-crown"></i>
              </div>
              <div className="stat-info">
                <div className="stat-label" style={{ color: '#A855F7', fontWeight: 800 }}>
                  TRANSFER NET INVESTOR (Gabungan)
                </div>
                <div className="stat-value" style={{ color: '#A855F7', fontSize: '20px', fontWeight: 900 }}>
                  {formatRupiah(investorDeduction)}
                </div>
                <div className="stat-change" style={{ color: '#A855F7' }}>Hak Bersih Investor — Semua Motor Titipan</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
                <i className="fa-solid fa-building"></i>
              </div>
              <div className="stat-info">
                <div className="stat-label">Komisi Boss Rent (Gabungan)</div>
                <div className="stat-value" style={{ color: '#3B82F6' }}>
                  {formatRupiah(Math.max(0, totalRevenue - totalExpenses - investorDeduction))}
                </div>
                <div className="stat-change">Hak Pengelolaan Boss Rent</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link href="/reports" style={{ fontSize: '12px', color: 'var(--brand-primary-light)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
            Lihat Laporan Lengkap <i className="fa-solid fa-arrow-right" style={{ fontSize: '10px' }}></i>
          </Link>
        </div>
      </div>

      {/* ── 4. Charts & Armada ── */}
      <DashboardCharts
        transactions={filteredTx}
        vehicles={safeVehicles}
        periodMode={periodMode}
        periodRange={periodRange}
      />

      {/* ── 5. Bento Grid: Deposit + Info cards ── */}
      <div className="bento-grid-container mb-6">
        {/* Hero: Financial Intelligence */}
        <div className="bento-card bento-hero-card">
          <div className="bento-hero-top">
            <div className="tx-status-pill active">
              <span className="bento-live-pulse" style={{ margin: 0 }}></span>
              <i className="fa-solid fa-wand-magic-sparkles" style={{ color: 'var(--brand-primary-light)' }}></i>
              AI Financial Intelligence
            </div>
            <div className={`tx-status-pill ${netProfit >= 0 ? 'completed' : 'cancelled'}`}>
              <i className={`fa-solid ${netProfit >= 0 ? 'fa-chart-line' : 'fa-chart-line-down'}`}></i>
              {netProfit >= 0 ? 'Profit Positif' : 'Rugi — Perlu Evaluasi'}
            </div>
          </div>

          <div className="bento-hero-value-block">
            <div className="bento-hero-label">Laba Bersih — {periodRange.label}</div>
            <div className="bento-hero-value" style={{ color: netProfit >= 0 ? 'var(--text-primary)' : '#EF4444' }}>
              {formatRupiah(netProfit)}
            </div>
            <div className="bento-hero-margin">
              {totalRevenue > 0 ? `Margin ${Math.round((netProfit / totalRevenue) * 100)}%` : 'Belum ada pemasukan'}
            </div>
          </div>

          <div className="bento-hero-sub-grid">
            <div className="bento-hero-sub-item">
              <div className="bento-sub-label"><i className="fa-solid fa-arrow-down-left"></i> Total Pemasukan</div>
              <div className="bento-sub-value positive">{formatRupiah(totalRevenue)}</div>
            </div>
            <div className="bento-hero-sub-item">
              <div className="bento-sub-label"><i className="fa-solid fa-arrow-up-right"></i> Total Pengeluaran</div>
              <div className="bento-sub-value negative">{formatRupiah(totalExpenses)}</div>
            </div>
            {hasInvestor && (
              <div className="bento-hero-sub-item">
                <div className="bento-sub-label"><i className="fa-solid fa-crown"></i> Bagi Hasil Investor</div>
                <div className="bento-sub-value" style={{ color: '#A855F7' }}>{formatRupiah(investorDeduction)}</div>
              </div>
            )}
            <div className="bento-hero-sub-item">
              <div className="bento-sub-label"><i className="fa-solid fa-triangle-exclamation"></i> Piutang Belum Bayar</div>
              <div className="bento-sub-value" style={{ color: '#F59E0B' }}>{formatRupiah(totalUnpaid)}</div>
            </div>
          </div>
        </div>

        {/* Deposit Vault */}
        <div className="bento-card">
          <div className="bento-vault-header">
            <div className="bento-vault-icon"><i className="fa-solid fa-vault"></i></div>
            <div>
              <div className="bento-vault-title">Rekap Deposit Jaminan</div>
              <div className="bento-vault-sub">Monitor deposit & klaim denda</div>
            </div>
          </div>

          <div className="bento-deposit-list">
            <div className="bento-deposit-item held">
              <div className="dep-label"><i className="fa-solid fa-lock"></i> Deposit Ditahan</div>
              <div className="dep-amount">{formatRupiah(totalDepositHeld)}</div>
              <div className="dep-count">{activeTx.length} sewa aktif</div>
            </div>
            <div className="bento-deposit-item damage">
              <div className="dep-label"><i className="fa-solid fa-triangle-exclamation"></i> Klaim Kerusakan</div>
              <div className="dep-amount">{formatRupiah(totalDepositDamage)}</div>
              <div className="dep-count">Periode {periodRange.label}</div>
            </div>
            <div className="bento-deposit-item returned">
              <div className="dep-label"><i className="fa-solid fa-rotate-left"></i> Deposit Dikembalikan</div>
              <div className="dep-amount">{formatRupiah(totalDepositReturned)}</div>
              <div className="dep-count">{completedTx.length} transaksi selesai</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. Transaksi Terbaru ── */}
      <div className="bento-card bento-table-card">
        <div className="card-header mb-4">
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-receipt" style={{ color: 'var(--brand-primary)' }}></i>
              Transaksi Terbaru
            </div>
            <div className="card-subtitle">5 transaksi terkini pada periode {periodRange.label}</div>
          </div>
          <Link href="/transactions" className="btn btn-secondary btn-sm">
            Lihat Semua <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px' }}></i>
          </Link>
        </div>

        {recentTx.length === 0 ? (
          <div className="table-empty" style={{ padding: '40px 16px' }}>
            <div className="table-empty-icon"><i className="fa-solid fa-receipt"></i></div>
            <p>Belum ada transaksi pada periode {periodRange.label}. <Link href="/transactions">Catat transaksi baru</Link></p>
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
                            <i className="fa-solid fa-phone" style={{ marginRight: '4px', fontSize: '10px' }}></i>
                            {tx.renter_phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <strong style={{ fontSize: '13px' }}>{tx.vehicles?.name || tx.vehicle_name || '—'}</strong>
                        {(tx.vehicles?.plate_number || tx.plate_number) && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: '4px', width: 'fit-content' }}>
                            {tx.vehicles?.plate_number || tx.plate_number}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span><i className="fa-solid fa-calendar-plus" style={{ marginRight: '4px', color: '#22C55E', fontSize: '10px' }}></i>{tx.start_date}</span>
                        <span><i className="fa-solid fa-calendar-check" style={{ marginRight: '4px', color: '#3B82F6', fontSize: '10px' }}></i>{tx.end_date}</span>
                      </div>
                    </td>
                    <td>
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{formatRupiah(tx.total_price)}</strong>
                    </td>
                    <td>{statusBadge(tx.status, tx.payment_status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Photo Viewer Modal */}
      {viewPhotoUrl && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setViewPhotoUrl(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img src={viewPhotoUrl} alt="Foto" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain' }} />
            <button
              onClick={() => setViewPhotoUrl(null)}
              style={{ position: 'absolute', top: '-12px', right: '-12px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 800, boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}
            >✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
