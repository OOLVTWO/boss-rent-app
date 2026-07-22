'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

function formatRupiah(amount) {
  if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(1)}jt`;
  if (amount >= 1000) return `Rp ${(amount / 1000).toFixed(0)}rb`;
  return `Rp ${amount}`;
}

const COLORS = ['#22C55E', '#3B82F6', '#F59E0B'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#1E1E2E',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px',
        padding: '12px 16px',
        fontSize: '13px',
      }}>
        <p style={{ color: '#9898B0', marginBottom: '4px' }}>{label}</p>
        <p style={{ color: '#FAA307', fontWeight: 700 }}>
          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardCharts({ transactions, vehicles }) {
  // Revenue 7 hari terakhir
  const revenueData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });

      const rev = transactions
        .filter(t => t.created_at?.startsWith(dateStr) && t.status !== 'cancelled')
        .reduce((s, t) => s + Number(t.total_price || 0), 0);

      days.push({ label, revenue: rev });
    }
    return days;
  }, [transactions]);

  // Status motor
  const vehicleStatusData = useMemo(() => {
    const available = vehicles.filter(v => v.status === 'available').length;
    const rented = vehicles.filter(v => v.status === 'rented').length;
    const maintenance = vehicles.filter(v => v.status === 'maintenance').length;
    return [
      { name: 'Tersedia', value: available },
      { name: 'Disewa', value: rented },
      { name: 'Perawatan', value: maintenance },
    ].filter(d => d.value > 0);
  }, [vehicles]);

  return (
    <div className="grid-2 gap-6 mb-6" style={{ gridTemplateColumns: '2fr 1fr' }}>
      {/* Revenue Bar Chart */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Pendapatan 7 Hari Terakhir</div>
            <div className="card-subtitle">Performa pendapatan harian</div>
          </div>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#9898B0', fontSize: 12 }}
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
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(232,93,4,0.05)' }} />
              <Bar
                dataKey="revenue"
                fill="url(#barGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
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

      {/* Vehicle Status Pie Chart */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Status Armada</div>
            <div className="card-subtitle">Kondisi seluruh motor</div>
          </div>
        </div>
        <div className="chart-container" style={{ height: '260px' }}>
          {vehicleStatusData.length === 0 ? (
            <div className="table-empty">
              <div className="table-empty-icon"><i className="fa-solid fa-motorcycle"></i></div>
              <p>Belum ada data motor</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vehicleStatusData}
                  cx="50%"
                  cy="45%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {vehicleStatusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke="none"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1E1E2E',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: '#F0F0F5',
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', color: '#9898B0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
