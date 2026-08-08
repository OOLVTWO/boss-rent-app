'use client';

import { useState, useEffect, useMemo } from 'react';
import StatCards from '@/components/dashboard/StatCards';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { analyzeVehicleHealth } from '@/lib/aiDiagnostic';
import { calcFinancialSummary, formatRupiah, getLocalMonthStr, toLocalDateStr } from '@/lib/finance';

const MONTH_NAMES = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];

const statusBadge = (status, paymentStatus) => {
  if (status === 'active' && paymentStatus === 'unpaid') return (
    <span className="db-badge db-badge-warn">
      <i className="fa-solid fa-clock"></i> Belum Bayar
    </span>
  );
  const map = {
    active: <span className="db-badge db-badge-blue"><i className="fa-solid fa-bolt"></i> Aktif</span>,
    completed: <span className="db-badge db-badge-green"><i className="fa-solid fa-circle-check"></i> Selesai</span>,
    cancelled: <span className="db-badge db-badge-red"><i className="fa-solid fa-circle-xmark"></i> Batal</span>,
  };
  return map[status] || <span className="db-badge">{status}</span>;
};

export default function DashboardClient({ transactions, vehicles }) {
  const [expenses, setExpenses] = useState([]);
  const [periodMode, setPeriodMode] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(getLocalMonthStr());
  const [selectedYear, setSelectedYear] = useState(getLocalMonthStr().substring(0, 4));

  useEffect(() => {
    (async () => {
      let list = null;
      try {
        const res = await fetch('/api/expenses');
        if (res.ok) { const d = await res.json(); if (Array.isArray(d)) list = d; }
      } catch {}
      if (list === null) {
        try {
          const sb = createClient();
          const { data } = await sb.from('expenses').select('*').order('expense_date', { ascending: false });
          list = data || [];
        } catch {}
      }
      setExpenses(list || []);
    })();
  }, []);

  const safeTx = Array.isArray(transactions) ? transactions : [];
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  const periodRange = useMemo(() => {
    const curYear = getLocalMonthStr().substring(0, 4);
    if (periodMode === 'year') {
      return { start:`${selectedYear}-01-01`, end:`${selectedYear}-12-31`, label:`Tahun ${selectedYear}`, isCurrent: selectedYear === curYear };
    }
    const [y, m] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return {
      start:`${selectedMonth}-01`,
      end:`${selectedMonth}-${String(lastDay).padStart(2,'0')}`,
      label:`${MONTH_NAMES[m-1]} ${y}`,
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
    const years = new Set([Number(getLocalMonthStr().substring(0,4))]);
    safeTx.forEach(t => { const y = Number(toLocalDateStr(t.created_at).substring(0,4)); if (y) years.add(y); });
    return Array.from(years).sort((a,b) => b-a);
  }, [transactions]);

  const recentTx = filteredTx.slice(0, 5);
  const diagnostics = safeVehicles.map(v => analyzeVehicleHealth(v, safeTx));
  const urgentVehicles = diagnostics.filter(d => d.healthScore < 60 || d.recentIssues.length > 0);

  const summary = calcFinancialSummary({ transactions: filteredTx, expenses: filteredExpenses, vehicles: safeVehicles });
  const { totalRevenue, totalExpenses, investorPayout: investorDeduction, netProfit } = summary;

  const hasInvestor = safeVehicles.some(v => v.owner_type === 'investor' || v.ownership_type === 'investor');
  const activeTx = safeTx.filter(t => t.status === 'active');
  const completedTx = filteredTx.filter(t => t.status === 'completed');
  const totalDepositHeld     = activeTx.reduce((s,t) => s + Number(t.deposit||0), 0);
  const totalDepositDamage   = completedTx.reduce((s,t) => s + Number(t.damage_fee||0), 0);
  const totalDepositReturned = completedTx.reduce((s,t) => s + Math.max(0, Number(t.deposit||0) - Number(t.damage_fee||0)), 0);
  const unpaidTx    = safeTx.filter(t => t.status === 'active' && t.payment_status === 'unpaid');
  const totalUnpaid = unpaidTx.reduce((s,t) => s + Number(t.total_price||0), 0);
  const marginPct   = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  const paidCount = filteredTx.filter(t =>
    t.status === 'completed' || (t.status === 'active' && t.payment_status === 'paid')
  ).length;

  return (
    <div className="db-wrap fade-in">

      {/* ── GREETING ROW ── */}
      <div className="db-greeting-row">
        <div>
          <h1 className="db-greeting-title">
            Selamat Datang, <span className="db-greeting-accent">Boss Rent</span>
          </h1>
          <p className="db-greeting-sub">
            {periodRange.label} &mdash; Pererenan, Canggu
          </p>
        </div>

        {/* Period picker inline */}
        <div className="db-period-row">
          <div className="db-period-pills">
            <button className={`db-ppill ${periodMode==='month'?'active':''}`} onClick={()=>setPeriodMode('month')}>Bulanan</button>
            <button className={`db-ppill ${periodMode==='year'?'active':''}`} onClick={()=>setPeriodMode('year')}>Tahunan</button>
          </div>
          {periodMode === 'month' && (
            <select className="db-sel" value={selectedMonth.substring(5,7)} onChange={e=>setSelectedMonth(`${selectedMonth.substring(0,4)}-${e.target.value}`)}>
              {MONTH_NAMES.map((n,i) => <option key={i} value={String(i+1).padStart(2,'0')}>{n}</option>)}
            </select>
          )}
          <select className="db-sel" value={periodMode==='year'?selectedYear:selectedMonth.substring(0,4)} onChange={e=>{
            if (periodMode==='year') setSelectedYear(e.target.value);
            else setSelectedMonth(`${e.target.value}-${selectedMonth.substring(5,7)}`);
          }}>
            {yearOptions.map(y=><option key={y} value={String(y)}>{y}</option>)}
          </select>
          {!periodRange.isCurrent && (
            <button className="db-reset-btn" onClick={()=>{setSelectedMonth(getLocalMonthStr());setSelectedYear(getLocalMonthStr().substring(0,4));}}>
              <i className="fa-solid fa-rotate-left"></i> Reset
            </button>
          )}
        </div>
      </div>

      {/* ── AI ALERT ── */}
      {urgentVehicles.length > 0 && (
        <div className="db-alert-bar">
          <div className="db-alert-icon"><i className="fa-solid fa-robot"></i></div>
          <div className="db-alert-text">
            <strong>AI Diagnostik: {urgentVehicles.length} unit perlu perhatian</strong>
            <span>{urgentVehicles.map(v=>`${v.vehicleName} (${v.plateNumber})`).join(', ')}</span>
          </div>
          <Link href="/maintenance" className="db-alert-btn">
            Periksa <i className="fa-solid fa-arrow-right"></i>
          </Link>
        </div>
      )}

      {/* ── STAT CARDS — Motor KPI ── */}
      <StatCards
        transactions={filteredTx}
        vehicles={safeVehicles}
        periodLabel={periodRange.label}
        isCurrentPeriod={periodRange.isCurrent}
        periodMode={periodMode}
      />

      {/* ── ASYMMETRIC BENTO GRID ── */}
      {/* Layout: [FinanceSummary wide] [Deposit narrow] / [Chart wide] [Fleet narrow] */}
      <div className="db-bento">

        {/* A. Finance Summary — spans 2 col, 1 row */}
        <div className="db-bento-cell db-cell-finance">
          <div className="db-cell-eyebrow">
            <span className="db-live-dot"></span>
            Ringkasan Keuangan
          </div>
          <div className="db-finance-main">
            <div className="db-finance-left">
              <p className="db-finance-label">Laba Bersih {periodRange.label}</p>
              <div className={`db-finance-value ${netProfit < 0 ? 'negative' : ''}`}>
                {formatRupiah(netProfit)}
              </div>
              <div className="db-finance-margin">
                <i className={`fa-solid ${netProfit>=0?'fa-arrow-trend-up':'fa-arrow-trend-down'}`}></i>
                {totalRevenue > 0 ? `Margin ${marginPct}%` : 'Belum ada pemasukan'}
              </div>
            </div>
            <div className="db-finance-right">
              <div className="db-finance-metric">
                <span className="db-fm-label"><i className="fa-solid fa-circle-arrow-down" style={{color:'#15803D'}}></i> Pemasukan</span>
                <span className="db-fm-val income">{formatRupiah(totalRevenue)}</span>
                <span className="db-fm-sub">{paidCount} transaksi terbayar</span>
              </div>
              <div className="db-finance-divider"></div>
              <div className="db-finance-metric">
                <span className="db-fm-label"><i className="fa-solid fa-circle-arrow-up" style={{color:'#B91C1C'}}></i> Pengeluaran</span>
                <span className="db-fm-val expense">{formatRupiah(totalExpenses)}</span>
                <span className="db-fm-sub">{filteredExpenses.length} item</span>
              </div>
              {hasInvestor && <>
                <div className="db-finance-divider"></div>
                <div className="db-finance-metric">
                  <span className="db-fm-label"><i className="fa-solid fa-crown" style={{color:'#7C3AED'}}></i> Bagi Hasil</span>
                  <span className="db-fm-val" style={{color:'#7C3AED'}}>{formatRupiah(investorDeduction)}</span>
                  <span className="db-fm-sub">Investor gabungan</span>
                </div>
              </>}
              <div className="db-finance-divider"></div>
              <div className="db-finance-metric">
                <span className="db-fm-label"><i className="fa-solid fa-clock" style={{color:'#B45309'}}></i> Piutang</span>
                <span className="db-fm-val piutang">{formatRupiah(totalUnpaid)}</span>
                <span className="db-fm-sub">{unpaidTx.length} belum bayar</span>
              </div>
            </div>
          </div>
          <div className="db-finance-footer">
            <Link href="/reports" className="db-finance-link">
              Laporan Lengkap <i className="fa-solid fa-arrow-right"></i>
            </Link>
          </div>
        </div>

        {/* B. Deposit — 1 col, 1 row */}
        <div className="db-bento-cell db-cell-deposit">
          <div className="db-cell-eyebrow">
            <i className="fa-solid fa-vault" style={{color:'var(--brand-primary)'}}></i>
            Deposit Jaminan
          </div>
          <div className="db-deposit-list">
            <div className="db-dep-row held">
              <div className="db-dep-info">
                <span className="db-dep-label"><i className="fa-solid fa-lock"></i> Ditahan</span>
                <span className="db-dep-sub">{activeTx.length} sewa aktif</span>
              </div>
              <span className="db-dep-amt held">{formatRupiah(totalDepositHeld)}</span>
            </div>
            <div className="db-dep-row damage">
              <div className="db-dep-info">
                <span className="db-dep-label"><i className="fa-solid fa-triangle-exclamation"></i> Klaim Denda</span>
                <span className="db-dep-sub">Periode ini</span>
              </div>
              <span className="db-dep-amt damage">{formatRupiah(totalDepositDamage)}</span>
            </div>
            <div className="db-dep-row returned">
              <div className="db-dep-info">
                <span className="db-dep-label"><i className="fa-solid fa-rotate-left"></i> Dikembalikan</span>
                <span className="db-dep-sub">{completedTx.length} selesai</span>
              </div>
              <span className="db-dep-amt returned">{formatRupiah(totalDepositReturned)}</span>
            </div>
          </div>
        </div>

        {/* C. Charts — spans 2 col */}
        <div className="db-bento-cell db-cell-chart">
          <DashboardCharts
            transactions={filteredTx}
            vehicles={safeVehicles}
            periodMode={periodMode}
            periodRange={periodRange}
          />
        </div>

      </div>{/* /db-bento */}

      {/* ── TRANSAKSI TERBARU ── */}
      <div className="db-table-wrap">
        <div className="db-table-head">
          <div>
            <h3 className="db-table-title">Transaksi Terbaru</h3>
            <p className="db-table-sub">5 terkini pada {periodRange.label}</p>
          </div>
          <Link href="/transactions" className="db-table-link">
            Semua transaksi <i className="fa-solid fa-arrow-right"></i>
          </Link>
        </div>

        {recentTx.length === 0 ? (
          <div className="db-empty">
            <i className="fa-solid fa-receipt db-empty-ico"></i>
            <p>Belum ada transaksi pada {periodRange.label}</p>
            <Link href="/transactions" className="db-empty-link">Catat transaksi baru</Link>
          </div>
        ) : (
          <div className="db-table-scroll">
            <table className="db-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Penyewa</th>
                  <th>Motor</th>
                  <th>Periode Sewa</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.map((tx, idx) => (
                  <tr key={tx.id}>
                    <td>
                      <span className="db-row-num">{String(idx+1).padStart(2,'0')}</span>
                    </td>
                    <td>
                      <div className="db-renter">
                        <div className="db-renter-avatar">{(tx.renter_name||'?')[0].toUpperCase()}</div>
                        <div>
                          <div className="db-renter-name">{tx.renter_name}</div>
                          {tx.renter_phone && <div className="db-renter-phone">{tx.renter_phone}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="db-motor-name">{tx.vehicles?.name || tx.vehicle_name || '—'}</div>
                      {(tx.vehicles?.plate_number || tx.plate_number) && (
                        <span className="db-plat">{tx.vehicles?.plate_number || tx.plate_number}</span>
                      )}
                    </td>
                    <td>
                      <div className="db-dates">
                        <span><i className="fa-solid fa-arrow-right-to-bracket"></i> {tx.start_date}</span>
                        <span><i className="fa-solid fa-arrow-right-from-bracket"></i> {tx.end_date}</span>
                      </div>
                    </td>
                    <td>
                      <span className="db-price">{formatRupiah(tx.total_price)}</span>
                    </td>
                    <td>{statusBadge(tx.status, tx.payment_status)}</td>
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
