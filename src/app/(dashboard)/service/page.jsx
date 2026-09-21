'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { VEHICLE_LIGHT_COLUMNS } from '@/lib/queryColumns';
import { formatRupiah, getLocalDateStr } from '@/lib/finance';
import {
  SERVICE_ITEM_OPTIONS,
  getServiceIntervals,
  getServiceStatus,
} from '@/lib/serviceLog';

const LEVEL_META = {
  due:     { label: 'Perlu servis',   badge: 'badge-danger',  color: 'var(--status-danger)',  order: 0 },
  soon:    { label: 'Segera',         badge: 'badge-warning', color: 'var(--status-warning)', order: 1 },
  unknown: { label: 'Belum ada data', badge: 'badge-muted',   color: 'var(--text-muted)',     order: 2 },
  ok:      { label: 'Aman',           badge: 'badge-success', color: 'var(--status-success)', order: 3 },
};

const FIRST_YEAR = 2026;
const ISSUE_LOOKBACK_DAYS = 120;

function formatDateId(value) {
  if (!value) return '-';
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '-';
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatKm(n) {
  return Number.isFinite(Number(n)) ? `${Number(n).toLocaleString('id-ID')} km` : '-';
}

function vehicleLabel(v) {
  if (!v) return 'Motor dihapus';
  return v.plate_number ? `${v.name} (${v.plate_number})` : v.name;
}

// ─────────────────────────────────────────────────────────────
// Modal tambah / edit catatan servis
// ─────────────────────────────────────────────────────────────
function ServiceLogModal({ vehicles, editData, defaultVehicleId, onClose, onSaved }) {
  const initialVehicle = vehicles.find(v => v.id === (editData?.vehicle_id || defaultVehicleId));
  const [form, setForm] = useState(() => ({
    vehicle_id: editData?.vehicle_id || defaultVehicleId || '',
    service_date: editData?.service_date || getLocalDateStr(),
    km: editData ? (editData.km ?? '') : (initialVehicle?.current_km ?? ''),
    items: editData?.items || [],
    workshop: editData?.workshop || '',
    cost: editData?.cost ? String(Math.round(editData.cost)) : '',
    notes: editData?.notes || '',
    record_expense: editData ? !!editData.expense_id || !editData.cost : true,
  }));
  const [customItem, setCustomItem] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleVehicleChange = (id) => {
    const v = vehicles.find(x => x.id === id);
    setForm(f => ({
      ...f,
      vehicle_id: id,
      // Isi otomatis KM terakhir motor (masih bisa diubah) — hanya saat mencatat baru.
      km: !editData && v?.current_km != null ? v.current_km : f.km,
    }));
  };

  const toggleItem = (item) => {
    setForm(f => ({
      ...f,
      items: f.items.includes(item) ? f.items.filter(i => i !== item) : [...f.items, item],
    }));
  };

  const addCustomItem = () => {
    const item = customItem.trim();
    if (!item) return;
    setForm(f => (f.items.includes(item) ? f : { ...f, items: [...f.items, item] }));
    setCustomItem('');
  };

  const extraItems = form.items.filter(i => !SERVICE_ITEM_OPTIONS.includes(i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.vehicle_id) return setError('Pilih motor terlebih dahulu.');
    if (form.items.length === 0 && !form.notes.trim()) return setError('Pilih minimal satu item servis atau isi catatan.');

    setSaving(true);
    try {
      const res = await fetch(editData ? `/api/service-logs/${editData.id}` : '/api/service-logs', {
        method: editData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, cost: Number(form.cost) || 0 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan catatan servis.');
      onSaved(editData ? 'Catatan servis diperbarui.' : 'Catatan servis tersimpan.');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">
              <i className="fa-solid fa-screwdriver-wrench" style={{ marginRight: '6px' }}></i>
              {editData ? 'Edit Catatan Servis' : 'Catat Servis Motor'}
            </div>
            <div className="modal-subtitle">Tanggal, KM, dan pekerjaan yang dilakukan</div>
          </div>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="form-group">
              <label className="form-label">Motor <span className="required">*</span></label>
              <select className="form-control" value={form.vehicle_id} onChange={e => handleVehicleChange(e.target.value)} required>
                <option value="">— Pilih motor —</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{vehicleLabel(v)}</option>
                ))}
              </select>
            </div>

            <div className="form-row cols-2">
              <div className="form-group">
                <label className="form-label">Tanggal servis <span className="required">*</span></label>
                <input type="date" className="form-control" value={form.service_date}
                  max={getLocalDateStr()} onChange={e => set('service_date', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">KM saat servis</label>
                <input type="number" inputMode="numeric" min="0" className="form-control" placeholder="mis. 12500"
                  value={form.km} onChange={e => set('km', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Pekerjaan / item servis</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[...SERVICE_ITEM_OPTIONS, ...extraItems].map(item => {
                  const active = form.items.includes(item);
                  return (
                    <button key={item} type="button" onClick={() => toggleItem(item)}
                      style={{
                        padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: '12.5px', fontWeight: 600,
                        border: `1.5px solid ${active ? 'var(--brand-primary)' : 'var(--bg-border)'}`,
                        background: active ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                        color: active ? '#fff' : 'var(--text-secondary)', cursor: 'pointer',
                      }}>
                      {active && <i className="fa-solid fa-check" style={{ marginRight: '4px' }}></i>}{item}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <input className="form-control" placeholder="Item lain (mis. ganti kabel gas)" value={customItem}
                  onChange={e => setCustomItem(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomItem(); } }} />
                <button type="button" className="btn btn-secondary" onClick={addCustomItem}>Tambah</button>
              </div>
            </div>

            <div className="form-row cols-2">
              <div className="form-group">
                <label className="form-label">Bengkel / mekanik</label>
                <input className="form-control" placeholder="mis. Bengkel Pak Made" value={form.workshop}
                  onChange={e => set('workshop', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Total biaya (Rp)</label>
                <input type="number" inputMode="numeric" min="0" className="form-control" placeholder="0"
                  value={form.cost} onChange={e => set('cost', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Catatan</label>
              <textarea className="form-control" rows={2} placeholder="Temuan, part yang diganti, saran berikutnya…"
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.record_expense} onChange={e => set('record_expense', e.target.checked)} />
              Catat biaya ini sebagai pengeluaran di menu Keuangan
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Menyimpan…</> : <><i className="fa-solid fa-floppy-disk"></i> Simpan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MigrationNotice() {
  return (
    <div className="alert alert-warning" style={{ lineHeight: 1.6 }}>
      <strong>Tabel servis belum dibuat di database.</strong> Jalankan file
      <code style={{ margin: '0 4px' }}>supabase/migrations/002_service_logs.sql</code>
      di Supabase → SQL Editor, lalu muat ulang halaman ini.
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Halaman utama
// ─────────────────────────────────────────────────────────────
function ServicePageInner() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const currentYear = new Date().getFullYear();

  const [vehicles, setVehicles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [alert, setAlert] = useState(null);

  const [year, setYear] = useState(String(currentYear));
  const [vehicleFilter, setVehicleFilter] = useState(searchParams.get('vehicle') || '');
  const [statusFilter, setStatusFilter] = useState('attention');
  const [intervals, setIntervals] = useState({ km: 2000, days: 60 });

  const [modal, setModal] = useState(null); // { editData, defaultVehicleId }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3500);
  };

  // Interval dibaca dari localStorage setelah mount (hindari hydration mismatch).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setIntervals(getServiceIntervals()); }, []);

  const loadVehicles = useCallback(async () => {
    setLoadingVehicles(true);
    const sinceIssues = getLocalDateStr(new Date(Date.now() - ISSUE_LOOKBACK_DAYS * 86400000));
    const [vRes, iRes] = await Promise.all([
      supabase.from('vehicles').select(VEHICLE_LIGHT_COLUMNS).order('name'),
      // Keluhan penyewa saat pengembalian (kolom ringan saja, tanpa foto).
      supabase.from('transactions')
        .select('id, vehicle_id, renter_name, end_date, issues_reported')
        .not('issues_reported', 'is', null).neq('issues_reported', '')
        .gte('end_date', sinceIssues)
        .order('end_date', { ascending: false })
        .limit(200),
    ]);
    if (vRes.error) showAlert('danger', `Gagal memuat data motor: ${vRes.error.message}`);
    setVehicles(vRes.data || []);
    setIssues(iRes.data || []);
    setLoadingVehicles(false);
  }, [supabase]);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    const params = new URLSearchParams();
    if (year !== 'all') {
      params.set('start_date', `${year}-01-01`);
      params.set('end_date', `${year}-12-31`);
    }
    if (vehicleFilter) params.set('vehicle_id', vehicleFilter);
    try {
      const res = await fetch(`/api/service-logs?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (res.status === 503 && json.needsMigration) {
        setNeedsMigration(true);
        setLogs([]);
      } else if (!res.ok) {
        throw new Error(json.error || 'Gagal memuat riwayat servis.');
      } else {
        setNeedsMigration(false);
        setLogs(Array.isArray(json) ? json : []);
      }
    } catch (err) {
      showAlert('danger', err.message);
    } finally {
      setLoadingLogs(false);
    }
  }, [year, vehicleFilter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadVehicles(); }, [loadVehicles]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Status servis per motor + keluhan penyewa sejak servis terakhir
  const vehicleRows = useMemo(() => {
    return vehicles.map(v => {
      const status = getServiceStatus(v, intervals);
      const lastServiceDay = v.last_serviced_at ? String(v.last_serviced_at).slice(0, 10) : null;
      const openIssues = issues.filter(i =>
        i.vehicle_id === v.id && (!lastServiceDay || String(i.end_date).slice(0, 10) >= lastServiceDay)
      );
      return { vehicle: v, status, openIssues };
    }).sort((a, b) =>
      LEVEL_META[a.status.level].order - LEVEL_META[b.status.level].order
      || (b.status.kmSince ?? -1) - (a.status.kmSince ?? -1)
      || String(a.vehicle.name).localeCompare(String(b.vehicle.name))
    );
  }, [vehicles, intervals, issues]);

  const counts = useMemo(() => {
    const c = { due: 0, soon: 0, unknown: 0, ok: 0 };
    vehicleRows.forEach(r => { c[r.status.level] += 1; });
    return c;
  }, [vehicleRows]);

  const visibleRows = vehicleRows.filter(r => {
    if (statusFilter === 'attention') return r.status.level === 'due' || r.status.level === 'soon' || r.openIssues.length > 0;
    if (statusFilter === 'all') return true;
    return r.status.level === statusFilter;
  });

  const totalCost = logs.reduce((sum, l) => sum + (Number(l.cost) || 0), 0);
  const yearOptions = [];
  for (let y = currentYear; y >= FIRST_YEAR; y -= 1) yearOptions.push(String(y));

  const handleSaved = (message) => {
    setModal(null);
    showAlert('success', message);
    loadLogs();
    loadVehicles();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/service-logs/${confirmDelete.id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus catatan servis.');
      setConfirmDelete(null);
      showAlert('success', 'Catatan servis dihapus.');
      loadLogs();
      loadVehicles();
    } catch (err) {
      showAlert('danger', err.message);
    } finally {
      setDeleting(false);
    }
  };

  const openHistory = (vehicleId) => {
    setVehicleFilter(vehicleId);
    setYear('all');
    requestAnimationFrame(() => document.getElementById('riwayat-servis')?.scrollIntoView({ behavior: 'smooth' }));
  };

  const statusChips = [
    { key: 'attention', label: 'Perlu perhatian', count: vehicleRows.filter(r => r.status.level === 'due' || r.status.level === 'soon' || r.openIssues.length > 0).length },
    { key: 'due', label: 'Perlu servis', count: counts.due },
    { key: 'soon', label: 'Segera', count: counts.soon },
    { key: 'unknown', label: 'Belum ada data', count: counts.unknown },
    { key: 'all', label: 'Semua', count: vehicleRows.length },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2><i className="fa-solid fa-screwdriver-wrench" style={{ marginRight: '8px' }}></i> Servis Motor</h2>
          <p>Jejak servis setiap motor. Batas servis: {intervals.km.toLocaleString('id-ID')} km atau {intervals.days} hari (ubah di Pengaturan → Profil Bisnis).</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ editData: null, defaultVehicleId: vehicleFilter })} disabled={needsMigration}>
          <i className="fa-solid fa-plus"></i> Catat Servis
        </button>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.message}</div>}
      {needsMigration && <MigrationNotice />}

      <div className="grid-3 mb-6">
        <div className="stat-card" style={{ borderLeft: '4px solid var(--status-danger)' }}>
          <div className="stat-icon" style={{ background: 'var(--status-danger-bg)', color: 'var(--status-danger)' }}>
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Perlu servis</div>
            <div className="stat-value">{loadingVehicles ? '…' : counts.due}</div>
            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>{counts.soon} motor segera menyusul</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--text-muted)' }}>
          <div className="stat-icon" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-circle-question"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Belum ada catatan servis</div>
            <div className="stat-value">{loadingVehicles ? '…' : counts.unknown}</div>
            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>dari {vehicles.length} motor</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--brand-primary)' }}>
          <div className="stat-icon" style={{ background: 'var(--bg-elevated)', color: 'var(--brand-primary)' }}>
            <i className="fa-solid fa-receipt"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Biaya servis {year === 'all' ? '(semua)' : year}</div>
            <div className="stat-value">{loadingLogs ? '…' : formatRupiah(totalCost)}</div>
            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>{logs.length} catatan{vehicleFilter ? ' (motor terpilih)' : ''}</div>
          </div>
        </div>
      </div>

      {/* ── Status per motor ── */}
      <div className="card mb-6">
        <div className="card-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
          <h3 style={{ margin: 0 }}><i className="fa-solid fa-motorcycle" style={{ marginRight: '6px' }}></i> Status Servis Motor</h3>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {statusChips.map(c => (
              <button key={c.key} type="button" onClick={() => setStatusFilter(c.key)}
                className={`btn btn-sm ${statusFilter === c.key ? 'btn-primary' : 'btn-secondary'}`}>
                {c.label} <span style={{ opacity: 0.75, marginLeft: '4px' }}>{c.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {loadingVehicles ? (
            <div className="table-empty" style={{ padding: '24px', textAlign: 'center' }}>
              <i className="fa-solid fa-spinner fa-spin"></i> Memuat data motor…
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="table-empty" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              {statusFilter === 'attention' ? 'Semua motor aman — tidak ada yang perlu perhatian.' : 'Tidak ada motor di kategori ini.'}
            </div>
          ) : visibleRows.map(({ vehicle: v, status: s, openIssues }) => {
            const meta = LEVEL_META[s.level];
            return (
              <div key={v.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--bg-border)', flexWrap: 'wrap' }}>
                <div style={{ width: '4px', alignSelf: 'stretch', borderRadius: '4px', background: meta.color }} />
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {v.name} {v.plate_number && <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>· {v.plate_number}</span>}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {s.level === 'unknown' ? (
                      'Belum ada catatan servis'
                    ) : (
                      <>
                        {s.kmSince !== null && <>{s.kmSince.toLocaleString('id-ID')} km</>}
                        {s.kmSince !== null && s.daysSince !== null && ' · '}
                        {s.daysSince !== null && <>{s.daysSince} hari</>}
                        {' sejak servis terakhir'}
                        {v.last_serviced_at && <> ({formatDateId(String(v.last_serviced_at).slice(0, 10))})</>}
                      </>
                    )}
                    <span style={{ color: 'var(--text-muted)' }}> · KM sekarang {formatKm(v.current_km)}</span>
                  </div>
                  {openIssues.length > 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--status-warning)', marginTop: '4px' }}>
                      <i className="fa-solid fa-comment-dots" style={{ marginRight: '4px' }}></i>
                      Keluhan penyewa: {openIssues.slice(0, 2).map(i => `“${i.issues_reported}” (${formatDateId(i.end_date)})`).join('; ')}
                      {openIssues.length > 2 && ` +${openIssues.length - 2} lagi`}
                    </div>
                  )}
                </div>
                <span className={`badge ${meta.badge}`}>{meta.label}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => openHistory(v.id)} title="Lihat riwayat servis">
                    <i className="fa-solid fa-clock-rotate-left"></i> Riwayat
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" disabled={needsMigration}
                    onClick={() => setModal({ editData: null, defaultVehicleId: v.id })}>
                    <i className="fa-solid fa-plus"></i> Catat
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Riwayat servis ── */}
      <div className="card" id="riwayat-servis">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}><i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '6px' }}></i> Riwayat Servis</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select className="form-control filter-select" value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)} style={{ minWidth: '180px' }}>
              <option value="">Semua motor</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{vehicleLabel(v)}</option>)}
            </select>
            <select className="form-control filter-select" value={year} onChange={e => setYear(e.target.value)}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              <option value="all">Semua tahun</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Motor</th>
                <th>KM</th>
                <th>Pekerjaan</th>
                <th>Bengkel</th>
                <th style={{ textAlign: 'right' }}>Biaya</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loadingLogs ? (
                <tr><td colSpan={7} className="table-empty"><i className="fa-solid fa-spinner fa-spin"></i> Memuat riwayat…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="table-empty">Belum ada catatan servis{year !== 'all' ? ` di tahun ${year}` : ''}.</td></tr>
              ) : logs.map(l => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDateId(l.service_date)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{vehicleLabel(l.vehicles)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{l.km != null ? formatKm(l.km) : '-'}</td>
                  <td style={{ minWidth: '200px' }}>
                    {(l.items || []).length > 0 ? l.items.join(', ') : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                    {l.notes && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'pre-line' }}>{l.notes}</div>}
                  </td>
                  <td>{l.workshop || '-'}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {Number(l.cost) > 0 ? formatRupiah(l.cost) : '-'}
                    {l.expense_id && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>tercatat di Keuangan</div>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModal({ editData: l })} title="Edit">
                      <i className="fa-solid fa-pen"></i>
                    </button>{' '}
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(l)} title="Hapus">
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ServiceLogModal
          vehicles={vehicles}
          editData={modal.editData}
          defaultVehicleId={modal.defaultVehicleId}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => !deleting && setConfirmDelete(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Hapus catatan servis?</div>
              <button className="modal-close" type="button" onClick={() => setConfirmDelete(null)} disabled={deleting}>✕</button>
            </div>
            <div className="modal-body" style={{ fontSize: '14px', lineHeight: 1.6 }}>
              {vehicleLabel(confirmDelete.vehicles)} — {formatDateId(confirmDelete.service_date)}.
              {confirmDelete.expense_id && <> Pengeluaran {formatRupiah(confirmDelete.cost)} yang terhubung di menu Keuangan juga akan dihapus.</>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(null)} disabled={deleting}>Batal</button>
              <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-trash"></i>} Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServicePage() {
  return (
    <Suspense fallback={<div className="table-empty" style={{ padding: '24px' }}>Memuat…</div>}>
      <ServicePageInner />
    </Suspense>
  );
}
