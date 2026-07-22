'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getPaymentMethods, savePaymentMethods, DEFAULT_PAYMENT_METHODS } from '@/lib/paymentMethods';
import {
  getWaTemplate,
  saveWaTemplate,
  DEFAULT_WA_TEMPLATE,
  getWaReminderTemplate,
  saveWaReminderTemplate,
  DEFAULT_WA_REMINDER_TEMPLATE,
  getWaGatewayConfig,
  saveWaGatewayConfig,
  sendWhatsAppGateway
} from '@/lib/countryCodes';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

const FA_ICON_OPTIONS = [
  { icon: 'fa-solid fa-money-bill-wave', label: 'Uang Tunai' },
  { icon: 'fa-solid fa-building-columns', label: 'Bank / Transfer' },
  { icon: 'fa-solid fa-qrcode', label: 'QRIS / Barcode' },
  { icon: 'fa-solid fa-credit-card', label: 'Kartu Kredit / Debit' },
  { icon: 'fa-solid fa-globe', label: 'Wise / International' },
  { icon: 'fa-solid fa-wallet', label: 'E-Wallet' },
  { icon: 'fa-solid fa-receipt', label: 'Faktur / Invoice' },
  { icon: 'fa-solid fa-vault', label: 'Deposit Jaminan' },
];

const COLOR_OPTIONS = [
  { hex: '#22C55E', label: 'Hijau' },
  { hex: '#3B82F6', label: 'Biru' },
  { hex: '#8B5CF6', label: 'Ungu' },
  { hex: '#F59E0B', label: 'Kuning' },
  { hex: '#EF4444', label: 'Merah' },
  { hex: '#06B6D4', label: 'Cyan' },
  { hex: '#EC4899', label: 'Pink' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('storage'); // 'storage', 'payment', 'security', 'business', 'wacustom'
  const [alert, setAlert] = useState(null);

  // Statistics State
  const [stats, setStats] = useState({ vehicles: 0, transactions: 0, expenses: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  // Payment Methods State
  const [paymentMethods, setPaymentMethodsState] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editPayment, setEditPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ id: '', label: '', icon: 'fa-solid fa-building-columns', color: '#3B82F6', active: true });

  // Security / Password State
  const [passForm, setPassForm] = useState({ currentPass: '', newPass: '', confirmPass: '' });
  const [showPass, setShowPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  // Business Settings State
  const [bizForm, setBizForm] = useState({
    name: 'Boss Rent Pererenan',
    location: 'Jl. Pantai Pererenan, Canggu, Badung, Bali',
    phone: '+62 812-3456-7890',
    defaultDeposit: 500000,
    oilInterval: 2000,
    cvtInterval: 6000,
  });

  // WA Template & Gateway State (Dual Templates: Invoice & Reminder + API Gateway)
  const [waSubTab, setWaSubTab] = useState('invoice'); // 'invoice' | 'reminder' | 'gateway'
  const [waInvoiceText, setWaInvoiceText] = useState('');
  const [waReminderText, setWaReminderText] = useState('');
  const [waSavedAlert, setWaSavedAlert] = useState(null);

  const [waGatewayForm, setWaGatewayForm] = useState({ provider: 'fonnte', token: '', enabled: false, endpoint: '' });
  const [testGatewayPhone, setTestGatewayPhone] = useState('');
  const [testingGateway, setTestingGateway] = useState(false);

  // Backup & Restore State
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreModalData, setRestoreModalData] = useState(null);
  const [restoringData, setRestoringData] = useState(false);

  useEffect(() => {
    setWaInvoiceText(getWaTemplate());
    setWaReminderText(getWaReminderTemplate());
    setWaGatewayForm(getWaGatewayConfig());
  }, []);

  const handleSaveWaInvoiceTemplate = (e) => {
    e.preventDefault();
    saveWaTemplate(waInvoiceText);
    showAlert('Format custom WhatsApp Invoice berhasil disimpan!');
    setWaSavedAlert('invoice');
    setTimeout(() => setWaSavedAlert(null), 5000);
  };

  const handleResetWaInvoiceTemplate = () => {
    setWaInvoiceText(DEFAULT_WA_TEMPLATE);
    saveWaTemplate(DEFAULT_WA_TEMPLATE);
    showAlert('Template WhatsApp Invoice dikembalikan ke standar default!');
  };

  const handleSaveWaReminderTemplate = (e) => {
    e.preventDefault();
    saveWaReminderTemplate(waReminderText);
    showAlert('Format custom WhatsApp Reminder (Pengingat) berhasil disimpan!');
    setWaSavedAlert('reminder');
    setTimeout(() => setWaSavedAlert(null), 5000);
  };

  const handleResetWaReminderTemplate = () => {
    setWaReminderText(DEFAULT_WA_REMINDER_TEMPLATE);
    saveWaReminderTemplate(DEFAULT_WA_REMINDER_TEMPLATE);
    showAlert('Template WhatsApp Reminder dikembalikan ke standar default!');
  };

  const handleSaveWaGateway = (e) => {
    e.preventDefault();
    saveWaGatewayConfig(waGatewayForm);
    showAlert('Konfigurasi WhatsApp Gateway API berhasil disimpan!');
  };

  const handleTestWaGateway = async () => {
    if (!testGatewayPhone) {
      showAlert('Masukkan nomor HP penerima pesan tes (misal: 628123456789).', 'danger');
      return;
    }
    setTestingGateway(true);
    const testMsg = `🛵 *BOSS RENT BALI — WA GATEWAY TEST*\n\nHello! This is a test message sent from Boss Rent Pererenan System Gateway API (${waGatewayForm.provider.toUpperCase()}).\n\n✅ Gateway connection is working properly!`;
    const res = await sendWhatsAppGateway(testGatewayPhone, testMsg);
    setTestingGateway(false);

    if (res.success) {
      showAlert(`✓ Tes WA Gateway Berhasil! Pesan terkirim via ${waGatewayForm.provider.toUpperCase()}.`);
    } else if (res.mode === 'direct_link') {
      window.open(res.url, '_blank');
      showAlert('Gateway API tidak aktif / token kosong. Mengalihkan ke WhatsApp Direct Link.');
    } else {
      showAlert(`❌ Gagal mengirim tes WA Gateway: ${res.error || res.message || 'Periksa API Key / Status Gateway.'}`, 'danger');
    }
  };

  const handleInsertInvoiceTag = (tag) => {
    setWaInvoiceText(prev => prev + ` ${tag}`);
  };

  const handleInsertReminderTag = (tag) => {
    setWaReminderText(prev => prev + ` ${tag}`);
  };

  // 📦 1-CLICK FULL BACKUP DOWNLOAD (JSON)
  const handleFullBackupDownload = async () => {
    setBackupLoading(true);
    try {
      const supabase = createClient();
      const [vRes, tRes, eRes] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('expenses').select('*')
      ]);

      const backupObject = {
        app: 'Boss Rent Pererenan',
        version: '2.0',
        exported_at: new Date().toISOString(),
        data: {
          vehicles: vRes.data || [],
          transactions: tRes.data || [],
          expenses: eRes.data || [],
          settings: {
            biz: JSON.parse(localStorage.getItem('boss_rent_biz_settings') || '{}'),
            wa_invoice: localStorage.getItem('boss_rent_wa_template') || '',
            wa_reminder: localStorage.getItem('boss_rent_wa_reminder_template') || '',
            wa_gateway: JSON.parse(localStorage.getItem('boss_rent_wa_gateway') || '{}'),
            payment_methods: JSON.parse(localStorage.getItem('boss_rent_payment_methods') || '[]'),
          }
        }
      };

      const dateStr = new Date().toISOString().split('T')[0];
      const jsonStr = JSON.stringify(backupObject, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `boss_rent_full_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showAlert('✓ Full Backup Database (.json) berhasil diunduh!');
    } catch (err) {
      showAlert(`Gagal mengeksport backup data: ${err.message}`, 'danger');
    } finally {
      setBackupLoading(false);
    }
  };

  // 📦 1-CLICK FULL RESTORE / IMPORT (JSON)
  const handleSelectRestoreFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!json.data || (!json.data.vehicles && !json.data.transactions)) {
          showAlert('File JSON cadangan tidak valid atau rusak.', 'danger');
          return;
        }
        setRestoreModalData(json);
      } catch {
        showAlert('Gagal membaca file JSON. Pastikan format file benar.', 'danger');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteRestore = async () => {
    if (!restoreModalData || !restoreModalData.data) return;
    setRestoringData(true);

    try {
      const supabase = createClient();
      const { vehicles, transactions, expenses, settings } = restoreModalData.data;

      // 1. Restore local storage settings
      if (settings) {
        if (settings.biz) localStorage.setItem('boss_rent_biz_settings', JSON.stringify(settings.biz));
        if (settings.wa_invoice) localStorage.setItem('boss_rent_wa_template', settings.wa_invoice);
        if (settings.wa_reminder) localStorage.setItem('boss_rent_wa_reminder_template', settings.wa_reminder);
        if (settings.wa_gateway) localStorage.setItem('boss_rent_wa_gateway', JSON.stringify(settings.wa_gateway));
        if (settings.payment_methods) localStorage.setItem('boss_rent_payment_methods', JSON.stringify(settings.payment_methods));
      }

      // 2. Restore DB Vehicles
      if (Array.isArray(vehicles) && vehicles.length > 0) {
        await supabase.from('vehicles').upsert(vehicles, { onConflict: 'id' });
      }

      // 3. Restore DB Transactions
      if (Array.isArray(transactions) && transactions.length > 0) {
        await supabase.from('transactions').upsert(transactions, { onConflict: 'id' });
      }

      // 4. Restore DB Expenses
      if (Array.isArray(expenses) && expenses.length > 0) {
        await supabase.from('expenses').upsert(expenses, { onConflict: 'id' });
      }

      setRestoreModalData(null);
      fetchStats();
      showAlert('🎉 Data aplikasi & pengaturan berhasil dipulihkan dari file backup!');
    } catch (err) {
      showAlert(`Terjadi kesalahan saat memulihkan data: ${err.message}`, 'danger');
    } finally {
      setRestoringData(false);
    }
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  // Fetch DB Statistics
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [vRes, tRes, eRes] = await Promise.all([
        fetch('/api/vehicles'),
        fetch('/api/transactions'),
        fetch('/api/expenses'),
      ]);
      const vData = await vRes.json();
      const tData = await tRes.json();
      const eData = await eRes.json();

      setStats({
        vehicles: Array.isArray(vData) ? vData.length : 0,
        transactions: Array.isArray(tData) ? tData.length : 0,
        expenses: Array.isArray(eData) ? eData.length : 0,
      });
    } catch {
      // ignore
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    setPaymentMethodsState(getPaymentMethods());

    // Load business settings from local storage if available
    try {
      const savedBiz = localStorage.getItem('boss_rent_biz_settings');
      if (savedBiz) setBizForm(JSON.parse(savedBiz));
    } catch {
      // ignore
    }
  }, [fetchStats]);

  // Export Data to JSON
  const handleExportData = async (type) => {
    try {
      const res = await fetch(`/api/${type}`);
      const data = await res.json();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_boss_rent_${type}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showAlert(`Backup data ${type} berhasil di-download.`);
    } catch {
      showAlert(`Gagal mengeksport data ${type}.`, 'danger');
    }
  };

  // Save Payment Method (Add / Edit)
  const handleSavePaymentMethod = (e) => {
    e.preventDefault();
    const id = paymentForm.id ? paymentForm.id : paymentForm.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newMethod = { ...paymentForm, id };

    let updated;
    if (editPayment) {
      updated = paymentMethods.map(m => m.id === editPayment.id ? newMethod : m);
    } else {
      updated = [...paymentMethods, newMethod];
    }

    setPaymentMethodsState(updated);
    savePaymentMethods(updated);
    setShowPaymentModal(false);
    setEditPayment(null);
    showAlert('Metode pembayaran berhasil disimpan!');
  };

  // Toggle Payment Method Active Status
  const handleTogglePaymentActive = (id) => {
    const updated = paymentMethods.map(m => m.id === id ? { ...m, active: !m.active } : m);
    setPaymentMethodsState(updated);
    savePaymentMethods(updated);
  };

  // Delete Payment Method
  const handleDeletePaymentMethod = (id) => {
    if (paymentMethods.length <= 1) {
      showAlert('Minimal harus ada 1 metode pembayaran aktif.', 'danger');
      return;
    }
    const updated = paymentMethods.filter(m => m.id !== id);
    setPaymentMethodsState(updated);
    savePaymentMethods(updated);
    showAlert('Metode pembayaran dihapus.');
  };

  // Reset Payment Methods to Default
  const handleResetPaymentMethods = () => {
    setPaymentMethodsState(DEFAULT_PAYMENT_METHODS);
    savePaymentMethods(DEFAULT_PAYMENT_METHODS);
    showAlert('Metode pembayaran dikembalikan ke default.');
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passForm.newPass !== passForm.confirmPass) {
      showAlert('Konfirmasi password baru tidak cocok.', 'danger');
      return;
    }
    if (passForm.newPass.length < 6) {
      showAlert('Password minimal 6 karakter.', 'danger');
      return;
    }

    setSavingPass(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: passForm.newPass });
      if (error) {
        showAlert(error.message || 'Gagal mengubah password.', 'danger');
      } else {
        showAlert('Password berhasil diperbarui! Gunakan password baru saat login berikutnya.');
        setPassForm({ currentPass: '', newPass: '', confirmPass: '' });
      }
    } catch {
      showAlert('Terjadi kesalahan saat mengubah password.', 'danger');
    } finally {
      setSavingPass(false);
    }
  };

  // Save Business Settings
  const handleSaveBizSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('boss_rent_biz_settings', JSON.stringify(bizForm));
    showAlert('Pengaturan operasional rental berhasil disimpan!');
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2><i className="fa-solid fa-gear" style={{ marginRight: '8px' }}></i> Pengaturan Sistem & Operasional</h2>
        <p>Kelola koneksi database, metode pembayaran, keamanan akun, dan konfigurasi rental</p>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.message}</div>}

      {/* Tabs Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', borderBottom: '1px solid var(--bg-border)', paddingBottom: '12px' }}>
        {[
          { id: 'storage', label: 'Database & Storage', icon: 'fa-solid fa-database' },
          { id: 'payment', label: 'Metode Pembayaran', icon: 'fa-solid fa-credit-card' },
          { id: 'wacustom', label: 'Template Invoice WA', icon: 'fa-brands fa-whatsapp' },
          { id: 'security', label: 'Keamanan & Password', icon: 'fa-solid fa-shield-halved' },
          { id: 'business', label: 'Operasional Rental', icon: 'fa-solid fa-sliders' },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                border: `1px solid ${isActive ? 'var(--brand-primary)' : 'var(--bg-border)'}`,
                background: isActive ? 'var(--brand-primary)' : 'var(--bg-card)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <i className={tab.icon}></i>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DATABASE & STORAGE */}
      {activeTab === 'storage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status Box */}
          <div className="card" style={{ borderLeft: '4px solid #22C55E' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(62, 207, 142, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3ECF8E', fontSize: '22px', border: '1px solid rgba(62, 207, 142, 0.3)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M13.35 2.54a1 1 0 0 0-1.7 0l-8.5 13.5A1 1 0 0 0 4 17.5h7v4a1 1 0 0 0 1.7 0l8.5-13.5a1 1 0 0 0-.85-1.5h-7v-3.96z" fill="#3ECF8E"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#3ECF8E' }}>Supabase PostgreSQL Cloud</span>
                    <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '11px' }}>
                      <i className="fa-solid fa-circle" style={{ fontSize: '7px', marginRight: '4px' }}></i> Status Online
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Koneksi realtime database & storage berjalan normal (Region: ap-southeast-1 Singapore)
                  </div>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={fetchStats}>
                <i className="fa-solid fa-rotate" style={{ marginRight: '4px' }}></i> Cek Koneksi
              </button>
            </div>
          </div>

          {/* Table Counts & Storage Cards */}
          <div className="grid-3">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
                <i className="fa-solid fa-motorcycle"></i>
              </div>
              <div className="stat-info">
                <div className="stat-label">Tabel Vehicles</div>
                <div className="stat-value">{loadingStats ? '...' : `${stats.vehicles} Unit`}</div>
                <div className="stat-change">Armada motor terdaftar</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' }}>
                <i className="fa-solid fa-file-invoice-dollar"></i>
              </div>
              <div className="stat-info">
                <div className="stat-label">Tabel Transactions</div>
                <div className="stat-value">{loadingStats ? '...' : `${stats.transactions} Record`}</div>
                <div className="stat-change">Riwayat sewa kendaraan</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
                <i className="fa-solid fa-money-bill-transfer"></i>
              </div>
              <div className="stat-info">
                <div className="stat-label">Tabel Expenses</div>
                <div className="stat-value">{loadingStats ? '...' : `${stats.expenses} Record`}</div>
                <div className="stat-change">Pencatatan pengeluaran</div>
              </div>
            </div>
          </div>

          {/* Export / Backup & Restore Section */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-box-archive" style={{ color: 'var(--brand-primary-light)' }}></i>
              1-Click Backup & Pemulihan (Restore) Database
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              Unduh seluruh database (Armada, Transaksi, Pengeluaran, Pengaturan) dalam 1 file cadangan `.json`, atau pulihkan data dari file cadangan sebelumnya.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: '12px', border: '1px solid var(--bg-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-cloud-arrow-down" style={{ color: '#3B82F6', fontSize: '18px' }}></i>
                  Download Full Backup (.json)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Mengunduh seluruh data aplikasi (Motor, Transaksi, Pengeluaran, & Settings) dalam 1 file JSON bertanggal.
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleFullBackupDownload}
                  disabled={backupLoading}
                  style={{ marginTop: 'auto', width: '100%', background: '#3B82F6', borderColor: '#3B82F6' }}
                >
                  {backupLoading ? (
                    <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Mengunduh Backup...</>
                  ) : (
                    <><i className="fa-solid fa-download" style={{ marginRight: '6px' }}></i> Download Full Backup (.json)</>
                  )}
                </button>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: '12px', border: '1px solid var(--bg-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#22C55E', fontSize: '18px' }}></i>
                  Restore / Import Backup (.json)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Unggah file cadangan `.json` untuk memulihkan seluruh data dan pengaturan ke database aplikasi.
                </div>
                <label className="btn btn-success" style={{ marginTop: 'auto', width: '100%', textAlign: 'center', cursor: 'pointer', background: '#22C55E', borderColor: '#22C55E', color: '#fff', fontWeight: 600 }}>
                  <i className="fa-solid fa-upload" style={{ marginRight: '6px' }}></i> Pilih File Backup (.json) untuk Restore
                  <input type="file" accept=".json" onChange={handleSelectRestoreFile} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--bg-border)', paddingTop: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Ekspor Parsial Satuan:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handleExportData('transactions')}>
                  <i className="fa-solid fa-file-export" style={{ marginRight: '6px' }}></i> Export Transaksi (.json)
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleExportData('vehicles')}>
                  <i className="fa-solid fa-file-export" style={{ marginRight: '6px' }}></i> Export Data Motor (.json)
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleExportData('expenses')}>
                  <i className="fa-solid fa-file-export" style={{ marginRight: '6px' }}></i> Export Pengeluaran (.json)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: METODE PEMBAYARAN (DYNAMIC PAYMENT ADJUSTER) */}
      {activeTab === 'payment' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                  <i className="fa-solid fa-credit-card" style={{ marginRight: '8px', color: 'var(--brand-primary-light)' }}></i>
                  Pengaturan Metode Pembayaran
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Tambah, edit, atau nonaktifkan pilihan metode pembayaran yang tampil saat membuat transaksi sewa
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={handleResetPaymentMethods}>
                  <i className="fa-solid fa-rotate-left" style={{ marginRight: '4px' }}></i> Reset Default
                </button>
                <button className="btn btn-primary" onClick={() => { setEditPayment(null); setPaymentForm({ id: '', label: '', icon: 'fa-solid fa-building-columns', color: '#3B82F6', active: true }); setShowPaymentModal(true); }}>
                  <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Tambah Metode Baru
                </button>
              </div>
            </div>

            {/* Payment Methods List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    border: `1px solid ${method.active ? 'var(--bg-border)' : 'rgba(239, 68, 68, 0.2)'}`,
                    background: method.active ? 'var(--bg-elevated)' : 'rgba(0,0,0,0.2)',
                    opacity: method.active ? 1 : 0.6,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      background: `${method.color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: method.color, fontSize: '18px'
                    }}>
                      <i className={method.icon}></i>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {method.label}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        ID System: <code>{method.id}</code> | Status: {method.active ? <span style={{ color: '#22C55E' }}>Aktif ✓</span> : <span style={{ color: '#EF4444' }}>Non-Aktif ✕</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      className={`btn btn-${method.active ? 'secondary' : 'success'} btn-sm`}
                      onClick={() => handleTogglePaymentActive(method.id)}
                      title={method.active ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      <i className={`fa-solid ${method.active ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      {method.active ? ' Sembunyikan' : ' Tampilkan'}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setEditPayment(method); setPaymentForm(method); setShowPaymentModal(true); }}
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeletePaymentMethod(method.id)}
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: TEMPLATE WHATSAPP CUSTOM (INVOICE & REMINDER) */}
      {activeTab === 'wacustom' && (
        <div style={{ maxWidth: '820px' }}>
          <div className="card">
            {/* Header & Sub-tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-brands fa-whatsapp" style={{ color: '#25D366', fontSize: '22px' }}></i>
                  Custom Format Text WhatsApp (Dual Templates)
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Kelola template pesan otomatis WhatsApp untuk Invoice Transaksi & Pengingat Masa Sewa (Tracking)
                </p>
              </div>
            </div>

            {/* Sub-tab Selector */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--bg-border)', paddingBottom: '12px' }}>
              <button
                type="button"
                className={`btn btn-${waSubTab === 'invoice' ? 'primary' : 'secondary'} btn-sm`}
                onClick={() => setWaSubTab('invoice')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
              >
                <i className="fa-solid fa-file-invoice"></i> 1. Template Invoice WA
              </button>
              <button
                type="button"
                className={`btn btn-${waSubTab === 'gateway' ? 'primary' : 'secondary'} btn-sm`}
                onClick={() => setWaSubTab('gateway')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
              >
                <i className="fa-solid fa-robot"></i> 3. 🤖 WhatsApp Gateway API Config
              </button>
            </div>

            {/* Alert Banner */}
            {waSavedAlert && (
              <div className="alert alert-success mb-4" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22C55E', padding: '14px 18px', borderRadius: '10px' }}>
                <i className="fa-solid fa-circle-check" style={{ fontSize: '20px' }}></i>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>
                    Template WhatsApp {waSavedAlert === 'invoice' ? 'Invoice' : 'Reminder (Pengingat)'} Berhasil Diperbarui!
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                    Format baru telah aktif dan akan digunakan secara otomatis oleh sistem.
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 1: INVOICE TEMPLATE */}
            {waSubTab === 'invoice' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <i className="fa-solid fa-file-invoice" style={{ marginRight: '6px', color: 'var(--brand-primary)' }}></i>
                    Format Pesan WhatsApp Invoice Transaksi
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={handleResetWaInvoiceTemplate}>
                    <i className="fa-solid fa-rotate-left" style={{ marginRight: '4px' }}></i> Reset Default Invoice
                  </button>
                </div>

                <form onSubmit={handleSaveWaInvoiceTemplate}>
                  {/* Tag Placeholder Quick Buttons */}
                  <div style={{ marginBottom: '12px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '10px', border: '1px solid var(--bg-border)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Klik Tag Untuk Sisipkan Variabel Dinamis Invoice:
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[
                        { tag: '{RENTER_NAME}', label: 'Nama Penyewa' },
                        { tag: '{RENTER_PHONE}', label: 'No Phone' },
                        { tag: '{VEHICLE_NAME}', label: 'Nama Motor' },
                        { tag: '{PLATE_NUMBER}', label: 'Plat Motor' },
                        { tag: '{START_DATE}', label: 'Tgl Mulai' },
                        { tag: '{END_DATE}', label: 'Tgl Selesai' },
                        { tag: '{DURATION_DAYS}', label: 'Durasi Hari' },
                        { tag: '{DAILY_RATE}', label: 'Tarif Harian' },
                        { tag: '{TOTAL_PRICE}', label: 'Total Biaya' },
                        { tag: '{DEPOSIT}', label: 'Deposit' },
                        { tag: '{PAYMENT_METHOD}', label: 'Metode Bayar' },
                        { tag: '{PAYMENT_STATUS}', label: 'Status Lunas' },
                        { tag: '{SHOP_NAME}', label: 'Nama Rental' },
                        { tag: '{SHOP_PHONE}', label: 'No HP Rental' },
                        { tag: '{SHOP_LOCATION}', label: 'Lokasi Rental' },
                      ].map(t => (
                        <button
                          key={t.tag}
                          type="button"
                          onClick={() => handleInsertInvoiceTag(t.tag)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            border: '1px solid var(--brand-primary)',
                            background: 'rgba(232, 93, 4, 0.12)',
                            color: 'var(--brand-primary-light)',
                            cursor: 'pointer'
                          }}
                        >
                          + {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <textarea
                      className="form-control"
                      rows={14}
                      value={waInvoiceText}
                      onChange={e => setWaInvoiceText(e.target.value)}
                      style={{ fontFamily: 'monospace', fontSize: '12.5px', lineHeight: 1.5, resize: 'vertical' }}
                      required
                    />
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <button type="submit" className="btn btn-success" style={{ width: '100%', background: '#25D366', borderColor: '#25D366', color: '#fff', fontWeight: 700 }}>
                      <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Simpan Template Invoice WA
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SUB-TAB 2: REMINDER TEMPLATE */}
            {waSubTab === 'reminder' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <i className="fa-solid fa-bell" style={{ marginRight: '6px', color: '#F59E0B' }}></i>
                    Format Pesan WhatsApp Reminder (Tracking Sewa)
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={handleResetWaReminderTemplate}>
                    <i className="fa-solid fa-rotate-left" style={{ marginRight: '4px' }}></i> Reset Default Reminder
                  </button>
                </div>

                <form onSubmit={handleSaveWaReminderTemplate}>
                  {/* Tag Placeholder Quick Buttons */}
                  <div style={{ marginBottom: '12px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '10px', border: '1px solid var(--bg-border)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Klik Tag Untuk Sisipkan Variabel Dinamis Reminder:
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[
                        { tag: '{RENTER_NAME}', label: 'Nama Penyewa' },
                        { tag: '{RENTER_PHONE}', label: 'No Phone' },
                        { tag: '{VEHICLE_NAME}', label: 'Nama Motor' },
                        { tag: '{PLATE_NUMBER}', label: 'Plat Motor' },
                        { tag: '{START_DATE}', label: 'Tgl Mulai' },
                        { tag: '{END_DATE}', label: 'Tgl Selesai' },
                        { tag: '{TIME_LEFT_STATUS}', label: 'Status Sisa Hari/Overdue' },
                        { tag: '{SHOP_NAME}', label: 'Nama Rental' },
                        { tag: '{SHOP_PHONE}', label: 'No HP Rental' },
                        { tag: '{SHOP_LOCATION}', label: 'Lokasi Rental' },
                      ].map(t => (
                        <button
                          key={t.tag}
                          type="button"
                          onClick={() => handleInsertReminderTag(t.tag)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            border: '1px solid #F59E0B',
                            background: 'rgba(245, 158, 11, 0.12)',
                            color: '#F59E0B',
                            cursor: 'pointer'
                          }}
                        >
                          + {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <textarea
                      className="form-control"
                      rows={14}
                      value={waReminderText}
                      onChange={e => setWaReminderText(e.target.value)}
                      style={{ fontFamily: 'monospace', fontSize: '12.5px', lineHeight: 1.5, resize: 'vertical' }}
                      required
                    />
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <button type="submit" className="btn btn-success" style={{ width: '100%', background: '#25D366', borderColor: '#25D366', color: '#fff', fontWeight: 700 }}>
                      <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Simpan Template Reminder WA
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SUB-TAB 3: GATEWAY API CONFIG */}
            {waSubTab === 'gateway' && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-robot" style={{ color: 'var(--brand-primary)' }}></i>
                  Konfigurasi WhatsApp Gateway API (Auto-Send Pesan)
                </div>

                <form onSubmit={handleSaveWaGateway}>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={waGatewayForm.enabled}
                        onChange={e => setWaGatewayForm(p => ({ ...p, enabled: e.target.checked }))}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--brand-primary)' }}
                      />
                      <span>Aktifkan Pengiriman Otomatis via WA Gateway API</span>
                    </label>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', marginLeft: '28px' }}>
                      Jika tidak diaktifkan, sistem akan mengalihkan ke WhatsApp Web/App Direct Link.
                    </div>
                  </div>

                  <div className="form-row cols-2">
                    <div className="form-group">
                      <label className="form-label" htmlFor="wa-provider">
                        <i className="fa-solid fa-server" style={{ marginRight: '6px' }}></i> Provider Gateway
                      </label>
                      <select
                        id="wa-provider"
                        className="form-control"
                        value={waGatewayForm.provider}
                        onChange={e => setWaGatewayForm(p => ({ ...p, provider: e.target.value }))}
                      >
                        <option value="fonnte">Fonnte API (Indonesia / Recommended)</option>
                        <option value="wablas">Wablas Gateway API</option>
                        <option value="webhook">Custom Webhook Endpoint API</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="wa-token">
                        <i className="fa-solid fa-key" style={{ marginRight: '6px' }}></i> API Key / Token <span className="required">*</span>
                      </label>
                      <input
                        id="wa-token"
                        type="password"
                        className="form-control"
                        placeholder="e.g. fonnte_token_xyz"
                        value={waGatewayForm.token}
                        onChange={e => setWaGatewayForm(p => ({ ...p, token: e.target.value }))}
                      />
                    </div>
                  </div>

                  {waGatewayForm.provider !== 'fonnte' && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="wa-endpoint">
                        <i className="fa-solid fa-link" style={{ marginRight: '6px' }}></i> Target Endpoint URL
                      </label>
                      <input
                        id="wa-endpoint"
                        type="url"
                        className="form-control"
                        placeholder="https://api.custom-gateway.com/send"
                        value={waGatewayForm.endpoint}
                        onChange={e => setWaGatewayForm(p => ({ ...p, endpoint: e.target.value }))}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                      <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Simpan Konfigurasi Gateway
                    </button>
                  </div>
                </form>

                {/* TEST SENDER PANEL */}
                <div style={{ marginTop: '24px', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '12px', border: '1px dashed var(--brand-primary)' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--brand-primary-light)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-vial"></i> Uji Coba (Test Send) WA Gateway
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nomor HP Tes (e.g. 628123456789)"
                      value={testGatewayPhone}
                      onChange={e => setTestGatewayPhone(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={handleTestWaGateway}
                      disabled={testingGateway}
                      style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
                    >
                      {testingGateway ? (
                        <><i className="fa-solid fa-spinner fa-spin"></i> Mengirim...</>
                      ) : (
                        <><i className="fa-paper-plane fa-solid"></i> Kirim Tes WA</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: KEAMANAN & PASSWORD */}
      {activeTab === 'security' && (
        <div style={{ maxWidth: '600px' }}>
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
              <i className="fa-solid fa-lock" style={{ marginRight: '8px', color: 'var(--brand-primary-light)' }}></i>
              Ubah Password Administrator
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Perbarui password akun Admin Panel Boss Rent Pererenan untuk menjaga keamanan data
            </p>

            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label" htmlFor="sec-new-pass">
                  <i className="fa-solid fa-key" style={{ marginRight: '6px' }}></i> Password Baru <span className="required">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="sec-new-pass"
                    type={showPass ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Minimal 6 karakter"
                    value={passForm.newPass}
                    onChange={e => setPassForm(p => ({ ...p, newPass: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="sec-confirm-pass">
                  <i className="fa-solid fa-shield-halved" style={{ marginRight: '6px' }}></i> Konfirmasi Password Baru <span className="required">*</span>
                </label>
                <input
                  id="sec-confirm-pass"
                  type={showPass ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Ulangi password baru"
                  value={passForm.confirmPass}
                  onChange={e => setPassForm(p => ({ ...p, confirmPass: e.target.value }))}
                  required
                />
              </div>

              <div style={{ marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary" disabled={savingPass} style={{ width: '100%' }}>
                  {savingPass ? (
                    <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Menyimpan Password...</>
                  ) : (
                    <><i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Simpan Password Baru</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: PENGATURAN OPERASIONAL RENTAL */}
      {activeTab === 'business' && (
        <div style={{ maxWidth: '680px' }}>
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
              <i className="fa-solid fa-sliders" style={{ marginRight: '8px', color: 'var(--brand-primary-light)' }}></i>
              Konfigurasi Operasional Rental
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Atur informasi usaha, nominal deposit default, dan interval jadwal maintenance AI
            </p>

            <form onSubmit={handleSaveBizSettings}>
              <div className="form-group">
                <label className="form-label" htmlFor="biz-name">
                  <i className="fa-solid fa-building" style={{ marginRight: '6px' }}></i> Nama Rental
                </label>
                <input
                  id="biz-name"
                  type="text"
                  className="form-control"
                  value={bizForm.name}
                  onChange={e => setBizForm(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="biz-location">
                  <i className="fa-solid fa-location-dot" style={{ marginRight: '6px' }}></i> Lokasi Rental
                </label>
                <input
                  id="biz-location"
                  type="text"
                  className="form-control"
                  value={bizForm.location}
                  onChange={e => setBizForm(p => ({ ...p, location: e.target.value }))}
                />
              </div>

              <div className="form-row cols-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="biz-phone">
                    <i className="fa-solid fa-phone" style={{ marginRight: '6px' }}></i> WhatsApp Admin
                  </label>
                  <input
                    id="biz-phone"
                    type="text"
                    className="form-control"
                    value={bizForm.phone}
                    onChange={e => setBizForm(p => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="biz-deposit">
                    <i className="fa-solid fa-vault" style={{ marginRight: '6px' }}></i> Default Deposit (Rp)
                  </label>
                  <input
                    id="biz-deposit"
                    type="number"
                    className="form-control"
                    value={bizForm.defaultDeposit}
                    onChange={e => setBizForm(p => ({ ...p, defaultDeposit: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Simpan Konfigurasi Operasional
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT METODE PEMBAYARAN */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <i className="fa-solid fa-credit-card" style={{ marginRight: '6px', color: 'var(--brand-primary-light)' }}></i>
                {editPayment ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran Baru'}
              </div>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSavePaymentMethod}>
              <div className="form-group">
                <label className="form-label" htmlFor="pm-label">
                  <i className="fa-solid fa-tag" style={{ marginRight: '6px' }}></i> Nama Metode Pembayaran <span className="required">*</span>
                </label>
                <input
                  id="pm-label"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Bank BRI, Wise Transfer, PayPal..."
                  value={paymentForm.label}
                  onChange={e => setPaymentForm(p => ({ ...p, label: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fa-solid fa-icons" style={{ marginRight: '6px' }}></i> Pilih Ikon Font Awesome
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {FA_ICON_OPTIONS.map((item) => (
                    <button
                      key={item.icon}
                      type="button"
                      onClick={() => setPaymentForm(p => ({ ...p, icon: item.icon }))}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: `1px solid ${paymentForm.icon === item.icon ? 'var(--brand-primary)' : 'var(--bg-border)'}`,
                        background: paymentForm.icon === item.icon ? 'rgba(232, 93, 4, 0.15)' : 'var(--bg-elevated)',
                        color: paymentForm.icon === item.icon ? 'var(--brand-primary-light)' : 'var(--text-secondary)',
                        fontSize: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <i className={item.icon}></i>
                      <span style={{ fontSize: '10px' }}>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fa-solid fa-palette" style={{ marginRight: '6px' }}></i> Warna Aksentuasi Badge
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {COLOR_OPTIONS.map(c => (
                    <div
                      key={c.hex}
                      onClick={() => setPaymentForm(p => ({ ...p, color: c.hex }))}
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: c.hex, cursor: 'pointer',
                        border: paymentForm.color === c.hex ? '3px solid #fff' : 'none',
                        boxShadow: paymentForm.color === c.hex ? '0 0 10px rgba(255,255,255,0.5)' : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">
                  <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Simpan Metode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      {restoreModalData && (
        <div className="modal-overlay" onClick={() => setRestoreModalData(null)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22C55E' }}>
                  <i className="fa-solid fa-cloud-arrow-up"></i> Confirm Restore Database Backup
                </div>
                <div className="modal-subtitle">
                  File: <strong>boss_rent_backup.json</strong> ({new Date(restoreModalData.exported_at || Date.now()).toLocaleDateString('id-ID')})
                </div>
              </div>
              <button className="modal-close" onClick={() => setRestoreModalData(null)}>✕</button>
            </div>

            <div className="alert alert-warning" style={{ fontSize: '12px', lineHeight: 1.5, marginBottom: '16px' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>
              Proses restore ini akan meng-update/menggabungkan record dari file backup ke Supabase database dan meng-update pengaturan lokal.
            </div>

            <div style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '16px', border: '1px solid var(--bg-border)', marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '10px', color: 'var(--brand-primary-light)' }}>
                Rincian Data Yang Akan Dipulihkan:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                <div>🏍️ Armada Motor: <strong>{restoreModalData.data?.vehicles?.length || 0} unit</strong></div>
                <div>📄 Transaksi: <strong>{restoreModalData.data?.transactions?.length || 0} record</strong></div>
                <div>💸 Pengeluaran: <strong>{restoreModalData.data?.expenses?.length || 0} record</strong></div>
                <div>⚙️ Setting Operasional: <strong>Termasuk ✅</strong></div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRestoreModalData(null)}>Batal</button>
              <button
                type="button"
                className="btn btn-success"
                onClick={handleExecuteRestore}
                disabled={restoringData}
                style={{ background: '#22C55E', borderColor: '#22C55E', color: '#fff', fontWeight: 700 }}
              >
                {restoringData ? (
                  <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Memulihkan Data...</>
                ) : (
                  <><i className="fa-solid fa-check-double" style={{ marginRight: '6px' }}></i> Ya, Pulihkan Data Sekarang</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
