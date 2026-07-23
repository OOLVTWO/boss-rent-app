'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

function formatRupiah(amount) {
  if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(1)}jt`;
  if (amount >= 1000) return `Rp ${(amount / 1000).toFixed(0)}rb`;
  return `Rp ${amount || 0}`;
}

function formatFullRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
}

const COLORS = {
  available: '#22C55E',
  rented: '#3B82F6',
  maintenance: '#F59E0B',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#1A1A26',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
      }}>
        <p style={{ color: '#9898B0', marginBottom: '4px', fontWeight: 600 }}>{label}</p>
        <p style={{ color: '#FAA307', fontWeight: 800, fontSize: '14px' }}>
          {formatFullRupiah(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardCharts({ transactions, vehicles }) {
  const safeTx = Array.isArray(transactions) ? transactions : [];
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];

  // Revenue 7 hari terakhir
  const { revenueData, total7DaysRevenue } = useMemo(() => {
    const days = [];
    let sum = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });

      const rev = safeTx
        .filter(t => t.created_at?.startsWith(dateStr) && t.status !== 'cancelled')
        .reduce((s, t) => s + Number(t.total_price || 0), 0);

      sum += rev;
      days.push({ label, revenue: rev });
    }
    return { revenueData: days, total7DaysRevenue: sum };
  }, [safeTx]);

  // Status motor
  const vehicleStats = useMemo(() => {
    const total = safeVehicles.length;
    const available = safeVehicles.filter(v => v.status === 'available').length;
    const rented = safeVehicles.filter(v => v.status === 'rented').length;
    const maintenance = safeVehicles.filter(v => v.status === 'maintenance').length;

    const chartData = [
      { name: 'Tersedia', value: available, color: COLORS.available },
      { name: 'Disewa', value: rented, color: COLORS.rented },
      { name: 'Perawatan', value: maintenance, color: COLORS.maintenance },
    ].filter(d => d.value > 0);

    return { total, available, rented, maintenance, chartData };
  }, [safeVehicles]);

  return (
    <div className="bento-charts-stack mb-6">
      {/* ── ROW 1: FULL-WIDTH BENTO CARD — Pendapatan 7 Hari Terakhir ── */}
      <div className="bento-card bento-chart-full-card mb-6">
        <div className="card-header" style={{ marginBottom: '20px' }}>
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 800 }}>
              <i className="fa-solid fa-chart-simple" style={{ color: 'var(--brand-primary)', fontSize: '18px' }}></i>
              Statistik Pendapatan 7 Hari Terakhir
            </div>
            <div className="card-subtitle">Performa grafik transaksi & omset harian secara real-time</div>
          </div>
          <div className="bento-pill-tag">
            <i className="fa-solid fa-sack-dollar" style={{ marginRight: '6px' }}></i>
            Total 7 Hari: <strong>{formatFullRupiah(total7DaysRevenue)}</strong>
          </div>
        </div>

        <div style={{ width: '100%', height: '290px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#9898B0', fontSize: 12, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9898B0', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatRupiah}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(232,93,4,0.06)' }} />
              <Bar
                dataKey="revenue"
                fill="url(#barGradientFull)"
                radius={[8, 8, 0, 0]}
                maxBarSize={56}
              />
              <defs>
                <linearGradient id="barGradientFull" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E85D04" stopOpacity={1} />
                  <stop offset="100%" stopColor="#FAA307" stopOpacity={0.6} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── ROW 2: FULL-WIDTH BENTO CARD — Status & Distribusi Armada ── */}
      <div className="bento-card bento-chart-full-card">
        <div className="card-header" style={{ marginBottom: '20px' }}>
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 800 }}>
              <i className="fa-solid fa-motorcycle" style={{ color: '#3B82F6', fontSize: '18px' }}></i>
              Status & Distribusi Armada Motor
            </div>
            <div className="card-subtitle">Kondisi ketersediaan seluruh unit kendaraan rental</div>
          </div>
          <div className="bento-pill-tag info">
            <i className="fa-solid fa-cubes" style={{ marginRight: '6px' }}></i>
            Total Armada: <strong>{vehicleStats.total} Unit</strong>
          </div>
        </div>

        {vehicleStats.total === 0 ? (
          <div className="table-empty" style={{ padding: '40px 16px' }}>
            <div className="table-empty-icon" style={{ fontSize: '40px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              <i className="fa-solid fa-motorcycle"></i>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>Belum ada unit motor terdaftar dalam sistem.</p>
          </div>
        ) : (
          <div className="bento-fleet-status-row">
            {/* Pie Chart Visual */}
            <div style={{ width: '220px', height: '200px', flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vehicleStats.chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={6}
                    dataKey="value"
                  >
                    {vehicleStats.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#1A1A26',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#F0F0F5',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Status Breakdown Cards */}
            <div className="bento-fleet-metrics-grid" style={{ flex: 1 }}>
              <div className="bento-metric-pill available">
                <div className="pill-head">
                  <span className="pill-dot"></span>
                  <span>Motor Tersedia</span>
                </div>
                <div className="pill-value">{vehicleStats.available} <span className="pill-unit">Unit</span></div>
                <div className="pill-bar-bg">
                  <div className="pill-bar-fill" style={{ width: `${vehicleStats.total ? (vehicleStats.available / vehicleStats.total) * 100 : 0}%`, background: '#22C55E' }}></div>
                </div>
              </div>

              <div className="bento-metric-pill rented">
                <div className="pill-head">
                  <span className="pill-dot"></span>
                  <span>Sedang Disewa</span>
                </div>
                <div className="pill-value">{vehicleStats.rented} <span className="pill-unit">Unit</span></div>
                <div className="pill-bar-bg">
                  <div className="pill-bar-fill" style={{ width: `${vehicleStats.total ? (vehicleStats.rented / vehicleStats.total) * 100 : 0}%`, background: '#3B82F6' }}></div>
                </div>
              </div>

              <div className="bento-metric-pill maintenance">
                <div className="pill-head">
                  <span className="pill-dot"></span>
                  <span>Perawatan Bengkel</span>
                </div>
                <div className="pill-value">{vehicleStats.maintenance} <span className="pill-unit">Unit</span></div>
                <div className="pill-bar-bg">
                  <div className="pill-bar-fill" style={{ width: `${vehicleStats.total ? (vehicleStats.maintenance / vehicleStats.total) * 100 : 0}%`, background: '#F59E0B' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
