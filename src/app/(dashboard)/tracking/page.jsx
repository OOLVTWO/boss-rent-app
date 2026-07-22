'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getWhatsAppShareUrl, getWaReminderTemplate } from '@/lib/countryCodes';

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getDaysLeft(endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return Math.floor((end - today) / (1000 * 60 * 60 * 24));
}

function getCountdown(endDate) {
  const now = new Date();
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  const diff = end - now;
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

function getBizSettings() {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem('boss_rent_biz_settings');
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

function generateReminderText(tx, vehicle, type) {
  const biz = getBizSettings();
  const shopName = biz.name || 'Boss Rent Pererenan';
  const shopPhone = biz.phone || '+62 812-3456-7890';
  const shopLocation = biz.location || 'Jl. Pantai Pererenan, Canggu, Badung, Bali';
  const daysLeft = getDaysLeft(tx.end_date);
  const overdueAbs = Math.abs(daysLeft);

  const formatEnDate = (dStr) => dStr ? new Date(dStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  const statusText = type === 'overdue'
    ? `⛔ OVERDUE ${overdueAbs} day(s)`
    : type === 'today'
    ? '🔔 Ending TODAY'
    : type === 'tomorrow'
    ? '⏳ 1 day left (ends tomorrow)'
    : `⏳ ${daysLeft} days remaining`;

  const template = getWaReminderTemplate();

  return template
    .replaceAll('{RENTER_NAME}', tx.renter_name || 'Customer')
    .replaceAll('{RENTER_PHONE}', tx.renter_phone || '-')
    .replaceAll('{VEHICLE_NAME}', vehicle?.name || 'Motorbike')
    .replaceAll('{PLATE_NUMBER}', vehicle?.plate_number || '-')
    .replaceAll('{START_DATE}', formatEnDate(tx.start_date))
    .replaceAll('{END_DATE}', formatEnDate(tx.end_date))
    .replaceAll('{TIME_LEFT_STATUS}', statusText)
    .replaceAll('{SHOP_NAME}', shopName)
    .replaceAll('{SHOP_LOCATION}', shopLocation)
    .replaceAll('{SHOP_PHONE}', shopPhone);
}

function classifyTx(tx) {
  const days = getDaysLeft(tx.end_date);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days <= 7) return 'upcoming';
  return 'future';
}

// ─── Countdown Display ─────────────────────────────────────────────────────
function CountdownTimer({ endDate }) {
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    const update = () => setCountdown(getCountdown(endDate));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  const daysLeft = getDaysLeft(endDate);

  if (daysLeft < 0) {
    const overdueDays = Math.abs(daysLeft);
    return (
      <div className="countdown-display overdue">
        <div className="countdown-overdue-badge">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>OVERDUE {overdueDays} HARI</span>
        </div>
      </div>
    );
  }

  if (!countdown) {
    return (
      <div className="countdown-display overdue">
        <div className="countdown-overdue-badge">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>BERAKHIR HARI INI</span>
        </div>
      </div>
    );
  }

  return (
    <div className="countdown-display">
      <div className="countdown-units">
        <div className="countdown-unit">
          <span className="countdown-value">{String(countdown.days).padStart(2, '0')}</span>
          <span className="countdown-label">Hari</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-unit">
          <span className="countdown-value">{String(countdown.hours).padStart(2, '0')}</span>
          <span className="countdown-label">Jam</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-unit">
          <span className="countdown-value">{String(countdown.minutes).padStart(2, '0')}</span>
          <span className="countdown-label">Mnt</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-unit">
          <span className="countdown-value">{String(countdown.seconds).padStart(2, '0')}</span>
          <span className="countdown-label">Dtk</span>
        </div>
      </div>
    </div>
  );
}

// ─── Tracking Card ──────────────────────────────────────────────────────────
function TrackingCard({ tx, vehicle }) {
  const [copied, setCopied] = useState(false);
  const type = classifyTx(tx);
  const daysLeft = getDaysLeft(tx.end_date);

  const categoryMeta = {
    overdue: { label: 'Overdue', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: 'fa-solid fa-circle-exclamation', pulse: true },
    today: { label: 'Hari Ini', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: 'fa-solid fa-bell', pulse: true },
    tomorrow: { label: 'Besok', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', icon: 'fa-solid fa-clock', pulse: false },
    upcoming: { label: `${daysLeft} Hari Lagi`, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', icon: 'fa-solid fa-calendar-days', pulse: false },
    future: { label: `${daysLeft} Hari Lagi`, color: '#22C55E', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', icon: 'fa-solid fa-calendar-check', pulse: false },
  };
  const meta = categoryMeta[type];

  const reminderText = generateReminderText(tx, vehicle, type);
  const waUrl = getWhatsAppShareUrl(tx.renter_phone, reminderText);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reminderText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  // Progress bar for time elapsed
  const startD = new Date(tx.start_date);
  const endD = new Date(tx.end_date);
  const totalMs = endD - startD;
  const elapsedMs = Date.now() - startD;
  const progress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
  const isOverProgress = progress >= 100;

  return (
    <div className="tracking-card" style={{ borderColor: meta.border, background: `linear-gradient(145deg, var(--bg-card), ${meta.bg})` }}>
      {/* Top Badge */}
      <div className="tracking-card-top">
        <div className="tracking-status-badge" style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}>
          <i className={`${meta.icon} ${meta.pulse ? 'fa-beat' : ''}`}></i>
          <span>{meta.label}</span>
        </div>
        <div className="tracking-vehicle-info">
          <i className="fa-solid fa-motorcycle" style={{ color: meta.color }}></i>
          <span>{vehicle?.name || 'Motor'}</span>
          <span className="tracking-plate">{vehicle?.plate_number || '-'}</span>
        </div>
      </div>

      {/* Renter Info */}
      <div className="tracking-renter">
        <div className="tracking-renter-avatar" style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.border})` }}>
          <i className="fa-solid fa-user"></i>
        </div>
        <div className="tracking-renter-info">
          <div className="tracking-renter-name">{tx.renter_name}</div>
          <div className="tracking-renter-phone">
            <i className="fa-solid fa-phone" style={{ fontSize: '10px', color: '#22C55E' }}></i>
            {tx.renter_phone}
          </div>
        </div>
        <div className="tracking-dates">
          <div className="tracking-date-row">
            <i className="fa-solid fa-calendar-plus" style={{ color: '#9898B0', fontSize: '11px' }}></i>
            <span>{formatDate(tx.start_date)}</span>
          </div>
          <div className="tracking-date-arrow">
            <i className="fa-solid fa-arrow-down" style={{ color: '#9898B0', fontSize: '10px' }}></i>
          </div>
          <div className="tracking-date-row" style={{ color: meta.color, fontWeight: 600 }}>
            <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '11px' }}></i>
            <span>{formatDate(tx.end_date)}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="tracking-progress-wrap">
        <div className="tracking-progress-labels">
          <span><i className="fa-solid fa-hourglass-start" style={{ fontSize: '10px', marginRight: '4px' }}></i>Mulai</span>
          <span style={{ color: isOverProgress ? '#EF4444' : meta.color }}>
            {isOverProgress ? 'Sudah Berakhir' : `${Math.round(progress)}% berjalan`}
          </span>
          <span><i className="fa-solid fa-flag-checkered" style={{ fontSize: '10px', marginRight: '4px' }}></i>Selesai</span>
        </div>
        <div className="tracking-progress-bar">
          <div
            className="tracking-progress-fill"
            style={{
              width: `${progress}%`,
              background: isOverProgress
                ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                : `linear-gradient(90deg, ${meta.color}, ${meta.border})`
            }}
          ></div>
        </div>
      </div>

      {/* Countdown */}
      <CountdownTimer endDate={tx.end_date} />

      {/* Action Buttons */}
      <div className="tracking-actions">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="tracking-btn-wa"
        >
          <i className="fa-brands fa-whatsapp"></i>
          <span>Kirim Reminder WA</span>
        </a>
        <button className="tracking-btn-copy" onClick={handleCopy} title="Salin teks pesan">
          <i className={copied ? 'fa-solid fa-check' : 'fa-solid fa-copy'}></i>
          <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
        </button>
      </div>

      {/* Preview message on hover (expandable) */}
      <details className="tracking-msg-preview">
        <summary>
          <i className="fa-solid fa-eye" style={{ marginRight: '6px' }}></i>
          Lihat Preview Pesan WA
        </summary>
        <pre className="tracking-msg-text">{reminderText}</pre>
      </details>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function TrackingPage() {
  const [transactions, setTransactions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [search, setSearch] = useState('');
  const refreshRef = useRef(null);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const [{ data: txData }, { data: vData }] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, vehicles(id, name, plate_number, category, rate_per_day)')
        .eq('status', 'active')
        .order('end_date', { ascending: true }),
      supabase.from('vehicles').select('*'),
    ]);
    setTransactions(txData || []);
    setVehicles(vData || []);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    refreshRef.current = setInterval(loadData, 60000);
    return () => clearInterval(refreshRef.current);
  }, [loadData]);

  // Build vehicle lookup
  const vehicleMap = Object.fromEntries((vehicles || []).map(v => [v.id, v]));

  // Classify & filter
  const enriched = (transactions || []).map(tx => {
    const vehicle = tx.vehicles || vehicleMap[tx.vehicle_id];
    const type = classifyTx(tx);
    const daysLeft = getDaysLeft(tx.end_date);
    return { tx, vehicle, type, daysLeft };
  });

  const filtered = enriched.filter(({ tx, vehicle, type }) => {
    const q = search.toLowerCase();
    const matchSearch = !q || (tx.renter_name || '').toLowerCase().includes(q)
      || (tx.renter_phone || '').toLowerCase().includes(q)
      || (vehicle?.name || '').toLowerCase().includes(q)
      || (vehicle?.plate_number || '').toLowerCase().includes(q);

    const matchFilter = filter === 'all'
      || (filter === 'overdue' && type === 'overdue')
      || (filter === 'critical' && (type === 'today' || type === 'tomorrow'))
      || (filter === 'upcoming' && (type === 'upcoming' || type === 'future'));

    return matchSearch && matchFilter;
  });

  // Stats
  const overdueCnt = enriched.filter(e => e.type === 'overdue').length;
  const criticalCnt = enriched.filter(e => e.type === 'today' || e.type === 'tomorrow').length;
  const upcomingCnt = enriched.filter(e => e.type === 'upcoming').length;

  const FILTERS = [
    { key: 'all', label: 'Semua', icon: 'fa-solid fa-list', count: enriched.length },
    { key: 'overdue', label: 'Overdue', icon: 'fa-solid fa-circle-exclamation', count: overdueCnt, color: '#EF4444' },
    { key: 'critical', label: 'Kritis', icon: 'fa-solid fa-bell', count: criticalCnt, color: '#F59E0B' },
    { key: 'upcoming', label: 'Akan Datang', icon: 'fa-solid fa-calendar-days', count: upcomingCnt, color: '#3B82F6' },
  ];

  return (
    <div className="page-content">
      {/* ── Page Header ── */}
      <div className="tracking-page-header">
        <div className="tracking-header-left">
          <div className="tracking-header-icon">
            <i className="fa-solid fa-clock-rotate-left"></i>
          </div>
          <div>
            <h2>Tracking Sewa Motor</h2>
            <p>Monitor masa sewa aktif & kirim pengingat ke customer via WhatsApp</p>
          </div>
        </div>
        <div className="tracking-header-right">
          <div className="tracking-refresh-info">
            <i className="fa-solid fa-rotate" style={{ fontSize: '11px', color: '#22C55E' }}></i>
            <span>Auto-refresh tiap 60 detik</span>
            <span className="tracking-refresh-time">
              {lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <button className="btn-refresh" onClick={loadData}>
            <i className="fa-solid fa-arrows-rotate"></i> Refresh
          </button>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="tracking-stats-row">
        <div className="tracking-stat overdue-stat">
          <div className="tracking-stat-icon"><i className="fa-solid fa-circle-exclamation fa-beat"></i></div>
          <div>
            <div className="tracking-stat-val">{overdueCnt}</div>
            <div className="tracking-stat-label">Overdue</div>
          </div>
        </div>
        <div className="tracking-stat critical-stat">
          <div className="tracking-stat-icon"><i className="fa-solid fa-bell fa-shake"></i></div>
          <div>
            <div className="tracking-stat-val">{criticalCnt}</div>
            <div className="tracking-stat-label">Kritis (Hari ini/Besok)</div>
          </div>
        </div>
        <div className="tracking-stat upcoming-stat">
          <div className="tracking-stat-icon"><i className="fa-solid fa-calendar-days"></i></div>
          <div>
            <div className="tracking-stat-val">{upcomingCnt}</div>
            <div className="tracking-stat-label">Akan Datang (2-7 Hari)</div>
          </div>
        </div>
        <div className="tracking-stat total-stat">
          <div className="tracking-stat-icon"><i className="fa-solid fa-motorcycle"></i></div>
          <div>
            <div className="tracking-stat-val">{enriched.length}</div>
            <div className="tracking-stat-label">Total Aktif</div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="tracking-controls">
        <div className="tracking-filter-tabs">
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`tracking-filter-tab ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
              style={filter === f.key && f.color ? { borderColor: f.color, color: f.color } : {}}
            >
              <i className={f.icon}></i>
              <span>{f.label}</span>
              {f.count > 0 && (
                <span className="filter-count" style={f.color ? { background: `${f.color}22`, color: f.color } : {}}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="tracking-search-wrap">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            placeholder="Cari nama, HP, atau motor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="tracking-search-input"
          />
          {search && (
            <button onClick={() => setSearch('')} className="tracking-search-clear">
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="tracking-loading">
          <i className="fa-solid fa-spinner fa-spin-pulse" style={{ fontSize: '32px', color: 'var(--brand-primary)' }}></i>
          <p>Memuat data sewa aktif...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="tracking-empty">
          <i className="fa-solid fa-motorcycle" style={{ fontSize: '48px', color: 'var(--text-muted)', marginBottom: '16px' }}></i>
          <h3>Tidak ada data</h3>
          <p>{enriched.length === 0 ? 'Tidak ada transaksi sewa aktif saat ini.' : 'Tidak ada transaksi yang sesuai filter.'}</p>
          {search && <button className="btn-refresh" onClick={() => setSearch('')} style={{ marginTop: '12px' }}>
            <i className="fa-solid fa-xmark"></i> Reset Pencarian
          </button>}
        </div>
      ) : (
        <>
          <div className="tracking-results-info">
            <i className="fa-solid fa-list-check" style={{ color: 'var(--brand-primary)' }}></i>
            Menampilkan <strong>{filtered.length}</strong> dari <strong>{enriched.length}</strong> transaksi aktif
          </div>
          <div className="tracking-grid">
            {filtered.map(({ tx, vehicle }) => (
              <TrackingCard key={tx.id} tx={tx} vehicle={vehicle} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
