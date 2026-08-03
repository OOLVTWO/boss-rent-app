'use client';

import { useState, useEffect, useMemo } from 'react';
import StatCards from '@/components/dashboard/StatCards';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import Link from 'next/link';
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

  // ── Filter Periode: dashboard default = BULAN BERJALAN ──
  // Permintaan client: tiap awal bulan dashboard otomatis "mulai dari 0".
  // Data lama TIDAK dihapus — hanya tampilan yang difilter per periode,
  // dan user bisa membaca laporan bulan/tahun lain lewat pemilih periode.
  const [periodMode, setPeriodMode] = useState('month'); // 'month' | 'year'
  const [selectedMonth, setSelectedMonth] = useState(getLocalMonthStr()); // 'YYYY-MM' (lokal/WITA)
  const [selectedYear, setSelectedYear] = useState(getLocalMonthStr().substring(0, 4));

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

  // Rentang tanggal periode terpilih (tanggal lokal YYYY-MM-DD, aman timezone WITA)
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

  // Data yang difilter per periode — inilah dasar "reset bulanan" dashboard
  // serta laporan per bulan / per tahun yang diminta client.
  const filteredTx = safeTx.filter(t => {
    const d = toLocalDateStr(t.created_at);
    return d >= periodRange.start && d <= periodRange.end;
  });
  const filteredExpenses = safeExpenses.filter(e => {
    const d = e.expense_date || toLocalDateStr(e.created_at);
    return d >= periodRange.start && d <= periodRange.end;
  });

  // Opsi tahun = dari tahun transaksi paling awal s/d tahun berjalan
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

  // AI Diagnostic: kesehatan motor = kondisi SAAT INI → pakai SELURUH riwayat (tanpa filter periode)
  const diagnostics = safeVehicles.map(v => analyzeVehicleHealth(v, safeTx));
  const urgentVehicles = diagnostics.filter(d => d.healthScore < 60 || d.recentIssues.length > 0);

  // ── Financial calculations via Shared Finance Engine (@/lib/finance) ──
  // Konsisten dengan halaman Laporan: revenue cash-basis (completed / active+paid),
  // bagi hasil investor basis NET per motor (omset − biaya servis motor investor).
  // Semua angka dihitung dari data PERIODE TERPILIH (default: bulan berjalan).
  const summary = calcFinancialSummary({ transactions: filteredTx, expenses: filteredExpenses, vehicles: safeVehicles });
  const totalRevenue = summary.totalRevenue;
  const totalExpenses = summary.totalExpenses;
  const investorDeduction = summary.investorPayout;
  const netProfit = summary.netProfit;

  // Piutang belum dibayar = kondisi SAAT INI → seluruh transaksi aktif unpaid
  // (sengaja TANPA filter periode agar tunggakan bulan lalu tetap terlihat)
  const unpaidTx = safeTx.filter(t => t.status === 'active' && t.payment_status === 'unpaid');
  const totalUnpaid = unpaidTx.reduce((s, t) => s + Number(t.total_price || 0), 0);

  // Deposit calculations
  // "Ditahan" = uang deposit yang dipegang SAAT INI (semua sewa aktif, tanpa filter periode).
  // "Klaim denda" & "Dikembalikan" = kejadian pada PERIODE TERPILIH.
  const activeTx = safeTx.filter(t => t.status === 'active');
  const completedTx = filteredTx.filter(t => t.status === 'completed');
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
        <p>Ringkasan performa finansial, status armada, dan ketersediaan sewa motor Boss Rent Pererenan — {periodRange.label}</p>
      </div>

      {/* ── Pemilih Periode: baca laporan per bulan / per tahun ── */}
      <div className="card mb-6">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <span className="form-label"><i className="fa-solid fa-filter" style={{ marginRight: '6px' }}></i> Mode Periode</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${periodMode === 'month' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPeriodMode('month')}
                  style={{ borderRadius: '8px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  <i className="fa-solid fa-calendar-day" style={{ marginRight: '4px' }}></i> Bulanan
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${periodMode === 'year' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPeriodMode('year')}
                  style={{ borderRadius: '8px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  <i className="fa-solid fa-calendar" style={{ marginRight: '4px' }}></i> Tahunan
                </button>
              </div>
            </div>

            {periodMode === 'month' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="dash-period-month">
                  <i className="fa-solid fa-calendar-days" style={{ marginRight: '6px' }}></i> Bulan
                </label>
                <select
                  id="dash-period-month"
                  className="form-control"
                  value={selectedMonth.substring(5, 7)}
                  onChange={e => setSelectedMonth(`${selectedMonth.substring(0, 4)}-${e.target.value}`)}
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={name} value={String(i + 1).padStart(2, '0')}>{name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="dash-period-year">
                <i className="fa-solid fa-calendar-days" style={{ marginRight: '6px' }}></i> Tahun
              </label>
              <select
                id="dash-period-year"
                className="form-control"
                value={periodMode === 'year' ? selectedYear : selectedMonth.substring(0, 4)}
                onChange={e => {
                  if (periodMode === 'year') setSelectedYear(e.target.value);
                  else setSelectedMonth(`${e.target.value}-${selectedMonth.substring(5, 7)}`);
                }}
              >
                {yearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>

            {!periodRange.isCurrent && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleResetPeriod}
              >
                <i className="fa-solid fa-rotate-left" style={{ marginRight: '4px' }}></i> Kembali ke Periode Berjalan
              </button>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '4px' }}>
              Periode Ditampilkan
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--brand-primary-light)' }}>
              <i className="fa-solid fa-calendar-check" style={{ marginRight: '6px' }}></i>{periodRange.label}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <i className="fa-solid fa-circle-info" style={{ marginRight: '4px' }}></i>
              Dashboard otomatis mulai dari 0 setiap awal bulan
            </div>
          </div>
        </div>
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
              <span>{netProfit >= 0 ? 'Surplus Laba Bersih' : 'Defisit Operasional'}</span>
            </div>
          </div>

          <div className="bento-hero-main" style={{ margin: '18px 0 12px 0' }}>
            <div className="bento-hero-label" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-sack-dollar" style={{ color: 'var(--brand-primary-light)' }}></i> Laba Bersih Setelah Investor &amp; Pengeluaran
            </div>
            <div className="bento-hero-value-wrap" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <span className="bento-hero-value" style={{ fontSize: '36px', fontWeight: 900, color: netProfit >= 0 ? '#22C55E' : '#EF4444', letterSpacing: '-0.5px' }}>
                {formatRupiah(netProfit)}
              </span>
              {totalRevenue > 0 && (
                <span className="tx-status-pill completed">
                  <i className="fa-solid fa-arrow-trend-up"></i> Margin {Math.round((netProfit / totalRevenue) * 100)}%
                </span>
              )}
            </div>
          </div>

          {/* Unpaid alert */}
          {unpaidTx.length > 0 && (
            <div style={{ margin: '0 0 12px 0', padding: '8px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)', fontSize: '12px', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-clock"></i>
                <span><strong>{unpaidTx.length}</strong> transaksi belum bayar (semua periode)</span>
              </div>
              <strong>{formatRupiah(totalUnpaid)}</strong>
            </div>
          )}

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

            {investorDeduction > 0 && (
              <div className="bento-stat-sub" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '12px', padding: '12px 14px' }}>
                <div className="sub-head">
                  <div className="sub-icon" style={{ background: 'rgba(168,85,247,0.15)', color: '#A855F7' }}>
                    <i className="fa-solid fa-handshake"></i>
                  </div>
                  <span style={{ color: '#A855F7' }}>Bagi Hasil Investor</span>
                </div>
                <div className="sub-val" style={{ color: '#A855F7' }}>-{formatRupiah(investorDeduction)}</div>
              </div>
            )}

            <div className="bento-stat-sub expense">
              <div className="sub-head">
                <div className="sub-icon expense-icon">
                  <i className="fa-solid fa-arrow-up-right"></i>
                </div>
                <span>Pengeluaran Operasional</span>
              </div>
              <div className="sub-val expense-val">-{formatRupiah(totalExpenses)}</div>
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
                  <i className="fa-solid fa-circle-plus"></i> Masuk Pemasukan & Laba periode ini
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
                  <i className="fa-solid fa-arrow-rotate-left"></i> Pengembalian Kas periode ini
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Metrics Stat Bento Cards (per periode terpilih) */}
      <StatCards
        transactions={filteredTx}
        vehicles={safeVehicles}
        periodLabel={periodRange.label}
        isCurrentPeriod={periodRange.isCurrent}
        periodMode={periodMode}
      />

      {/* 4. Analytics Bento Grid (Charts, per periode terpilih) */}
      <DashboardCharts
        transactions={filteredTx}
        vehicles={safeVehicles}
        periodMode={periodMode}
        periodRange={periodRange}
      />

      {/* 5. Recent Transactions Table Bento Card */}
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
                    <td style={{ verticalAlign: 'middle' }}>{statusBadge(tx.status, tx.payment_status)}</td>
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
