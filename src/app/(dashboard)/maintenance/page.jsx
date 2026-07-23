'use client';

import { useState, useEffect, useCallback } from 'react';
import { analyzeVehicleHealth } from '@/lib/aiDiagnostic';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

// ===== MODAL CATAT SERVIS / PERBAIKAN SELESAI =====
function ResolveMaintenanceModal({ isOpen, onClose, onConfirm, vehicle }) {
  const [serviceCategory, setServiceCategory] = useState('service');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Granular Service Items with Target Issue Matchers
  const availableItems = [
    { id: 'oli_mesin', label: 'Ganti Oli Mesin (MPX2 / Yamalube)', category: 'service' },
    { id: 'oli_gardan', label: 'Ganti Oli Gardan / Transmission Oil', category: 'service' },
    { id: 'kampas_rem_depan', label: 'Ganti Kampas Rem Depan', category: 'brake' },
    { id: 'kampas_rem_belakang', label: 'Ganti Kampas Rem Belakang / Setel Rem', category: 'brake' },
    { id: 'servis_cvt', label: 'Pembersihan & Greasing Mangkok CVT', category: 'cvt' },
    { id: 'ganti_roller_vbelt', label: 'Ganti Roller CVT & V-Belt', category: 'cvt' },
    { id: 'ganti_ban_depan', label: 'Ganti Ban Depan Baru', category: 'tire' },
    { id: 'ganti_ban_belakang', label: 'Ganti Ban Belakang Baru & Cek Angin', category: 'tire' },
    { id: 'cek_aki_kelistrikan', label: 'Ganti Aki / Cek Voltase & Lampu LED', category: 'electrical' },
    { id: 'tuneup_injeksi', label: 'Tune-Up Injeksi & Clean Throttle Body', category: 'engine' },
    { id: 'ganti_busi_filter', label: 'Ganti Busi & Filter Udara', category: 'engine' },
    { id: 'poles_bodi_lecet', label: 'Perbaikan Bodi Lecet / Spek Spion', category: 'body' }
  ];

  // Smart Helper: Check if an item is directly required by AI diagnosis
  const checkIsRequiredByAI = useCallback((itemId) => {
    if (!vehicle) return false;
    const allText = [
      ...(vehicle.warnings || []),
      ...(vehicle.recentIssues || []),
      ...(vehicle.recommendations || [])
    ].join(' ').toLowerCase();

    return (
      (itemId.includes('oli') && (vehicle.kmToNextOil <= 300 || allText.includes('oli'))) ||
      (itemId.includes('cvt') && (vehicle.kmToNextCvt <= 500 || allText.includes('cvt') || allText.includes('gredek'))) ||
      (itemId.includes('rem') && (allText.includes('rem') || allText.includes('blong'))) ||
      (itemId.includes('ban') && (allText.includes('ban') || allText.includes('kempes') || allText.includes('bocor') || allText.includes('gundul'))) ||
      (itemId.includes('aki') && (allText.includes('lampu') || allText.includes('stang') || allText.includes('redup') || allText.includes('tekor') || allText.includes('starter'))) ||
      (itemId.includes('tuneup') && (allText.includes('mesin') || allText.includes('kasar') || allText.includes('mogok')))
    );
  }, [vehicle]);

  useEffect(() => {
    if (isOpen && vehicle) {
      setServiceCategory('service');
      setCost('');
      setNotes('');

      // Auto pre-check all AI required items for convenience!
      const initialChecked = availableItems
        .filter(item => checkIsRequiredByAI(item.id))
        .map(item => item.id);

      setSelectedItems(initialChecked.length > 0 ? Array.from(new Set(initialChecked)) : ['oli_mesin', 'oli_gardan']);
    }
  }, [isOpen, vehicle?.vehicleId, checkIsRequiredByAI]);

  if (!isOpen || !vehicle) return null;

  const toggleItem = (itemId) => {
    setSelectedItems(prev =>
      prev.includes(itemId) ? prev.filter(i => i !== itemId) : [...prev, itemId]
    );
  };

  // ===== REAL-TIME DYNAMIC HEALTH SCORE CALCULATOR =====
  const initialHealth = vehicle.healthScore || 50;
  const missingScore = 100 - initialHealth;

  let totalBoost = 0;
  selectedItems.forEach(itemId => {
    const isDirectFix = checkIsRequiredByAI(itemId);
    if (isDirectFix) {
      totalBoost += Math.round(missingScore * 0.40); // Required fix gives high boost!
    } else {
      totalBoost += Math.round(missingScore * 0.15); // General maintenance boost
    }
  });

  const calculatedHealth = Math.min(100, Math.max(initialHealth, initialHealth + totalBoost));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Combine selected items into detailed notes string
    const itemNames = availableItems
      .filter(i => selectedItems.includes(i.id))
      .map(i => i.label);
    
    const fullNotes = [
      itemNames.length > 0 ? `Tindakan Perbaikan Dikerjakan: ${itemNames.join(', ')}` : '',
      notes ? `Catatan Tambahan Bengkel: ${notes}` : ''
    ].filter(Boolean).join('\n');

    await onConfirm(vehicle, {
      serviceCategory,
      cost: parseFloat(cost) || 0,
      notes: fullNotes,
      selectedItems: itemNames,
      calculatedHealth
    });

    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">
              <i className="fa-solid fa-screwdriver-wrench" style={{ marginRight: '8px', color: '#22C55E' }}></i>
              Formulir Servis AI & Kalkulator Real-Time Performa Motor
            </div>
            <div className="modal-subtitle">Centang item perbaikan di bawah untuk melihat peningkatan persentase kesehatan mesin secara real-time</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Real-time Dynamic Score Bar Header */}
          <div className="alert alert-info mb-4" style={{ fontSize: '13px', background: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                Motor: <strong>{vehicle.vehicleName}</strong> (<span style={{ color: 'var(--brand-primary-light)' }}>{vehicle.plateNumber}</span>)
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Odometer: <strong>{vehicle.currentKm.toLocaleString('id-ID')} KM</strong>
                </div>
              </div>

              {/* Dynamic Real-Time Health Score Indicator */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Proyeksi Skor Kesehatan:</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{initialHealth}% ➔</span>
                  <span style={{
                    fontSize: '22px',
                    fontWeight: 900,
                    color: calculatedHealth >= 85 ? '#22C55E' : calculatedHealth >= 60 ? '#F59E0B' : '#EF4444',
                    transition: 'all 0.3s ease'
                  }}>
                    {calculatedHealth}%
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Real-Time Progress Bar */}
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '6px', height: '10px', overflow: 'hidden', margin: '8px 0' }}>
              <div style={{
                width: `${calculatedHealth}%`,
                height: '100%',
                background: calculatedHealth >= 85 ? '#22C55E' : calculatedHealth >= 60 ? '#F59E0B' : '#EF4444',
                transition: 'all 0.3s ease'
              }} />
            </div>

            <div style={{ fontSize: '11.5px', color: calculatedHealth === 100 ? '#22C55E' : calculatedHealth >= 85 ? '#22C55E' : '#F59E0B', fontWeight: 600, marginTop: '4px' }}>
              {calculatedHealth === 100 ? '🏆 100% Prima — Semua komponen krusial telah selesai diperbaiki!' :
               calculatedHealth >= 85 ? '💚 Performa Sangat Baik (Centang item tersisa untuk mencapai 100% Prima)' :
               '💛 Perbaikan Sebagian (Centang item dengan label Dibutuhkan AI 🎯 di bawah untuk meningkatkan persentase)'}
            </div>
          </div>

          {/* Service Category Buttons */}
          <div className="form-group">
            <label className="form-label">
              <i className="fa-solid fa-layer-group" style={{ marginRight: '6px' }}></i> Kategori Utama Servis <span className="required">*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
              {[
                { id: 'service', label: 'Servis Rutin & Oli', icon: 'fa-solid fa-oil-can', color: '#22C55E' },
                { id: 'brake', label: 'Sistem Rem', icon: 'fa-solid fa-stop-circle', color: '#EF4444' },
                { id: 'cvt', label: 'Servis CVT & Roller', icon: 'fa-solid fa-gears', color: '#3B82F6' },
                { id: 'tire', label: 'Ban & Tekanan', icon: 'fa-solid fa-circle-dot', color: '#F59E0B' },
                { id: 'electrical', label: 'Aki & Kelistrikan', icon: 'fa-solid fa-bolt', color: '#EAB308' },
                { id: 'engine', label: 'Tune-Up Mesin', icon: 'fa-solid fa-wrench', color: '#8B5CF6' }
              ].map(cat => {
                const isActive = serviceCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setServiceCategory(cat.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${isActive ? cat.color : 'var(--bg-border)'}`,
                      background: isActive ? `${cat.color}18` : 'var(--bg-elevated)',
                      color: isActive ? cat.color : 'var(--text-secondary)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <i className={cat.icon} style={{ fontSize: '13px' }}></i>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Granular Checklist Items with Real-time Score Impact */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                <i className="fa-solid fa-square-check" style={{ marginRight: '6px' }}></i> Checklist Item Perbaikan (Centang untuk Menaikkan Skor %):
              </label>
              <span style={{ fontSize: '11px', color: 'var(--brand-primary-light)', fontWeight: 600 }}>
                {selectedItems.length} dari {availableItems.length} Dicentang
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--bg-border)' }}>
              {availableItems.map(item => {
                const checked = selectedItems.includes(item.id);
                const isTargetIssue = checkIsRequiredByAI(item.id);

                return (
                  <label
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: isTargetIssue ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent',
                      background: checked ? 'rgba(34, 197, 94, 0.12)' : isTargetIssue ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                      color: checked ? '#22C55E' : isTargetIssue ? '#F59E0B' : 'var(--text-secondary)',
                      fontWeight: checked || isTargetIssue ? 600 : 400
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(item.id)}
                      style={{ accentColor: '#22C55E' }}
                    />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {isTargetIssue && (
                      <span style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.25)', padding: '2px 6px', borderRadius: '4px', color: '#F59E0B', fontWeight: 800 }}>
                        Dibutuhkan AI 🎯
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Cost & Expenses Sync */}
          <div className="form-group">
            <label className="form-label" htmlFor="maint-cost">
              <i className="fa-solid fa-receipt" style={{ marginRight: '6px' }}></i> Total Biaya Servis / Sparepart (Rp)
            </label>
            <input
              id="maint-cost"
              type="number"
              className="form-control"
              placeholder="Contoh: 150000 (Otomatis tercatat ke Laporan Pengeluaran Operasional)"
              value={cost}
              onChange={e => setCost(e.target.value)}
              min="0"
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              *Biaya ini akan otomatis dimasukkan ke laporan keuangan <strong>Pengeluaran Operasional</strong>.
            </div>
          </div>

          {/* Bengkel Notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="maint-notes">
              <i className="fa-regular fa-note-sticky" style={{ marginRight: '6px' }}></i> Catatan Mekanik / Nama Bengkel
            </label>
            <textarea
              id="maint-notes"
              className="form-control"
              rows={2}
              placeholder="Contoh: Diservis di Bengkel Resmi AHASS Canggu. Ban belakang diisi nitrogen 33 psi, kampas rem baru original."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? (
                <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '4px' }}></i> Menyimpan...</>
              ) : (
                <><i className="fa-solid fa-circle-check" style={{ marginRight: '4px' }}></i> Simpan Perbaikan & Set Skor ke {calculatedHealth}%</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== MAIN MAINTENANCE PAGE =====
export default function MaintenancePage() {
  const [activeTab, setActiveTab] = useState('diagnostics'); // 'diagnostics' | 'history' | 'reports'
  const [vehicles, setVehicles] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [resolveModal, setResolveModal] = useState({ open: false, vehicle: null });
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [vRes, tRes, eRes] = await Promise.all([
      fetch('/api/vehicles'),
      fetch('/api/transactions'),
      fetch('/api/expenses')
    ]);
    const vData = await vRes.json();
    const tData = await tRes.json();
    const eData = await eRes.json();

    setVehicles(Array.isArray(vData) ? vData : []);
    setTransactions(Array.isArray(tData) ? tData : []);
    setExpenses(Array.isArray(eData) ? eData : []);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto refresh every 60s
  useEffect(() => {
    const timer = setInterval(() => fetchData(), 60000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const diagnostics = vehicles.map(v => analyzeVehicleHealth(v, transactions));

  const filtered = diagnostics.filter(diag => {
    const matchSearch = !searchQuery ||
      diag.vehicleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      diag.plateNumber.toLowerCase().includes(searchQuery.toLowerCase());

    let matchStatus = true;
    if (filterStatus === 'urgent') matchStatus = diag.healthScore < 60;
    if (filterStatus === 'warning') matchStatus = diag.healthScore >= 60 && diag.healthScore < 85;
    if (filterStatus === 'healthy') matchStatus = diag.healthScore >= 85;

    return matchSearch && matchStatus;
  });

  const urgentCount = diagnostics.filter(d => d.healthScore < 60).length;
  const warningCount = diagnostics.filter(d => d.healthScore >= 60 && d.healthScore < 85).length;
  const healthyCount = diagnostics.filter(d => d.healthScore >= 85).length;

  // Filter Service Expenses for History Log
  const serviceHistoryLogs = expenses.filter(exp =>
    exp.category === 'service' ||
    exp.category === 'sparepart' ||
    exp.title?.toLowerCase().includes('servis') ||
    exp.title?.toLowerCase().includes('perbaikan')
  ).filter(exp => {
    if (!searchQuery) return true;
    return exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  // Get ONLY unresolved issue reports (where issue date is AFTER vehicle's last_serviced_at)
  const recentReports = transactions
    .filter(t => {
      if (t.status !== 'completed' || !t.issues_reported || !t.issues_reported.trim()) return false;
      const v = vehicles.find(veh => veh.id === t.vehicle_id);
      if (!v) return true;
      if (!v.last_serviced_at) return true;
      const txDate = new Date(t.updated_at || t.created_at);
      const serviceDate = new Date(v.last_serviced_at);
      return txDate > serviceDate;
    })
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

  // Helper to generate dynamic required items list for card view
  const getCardRequiredFixes = (diag) => {
    const fixes = [];
    const allText = [
      ...(diag.warnings || []),
      ...(diag.recentIssues || []),
      ...(diag.recommendations || [])
    ].join(' ').toLowerCase();

    if (diag.kmToNextOil <= 300 || allText.includes('oli')) fixes.push({ name: 'Ganti Oli Mesin & Gardan', icon: 'fa-solid fa-oil-can' });
    if (diag.kmToNextCvt <= 500 || allText.includes('cvt') || allText.includes('gredek')) fixes.push({ name: 'Servis CVT & Roller', icon: 'fa-solid fa-gears' });
    if (allText.includes('rem') || allText.includes('blong')) fixes.push({ name: 'Servis / Ganti Kampas Rem', icon: 'fa-solid fa-stop-circle' });
    if (allText.includes('ban') || allText.includes('kempes') || allText.includes('bocor') || allText.includes('gundul')) fixes.push({ name: 'Ganti Ban / Cek Tekanan', icon: 'fa-solid fa-circle-dot' });
    if (allText.includes('lampu') || allText.includes('stang') || allText.includes('redup') || allText.includes('tekor')) fixes.push({ name: 'Servis Aki & Kelistrikan', icon: 'fa-solid fa-bolt' });
    if (allText.includes('mesin') || allText.includes('kasar') || allText.includes('mogok')) fixes.push({ name: 'Tune-Up Injeksi & Busi', icon: 'fa-solid fa-wrench' });

    return fixes;
  };

  // Confirm Service Completion
  const handleConfirmService = async (diagVehicle, serviceData) => {
    const { cost, notes, serviceCategory, calculatedHealth } = serviceData;
    const nowIso = new Date().toISOString();

    // 1. Update vehicle record (last_service_km, last_serviced_at, status='available')
    const vRes = await fetch(`/api/vehicles/${diagVehicle.vehicleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        last_service_km: diagVehicle.currentKm,
        last_serviced_at: nowIso,
        status: 'available'
      }),
    });

    // 2. Auto insert into Expenses history log
    const catLabels = {
      service: 'Servis Rutin & Oli',
      brake: 'Perbaikan Sistem Rem',
      cvt: 'Servis CVT & Roller',
      tire: 'Penggantian Ban',
      electrical: 'Servis Aki & Kelistrikan',
      engine: 'Tune-Up Mesin'
    };

    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Servis Motor: ${diagVehicle.vehicleName} (${diagVehicle.plateNumber}) - ${catLabels[serviceCategory] || 'Servis'}`,
        category: serviceCategory === 'cvt' || serviceCategory === 'tire' ? 'sparepart' : 'service',
        amount: cost || 0,
        expense_date: nowIso.split('T')[0],
        notes: notes || `Perbaikan diselesaikan. Skor Kesehatan Terkini: ${calculatedHealth}%`
      }),
    });

    if (vRes.ok) {
      showAlert(`Perbaikan motor ${diagVehicle.vehicleName} (${diagVehicle.plateNumber}) telah dicatat! Skor kesehatan motor terupdate menjadi ${calculatedHealth}% 🎉`);
      fetchData();
    } else {
      showAlert('Gagal memperbarui data kendaraan.', 'danger');
    }
  };

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2><i className="fa-solid fa-robot" style={{ marginRight: '8px', color: 'var(--brand-primary-light)' }}></i> AI Maintenance & Rekam Jejak Servis Motor</h2>
            <p>Deteksi dini kesehatan mesin, jadwal penggantian oli, CVT & history lengkap perbaikan motor</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {lastUpdated && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-rotate" style={{ marginRight: '4px' }}></i>
                Update: {lastUpdated.toLocaleTimeString('id-ID')}
              </span>
            )}
            <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
              <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`} style={{ marginRight: '6px' }}></i>
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.message}</div>}

      {/* KPI Cards */}
      <div className="grid-3 mb-6">
        <div className="stat-card" onClick={() => { setFilterStatus('healthy'); setActiveTab('diagnostics'); }} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' }}>
            <i className="fa-solid fa-heart-pulse"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Armada Sehat (100% Prima)</div>
            <div className="stat-value">{healthyCount} Motor</div>
            <div className="stat-change">Kondisi siap sewa ✓</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => { setFilterStatus('warning'); setActiveTab('diagnostics'); }} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Perlu Cek Berkala</div>
            <div className="stat-value">{warningCount} Motor</div>
            <div className="stat-change">Mendekati jadwal servis</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => { setFilterStatus('urgent'); setActiveTab('diagnostics'); }} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
            <i className="fa-solid fa-screwdriver-wrench"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Servis / Kendala Keluhan</div>
            <div className="stat-value">{urgentCount} Motor</div>
            <div className="stat-change">Ada keluhan / skor &lt; 60%</div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TAB SWITCHER — Scrollable Chips / Pills Layout */}
      <div className="scrollable-tabs-bar" style={{ marginBottom: '16px' }}>
        <button
          type="button"
          className={`scrollable-tab-btn ${activeTab === 'diagnostics' ? 'active' : ''}`}
          onClick={() => setActiveTab('diagnostics')}
        >
          <i className="fa-solid fa-robot"></i>
          AI Diagnostics & Skor Kesehatan ({diagnostics.length})
        </button>

        <button
          type="button"
          className={`scrollable-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <i className="fa-solid fa-clock-rotate-left"></i>
          Riwayat & History Servis ({serviceHistoryLogs.length})
        </button>

        <button
          type="button"
          className={`scrollable-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <i className="fa-solid fa-clipboard-list"></i>
          Keluhan Pelanggan ({recentReports.length})
        </button>
      </div>

      <div className="page-actions mb-6">
        <div className="filter-bar" style={{ width: '100%' }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <span className="search-bar-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
            <input
              type="text"
              className="form-control"
              placeholder="Cari nama motor, plat nomor, atau jenis perbaikan..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          {activeTab === 'diagnostics' && (
            <select
              className="form-control"
              style={{ width: 'auto' }}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">Semua Kondisi Armada</option>
              <option value="healthy">💚 Sehat (85%+)</option>
              <option value="warning">💛 Perlu Cek (60-84%)</option>
              <option value="urgent">❤️ Perlu Servis (&lt;60%)</option>
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: AI DIAGNOSTICS & HEALTH SCORES */}
      {activeTab === 'diagnostics' && (
        <>
          {loading ? (
            <div className="card table-empty">
              <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Menganalisis data kesehatan kendaraan dengan AI...
            </div>
          ) : filtered.length === 0 ? (
            <div className="card table-empty">
              <div className="table-empty-icon"><i className="fa-solid fa-robot"></i></div>
              <p>Tidak ada kendaraan yang sesuai dengan kriteria pencarian</p>
            </div>
          ) : (
            <div className="grid-2">
              {filtered.map(diag => {
                const cardFixes = getCardRequiredFixes(diag);

                return (
                  <div key={diag.vehicleId} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          {diag.vehicleName}
                        </h3>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Plat Nomor: <strong style={{ color: 'var(--brand-primary-light)' }}>{diag.plateNumber}</strong>
                          {' | '}KM Odometer: <strong>{diag.currentKm.toLocaleString('id-ID')} KM</strong>
                          {diag.lastServicedAt && (
                            <div style={{ color: '#22C55E', marginTop: '2px', fontWeight: 600 }}>
                              <i className="fa-solid fa-wrench" style={{ marginRight: '4px' }}></i>
                              Servis Terakhir: {new Date(diag.lastServicedAt).toLocaleDateString('id-ID')}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: '24px',
                          fontWeight: 900,
                          color: diag.healthScore >= 85 ? '#22C55E' : diag.healthScore >= 60 ? '#F59E0B' : '#EF4444'
                        }}>
                          {diag.healthScore}%
                        </div>
                        <span className="badge" style={{
                          background: `${diag.badgeColor}20`,
                          color: diag.badgeColor,
                          border: `1px solid ${diag.badgeColor}40`,
                          fontSize: '11px'
                        }}>
                          {diag.statusLevel}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${diag.healthScore}%`,
                        height: '100%',
                        background: diag.healthScore >= 85 ? '#22C55E' : diag.healthScore >= 60 ? '#F59E0B' : '#EF4444',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>

                    {/* Service Estimates */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--bg-border)' }}>
                      <div style={{ fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}><i className="fa-solid fa-oil-can" style={{ marginRight: '4px' }}></i> Ganti Oli Mesin:</span>
                        <div style={{ fontWeight: 600, color: diag.kmToNextOil <= 300 ? '#EF4444' : 'var(--text-primary)' }}>
                          {diag.kmToNextOil <= 0 ? 'Waktunya ganti sekarang!' : `Tersisa ~${diag.kmToNextOil} KM`}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}><i className="fa-solid fa-gears" style={{ marginRight: '4px' }}></i> Servis CVT berkala:</span>
                        <div style={{ fontWeight: 600, color: diag.kmToNextCvt <= 500 ? '#F59E0B' : 'var(--text-primary)' }}>
                          {diag.kmToNextCvt <= 0 ? 'Waktunya servis CVT!' : `Tersisa ~${diag.kmToNextCvt} KM`}
                        </div>
                      </div>
                    </div>

                    {/* AI TARGETED REQUIRED FIXES (For ALL motorbikes with health < 100%) */}
                    {diag.healthScore < 100 && cardFixes.length > 0 && (
                      <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '12px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#F59E0B', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fa-solid fa-bullseye"></i>
                          <span>Rekomendasi Perbaikan Utama AI (Dibutuhkan 🎯):</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {cardFixes.map((fix, fIdx) => (
                            <span key={fIdx} style={{
                              fontSize: '11px',
                              background: 'rgba(245, 158, 11, 0.18)',
                              color: '#F59E0B',
                              border: '1px solid rgba(245, 158, 11, 0.35)',
                              padding: '3px 9px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <i className={fix.icon}></i>
                              {fix.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Warnings / AI Alerts */}
                    {diag.warnings.length > 0 && (
                      <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderLeft: '3px solid #EF4444', padding: '10px 14px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#EF4444', marginBottom: '6px' }}>
                          <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i> AI Warning & Catatan Keluhan:
                        </div>
                        {diag.warnings.map((w, idx) => (
                          <div key={idx} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{w}</div>
                        ))}
                      </div>
                    )}

                    {/* Issues from transactions */}
                    {diag.recentIssues.length > 0 && (
                      <div style={{ background: 'rgba(245, 158, 11, 0.06)', borderLeft: '3px solid #F59E0B', padding: '10px 14px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#F59E0B', marginBottom: '6px' }}>
                          <i className="fa-solid fa-clipboard-list" style={{ marginRight: '6px' }}></i> Keluhan Pelanggan Belum Difix:
                        </div>
                        {diag.recentIssues.map((issue, idx) => (
                          <div key={idx} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>• {issue}</div>
                        ))}
                      </div>
                    )}

                    {/* AI Recommendations */}
                    <div style={{ background: 'rgba(59, 130, 246, 0.08)', borderLeft: '3px solid #3B82F6', padding: '10px 14px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#3B82F6', marginBottom: '6px' }}>
                        <i className="fa-solid fa-lightbulb" style={{ marginRight: '6px' }}></i> Rekomendasi Mekanik AI:
                      </div>
                      {diag.recommendations.map((r, idx) => (
                        <div key={idx} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>• {r}</div>
                      ))}
                    </div>

                    {/* ACTION BUTTON */}
                    <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                      {diag.healthScore < 100 ? (
                        <button
                          className="btn btn-success"
                          style={{ width: '100%', gap: '8px', padding: '10px', fontSize: '13px' }}
                          onClick={() => setResolveModal({ open: true, vehicle: diag })}
                        >
                          <i className="fa-solid fa-screwdriver-wrench"></i>
                          Catat Perbaikan & Kalkulasi Skor Real-Time
                        </button>
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '10px',
                          borderRadius: '8px',
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid rgba(34, 197, 94, 0.25)',
                          color: '#22C55E',
                          fontSize: '12.5px',
                          fontWeight: 700
                        }}>
                          <i className="fa-solid fa-shield-halved"></i>
                          <span>Motor 100% Prima — Siap Disewa Kembali</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: RIWAYAT & HISTORY SERVIS LOG */}
      {activeTab === 'history' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
              <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '8px', color: 'var(--brand-primary-light)' }}></i>
              Rekam Jejak History Servis & Perbaikan Armada Motor
            </h3>
            <span className="badge badge-info">{serviceHistoryLogs.length} Catatan Perbaikan</span>
          </div>

          {serviceHistoryLogs.length === 0 ? (
            <div className="table-empty">
              <div className="table-empty-icon"><i className="fa-solid fa-wrench"></i></div>
              <p>Belum ada riwayat perbaikan motor yang dicatat.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tanggal Servis</th>
                    <th>Nama Motor & Keterangan</th>
                    <th>Kategori Perbaikan</th>
                    <th>Biaya Servis</th>
                    <th>Detail Tindakan Bengkel</th>
                    <th>Status Performa</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceHistoryLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '12.5px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        <i className="fa-regular fa-calendar-check" style={{ marginRight: '6px', color: 'var(--brand-primary-light)' }}></i>
                        {new Date(log.expense_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {log.title}
                      </td>
                      <td>
                        <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>
                          <i className="fa-solid fa-gear" style={{ marginRight: '4px' }}></i>
                          {log.category}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: '#EF4444' }}>
                        {formatRupiah(log.amount)}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '300px' }}>
                        {log.notes || 'Perbaikan rutin & penyetelan mesin'}
                      </td>
                      <td>
                        <span className="badge badge-success">
                          <i className="fa-solid fa-circle-check" style={{ marginRight: '4px' }}></i>
                          Terbukti Prima
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: KELUHAN PELANGGAN RECENT REPORTS */}
      {activeTab === 'reports' && (
        <div className="card">
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>
              <i className="fa-solid fa-clipboard-list" style={{ marginRight: '8px', color: '#F59E0B' }}></i>
              Laporan Keluhan Motor dari Penyewa (Transaksi Selesai)
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Daftar keluhan yang dilaporkan oleh customer saat pengembalian motor dan mempengaruhi skor kesehatan AI.
            </p>
          </div>

          {recentReports.length === 0 ? (
            <div className="table-empty">
              <div className="table-empty-icon"><i className="fa-solid fa-circle-check"></i></div>
              <p>Tidak ada laporan keluhan aktif dari pelanggan. Semua motor bebas masalah!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentReports.map(t => {
                const targetDiag = diagnostics.find(d => d.vehicleId === t.vehicle_id);
                return (
                  <div key={t.id} style={{
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: '14px' }}>
                        <i className="fa-solid fa-motorcycle" style={{ marginRight: '8px', color: 'var(--brand-primary-light)' }}></i>
                        {t.vehicles?.name || 'Motor'} — <span style={{ color: 'var(--brand-primary-light)' }}>{t.vehicles?.plate_number}</span>
                      </div>
                      {targetDiag && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => setResolveModal({ open: true, vehicle: targetDiag })}
                        >
                          <i className="fa-solid fa-wrench" style={{ marginRight: '4px' }}></i>
                          Fix & Kalkulasi Real-Time
                        </button>
                      )}
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Penyewa: <strong>{t.renter_name}</strong> ({t.renter_phone}) | Selesai Sewa: {new Date(t.updated_at || t.created_at).toLocaleDateString('id-ID')}
                      {t.km_start && t.km_end && (
                        <span> | Total Pakai: +{(t.km_end - t.km_start).toLocaleString()} KM</span>
                      )}
                    </div>

                    <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '6px', borderLeft: '3px solid #F59E0B', fontSize: '13px', color: '#F59E0B', fontStyle: 'italic' }}>
                      "{t.issues_reported}"
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Resolve Maintenance Modal */}
      <ResolveMaintenanceModal
        isOpen={resolveModal.open}
        onClose={() => setResolveModal({ open: false, vehicle: null })}
        onConfirm={handleConfirmService}
        vehicle={resolveModal.vehicle}
      />
    </div>
  );
}
