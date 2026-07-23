'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

const categoryIcons = {
  service: 'fa-solid fa-wrench',
  sparepart: 'fa-solid fa-gear',
  fuel: 'fa-solid fa-gas-pump',
  salary: 'fa-solid fa-user-tie',
  other: 'fa-solid fa-receipt',
};

const categoryLabels = {
  service: 'Servis & Perawatan',
  sparepart: 'Suku Cadang / Sparepart',
  fuel: 'Bahan Bakar',
  salary: 'Gaji Karyawan',
  other: 'Lain-lain',
};

const SQL_MIGRATION = `-- Jalankan SQL ini di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/eedrziblypwrufdzctvd/sql/new

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'service',
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_image_url TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS damage_fee DECIMAL(12,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS km_start INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS km_end INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS issues_reported TEXT;

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_km INTEGER DEFAULT 15000;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_url TEXT;`;

// ===== EXPENSE MODAL =====
function ExpenseModal({ isOpen, onClose, onSubmit, editData }) {
  const [form, setForm] = useState({
    title: '',
    category: 'service',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editData) {
      setForm({
        title: editData.title || '',
        category: editData.category || 'service',
        amount: editData.amount || '',
        expense_date: editData.expense_date || new Date().toISOString().split('T')[0],
        notes: editData.notes || '',
      });
    } else {
      setForm({
        title: '',
        category: 'service',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
  }, [editData, isOpen]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({ ...form, amount: parseFloat(form.amount) || 0 });
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">
              {editData ? (
                <><i className="fa-solid fa-pen-to-square" style={{ marginRight: '6px' }}></i> Edit Pengeluaran</>
              ) : (
                <><i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Tambah Pengeluaran Baru</>
              )}
            </div>
            <div className="modal-subtitle">Isi data pengeluaran operasional Boss Rent</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="exp-title">
              <i className="fa-solid fa-file-signature" style={{ marginRight: '6px' }}></i> Keterangan / Nama Pengeluaran <span className="required">*</span>
            </label>
            <input id="exp-title" name="title" type="text" className="form-control" placeholder="e.g. Ganti Oli Honda Beat & Busi" value={form.title} onChange={handleChange} required />
          </div>

          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label" htmlFor="exp-cat">
                <i className="fa-solid fa-list" style={{ marginRight: '6px' }}></i> Kategori <span className="required">*</span>
              </label>
              <select id="exp-cat" name="category" className="form-control" value={form.category} onChange={handleChange} required>
                <option value="service">Servis & Perawatan</option>
                <option value="sparepart">Suku Cadang / Sparepart</option>
                <option value="fuel">Bahan Bakar</option>
                <option value="salary">Gaji Karyawan</option>
                <option value="other">Lain-lain</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="exp-amount">
                <i className="fa-solid fa-coins" style={{ marginRight: '6px' }}></i> Jumlah Pengeluaran (Rp) <span className="required">*</span>
              </label>
              <input id="exp-amount" name="amount" type="number" className="form-control" placeholder="150000" min="0" value={form.amount} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="exp-date">
              <i className="fa-solid fa-calendar-days" style={{ marginRight: '6px' }}></i> Tanggal Pengeluaran <span className="required">*</span>
            </label>
            <input id="exp-date" name="expense_date" type="date" className="form-control" value={form.expense_date} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="exp-notes">
              <i className="fa-regular fa-note-sticky" style={{ marginRight: '6px' }}></i> Catatan Tambahan
            </label>
            <textarea id="exp-notes" name="notes" className="form-control" rows={3} placeholder="Catatan opsional..." value={form.notes} onChange={handleChange} style={{ resize: 'vertical' }} />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Menyimpan...</>
              ) : editData ? (
                <><i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Simpan Perubahan</>
              ) : (
                <><i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Simpan Pengeluaran</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== SQL MIGRATION BANNER =====
function MigrationBanner({ onCopy }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_MIGRATION);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    if (onCopy) onCopy();
  };

  return (
    <div style={{
      background: 'rgba(239, 68, 68, 0.08)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ fontSize: '28px', color: '#EF4444', flexShrink: 0 }}>
          <i className="fa-solid fa-circle-exclamation"></i>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#EF4444', marginBottom: '6px' }}>
            Database Belum Di-Migrate — Tabel expenses Belum Ada
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.6 }}>
            Fitur Pengeluaran, Galeri Foto, dan kolom-kolom baru membutuhkan pembaruan skema database Supabase.
            Klik tombol di bawah untuk menyalin SQL, lalu jalankan di Supabase SQL Editor.
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={handleCopy}
              style={{ gap: '8px' }}
            >
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              {copied ? 'SQL Tersalin! Tempel ke Supabase' : 'Salin SQL Migration'}
            </button>
            <a
              href="https://supabase.com/dashboard/project/eedrziblypwrufdzctvd/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              <i className="fa-solid fa-arrow-up-right-from-square"></i>
              Buka Supabase SQL Editor
            </a>
          </div>
          <div style={{ marginTop: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '12px', maxHeight: '120px', overflow: 'auto' }}>
            <pre style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{SQL_MIGRATION}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== CONFIRM DELETE EXPENSE MODAL =====
function ConfirmDeleteExpenseModal({ isOpen, onClose, onConfirm, expense }) {
  if (!isOpen || !expense) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <i className="fa-solid fa-trash-can" style={{ marginRight: '6px', color: '#EF4444' }}></i> Hapus Pengeluaran?
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px 0' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', margin: 0 }}>
            Apakah kamu yakin ingin menghapus pencatatan pengeluaran berikut?
          </p>

          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: '8px', padding: '12px 16px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{expense.title}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Tanggal: {new Date(expense.expense_date).toLocaleDateString('id-ID')}</span>
              <strong style={{ color: '#EF4444' }}>-{formatRupiah(expense.amount)}</strong>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Batal</button>
          <button className="btn btn-danger" onClick={() => { onConfirm(expense.id); onClose(); }}>
            <i className="fa-solid fa-trash-can" style={{ marginRight: '6px' }}></i> Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN EXPENSES PAGE =====
export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/expenses');
    const data = await res.json();
    if (Array.isArray(data)) {
      setExpenses(data);
      setNeedsMigration(false);
    } else {
      setExpenses([]);
      // If empty array returned means table might be missing but API returned [] gracefully
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const filtered = Array.isArray(expenses) ? expenses.filter(exp => {
    const matchCat = categoryFilter === 'all' || exp.category === categoryFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || exp.title?.toLowerCase().includes(q) || exp.notes?.toLowerCase().includes(q);
    return matchCat && matchSearch;
  }) : [];

  const totalExpense = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);

  const handleSubmit = async (formData) => {
    const url = editData ? `/api/expenses/${editData.id}` : '/api/expenses';
    const method = editData ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const resData = await res.json();
    if (res.ok) {
      showAlert(editData ? 'Pengeluaran berhasil diperbarui.' : 'Pengeluaran baru berhasil ditambahkan.');
      setShowModal(false);
      setEditData(null);
      fetchExpenses();
    } else {
      if (resData.needsMigration) {
        setNeedsMigration(true);
        setShowModal(false);
        showAlert('Tabel database belum ada. Jalankan SQL migration terlebih dahulu!', 'danger');
      } else {
        showAlert(resData.error || 'Terjadi kesalahan.', 'danger');
      }
    }
  };

  const [deleteModal, setDeleteModal] = useState({ open: false, data: null });

  const handleDelete = async (id) => {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showAlert('Pengeluaran berhasil dihapus.');
      fetchExpenses();
    } else {
      showAlert('Gagal menghapus pengeluaran.', 'danger');
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2><i className="fa-solid fa-money-bill-transfer" style={{ marginRight: '8px' }}></i> Pengeluaran Operasional</h2>
        <p>Catat dan pantau seluruh biaya operasional, servis motor, sparepart, dan gaji karyawan</p>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.message}</div>}

      {needsMigration && <MigrationBanner />}

      {/* Summary KPI */}
      <div className="grid-3 mb-6">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
            <i className="fa-solid fa-arrow-trend-down"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Pengeluaran</div>
            <div className="stat-value" style={{ color: '#EF4444' }}>{formatRupiah(totalExpense)}</div>
            <div className="stat-change">{filtered.length} transaksi pengeluaran</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
            <i className="fa-solid fa-wrench"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Biaya Servis & Sparepart</div>
            <div className="stat-value">
              {formatRupiah(expenses.filter(e => e.category === 'service' || e.category === 'sparepart').reduce((s, e) => s + Number(e.amount), 0))}
            </div>
            <div className="stat-change">Pemeliharaan armada</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
            <i className="fa-solid fa-receipt"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Pengeluaran Lainnya</div>
            <div className="stat-value">
              {formatRupiah(expenses.filter(e => e.category !== 'service' && e.category !== 'sparepart').reduce((s, e) => s + Number(e.amount), 0))}
            </div>
            <div className="stat-change">BBM, Gaji & Operasional</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="page-actions mb-6">
        <div className="filter-bar">
          <div className="search-bar">
            <span className="search-bar-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
            <input
              type="text"
              className="form-control"
              placeholder="Cari pengeluaran..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="form-control filter-select"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="all">Semua Kategori</option>
            <option value="service">Servis & Perawatan</option>
            <option value="sparepart">Sparepart</option>
            <option value="fuel">Bahan Bakar</option>
            <option value="salary">Gaji</option>
            <option value="other">Lain-lain</option>
          </select>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setEditData(null); setShowModal(true); }}
        >
          <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Tambah Pengeluaran
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          {loading ? (
            <div className="table-empty"><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Memuat data pengeluaran...</div>
          ) : filtered.length === 0 ? (
            <div className="table-empty">
              <div className="table-empty-icon"><i className="fa-solid fa-money-bill-transfer"></i></div>
              <p>{needsMigration ? 'Jalankan SQL migration untuk mengaktifkan fitur ini.' : 'Belum ada pencatatan pengeluaran'}</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tanggal</th>
                  <th>Keterangan</th>
                  <th>Kategori</th>
                  <th>Jumlah</th>
                  <th>Catatan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((exp, idx) => (
                  <tr key={exp.id}>
                    <td>{idx + 1}</td>
                    <td style={{ fontSize: '12px' }}>{new Date(exp.expense_date).toLocaleDateString('id-ID')}</td>
                    <td><strong>{exp.title}</strong></td>
                    <td>
                      <span className="badge badge-muted">
                        <i className={categoryIcons[exp.category] || 'fa-solid fa-receipt'} style={{ marginRight: '6px' }}></i>
                        {categoryLabels[exp.category] || exp.category}
                      </span>
                    </td>
                    <td><strong style={{ color: '#EF4444' }}>-{formatRupiah(exp.amount)}</strong></td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{exp.notes || '-'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setEditData(exp); setShowModal(true); }}
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteModal({ open: true, data: exp })}
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ExpenseModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditData(null); }}
        onSubmit={handleSubmit}
        editData={editData}
      />

      <ConfirmDeleteExpenseModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, data: null })}
        onConfirm={handleDelete}
        expense={deleteModal.data}
      />
    </div>
  );
}
