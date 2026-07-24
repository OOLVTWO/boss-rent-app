'use client';

import { useState, useEffect, useCallback } from 'react';
import { exportTransactionsToExcel, exportExpensesToExcel, exportInvestorReportToExcel, formatRupiah } from '@/lib/excel';

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

export default function ReportsPage() {
  const [activeReportTab, setActiveReportTab] = useState('income'); // 'income' | 'expenses' | 'profit_loss' | 'investor'
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedInvestor, setSelectedInvestor] = useState('all');
  const [investorSearch, setInvestorSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const txParams = new URLSearchParams({ start_date: startDate, end_date: endDate });
    if (statusFilter !== 'all') txParams.append('status', statusFilter);

    const expParams = new URLSearchParams({ start_date: startDate, end_date: endDate });

    try {
      const [txRes, expRes, vehRes] = await Promise.all([
        fetch(`/api/transactions?${txParams}`),
        fetch(`/api/expenses?${expParams}`),
        fetch('/api/vehicles')
      ]);

      const txData = await txRes.json();
      const expData = await expRes.json();
      const vehData = await vehRes.json();

      setTransactions(Array.isArray(txData) ? txData : []);
      setExpenses(Array.isArray(expData) ? expData : []);
      setVehicles(Array.isArray(vehData) ? vehData : []);
    } catch (err) {
      console.error('Fetch report error:', err);
      setTransactions([]);
      setExpenses([]);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, statusFilter]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // Safe Array Defensive Checks
  const safeTx = Array.isArray(transactions) ? transactions : [];
  const safeExp = Array.isArray(expenses) ? expenses : [];

  const checkIsInc = (e) => {
    if (!e) return false;
    if (e.type === 'income') return true;
    if (typeof e.category === 'string' && (e.category.startsWith('income_') || e.category.includes('income'))) return true;
    return false;
  };

  const realExpenses = safeExp.filter(e => !checkIsInc(e));
  const financialIncomes = safeExp.filter(e => checkIsInc(e));

  const completedTx = safeTx.filter(t => t.status === 'completed');
  const rentalRevenue = completedTx.reduce((s, t) => s + Number(t.total_price || 0), 0);
  const depositClaimIncome = completedTx.reduce((s, t) => s + Number(t.damage_fee || 0), 0);
  const addOnRevenue = financialIncomes.reduce((s, e) => s + Number(e.amount || 0), 0);

  const totalRevenue = rentalRevenue + depositClaimIncome + addOnRevenue;
  const totalExpenses = realExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  // ── INVESTOR REPORT ENGINE ──
  const safeVeh = Array.isArray(vehicles) ? vehicles : [];
  const allInvestorVehicles = safeVeh.filter(v => v.owner_type === 'investor' || (v.owner_name && v.owner_name.trim() !== ''));
  const uniqueInvestorNames = Array.from(new Set(allInvestorVehicles.map(v => v.owner_name?.trim()).filter(Boolean)));

  const targetInvestorVehicles = selectedInvestor === 'all'
    ? allInvestorVehicles
    : allInvestorVehicles.filter(v => v.owner_name?.trim() === selectedInvestor);

  const targetVehicleIds = targetInvestorVehicles.map(v => v.id);

  // Transactions for investor vehicles
  const targetInvestorTx = safeTx.filter(t => targetVehicleIds.includes(t.vehicle_id) || targetVehicleIds.includes(t.vehicles?.id));
  const targetCompletedTx = targetInvestorTx.filter(t => t.status === 'completed');

  const invRentalRev = targetCompletedTx.reduce((s, t) => s + Number(t.total_price || 0), 0);
  const invDamageRev = targetCompletedTx.reduce((s, t) => s + Number(t.damage_fee || 0), 0);
  const invTotalRevenue = invRentalRev + invDamageRev;

  // Expenses for investor vehicles
  const targetInvestorExp = realExpenses.filter(e => targetVehicleIds.includes(e.vehicle_id) || (e.title && targetInvestorVehicles.some(v => e.title.toLowerCase().includes(v.name.toLowerCase()) || (v.plate_number && e.title.toLowerCase().includes(v.plate_number.toLowerCase())))));
  const invTotalExpenses = targetInvestorExp.reduce((s, e) => s + Number(e.amount || 0), 0);
  const invNetIncome = invTotalRevenue - invTotalExpenses;

  // Share split calculation
  const avgSharePct = targetInvestorVehicles.length > 0
    ? (targetInvestorVehicles.reduce((s, v) => s + Number(v.revenue_share_percentage || 70), 0) / targetInvestorVehicles.length)
    : 70;
  const investorSharePct = selectedInvestor !== 'all' && targetInvestorVehicles[0]?.revenue_share_percentage
    ? Number(targetInvestorVehicles[0].revenue_share_percentage)
    : Math.round(avgSharePct);
  const bossRentSharePct = 100 - investorSharePct;

  const investorPayout = Math.round(invNetIncome * (investorSharePct / 100));
  const bossRentShare = invNetIncome - investorPayout;

  const handleExportInvestorExcel = () => {
    setExporting(true);
    const invName = selectedInvestor === 'all' ? 'Gabungan-Seluruh-Investor' : selectedInvestor;
    const contact = selectedInvestor !== 'all' && targetInvestorVehicles[0]?.owner_contact ? targetInvestorVehicles[0].owner_contact : '-';

    exportInvestorReportToExcel({
      investorName: invName,
      contact,
      sharePct: investorSharePct,
      vehicles: targetInvestorVehicles,
      transactions: targetInvestorTx,
      expenses: targetInvestorExp,
      totalRevenue: invTotalRevenue,
      totalExpenses: invTotalExpenses,
      netIncome: invNetIncome,
      investorPayout: investorPayout,
      bossRentShare: bossRentShare
    }, `laporan-bagi-hasil-investor-${invName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
    setTimeout(() => setExporting(false), 1000);
  };

  const handleExport = () => {
    setExporting(true);
    const dateRange = `${startDate}-sd-${endDate}`;
    if (activeReportTab === 'expenses') {
      exportExpensesToExcel(realExpenses, `laporan-pengeluaran-${dateRange}`);
    } else if (activeReportTab === 'investor') {
      handleExportInvestorExcel();
    } else {
      exportTransactionsToExcel(safeTx, `laporan-pemasukan-${dateRange}`);
    }
    setTimeout(() => setExporting(false), 1000);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2><i className="fa-solid fa-chart-line" style={{ marginRight: '8px' }}></i> Laporan Keuangan & Laba Rugi</h2>
        <p>Analisis terpisah antara Pemasukan, Pengeluaran, Laba Bersih & Bagi Hasil Investor</p>
      </div>

      {/* Scrollable Tabs Chips / Pills Bar */}
      <div className="scrollable-tabs-bar">
        <button
          type="button"
          className={`scrollable-tab-btn ${activeReportTab === 'income' ? 'active' : ''}`}
          onClick={() => setActiveReportTab('income')}
        >
          <i className="fa-solid fa-sack-dollar"></i> Laporan Pemasukan (Sewa)
        </button>
        <button
          type="button"
          className={`scrollable-tab-btn ${activeReportTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveReportTab('expenses')}
        >
          <i className="fa-solid fa-money-bill-transfer"></i> Laporan Pengeluaran Operasional
        </button>
        <button
          type="button"
          className={`scrollable-tab-btn ${activeReportTab === 'profit_loss' ? 'active' : ''}`}
          onClick={() => setActiveReportTab('profit_loss')}
        >
          <i className="fa-solid fa-calculator"></i> Ringkasan Laba Rugi
        </button>
        <button
          type="button"
          className={`scrollable-tab-btn ${activeReportTab === 'investor' ? 'active' : ''}`}
          onClick={() => setActiveReportTab('investor')}
        >
          <i className="fa-solid fa-crown" style={{ color: '#A855F7' }}></i> 📊 Laporan Bagi Hasil Investor
        </button>
      </div>

      {/* Filter */}
      <div className="card mb-6">
        <div className="card-header">
          <div className="card-title"><i className="fa-solid fa-filter" style={{ marginRight: '6px' }}></i> Filter Periode</div>
        </div>
        <div className="form-row cols-3">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="report-start">
              <i className="fa-solid fa-calendar-days" style={{ marginRight: '6px' }}></i> Tanggal Mulai
            </label>
            <input
              id="report-start"
              type="date"
              className="form-control"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="report-end">
              <i className="fa-solid fa-calendar-days" style={{ marginRight: '6px' }}></i> Tanggal Selesai
            </label>
            <input
              id="report-end"
              type="date"
              className="form-control"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              min={startDate}
            />
          </div>
          {activeReportTab === 'income' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="report-status">Status Transaksi</label>
              <select
                id="report-status"
                className="form-control"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>
          )}
          {activeReportTab === 'investor' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="report-investor">
                <i className="fa-solid fa-crown" style={{ marginRight: '6px', color: '#A855F7' }}></i> Cari & Pilih Investor ({uniqueInvestorNames.length} Terdaftar)
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ minWidth: '160px', flex: '1 1 160px', border: '1px solid #A855F7' }}
                  placeholder="🔍 Ketik nama investor..."
                  value={investorSearch}
                  onChange={e => setInvestorSearch(e.target.value)}
                />
                <select
                  id="report-investor"
                  className="form-control"
                  style={{ flex: '2 1 200px' }}
                  value={selectedInvestor}
                  onChange={e => setSelectedInvestor(e.target.value)}
                >
                  <option value="all">Semua Investor (Gabungan)</option>
                  {uniqueInvestorNames
                    .filter(name => !investorSearch || name.toLowerCase().includes(investorSearch.toLowerCase()))
                    .map((name, i) => (
                      <option key={i} value={name}>{name}</option>
                    ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI */}
      <div className="grid-3 mb-6">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' }}>
            <i className="fa-solid fa-sack-dollar"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Pemasukan</div>
            <div className="stat-value" style={{ color: '#22C55E' }}>{formatRupiah(totalRevenue)}</div>
            <div className="stat-change">{completedTx.length} transaksi selesai</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
            <i className="fa-solid fa-money-bill-transfer"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Pengeluaran</div>
            <div className="stat-value" style={{ color: '#EF4444' }}>{formatRupiah(totalExpenses)}</div>
            <div className="stat-change">{safeExp.length} item pengeluaran</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
            <i className="fa-solid fa-chart-pie"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Laba Bersih (Net Profit)</div>
            <div className="stat-value" style={{ color: netProfit >= 0 ? '#3B82F6' : '#EF4444' }}>{formatRupiah(netProfit)}</div>
            <div className="stat-change">Pemasukan - Pengeluaran</div>
          </div>
        </div>
      </div>

      {/* TAB CONTENT: INCOME */}
      {activeReportTab === 'income' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)' }}>
            <div>
              <div className="card-title">Detail Transaksi Pemasukan</div>
              <div className="card-subtitle">{safeTx.length} transaksi ditemukan</div>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleExport}
              disabled={exporting || loading || safeTx.length === 0}
            >
              {exporting ? <><i className="fa-solid fa-spinner fa-spin"></i> Mengexport...</> : <><i className="fa-solid fa-file-excel"></i> Download Excel Pemasukan</>}
            </button>
          </div>

          <div className="table-wrapper">
            {loading ? (
              <div className="table-empty"><i className="fa-solid fa-spinner fa-spin"></i> Memuat laporan...</div>
            ) : safeTx.length === 0 ? (
              <div className="table-empty"><p>Tidak ada transaksi untuk periode ini</p></div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tgl Transaksi</th>
                    <th>Penyewa</th>
                    <th>Motor</th>
                    <th>Durasi</th>
                    <th>Tarif Sewa</th>
                    <th>Klaim Denda Kerusakan</th>
                    <th>Total Pemasukan</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {safeTx.map((tx, idx) => {
                    const damageFee = Number(tx.damage_fee || 0);
                    const totalPrice = Number(tx.total_price || 0);
                    const grandTotalIncome = totalPrice + (tx.status === 'completed' ? damageFee : 0);

                    return (
                      <tr key={tx.id}>
                        <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                            <i className="fa-solid fa-calendar-day" style={{ color: 'var(--brand-primary-light)', fontSize: '11px' }}></i>
                            {new Date(tx.created_at || tx.start_date).toLocaleDateString('id-ID')}
                          </div>
                        </td>
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '180px' }}>
                            <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.35 }}>{tx.vehicles?.name || '-'}</strong>
                            {tx.vehicles?.plate_number && (
                              <div>
                                <span className="tx-info-pill" style={{ color: 'var(--brand-primary-light)', borderColor: 'rgba(232, 93, 4, 0.35)', background: 'rgba(232, 93, 4, 0.12)', padding: '4px 10px' }}>
                                  <i className="fa-solid fa-motorcycle" style={{ fontSize: '11px', marginRight: '6px' }}></i>
                                  {tx.vehicles.plate_number}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
                            <div>
                              <span className="tx-info-pill" style={{ color: '#60A5FA', borderColor: 'rgba(59, 130, 246, 0.35)', background: 'rgba(59, 130, 246, 0.15)', padding: '5px 12px', fontWeight: 700, fontSize: '11.5px', borderRadius: '50px' }}>
                                <i className="fa-solid fa-clock" style={{ fontSize: '11px', marginRight: '6px' }}></i>
                                {tx.duration_days} Hari
                              </span>
                            </div>
                            {tx.start_date && tx.end_date && (
                              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                {new Date(tx.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — {new Date(tx.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: 600 }}>{formatRupiah(totalPrice)}</span>
                        </td>
                        <td>
                          {tx.status === 'completed' && damageFee > 0 ? (
                            <span style={{ color: '#22C55E', fontWeight: 700, fontSize: '13px' }}>
                              +{formatRupiah(damageFee)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>-</span>
                          )}
                        </td>
                        <td>
                          <strong style={{ fontSize: '14px', color: '#22C55E' }}>{formatRupiah(grandTotalIncome)}</strong>
                        </td>
                        <td style={{ verticalAlign: 'middle' }}>{statusBadge(tx.status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: EXPENSES */}
      {activeReportTab === 'expenses' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)' }}>
            <div>
              <div className="card-title">Detail Pengeluaran Operasional</div>
              <div className="card-subtitle">{realExpenses.length} item pengeluaran ditemukan</div>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleExport}
              disabled={exporting || loading || realExpenses.length === 0}
            >
              {exporting ? <><i className="fa-solid fa-spinner fa-spin"></i> Mengexport...</> : <><i className="fa-solid fa-file-excel"></i> Download Excel Pengeluaran</>}
            </button>
          </div>

          <div className="table-wrapper">
            {loading ? (
              <div className="table-empty"><i className="fa-solid fa-spinner fa-spin"></i> Memuat pengeluaran...</div>
            ) : realExpenses.length === 0 ? (
              <div className="table-empty"><p>Tidak ada pengeluaran untuk periode ini</p></div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tanggal</th>
                    <th>Keterangan</th>
                    <th>Kategori</th>
                    <th>Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {realExpenses.map((exp, idx) => (
                    <tr key={exp.id}>
                      <td>{idx + 1}</td>
                      <td>{new Date(exp.expense_date).toLocaleDateString('id-ID')}</td>
                      <td><strong>{exp.title}</strong></td>
                      <td><span className="badge badge-muted">{exp.category}</span></td>
                      <td><strong style={{ color: '#EF4444' }}>-{formatRupiah(exp.amount)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: PROFIT LOSS */}
      {activeReportTab === 'profit_loss' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><i className="fa-solid fa-calculator" style={{ marginRight: '6px' }}></i> Laporan Ringkasan Laba Rugi</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px', margin: '20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <span>Total Pemasukan Sewa (Selesai):</span>
              <strong style={{ color: '#22C55E', fontSize: '16px' }}>{formatRupiah(totalRevenue)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <span>Total Pengeluaran Operasional:</span>
              <strong style={{ color: '#EF4444', fontSize: '16px' }}>-{formatRupiah(totalExpenses)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-card-hover)', borderRadius: '10px', border: '2px solid var(--brand-primary)', marginTop: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '16px' }}>Laba Bersih (Net Profit):</span>
              <strong style={{ color: netProfit >= 0 ? '#3B82F6' : '#EF4444', fontSize: '20px' }}>
                {formatRupiah(netProfit)}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: INVESTOR REPORT */}
      {activeReportTab === 'investor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Investor KPI Summary Header Cards */}
          <div className="grid-4 mb-6">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' }}>
                <i className="fa-solid fa-arrow-down-left"></i>
              </div>
              <div className="stat-info">
                <div className="stat-label">Total Omset Motor (+)</div>
                <div className="stat-value" style={{ color: '#22C55E' }}>{formatRupiah(invTotalRevenue)}</div>
                <div className="stat-change">{targetCompletedTx.length} transaksi sewa selesai</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
                <i className="fa-solid fa-wrench"></i>
              </div>
              <div className="stat-info">
                <div className="stat-label">Biaya Servis / Perawatan (-)</div>
                <div className="stat-value" style={{ color: '#EF4444' }}>{formatRupiah(invTotalExpenses)}</div>
                <div className="stat-change">{targetInvestorExp.length} item servis motor</div>
              </div>
            </div>

            <div className="stat-card" style={{ border: '2px solid rgba(168, 85, 247, 0.4)', background: 'rgba(168, 85, 247, 0.06)' }}>
              <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#A855F7' }}>
                <i className="fa-solid fa-crown"></i>
              </div>
              <div className="stat-info">
                <div className="stat-label" style={{ color: '#A855F7', fontWeight: 800 }}>TRANSFER NET INVESTOR ({investorSharePct}%)</div>
                <div className="stat-value" style={{ color: '#A855F7', fontSize: '20px', fontWeight: 900 }}>{formatRupiah(investorPayout)}</div>
                <div className="stat-change" style={{ color: '#A855F7', fontWeight: 600 }}>Hak Bersih Investor ({selectedInvestor === 'all' ? 'Gabungan' : selectedInvestor})</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
                <i className="fa-solid fa-building"></i>
              </div>
              <div className="stat-info">
                <div className="stat-label">Komisi Boss Rent ({bossRentSharePct}%)</div>
                <div className="stat-value" style={{ color: '#3B82F6' }}>{formatRupiah(bossRentShare)}</div>
                <div className="stat-change">Hak Pengelolaan Boss Rent</div>
              </div>
            </div>
          </div>

          {/* Motor Performance Table */}
          <div className="card" style={{ padding: 0 }}>
            <div className="card-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)' }}>
              <div>
                <div className="card-title">Rincian Performa Motor Investor ({selectedInvestor === 'all' ? 'Semua Investor' : selectedInvestor})</div>
                <div className="card-subtitle">{targetInvestorVehicles.length} unit motor titipan ditemukan</div>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleExportInvestorExcel}
                disabled={exporting || loading || targetInvestorVehicles.length === 0}
              >
                {exporting ? <><i className="fa-solid fa-spinner fa-spin"></i> Mengexport...</> : <><i className="fa-solid fa-file-excel"></i> Download Excel Laporan Investor</>}
              </button>
            </div>

            <div className="table-wrapper">
              {targetInvestorVehicles.length === 0 ? (
                <div className="table-empty"><p>Tidak ada motor investor ditemukan untuk filter ini.</p></div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Motor & Plat</th>
                      <th>Investor / Pemilik</th>
                      <th>Kontak WA</th>
                      <th>Bagi Hasil (%)</th>
                      <th>Omset Sewa (+)</th>
                      <th>Biaya Servis (-)</th>
                      <th>Laba Bersih Motor</th>
                      <th>Hak Investor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targetInvestorVehicles.map((v, idx) => {
                      const vTx = safeTx.filter(t => (t.vehicle_id === v.id || t.vehicles?.id === v.id) && t.status === 'completed');
                      const vRev = vTx.reduce((s, t) => s + Number(t.total_price || 0) + Number(t.damage_fee || 0), 0);
                      const vExp = realExpenses.filter(e => e.vehicle_id === v.id || (e.title && (e.title.toLowerCase().includes(v.name.toLowerCase()) || (v.plate_number && e.title.toLowerCase().includes(v.plate_number.toLowerCase()))))).reduce((s, e) => s + Number(e.amount || 0), 0);
                      const vNet = vRev - vExp;
                      const sharePct = Number(v.revenue_share_percentage || 70);
                      const vPayout = Math.round(vNet * (sharePct / 100));

                      return (
                        <tr key={v.id}>
                          <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td>
                            <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{v.name}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--brand-primary-light)', fontWeight: 600 }}>{v.plate_number}</div>
                          </td>
                          <td>
                            <strong style={{ fontSize: '13px', color: '#A855F7' }}>{v.owner_name || 'Bagi Hasil'}</strong>
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{v.owner_contact || '-'}</td>
                          <td>
                            <span className="badge badge-success" style={{ fontSize: '11px' }}>{sharePct}% / {100 - sharePct}%</span>
                          </td>
                          <td><strong style={{ color: '#22C55E' }}>+{formatRupiah(vRev)}</strong></td>
                          <td><strong style={{ color: '#EF4444' }}>-{formatRupiah(vExp)}</strong></td>
                          <td><strong style={{ color: 'var(--text-primary)' }}>{formatRupiah(vNet)}</strong></td>
                          <td><strong style={{ color: '#A855F7', fontSize: '14px' }}>{formatRupiah(vPayout)}</strong></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
