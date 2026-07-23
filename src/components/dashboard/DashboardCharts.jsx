'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
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
        background: '#1E1E2E',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
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
    <div className="dashboard-charts-grid mb-6">
      {/* 1. Bar Chart: Revenue 7 Hari Terakhir */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="card-header" style={{ marginBottom: '16px' }}>
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-chart-simple" style={{ color: 'var(--brand-primary)' }}></i>
              Pendapatan 7 Hari Terakhir
            </div>
            <div className="card-subtitle">Grafik rincian omset harian sewa motor</div>
          </div>
          <div style={{
            background: 'rgba(232, 93, 4, 0.12)',
            border: '1px solid rgba(232, 93, 4, 0.3)',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            color: 'var(--brand-primary-light)',
            fontWeight: 700
          }}>
            Total: {formatRupiah(total7DaysRevenue)}
          </div>
        </div>

        <div style={{ width: '100%', height: '280px', flex: 1, minHeight: '260px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#9898B0', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9898B0', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatRupiah}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(232,93,4,0.06)' }} />
              <Bar
                dataKey="revenue"
                fill="url(#barGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={44}
              />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E85D04" stopOpacity={1} />
                  <stop offset="100%" stopColor="#FAA307" stopOpacity={0.6} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Pie / Breakdown Chart: Status Armada */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="card-header" style={{ marginBottom: '16px' }}>
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-motorcycle" style={{ color: '#3B82F6' }}></i>
              Status Armada Motor
            </div>
            <div className="card-subtitle">Kondisi ketersediaan seluruh unit</div>
          </div>
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--bg-border)',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            fontWeight: 600
          }}>
            Total: {vehicleStats.total} Unit
          </div>
        </div>

        {vehicleStats.total === 0 ? (
          <div className="table-empty" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 16px' }}>
            <div className="table-empty-icon" style={{ fontSize: '36px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              <i className="fa-solid fa-motorcycle"></i>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Belum ada unit motor terdaftar.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
            <div style={{ width: '100%', height: '180px', flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vehicleStats.chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {vehicleStats.chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#1E1E2E',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#F0F0F5',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Status Breakdown Legend Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', borderTop: '1px solid var(--bg-border)', paddingTop: '12px' }}>
              <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#22C55E', fontWeight: 600 }}>Tersedia</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#22C55E', marginTop: '2px' }}>{vehicleStats.available}</div>
              </div>

              <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#3B82F6', fontWeight: 600 }}>Disewa</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#3B82F6', marginTop: '2px' }}>{vehicleStats.rented}</div>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#F59E0B', fontWeight: 600 }}>Bengkel</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#F59E0B', marginTop: '2px' }}>{vehicleStats.maintenance}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
