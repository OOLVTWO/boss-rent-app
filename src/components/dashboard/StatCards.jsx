'use client';

import { useMemo } from 'react';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

export default function StatCards({ transactions, vehicles }) {
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().substring(0, 7);

    const todayTx = transactions.filter(
      (t) => t.created_at?.startsWith(today) && t.status !== 'cancelled'
    );
    const todayRevenue = todayTx.reduce((s, t) => s + Number(t.total_price || 0), 0);

    const monthTx = transactions.filter(
      (t) => t.created_at?.startsWith(thisMonth) && t.status !== 'cancelled'
    );
    const monthRevenue = monthTx.reduce((s, t) => s + Number(t.total_price || 0), 0);

    const activeCount = vehicles.filter((v) => v.status === 'rented').length;
    const availableCount = vehicles.filter((v) => v.status === 'available').length;
    const maintenanceCount = vehicles.filter((v) => v.status === 'maintenance').length;
    const activeTx = transactions.filter((t) => t.status === 'active').length;

    return {
      todayRevenue,
      monthRevenue,
      activeCount,
      availableCount,
      maintenanceCount,
      activeTx,
      totalVehicles: vehicles.length,
    };
  }, [transactions, vehicles]);

  const cards = [
    {
      iconClass: 'fa-solid fa-sack-dollar',
      label: 'Pendapatan Hari Ini',
      value: formatRupiah(stats.todayRevenue),
      iconBg: 'linear-gradient(135deg, rgba(232,93,4,0.2), rgba(250,163,7,0.15))',
      iconColor: '#FAA307',
      change: `Bulan ini: ${formatRupiah(stats.monthRevenue)}`,
    },
    {
      iconClass: 'fa-solid fa-key',
      label: 'Motor Sedang Disewa',
      value: stats.activeCount,
      iconBg: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.1))',
      iconColor: '#3B82F6',
      change: `${stats.activeTx} transaksi aktif`,
    },
    {
      iconClass: 'fa-solid fa-circle-check',
      label: 'Motor Tersedia',
      value: stats.availableCount,
      iconBg: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.1))',
      iconColor: '#22C55E',
      change: `dari ${stats.totalVehicles} total motor`,
    },
    {
      iconClass: 'fa-solid fa-wrench',
      label: 'Dalam Perawatan',
      value: stats.maintenanceCount,
      iconBg: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.1))',
      iconColor: '#F59E0B',
      change: `Motor tidak beroperasi`,
    },
  ];

  return (
    <div className="grid-4 mb-6">
      {cards.map((card, i) => (
        <div key={i} className="stat-card">
          <div
            className="stat-icon"
            style={{ background: card.iconBg, color: card.iconColor }}
          >
            <i className={card.iconClass}></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">{card.label}</div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-change">{card.change}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
