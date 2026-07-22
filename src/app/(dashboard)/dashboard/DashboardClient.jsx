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
    active: <span className="badge badge-info"><i className="fa-solid fa-spinner" style={{ marginRight: '4px' }}></i> Aktif</span>,
    completed: <span className="badge badge-success"><i className="fa-solid fa-check" style={{ marginRight: '4px' }}></i> Selesai</span>,
    cancelled: <span className="badge badge-danger"><i className="fa-solid fa-xmark" style={{ marginRight: '4px' }}></i> Dibatalkan</span>,
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
    <div className="fade-in">
      <div className="page-header">
        <h2><i className="fa-solid fa-gauge" style={{ marginRight: '8px' }}></i> Dashboard</h2>
        <p>Selamat datang di Boss Rent Pererenan — Admin Panel</p>
      </div>

      {/* AI Diagnostic Warning Banner */}
      {urgentVehicles.length > 0 && (
        <div className="alert alert-warning mb-6" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B', fontSize: '20px' }}>
              <i className="fa-solid fa-robot"></i>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#F59E0B' }}>
                <i className="fa-solid fa-robot" style={{ marginRight: '6px' }}></i> AI Maintenance Alert: {urgentVehicles.length} Motor Membutuhkan Perhatian / Servis!
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {urgentVehicles.map(v => `${v.vehicleName} (${v.plateNumber})`).join(', ')}
              </div>
            </div>
          </div>
          <Link href="/maintenance" className="btn btn-warning btn-sm">
            Cek Diagnosa AI <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px' }}></i>
          </Link>
        </div>
      )}

      {/* Financial Overview */}
      <div className="grid-3 mb-6">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' }}>
            <i className="fa-solid fa-sack-dollar"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Pemasukan (Sewa)</div>
            <div className="stat-value" style={{ color: '#22C55E' }}>{formatRupiah(totalRevenue)}</div>
            <div className="stat-change">Dari transaksi selesai</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
            <i className="fa-solid fa-money-bill-transfer"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Pengeluaran Operasional</div>
            <div className="stat-value" style={{ color: '#EF4444' }}>{formatRupiah(totalExpenses)}</div>
            <div className="stat-change">Servis, BBM, Sparepart</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
            <i className="fa-solid fa-chart-line"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Laba Bersih (Net Profit)</div>
            <div className="stat-value" style={{ color: netProfit >= 0 ? '#3B82F6' : '#EF4444' }}>
              {formatRupiah(netProfit)}
            </div>
            <div className="stat-change">Pemasukan dikurangi pengeluaran</div>
          </div>
        </div>
      </div>

      {/* Deposit Overview */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
          <i className="fa-solid fa-vault" style={{ marginRight: '6px', color: 'var(--brand-primary)' }}></i>
          Rekap Deposit Jaminan
        </div>
      </div>
      <div className="grid-3 mb-6">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(250, 163, 7, 0.15)', color: '#FAA307' }}>
            <i className="fa-solid fa-vault"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Deposit Ditahan (Aktif)</div>
            <div className="stat-value" style={{ color: '#FAA307' }}>{formatRupiah(totalDepositHeld)}</div>
            <div className="stat-change">{activeTx.length} transaksi aktif sedang berjalan</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
            <i className="fa-solid fa-car-burst"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Deposit Dipotong (Denda)</div>
            <div className="stat-value" style={{ color: '#EF4444' }}>{formatRupiah(totalDepositDamage)}</div>
            <div className="stat-change">Total denda kerusakan dari penyewa</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' }}>
            <i className="fa-solid fa-money-bill-wave"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Deposit Dikembalikan</div>
            <div className="stat-value" style={{ color: '#22C55E' }}>{formatRupiah(totalDepositReturned)}</div>
            <div className="stat-change">Total deposit bersih ke penyewa</div>
          </div>
        </div>
      </div>

      <StatCards transactions={safeTx} vehicles={safeVehicles} />
      <DashboardCharts transactions={safeTx} vehicles={safeVehicles} />

      {/* Transaksi Terbaru */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Transaksi Terbaru</div>
            <div className="card-subtitle">5 transaksi terakhir</div>
          </div>
          <Link href="/transactions" className="btn btn-secondary btn-sm">
            Lihat Semua <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px' }}></i>
          </Link>
        </div>

        {recentTx.length === 0 ? (
          <div className="table-empty">
            <div className="table-empty-icon"><i className="fa-solid fa-receipt"></i></div>
            <p>Belum ada transaksi. <Link href="/transactions">Catat transaksi pertama</Link></p>
          </div>
        ) : (
          <div className="table-wrapper">
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
                      <strong>{tx.renter_name}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.renter_phone}</div>
                    </td>
                    <td>
                      <span>{tx.vehicles?.name || '-'}</span>
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
