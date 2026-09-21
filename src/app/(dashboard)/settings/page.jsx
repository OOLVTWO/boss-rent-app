'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { updateFavicon } from '@/lib/favicon';
import { fetchAllRows } from '@/lib/queryColumns';
import { uploadHandoverPhoto } from '@/lib/handoverPhoto';
import { DEFAULT_SERVICE_INTERVAL_KM, DEFAULT_SERVICE_INTERVAL_DAYS } from '@/lib/serviceLog';

// Panel Pengaturan difokuskan untuk ADMINISTRASI saja.
// CMS website publik (hero, galeri, FAQ, rating) dihapus: isinya hanya
// tersimpan di localStorage browser admin, jadi tidak pernah terlihat oleh
// pengunjung website. Key lain di localStorage tetap dipertahankan saat simpan.
const VALID_SETTINGS_TABS = ['business', 'payment', 'wacustom', 'security', 'storage'];
const BIZ_SETTINGS_KEY = 'boss_rent_biz_settings';

const DEFAULT_BIZ_FORM = {
  name: 'BOSS RENT PERERENAN',
  logoUrl: '/images/logoCompany.png',
  location: 'Jl. Pantai Pererenan No.119, Pererenan, Kec. Mengwi, Kabupaten Badung, Bali 80351',
  phone: '+62 812-3710-9751',
  serviceIntervalKm: DEFAULT_SERVICE_INTERVAL_KM,
  serviceIntervalDays: DEFAULT_SERVICE_INTERVAL_DAYS,
};

// Tabel yang ikut dihitung & di-backup. service_logs opsional (migration 002).
const DATA_TABLES = [
  { key: 'vehicles', label: 'Motor', icon: 'fa-solid fa-motorcycle', order: 'created_at' },
  { key: 'transactions', label: 'Transaksi', icon: 'fa-solid fa-file-invoice', order: 'created_at' },
  { key: 'customers', label: 'Customer', icon: 'fa-solid fa-users', order: 'created_at' },
  { key: 'expenses', label: 'Arus Kas', icon: 'fa-solid fa-wallet', order: 'created_at' },
  { key: 'service_logs', label: 'Catatan Servis', icon: 'fa-solid fa-screwdriver-wrench', order: 'created_at', optional: true },
];

// Reads ?tab= so the sidebar "Pengaturan" dropdown links land on the right
// section. Split out because useSearchParams() requires a Suspense boundary.
function TabFromQuery({ onTab }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && VALID_SETTINGS_TABS.includes(tab)) onTab(tab);
  }, [searchParams, onTab]);
  return null;
}

function readSavedBiz() {
  try {
    return JSON.parse(localStorage.getItem(BIZ_SETTINGS_KEY) || '{}') || {};
  } catch {
    return {};
  }
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
  const [activeTab, setActiveTab] = useState('business'); // 'business' | 'payment' | 'wacustom' | 'security' | 'storage'
  const [alert, setAlert] = useState(null);

  // Statistik jumlah data (dihitung di server, TANPA mengunduh isinya)
  const [stats, setStats] = useState({});
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

  // Profil bisnis (dipakai di invoice & pesan WA) + interval servis
  const [bizForm, setBizForm] = useState(DEFAULT_BIZ_FORM);

  // WhatsApp Template State
  const [waSubTab, setWaSubTab] = useState('invoice'); // 'invoice' | 'reminder' | 'gateway'
  const [waInvoiceText, setWaInvoiceText] = useState('');
  const [waReminderText, setWaReminderText] = useState('');
  const [waSavedAlert, setWaSavedAlert] = useState(null);

  const [waGatewayForm, setWaGatewayForm] = useState({ provider: 'fonnte', token: '', enabled: false, endpoint: '' });
  const [testGatewayPhone, setTestGatewayPhone] = useState('');
  const [testingGateway, setTestingGateway] = useState(false);

  // Backup State
  const [backupLoading, setBackupLoading] = useState(false);

  // Migrasi foto serah terima lama (base64 di database) → Supabase Storage
  const [legacyPhotoCount, setLegacyPhotoCount] = useState(null);
  const [migratingPhotos, setMigratingPhotos] = useState(false);
  const [migrateProgress, setMigrateProgress] = useState('');

  useEffect(() => {
    // Defer ke microtask: baca localStorage + setState tidak sinkron di effect
    Promise.resolve().then(() => {
      setWaInvoiceText(getWaTemplate());
      setWaReminderText(getWaReminderTemplate());
      setWaGatewayForm(getWaGatewayConfig());
    });
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

  const showAlert = (message, type = 'success', title = '') => {
    setAlert({
      message,
      type,
      title: title || (type === 'danger' ? 'Pemberitahuan System Error' : 'Berhasil Diperbarui ✓')
    });
  };

  // Hitung jumlah baris per tabel dengan count+head: server hanya mengirim
  // ANGKA, bukan data. (Sebelumnya: download seluruh tabel + foto base64.)
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    const supabase = createClient();
    const results = await Promise.all(
      DATA_TABLES.map(t => supabase.from(t.key).select('id', { count: 'exact', head: true }))
    );
    const next = {};
    DATA_TABLES.forEach((t, i) => {
      next[t.key] = results[i].error ? null : (results[i].count ?? 0);
    });
    setStats(next);

    // Hitung foto lama yang masih berupa base64 (count+head: tidak mengunduh foto)
    const legacy = await supabase.from('transactions')
      .select('id', { count: 'exact', head: true })
      .like('handover_image_url', 'data:%');
    setLegacyPhotoCount(legacy.error ? null : (legacy.count ?? 0));
    setLoadingStats(false);
  }, []);

  // Sekali jalan: pindahkan foto base64 lama ke bucket Storage, satu per satu.
  const handleMigrateLegacyPhotos = async () => {
    setMigratingPhotos(true);
    setMigrateProgress('');
    const supabase = createClient();
    let moved = 0;
    const failed = [];
    try {
      const { data: ids, error } = await supabase.from('transactions')
        .select('id').like('handover_image_url', 'data:%');
      if (error) throw new Error(error.message);

      for (let i = 0; i < ids.length; i += 1) {
        const { id } = ids[i];
        setMigrateProgress(`Memproses foto ${i + 1} dari ${ids.length}…`);
        try {
          const { data: row, error: rowErr } = await supabase.from('transactions')
            .select('handover_image_url').eq('id', id).maybeSingle();
          if (rowErr) throw new Error(rowErr.message);
          const value = row?.handover_image_url;
          if (!value || !value.startsWith('data:')) continue;

          const ref = await uploadHandoverPhoto(supabase, value); // dikompres ulang ±1280px
          const { error: upErr } = await supabase.from('transactions')
            .update({ handover_image_url: ref })
            .eq('id', id)
            .like('handover_image_url', 'data:%');
          if (upErr) throw new Error(upErr.message);
          moved += 1;
        } catch (err) {
          failed.push(`${id.slice(0, 8)}: ${err.message}`);
        }
      }
      if (failed.length) {
        showAlert(`${moved} foto dipindahkan, ${failed.length} gagal: ${failed.join('; ')}`, 'danger');
      } else {
        showAlert(`${moved} foto serah terima lama berhasil dipindahkan ke Storage.`);
      }
    } catch (err) {
      showAlert(`Gagal memindahkan foto: ${err.message}`, 'danger');
    } finally {
      setMigratingPhotos(false);
      setMigrateProgress('');
      fetchStats();
    }
  };

  useEffect(() => {
    // Defer ke microtask: hindari setState sinkron di dalam effect
    Promise.resolve().then(() => {
      fetchStats();
      setPaymentMethodsState(getPaymentMethods());
      const saved = readSavedBiz();
      setBizForm({
        name: saved.name || DEFAULT_BIZ_FORM.name,
        logoUrl: saved.logoUrl || DEFAULT_BIZ_FORM.logoUrl,
        location: saved.location || DEFAULT_BIZ_FORM.location,
        phone: saved.phone || DEFAULT_BIZ_FORM.phone,
        serviceIntervalKm: Number(saved.serviceIntervalKm ?? saved.oilInterval) || DEFAULT_SERVICE_INTERVAL_KM,
        serviceIntervalDays: Number(saved.serviceIntervalDays) || DEFAULT_SERVICE_INTERVAL_DAYS,
      });
    });
  }, [fetchStats]);

  // 📦 FULL BACKUP (JSON) — per tabel dengan paging (tidak terpotong di 1000 baris)
  const handleFullBackupDownload = async () => {
    setBackupLoading(true);
    try {
      const supabase = createClient();
      const data = {};
      for (const t of DATA_TABLES) {
        const { data: rows, error } = await fetchAllRows(() =>
          supabase.from(t.key).select('*').order(t.order, { ascending: true })
        );
        if (error) {
          if (t.optional) continue;
          throw new Error(`${t.label}: ${error.message}`);
        }
        data[t.key] = rows;
      }

      const backupObject = {
        app: 'Boss Rent Pererenan',
        version: '3.0',
        exported_at: new Date().toISOString(),
        note: 'Foto serah terima yang sudah dipindah ke Supabase Storage hanya tersimpan sebagai referensi (storage://...), filenya tidak ikut.',
        data: {
          ...data,
          settings: {
            biz: readSavedBiz(),
            wa_invoice: localStorage.getItem('boss_rent_wa_template') || '',
            wa_reminder: localStorage.getItem('boss_rent_wa_reminder_template') || '',
            wa_gateway: JSON.parse(localStorage.getItem('boss_rent_wa_gateway') || '{}'),
            payment_methods: JSON.parse(localStorage.getItem('boss_rent_payment_methods') || '[]'),
          }
        }
      };

      const dateStr = new Date().toISOString().split('T')[0];
      const blob = new Blob([JSON.stringify(backupObject, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `boss_rent_full_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const summary = DATA_TABLES.filter(t => data[t.key]).map(t => `${data[t.key].length} ${t.label.toLowerCase()}`).join(', ');
      showAlert(`Backup berhasil diunduh (${summary}). Simpan file ini di tempat aman, mis. Google Drive.`);
    } catch (err) {
      showAlert(`Gagal membuat backup: ${err.message}`, 'danger');
    } finally {
      setBackupLoading(false);
    }
  };

  // Logo: disimpan di localStorage browser ini (dipakai header, sidebar, favicon)
  const handleLogoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      showAlert('Ukuran logo maksimal 1 MB. Kecilkan dulu file-nya.', 'danger');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => setBizForm(p => ({ ...p, logoUrl: event.target.result }));
    reader.readAsDataURL(file);
  };

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
    const km = Math.round(Number(bizForm.serviceIntervalKm));
    const days = Math.round(Number(bizForm.serviceIntervalDays));
    if (!(km > 0) || !(days > 0)) {
      showAlert('Interval servis harus berupa angka lebih dari 0.', 'danger');
      return;
    }
    // Gabungkan dengan data lama supaya key lain (mis. konten /fleet di browser ini) tidak hilang.
    const merged = { ...readSavedBiz(), ...bizForm, serviceIntervalKm: km, serviceIntervalDays: days };
    try {
      localStorage.setItem(BIZ_SETTINGS_KEY, JSON.stringify(merged));
    } catch {
      showAlert('Gagal menyimpan: penyimpanan browser penuh. Coba pakai logo yang lebih kecil.', 'danger');
      return;
    }
    if (merged.logoUrl) updateFavicon(merged.logoUrl);
    showAlert('Profil bisnis & interval servis tersimpan.');
  };

  return (
    <div className="fade-in">
      <Suspense fallback={null}>
        <TabFromQuery onTab={setActiveTab} />
      </Suspense>

      <div className="page-header">
        <h2><i className="fa-solid fa-gear" style={{ marginRight: '8px' }}></i> Pengaturan</h2>
        <p>Profil bisnis, metode pembayaran, template WhatsApp, keamanan akun, dan backup data</p>
      </div>

      {/* INTERACTIVE MODAL NOTIFICATION POP-UP WITH OK BUTTON */}
      {alert && (
        <div
          className="modal-overlay"
          style={{ zIndex: 999999, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)' }}
          onClick={() => setAlert(null)}
        >
          <div
            className="modal modal-sm"
            onClick={e => e.stopPropagation()}
            style={{
              textAlign: 'center',
              padding: '28px 24px',
              borderRadius: '20px',
              border: `2px solid ${alert.type === 'danger' ? '#EF4444' : 'var(--brand-primary)'}`,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              background: '#0F172A',
              animation: 'fadeIn 0.25s ease-out'
            }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: alert.type === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              border: `2px solid ${alert.type === 'danger' ? '#EF4444' : '#22C55E'}`,
              color: alert.type === 'danger' ? '#EF4444' : '#22C55E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              margin: '0 auto 16px auto',
              boxShadow: `0 0 24px ${alert.type === 'danger' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`
            }}>
              <i className={alert.type === 'danger' ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-check'}></i>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#F8FAFC', margin: '0 0 8px 0' }}>
              {alert.title || (alert.type === 'danger' ? 'Pemberitahuan System Error' : 'Berhasil Diperbarui ✓')}
            </h3>

            <p style={{ fontSize: '13.5px', color: '#CBD5E1', lineHeight: 1.5, marginBottom: '24px' }}>
              {alert.message}
            </p>

            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => setAlert(null)}
              style={{
                padding: '12px',
                fontSize: '14px',
                fontWeight: 800,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <i className="fa-solid fa-check"></i> OK, Selesai
            </button>
          </div>
        </div>
      )}

      {/* Current section indicator — the section itself is chosen from
          the sidebar "Pengaturan" dropdown, this just confirms what's showing */}
      {(() => {
        const TABS = [
          { id: 'business', label: 'Profil Bisnis', icon: 'fa-solid fa-store' },
          { id: 'payment', label: 'Metode Pembayaran', icon: 'fa-solid fa-credit-card' },
          { id: 'wacustom', label: 'Template WhatsApp', icon: 'fa-brands fa-whatsapp' },
          { id: 'security', label: 'Keamanan & Password', icon: 'fa-solid fa-shield-halved' },
          { id: 'storage', label: 'Data & Backup', icon: 'fa-solid fa-database' },
        ];
        const current = TABS.find(t => t.id === activeTab) || TABS[0];
        return (
          <div style={{ marginBottom: '16px' }}>
            <span className="badge" style={{
              background: 'var(--bg-elevated)', color: 'var(--brand-primary)', border: '1px solid var(--bg-border)',
              fontSize: '12.5px', padding: '6px 14px', fontWeight: 600,
            }}>
              <i className={current.icon} style={{ marginRight: '6px' }}></i>{current.label}
            </span>
          </div>
        );
      })()}

      {/* TAB 1: PROFIL BISNIS (dipakai di invoice/pesan WA, header & sidebar) */}
      {activeTab === 'business' && (
        <form className="card" onSubmit={handleSaveBizSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ margin: 0 }}><i className="fa-solid fa-store" style={{ marginRight: '8px' }}></i> Profil Bisnis</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Nama, alamat, dan nomor WhatsApp muncul di invoice & pesan pengingat. Tersimpan di browser ini.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bizForm.logoUrl || '/images/logoCompany.png'} alt="Logo"
              style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }} />
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                <i className="fa-solid fa-upload"></i> Ganti logo
                <input type="file" accept="image/*" onChange={handleLogoFileUpload} style={{ display: 'none' }} />
              </label>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setBizForm(p => ({ ...p, logoUrl: DEFAULT_BIZ_FORM.logoUrl }))}>
                Pakai logo bawaan
              </button>
            </div>
          </div>

          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label">Nama bisnis</label>
              <input className="form-control" value={bizForm.name} onChange={e => setBizForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Nomor WhatsApp / telepon</label>
              <input className="form-control" value={bizForm.phone} onChange={e => setBizForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Alamat</label>
            <textarea className="form-control" rows={2} value={bizForm.location} onChange={e => setBizForm(p => ({ ...p, location: e.target.value }))} />
          </div>

          <div>
            <h4 style={{ margin: '4px 0 2px' }}><i className="fa-solid fa-screwdriver-wrench" style={{ marginRight: '6px' }}></i> Interval servis rutin</h4>
            <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Motor ditandai &quot;Perlu servis&quot; di halaman Servis Motor & Dashboard jika salah satu batas terlewati.
            </p>
            <div className="form-row cols-2">
              <div className="form-group">
                <label className="form-label">Setiap (km)</label>
                <input type="number" min="1" inputMode="numeric" className="form-control" value={bizForm.serviceIntervalKm}
                  onChange={e => setBizForm(p => ({ ...p, serviceIntervalKm: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Atau setiap (hari)</label>
                <input type="number" min="1" inputMode="numeric" className="form-control" value={bizForm.serviceIntervalDays}
                  onChange={e => setBizForm(p => ({ ...p, serviceIntervalDays: e.target.value }))} required />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">
              <i className="fa-solid fa-floppy-disk"></i> Simpan Profil
            </button>
          </div>
        </form>
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
        <div style={{ maxWidth: '100%' }}>
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

            {/* Sub-tab Selector Chips / Pills Bar */}
            <div className="scrollable-tabs-bar">
              <button
                type="button"
                className={`scrollable-tab-btn ${waSubTab === 'invoice' ? 'active' : ''}`}
                onClick={() => setWaSubTab('invoice')}
              >
                <i className="fa-solid fa-file-invoice"></i> 1. Template Invoice WA
              </button>
              <button
                type="button"
                className={`scrollable-tab-btn ${waSubTab === 'reminder' ? 'active' : ''}`}
                onClick={() => setWaSubTab('reminder')}
              >
                <i className="fa-solid fa-bell"></i> 2. Template Reminder WA (Pengingat)
              </button>
              <button
                type="button"
                className={`scrollable-tab-btn ${waSubTab === 'gateway' ? 'active' : ''}`}
                onClick={() => setWaSubTab('gateway')}
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
                        { tag: '{INVOICE_NUMBER}', label: 'No. Invoice' },
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
                            background: 'rgba(37, 99, 235, 0.12)',
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
        <div style={{ maxWidth: '100%' }}>
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

      {/* TAB 5: DATA & BACKUP */}
      {activeTab === 'storage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <h3 style={{ margin: 0 }}><i className="fa-solid fa-database" style={{ marginRight: '8px' }}></i> Jumlah Data</h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={fetchStats} disabled={loadingStats}>
                <i className={`fa-solid fa-rotate${loadingStats ? ' fa-spin' : ''}`}></i> Muat ulang
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              {DATA_TABLES.map(t => (
                <div key={t.key} style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}><i className={t.icon} style={{ marginRight: '6px' }}></i>{t.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {loadingStats ? '…' : stats[t.key] === null ? '—' : (stats[t.key] ?? 0).toLocaleString('id-ID')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {legacyPhotoCount > 0 && (
            <div className="card" style={{ borderLeft: '4px solid var(--status-warning)' }}>
              <h3 style={{ margin: '0 0 6px' }}><i className="fa-solid fa-images" style={{ marginRight: '8px' }}></i> Pindahkan Foto Lama ke Storage</h3>
              <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Ada {legacyPhotoCount} foto serah terima lama yang masih tersimpan di dalam database (beberapa MB per foto).
                Pindahkan sekali saja: foto dikompres ulang, disimpan di Supabase Storage, dan database hanya menyimpan tautannya.
              </p>
              <button type="button" className="btn btn-primary" onClick={handleMigrateLegacyPhotos} disabled={migratingPhotos}>
                {migratingPhotos
                  ? <><i className="fa-solid fa-spinner fa-spin"></i> {migrateProgress || 'Memproses…'}</>
                  : <><i className="fa-solid fa-truck-arrow-right"></i> Pindahkan {legacyPhotoCount} Foto</>}
              </button>
            </div>
          )}

          <div className="card">
            <h3 style={{ margin: '0 0 6px' }}><i className="fa-solid fa-cloud-arrow-down" style={{ marginRight: '8px' }}></i> Backup Data</h3>
            <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Paket gratis Supabase tidak menyediakan backup otomatis. Unduh backup lengkap (.json) secara berkala,
              mis. seminggu sekali, dan simpan di Google Drive. Ukuran file = kuota transfer Supabase yang terpakai,
              jadi tidak perlu terlalu sering.
            </p>
            <button type="button" className="btn btn-primary" onClick={handleFullBackupDownload} disabled={backupLoading}>
              {backupLoading
                ? <><i className="fa-solid fa-spinner fa-spin"></i> Menyiapkan backup…</>
                : <><i className="fa-solid fa-download"></i> Unduh Backup Lengkap</>}
            </button>
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
                        background: paymentForm.icon === item.icon ? 'rgba(37, 99, 235, 0.15)' : 'var(--bg-elevated)',
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
                  File: <strong>boss_rent_backup.json</strong> ({restoreModalData._displayDate || '-'})
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
