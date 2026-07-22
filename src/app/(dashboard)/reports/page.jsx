'use client';

import { useState, useEffect, useCallback } from 'react';
import { exportTransactionsToExcel, exportExpensesToExcel, formatRupiah } from '@/lib/excel';

const statusBadge = (status) => {
  const map = {
    active: <span className="badge badge-info"><i className="fa-solid fa-spinner" style={{ marginRight: '4px' }}></i> Aktif</span>,
    completed: <span className="badge badge-success"><i className="fa-solid fa-circle-check" style={{ marginRight: '4px' }}></i> Selesai</span>,
    cancelled: <span className="badge badge-danger"><i className="fa-solid fa-circle-xmark" style={{ marginRight: '4px' }}></i> Dibatalkan</span>,
  };
  return map[status] || status;
};

export default function ReportsPage() {
  const [activeReportTab, setActiveReportTab] = useState('income'); // 'income' | 'expenses' | 'profit_loss'
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
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
      const [txRes, expRes] = await Promise.all([
        fetch(`/api/transactions?${txParams}`),
        fetch(`/api/expenses?${expParams}`)
      ]);

      const txData = await txRes.json();
      const expData = await expRes.json();

      setTransactions(Array.isArray(txData) ? txData : []);
      setExpenses(Array.isArray(expData) ? expData : []);
    } catch (err) {
      console.error('Fetch report error:', err);
      setTransactions([]);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, statusFilter]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // Safe Array Defensive Checks
  const safeTx = Array.isArray(transactions) ? transactions : [];
  const safeExp = Array.isArray(expenses) ? expenses : [];

  const completedTx = safeTx.filter(t => t.status === 'completed');
  const totalRevenue = completedTx.reduce((s, t) => s + Number(t.total_price || 0), 0);
  const totalExpenses = safeExp.reduce((s, e) => s + Number(e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  const handleExport = () => {
    setExporting(true);
    const dateRange = `${startDate}-sd-${endDate}`;
    if (activeReportTab === 'expenses') {
      exportExpensesToExcel(safeExp, `laporan-pengeluaran-${dateRange}`);
    } else {
      exportTransactionsToExcel(safeTx, `laporan-pemasukan-${dateRange}`);
    }
    setTimeout(() => setExporting(false), 1000);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2><i className="fa-solid fa-chart-line" style={{ marginRight: '8px' }}></i> Laporan Keuangan & Laba Rugi</h2>
        <p>Analisis terpisah antara Pemasukan, Pengeluaran, dan Laba Bersih Boss Rent</p>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-4 mb-6" style={{ borderBottom: '1px solid var(--bg-border)', paddingBottom: '12px' }}>
        <button
          className={`btn ${activeReportTab === 'income' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveReportTab('income')}
        >
          <i className="fa-solid fa-sack-dollar" style={{ marginRight: '6px' }}></i> Laporan Pemasukan (Sewa)
        </button>
        <button
          className={`btn ${activeReportTab === 'expenses' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveReportTab('expenses')}
        >
          <i className="fa-solid fa-money-bill-transfer" style={{ marginRight: '6px' }}></i> Laporan Pengeluaran Operasional
        </button>
        <button
          className={`btn ${activeReportTab === 'profit_loss' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveReportTab('profit_loss')}
        >
          <i className="fa-solid fa-calculator" style={{ marginRight: '6px' }}></i> Ringkasan Laba Rugi
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
                    <th>Total Harga</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {safeTx.map((tx, idx) => (
                    <tr key={tx.id}>
                      <td>{idx + 1}</td>
                      <td>{new Date(tx.created_at).toLocaleDateString('id-ID')}</td>
                      <td><strong>{tx.renter_name}</strong></td>
                      <td>{tx.vehicles?.name} ({tx.vehicles?.plate_number})</td>
                      <td>{tx.duration_days} hari</td>
                      <td><strong style={{ color: '#22C55E' }}>{formatRupiah(tx.total_price)}</strong></td>
                      <td>{statusBadge(tx.status)}</td>
                    </tr>
                  ))}
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
              <div className="card-subtitle">{safeExp.length} item pengeluaran ditemukan</div>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleExport}
              disabled={exporting || loading || safeExp.length === 0}
            >
              {exporting ? <><i className="fa-solid fa-spinner fa-spin"></i> Mengexport...</> : <><i className="fa-solid fa-file-excel"></i> Download Excel Pengeluaran</>}
            </button>
          </div>

          <div className="table-wrapper">
            {loading ? (
              <div className="table-empty"><i className="fa-solid fa-spinner fa-spin"></i> Memuat pengeluaran...</div>
            ) : safeExp.length === 0 ? (
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
                  {safeExp.map((exp, idx) => (
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
    </div>
  );
}
