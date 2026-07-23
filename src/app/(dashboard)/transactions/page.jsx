'use client';

import { useState, useEffect, useCallback } from 'react';
import { compressImage } from '@/lib/imageCompressor';
import { getPaymentMethods, getPaymentMethodMeta } from '@/lib/paymentMethods';
import { COUNTRY_CODES, getWhatsAppShareUrl, generateInvoiceText, getFlagImageUrl } from '@/lib/countryCodes';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

const statusBadge = (status) => {
  const map = {
    active: <span className="badge badge-info"><i className="fa-solid fa-spinner" style={{ marginRight: '4px' }}></i> Aktif</span>,
    completed: <span className="badge badge-success"><i className="fa-solid fa-circle-check" style={{ marginRight: '4px' }}></i> Selesai</span>,
    cancelled: <span className="badge badge-danger"><i className="fa-solid fa-circle-xmark" style={{ marginRight: '4px' }}></i> Dibatalkan</span>,
  };
  return map[status] || <span className="badge badge-muted">{status}</span>;
};

const BRANDS = [
  { key: 'honda',    label: 'Honda',          icon: 'fa-solid fa-motorcycle', color: '#EF4444' },
  { key: 'yamaha',   label: 'Yamaha',          icon: 'fa-solid fa-motorcycle', color: '#3B82F6' },
  { key: 'suzuki',   label: 'Suzuki',          icon: 'fa-solid fa-motorcycle', color: '#F59E0B' },
  { key: 'kawasaki', label: 'Kawasaki',        icon: 'fa-solid fa-motorcycle', color: '#22C55E' },
  { key: 'vespa',    label: 'Vespa / Piaggio', icon: 'fa-solid fa-person-biking', color: '#8B5CF6' },
  { key: 'other',    label: 'Merek Lain',      icon: 'fa-solid fa-circle-question', color: '#9898B0' },
];

// ===== BRAND-FIRST VEHICLE PICKER =====
function VehicleCombobox({ vehicles, value, onChange }) {
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [query, setQuery] = useState('');

  const selected = vehicles.find(v => v.id === value);

  useEffect(() => {
    if (selected && !selectedBrand) {
      setSelectedBrand(selected.category || null);
    }
  }, [selected]);

  const brandVehicles = selectedBrand
    ? vehicles.filter(v => (v.category || 'honda') === selectedBrand)
    : [];

  const filteredVehicles = brandVehicles.filter(v => {
    const q = query.toLowerCase();
    return !q || v.name.toLowerCase().includes(q) || v.plate_number.toLowerCase().includes(q);
  });

  const brandMeta = (key) => BRANDS.find(b => b.key === key) || BRANDS[BRANDS.length - 1];

  const handleBrandSelect = (key) => {
    setSelectedBrand(key);
    setQuery('');
    if (value) {
      const currentVehicle = vehicles.find(v => v.id === value);
      if (currentVehicle && (currentVehicle.category || 'honda') !== key) {
        onChange('');
      }
    }
  };

  const handleVehicleSelect = (id) => {
    onChange(id);
    setQuery('');
  };

  return (
    <div className="form-group">
      <label className="form-label">
        <i className="fa-solid fa-motorcycle" style={{ marginRight: '6px' }}></i>
        Pilih Kendaraan Motor <span className="required">*</span>
      </label>

      {/* STEP 1: Brand Filter Buttons */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
          Langkah 1 — Pilih Merek Motor
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {BRANDS.map(brand => {
            const count = vehicles.filter(v => (v.category || 'honda') === brand.key).length;
            const isActive = selectedBrand === brand.key;
            return (
              <button
                key={brand.key}
                type="button"
                onClick={() => handleBrandSelect(brand.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 500,
                  border: `1px solid ${isActive ? brand.color : 'var(--bg-border)'}`,
                  background: isActive ? `${brand.color}22` : 'var(--bg-elevated)',
                  color: isActive ? brand.color : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <i className={brand.icon} style={{ fontSize: '12px' }}></i>
                {brand.label}
                {count > 0 && (
                  <span style={{
                    background: isActive ? brand.color : 'var(--bg-hover)',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    borderRadius: '20px',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    minWidth: '18px',
                    textAlign: 'center'
                  }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 2: Motor List under selected brand */}
      {selectedBrand && (
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
            <i className="fa-solid fa-list" style={{ marginRight: '4px' }}></i>
            Langkah 2 — Pilih Motor {brandMeta(selectedBrand).label}
            {' '}({brandVehicles.length} unit tersedia)
          </div>

          {brandVehicles.length > 3 && (
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Cari nama atau plat nomor..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ paddingLeft: '36px', fontSize: '13px' }}
              />
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', fontSize: '12px' }}></i>
            </div>
          )}

          {filteredVehicles.length === 0 ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              background: 'var(--bg-elevated)',
              borderRadius: '10px',
              border: '1px dashed var(--bg-border)',
              fontSize: '13px',
              color: 'var(--text-muted)'
            }}>
              <i className="fa-solid fa-motorcycle" style={{ fontSize: '24px', display: 'block', marginBottom: '6px', opacity: 0.4 }}></i>
              {brandVehicles.length === 0
                ? `Belum ada motor ${brandMeta(selectedBrand).label} yang tersedia untuk disewa.`
                : 'Tidak ada motor yang cocok dengan pencarian.'}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '8px',
              maxHeight: '220px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {filteredVehicles.map(v => {
                const isSelected = value === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => handleVehicleSelect(v.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1.5px solid ${isSelected ? 'var(--brand-primary)' : 'var(--bg-border)'}`,
                      background: isSelected ? 'rgba(232, 93, 4, 0.12)' : 'var(--bg-elevated)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '6px',
                      background: 'var(--bg-hover)', overflow: 'hidden', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {v.image_url ? (
                        <img src={v.image_url} alt={v.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                      ) : (
                        <i className="fa-solid fa-motorcycle" style={{ fontSize: '16px', color: 'var(--brand-primary)' }}></i>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {v.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--brand-primary-light)', fontWeight: 600 }}>{v.plate_number}</span> • {formatRupiah(v.rate_per_day)}/hr
                      </div>
                    </div>
                    {isSelected && (
                      <i className="fa-solid fa-circle-check" style={{ color: 'var(--brand-primary)', fontSize: '16px', flexShrink: 0 }}></i>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Show currently selected motor badge if brand not picked yet */}
      {selected && !selectedBrand && (
        <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Terpilih: <strong>{selected.name} ({selected.plate_number})</strong>
        </div>
      )}
    </div>
  );
}

// ===== SEARCHABLE COUNTRY CODE PICKER WITH FLAG CDN =====
function CountryCodePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const currentCountry = COUNTRY_CODES.find(c => c.code === value) || COUNTRY_CODES[0];

  const filtered = COUNTRY_CODES.filter(c =>
    c.country.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search)
  );

  return (
    <div style={{ position: 'relative', width: '160px', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="form-control"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          fontWeight: 600,
          cursor: 'pointer',
          padding: '8px 12px',
          background: 'var(--bg-elevated)',
          borderColor: 'var(--bg-border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src={getFlagImageUrl(currentCountry.iso)}
            alt={currentCountry.country}
            style={{ width: '20px', height: '14px', borderRadius: '2px', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span>{currentCountry.code}</span>
        </div>
        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '11px', color: 'var(--text-muted)' }}></i>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          width: '270px',
          maxHeight: '280px',
          background: '#0F172A',
          border: '1px solid var(--brand-primary)',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 9999,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--bg-border)' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Cari 221 negara / kode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              style={{ fontSize: '12px', padding: '6px 10px' }}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                Tidak ditemukan
              </div>
            ) : (
              filtered.map(c => {
                const isSelected = c.code === value;
                return (
                  <div
                    key={`${c.iso}-${c.code}`}
                    onClick={() => {
                      onChange(c.code);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(232, 93, 4, 0.15)' : 'transparent',
                      color: isSelected ? 'var(--brand-primary-light)' : 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: isSelected ? 700 : 500
                    }}
                  >
                    <img
                      src={getFlagImageUrl(c.iso)}
                      alt={c.country}
                      style={{ width: '20px', height: '14px', borderRadius: '2px', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <strong style={{ minWidth: '42px' }}>{c.code}</strong>
                    <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.country}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== SMART PRICE RECOMMENDATION PANEL =====
function SmartPriceRecommendationPanel({ vehicle, startDate, endDate, selectedOptionId, onSelectOption }) {
  if (!vehicle || !startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return null;

  const durationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const dailyRate = Number(vehicle.rate_per_day) || 0;
  const weeklyRate = Number(vehicle.rate_per_week) || 0;
  const monthlyRate = Number(vehicle.rate_per_month) || 0;

  // Option 1: Daily Rate
  const dailyTotal = durationDays * dailyRate;

  // Option 2: Weekly Hybrid Rate
  let weeklyOption = null;
  if (weeklyRate > 0) {
    const weeks = Math.floor(durationDays / 7);
    const remDays = durationDays % 7;
    const mixCost = (weeks * weeklyRate) + (remDays * dailyRate);
    const fullWeeksCeil = Math.ceil(durationDays / 7);
    const flatWeeklyCost = fullWeeksCeil * weeklyRate;

    const bestWeeklyCost = Math.min(mixCost, flatWeeklyCost);
    const isFlatCheaper = flatWeeklyCost < mixCost;

    weeklyOption = {
      id: 'weekly',
      name: 'Weekly Rate Tier',
      badge: 'BEST VALUE (7+ DAYS)',
      total: bestWeeklyCost,
      savings: dailyTotal - bestWeeklyCost,
      detail: isFlatCheaper
        ? `${fullWeeksCeil} full week(s) @ ${formatRupiah(weeklyRate)}`
        : weeks > 0
          ? `${weeks} week(s) @ ${formatRupiah(weeklyRate)}${remDays > 0 ? ` + ${remDays} day(s) @ ${formatRupiah(dailyRate)}` : ''}`
          : `${remDays} day(s) @ ${formatRupiah(dailyRate)}`
    };
  }

  // Option 3: Monthly Hybrid Rate
  let monthlyOption = null;
  if (monthlyRate > 0) {
    const months = Math.floor(durationDays / 30);
    const remDaysMonth = durationDays % 30;
    const remWeeks = Math.floor(remDaysMonth / 7);
    const remDaysFinal = remDaysMonth % 7;

    const effWeekly = weeklyRate > 0 ? weeklyRate : (dailyRate * 7);
    const mixMonthCost = (months * monthlyRate) + (remWeeks * effWeekly) + (remDaysFinal * dailyRate);

    const fullMonthsCeil = Math.max(1, Math.ceil(durationDays / 30));
    const flatMonthCost = fullMonthsCeil * monthlyRate;

    const bestMonthCost = Math.min(mixMonthCost, flatMonthCost);
    const isFlatMonthCheaper = flatMonthCost < mixMonthCost;

    monthlyOption = {
      id: 'monthly',
      name: 'Monthly Rate Tier',
      badge: 'LONG TERM (30+ DAYS)',
      total: bestMonthCost,
      savings: dailyTotal - bestMonthCost,
      detail: isFlatMonthCheaper
        ? `${fullMonthsCeil} full month(s) @ ${formatRupiah(monthlyRate)}`
        : months > 0
          ? `${months} month(s) @ ${formatRupiah(monthlyRate)}${remDaysMonth > 0 ? ` + extra ${remDaysMonth} day(s)` : ''}`
          : `1 month rate @ ${formatRupiah(monthlyRate)}`
    };
  }

  const options = [
    {
      id: 'daily',
      name: 'Standard Daily',
      badge: 'DAILY RATE',
      total: dailyTotal,
      savings: 0,
      detail: `${durationDays} day(s) × ${formatRupiah(dailyRate)}/day`
    }
  ];

  if (weeklyOption) options.push(weeklyOption);
  if (monthlyOption) options.push(monthlyOption);

  // Find lowest price option
  let recommendedId = 'daily';
  let minTotal = dailyTotal;
  options.forEach(opt => {
    if (opt.total < minTotal) {
      minTotal = opt.total;
      recommendedId = opt.id;
    }
  });

  const activeOptionId = selectedOptionId || recommendedId;

  return (
    <div className="smart-calc-panel" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--bg-border)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
      <div className="smart-calc-header" style={{ marginBottom: '12px' }}>
        <div className="smart-calc-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
          <i className="fa-solid fa-wand-magic-sparkles" style={{ color: 'var(--brand-primary)' }}></i>
          <span>Smart Price Calculator</span>
          <span className="smart-calc-days" style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: '12px' }}>{durationDays} Days Duration</span>
        </div>
      </div>

      <div className="smart-calc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
        {options.map(opt => {
          const isRec = opt.id === recommendedId;
          const isSelected = activeOptionId === opt.id;

          return (
            <div
              key={opt.id}
              className={`smart-calc-card`}
              onClick={() => onSelectOption(opt.id, opt.total)}
              style={{
                background: isSelected ? 'rgba(232, 93, 4, 0.1)' : 'var(--bg-elevated)',
                border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--bg-border)'}`,
                borderRadius: '8px',
                padding: '12px',
                cursor: 'pointer',
                position: 'relative',
                textAlign: 'center'
              }}
            >
              {isRec && (
                <div className="rec-ribbon" style={{ fontSize: '9px', fontWeight: 800, color: '#fff', background: 'var(--brand-primary)', padding: '2px 6px', borderRadius: '4px', marginBottom: '6px', display: 'inline-block' }}>
                  <i className="fa-solid fa-crown" style={{ marginRight: '4px' }}></i> Recommended
                </div>
              )}
              <div className="smart-card-name" style={{ fontWeight: 600, fontSize: '12px' }}>{opt.name}</div>
              <div className="smart-card-price" style={{ fontWeight: 800, fontSize: '16px', color: 'var(--brand-primary-light)', margin: '4px 0' }}>{formatRupiah(opt.total)}</div>
              <div className="smart-card-detail" style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>{opt.detail}</div>
              {opt.savings > 0 && (
                <div className="smart-card-savings" style={{ fontSize: '10px', color: '#22C55E', fontWeight: 700 }}>
                  Saves {formatRupiah(opt.savings)}!
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== TRANSACTION MODAL =====
function TransactionModal({ isOpen, onClose, onSubmit, vehicles, editData }) {
  const [form, setForm] = useState({
    vehicle_id: '',
    renter_name: '',
    renter_phone: '',
    renter_id_number: '',
    renter_address: '',
    start_date: '',
    end_date: '',
    deposit: '',
    discount: '',
    customer_image_url: '',
    km_start: '',
    payment_method: 'cash',
    status: 'active',
    notes: '',
  });

  const [countryCode, setCountryCode] = useState('+62');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [appliedGross, setAppliedGross] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setForm({
          vehicle_id: editData.vehicle_id || '',
          renter_name: editData.renter_name || '',
          renter_phone: editData.renter_phone || '',
          renter_id_number: editData.renter_id_number || '',
          renter_address: editData.renter_address || '',
          start_date: editData.start_date || '',
          end_date: editData.end_date || '',
          deposit: editData.deposit || '',
          discount: editData.discount || '',
          customer_image_url: editData.customer_image_url || '',
          km_start: editData.km_start || '',
          payment_method: editData.payment_method || 'cash',
          status: editData.status || 'active',
          notes: editData.notes || '',
        });
        setTotalPrice(editData.total_price || 0);
        setSelectedOptionId(null);
        setAppliedGross(null);

        // Parse phone country code
        if (editData.renter_phone) {
          const parts = editData.renter_phone.trim().split(' ');
          if (parts.length > 1 && parts[0].startsWith('+')) {
            setCountryCode(parts[0]);
            setPhoneNumber(parts.slice(1).join(' '));
          } else {
            setCountryCode('+62');
            setPhoneNumber(editData.renter_phone);
          }
        } else {
          setCountryCode('+62');
          setPhoneNumber('');
        }
      } else {
        setForm({
          vehicle_id: '',
          renter_name: '',
          renter_phone: '+62 ',
          renter_id_number: '',
          start_date: new Date().toISOString().split('T')[0],
          end_date: '',
          deposit: '',
          discount: '',
          customer_image_url: '',
          km_start: '',
          payment_method: 'cash',
          status: 'active',
          notes: '',
        });
        setCountryCode('+62');
        setPhoneNumber('');
        setTotalPrice(0);
        setSelectedOptionId(null);
        setAppliedGross(null);
      }
    }
  }, [editData, isOpen]);

  // Recalculate price automatically with smart recommendations
  useEffect(() => {
    if (form.vehicle_id && form.start_date && form.end_date) {
      const vehicle = vehicles.find(v => v.id === form.vehicle_id);
      if (vehicle) {
        const start = new Date(form.start_date);
        const end = new Date(form.end_date);
        const durationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

        const dailyRate = Number(vehicle.rate_per_day) || 0;
        const weeklyRate = Number(vehicle.rate_per_week) || 0;
        const monthlyRate = Number(vehicle.rate_per_month) || 0;

        const dailyTotal = durationDays * dailyRate;

        // Calculate best default for logic
        let bestGross = dailyTotal;
        let bestOpt = 'daily';

        if (weeklyRate > 0) {
          const mixCost = (Math.floor(durationDays / 7) * weeklyRate) + ((durationDays % 7) * dailyRate);
          const flatCost = Math.ceil(durationDays / 7) * weeklyRate;
          const bestWeekly = Math.min(mixCost, flatCost);
          if (bestWeekly < bestGross) { bestGross = bestWeekly; bestOpt = 'weekly'; }
        }

        if (monthlyRate > 0) {
          const months = Math.floor(durationDays / 30);
          const remDays = durationDays % 30;
          const mixCost = (months * monthlyRate) + (Math.floor(remDays / 7) * (weeklyRate || dailyRate * 7)) + ((remDays % 7) * dailyRate);
          const flatCost = Math.max(1, Math.ceil(durationDays / 30)) * monthlyRate;
          const bestMonthly = Math.min(mixCost, flatCost);
          if (bestMonthly < bestGross) { bestGross = bestMonthly; bestOpt = 'monthly'; }
        }

        const grossToUse = appliedGross !== null ? appliedGross : bestGross;
        const disc = parseFloat(form.discount) || 0;
        setTotalPrice(Math.max(0, grossToUse - disc));

        if (!selectedOptionId) setSelectedOptionId(bestOpt);

        if (!form.km_start && vehicle.current_km) {
          setForm(prev => ({ ...prev, km_start: vehicle.current_km }));
        }
      }
    }
  }, [form.vehicle_id, form.start_date, form.end_date, form.discount, appliedGross, selectedOptionId, vehicles]);

  const handleSelectPricingOption = (optionId, grossAmount) => {
    setSelectedOptionId(optionId);
    setAppliedGross(grossAmount);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImageFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressedDataUrl = await compressImage(file, { maxWidth: 1000, maxHeight: 1000, quality: 0.82 });
      setForm(prev => ({ ...prev, customer_image_url: compressedDataUrl }));
    } catch (err) {
      alert(err.message || 'Gagal memproses gambar.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({ ...form, total_price: totalPrice });
    setLoading(false);
  };

  if (!isOpen) return null;

  const availableVehicles = vehicles.filter(v =>
    v.status === 'available' || (editData && v.id === editData.vehicle_id)
  );

  const selectedVehicleObj = vehicles.find(v => v.id === form.vehicle_id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">
              {editData ? (
                <><i className="fa-solid fa-pen-to-square" style={{ marginRight: '6px' }}></i> Edit Transaksi</>
              ) : (
                <><i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Transaksi Baru</>
              )}
            </div>
            <div className="modal-subtitle">Isi data penyewaan motor & customer</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Searchable Vehicle Picker */}
          <VehicleCombobox
            vehicles={availableVehicles}
            value={form.vehicle_id}
            onChange={(id) => {
              setForm(prev => ({ ...prev, vehicle_id: id }));
              setSelectedOptionId(null);
              setAppliedGross(null);
            }}
          />

          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label" htmlFor="tx-name">
                <i className="fa-solid fa-user" style={{ marginRight: '6px' }}></i> Nama Penyewa <span className="required">*</span>
              </label>
              <input id="tx-name" name="renter_name" type="text" className="form-control" placeholder="Nama lengkap" value={form.renter_name} onChange={handleChange} required />
            </div>

            {/* Phone input with Country Code Selector */}
            <div className="form-group">
              <label className="form-label" htmlFor="tx-phone">
                <i className="fa-solid fa-globe" style={{ marginRight: '6px' }}></i> No. WhatsApp (Kode Negara) <span className="required">*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <CountryCodePicker
                  value={countryCode}
                  onChange={(newCode) => {
                    setCountryCode(newCode);
                    setForm(prev => ({ ...prev, renter_phone: `${newCode} ${phoneNumber}` }));
                  }}
                />
                <input
                  id="tx-phone"
                  name="phone_number"
                  type="tel"
                  className="form-control"
                  placeholder="812345678"
                  value={phoneNumber}
                  onChange={e => {
                    const newNum = e.target.value;
                    setPhoneNumber(newNum);
                    setForm(prev => ({ ...prev, renter_phone: `${countryCode} ${newNum}` }));
                  }}
                  required
                />
              </div>
            </div>
          </div>

          {/* Customer Address Input Field */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-address">
              <i className="fa-solid fa-location-dot" style={{ marginRight: '6px', color: 'var(--brand-primary)' }}></i> Alamat Customer / Lokasi Villa / Hotel Delivery
            </label>
            <input
              id="tx-address"
              name="renter_address"
              type="text"
              className="form-control"
              placeholder="e.g. Villa Bamboo, Jl. Pantai Pererenan No. 88, Canggu, Bali"
              value={form.renter_address || ''}
              onChange={handleChange}
            />
          </div>

          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label" htmlFor="tx-id-num">
                <i className="fa-solid fa-id-card" style={{ marginRight: '6px' }}></i> No. KTP / Paspor / SIM
              </label>
              <input id="tx-id-num" name="renter_id_number" type="text" className="form-control" placeholder="Nomor identitas" value={form.renter_id_number} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-camera" style={{ marginRight: '6px' }}></i> Foto Penyewa / Dokumen KTP
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFile}
                  id="tx-custom-file"
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor="tx-custom-file"
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    padding: '9px 16px',
                    borderRadius: '8px',
                    background: 'var(--bg-elevated)',
                    border: '1px dashed var(--brand-primary)',
                    color: 'var(--brand-primary-light)',
                    fontWeight: 600,
                    width: '100%'
                  }}
                >
                  <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '15px' }}></i>
                  <span>Pilih & Upload Foto KTP</span>
                </label>
              </div>
              {uploading && <div style={{ fontSize: '11px', color: 'var(--brand-primary-light)', marginTop: '4px' }}><i className="fa-solid fa-spinner fa-spin"></i> Mengompresi gambar...</div>}
              {form.customer_image_url && !uploading && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={form.customer_image_url} alt="Preview KTP" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                  <span style={{ fontSize: '11px', color: '#22C55E', fontWeight: 600 }}>
                    <i className="fa-solid fa-circle-check" style={{ marginRight: '4px' }}></i> Foto Berhasil Dimuat
                  </span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm(p => ({ ...p, customer_image_url: '' }))}>Hapus</button>
                </div>
              )}
            </div>
          </div>

          <div className="form-row cols-3">
            <div className="form-group">
              <label className="form-label" htmlFor="tx-start">
                <i className="fa-solid fa-calendar-days" style={{ marginRight: '6px' }}></i> Tanggal Mulai <span className="required">*</span>
              </label>
              <input id="tx-start" name="start_date" type="date" className="form-control" value={form.start_date} onChange={(e) => { handleChange(e); setAppliedGross(null); }} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tx-end">
                <i className="fa-solid fa-calendar-days" style={{ marginRight: '6px' }}></i> Tanggal Selesai <span className="required">*</span>
              </label>
              <input id="tx-end" name="end_date" type="date" className="form-control" value={form.end_date} onChange={(e) => { handleChange(e); setAppliedGross(null); }} min={form.start_date} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tx-km-start">
                <i className="fa-solid fa-gauge-high" style={{ marginRight: '6px' }}></i> KM Awal Odometer
              </label>
              <input id="tx-km-start" name="km_start" type="number" className="form-control" placeholder="e.g. 18500" value={form.km_start} onChange={handleChange} min="0" />
            </div>
          </div>

          {selectedVehicleObj && form.start_date && form.end_date && (
            <SmartPriceRecommendationPanel
              vehicle={selectedVehicleObj}
              startDate={form.start_date}
              endDate={form.end_date}
              selectedOptionId={selectedOptionId}
              onSelectOption={handleSelectPricingOption}
            />
          )}

          <div className="form-row cols-3">
            <div className="form-group">
              <label className="form-label" htmlFor="tx-discount">
                <i className="fa-solid fa-tags" style={{ marginRight: '6px' }}></i> Diskon Potongan (Rp)
              </label>
              <input id="tx-discount" name="discount" type="number" className="form-control" placeholder="0" value={form.discount} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tx-deposit">
                <i className="fa-solid fa-vault" style={{ marginRight: '6px' }}></i> Deposit Jaminan (Rp)
              </label>
              <input id="tx-deposit" name="deposit" type="number" className="form-control" placeholder="0" value={form.deposit} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tx-payment">
                <i className="fa-solid fa-credit-card" style={{ marginRight: '6px' }}></i> Metode Pembayaran
              </label>
              <select id="tx-payment" name="payment_method" className="form-control" value={form.payment_method} onChange={handleChange}>
                {getPaymentMethods().filter(m => m.active).map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {totalPrice > 0 && (
            <div className="alert alert-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <i className="fa-solid fa-coins" style={{ marginRight: '6px' }}></i> Total Setelah Diskon: <strong>{formatRupiah(totalPrice)}</strong>
              </div>
              {form.discount > 0 && (
                <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                  Hemat {formatRupiah(form.discount)}
                </span>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="tx-notes">
              <i className="fa-regular fa-note-sticky" style={{ marginRight: '6px' }}></i> Catatan Tambahan
            </label>
            <textarea id="tx-notes" name="notes" className="form-control" rows={2} placeholder="Catatan khusus..." value={form.notes} onChange={handleChange} style={{ resize: 'vertical' }} />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading || uploading}>
              {loading ? (
                <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '4px' }}></i> Menyimpan...</>
              ) : (
                <><i className="fa-solid fa-floppy-disk" style={{ marginRight: '4px' }}></i> Simpan Transaksi</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== MODAL KIRIM INVOICE WHATSAPP =====
function WhatsAppInvoiceModal({ isOpen, onClose, tx, vehicle }) {
  const [activeTab, setActiveTab] = useState('text');
  const [customMsg, setCustomMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const paymentMeta = getPaymentMethodMeta(tx?.payment_method);

  useEffect(() => {
    if (isOpen && tx) {
      const generated = generateInvoiceText(tx, vehicle, paymentMeta);
      setCustomMsg(generated);
    }
  }, [isOpen, tx, vehicle, paymentMeta]);

  if (!isOpen || !tx) return null;

  const waUrl = getWhatsAppShareUrl(tx.renter_phone, customMsg);

  const handleCopy = () => {
    navigator.clipboard.writeText(customMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-brands fa-whatsapp" style={{ color: '#25D366', fontSize: '20px' }}></i>
              Kirim Invoice WhatsApp & Pesan Customer
            </div>
            <div className="modal-subtitle">
              Penyewa: <strong>{tx.renter_name}</strong> ({tx.renter_phone})
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            className={`btn btn-${activeTab === 'text' ? 'primary' : 'secondary'} btn-sm`}
            onClick={() => setActiveTab('text')}
          >
            <i className="fa-brands fa-whatsapp" style={{ marginRight: '6px' }}></i> Format Text WA
          </button>
          <button
            className={`btn btn-${activeTab === 'visual' ? 'primary' : 'secondary'} btn-sm`}
            onClick={() => setActiveTab('visual')}
          >
            <i className="fa-solid fa-file-invoice" style={{ marginRight: '6px' }}></i> Kartu Invoice Gambar / Print
          </button>
        </div>

        {activeTab === 'text' ? (
          <div>
            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-pen-to-square" style={{ marginRight: '6px' }}></i> Text Invoice Formal (Dapat Diedit):
              </label>
              <textarea
                className="form-control"
                rows={12}
                value={customMsg}
                onChange={e => setCustomMsg(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '12.5px', lineHeight: 1.5, resize: 'vertical' }}
              />
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={handleCopy}>
                <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} style={{ marginRight: '6px' }}></i>
                {copied ? 'Tercopy!' : 'Copy Text Invoice'}
              </button>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-success"
                style={{ textDecoration: 'none', background: '#25D366', borderColor: '#25D366', color: '#fff' }}
              >
                <i className="fa-brands fa-whatsapp" style={{ marginRight: '6px', fontSize: '16px' }}></i>
                Buka WhatsApp & Kirim Pesan
              </a>
            </div>
          </div>
        ) : (
          /* VISUAL INVOICE CARD FOR PRINT / IMAGE SHARE */
          <div>
            <div id="visual-invoice-card" style={{
              background: '#0F172A',
              border: '1px solid var(--bg-border)',
              borderRadius: '16px',
              padding: '24px',
              color: '#F8FAFC',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', fontWeight: 800, color: 'var(--brand-primary-light)' }}>
                    <i className="fa-solid fa-motorcycle"></i>
                    BOSS RENT PERERENAN
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                    Jl. Pantai Pererenan, Canggu, Badung, Bali • WA: +62 812-3456-7890
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge" style={{ background: tx.status === 'completed' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: tx.status === 'completed' ? '#22C55E' : '#3B82F6', border: `1px solid ${tx.status === 'completed' ? '#22C55E' : '#3B82F6'}`, padding: '6px 12px', fontSize: '12px' }}>
                    {tx.status === 'completed' ? 'PAID / LUNAS ✓' : 'ACTIVE RENTAL 🛵'}
                  </span>
                </div>
              </div>

              {/* Renter & Vehicle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Penyewa / Renter</div>
                  <div style={{ fontWeight: 700, fontSize: '15px', marginTop: '2px' }}>{tx.renter_name}</div>
                  <div style={{ fontSize: '12px', color: '#CBD5E1' }}>{tx.renter_phone}</div>
                  {tx.renter_address && (
                    <div style={{ fontSize: '11.5px', color: 'var(--brand-primary-light)', marginTop: '4px' }}>
                      <i className="fa-solid fa-location-dot" style={{ marginRight: '4px' }}></i> {tx.renter_address}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Motor / Vehicle</div>
                  <div style={{ fontWeight: 700, fontSize: '15px', marginTop: '2px', color: 'var(--brand-primary-light)' }}>{vehicle?.name || 'Motor'}</div>
                  <div style={{ fontSize: '12px', color: '#CBD5E1' }}>Plat: <strong>{vehicle?.plate_number}</strong></div>
                </div>
              </div>

              {/* Dates & Pricing Table */}
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', textAlign: 'left' }}>
                    <th style={{ padding: '8px 0' }}>DESKRIPSI</th>
                    <th style={{ padding: '8px 0', textAlign: 'right' }}>DURASI / VALUE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px 0' }}>Periode Sewa ({new Date(tx.start_date).toLocaleDateString('id-ID')} s/d {new Date(tx.end_date).toLocaleDateString('id-ID')})</td>
                    <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600 }}>{tx.duration_days} Hari</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px 0' }}>Tarif Sewa Harian</td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>{formatRupiah(vehicle?.rate_per_day)} / hari</td>
                  </tr>
                  {tx.discount > 0 && (
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#F59E0B' }}>
                      <td style={{ padding: '10px 0' }}>Diskon Potongan Harga</td>
                      <td style={{ padding: '10px 0', textAlign: 'right' }}>-{formatRupiah(tx.discount)}</td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px 0' }}>Deposit Jaminan (Held)</td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>{formatRupiah(tx.deposit)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 800, fontSize: '15px' }}>
                    <td style={{ padding: '12px 0', color: 'var(--brand-primary-light)' }}>TOTAL PEMBAYARAN</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', color: 'var(--brand-primary-light)' }}>{formatRupiah(tx.total_price)}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94A3B8' }}>
                <div>Metode Pembayaran: <strong style={{ color: paymentMeta.color }}><i className={paymentMeta.icon}></i> {paymentMeta.label}</strong></div>
                <div>Thank you for choosing Boss Rent Bali! 🌴</div>
              </div>
            </div>

            <div className="modal-footer" style={{ marginTop: '16px', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={handlePrint}>
                <i className="fa-solid fa-print" style={{ marginRight: '6px' }}></i> Cetak / Print PDF
              </button>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-success"
                style={{ textDecoration: 'none', background: '#25D366', borderColor: '#25D366', color: '#fff' }}
              >
                <i className="fa-brands fa-whatsapp" style={{ marginRight: '6px', fontSize: '16px' }}></i> Kirim Invoice WA
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== MODAL COMPLETE / FINISH TRANSACTION =====
function CompleteModal({ isOpen, onClose, onConfirm, tx }) {
  const [kmEnd, setKmEnd] = useState('');
  const [damageFee, setDamageFee] = useState('');
  const [issuesReported, setIssuesReported] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && tx) {
      setKmEnd(tx.km_end || tx.km_start || '');
      setDamageFee(tx.damage_fee || '');
      setIssuesReported(tx.issues_reported || '');
    }
  }, [isOpen, tx]);

  if (!isOpen || !tx) return null;

  const deposit = Number(tx.deposit) || 0;
  const dmgFee = Number(damageFee) || 0;
  const refundAmount = Math.max(0, deposit - dmgFee);
  const totalKmDriven = (Number(kmEnd) || 0) - (Number(tx.km_start) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onConfirm(tx.id, {
      vehicle_id: tx.vehicle_id,
      km_end: Number(kmEnd) || tx.km_start || 0,
      damage_fee: dmgFee,
      issues_reported: issuesReported,
    });
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">
              <i className="fa-solid fa-flag-checkered" style={{ marginRight: '6px', color: '#22C55E' }}></i>
              Selesaikan Transaksi & Pengembalian Deposit
            </div>
            <div className="modal-subtitle">Customer: <strong>{tx.renter_name}</strong> | Motor: <strong>{tx.vehicles?.name} ({tx.vehicles?.plate_number})</strong></div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="comp-km">
              <i className="fa-solid fa-gauge-high" style={{ marginRight: '6px' }}></i> KM Akhir Odometer Kendaraan <span className="required">*</span>
            </label>
            <input
              id="comp-km"
              type="number"
              className="form-control"
              placeholder="e.g. 19200"
              value={kmEnd}
              onChange={e => setKmEnd(e.target.value)}
              min={tx.km_start || 0}
              required
            />
            {totalKmDriven > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--brand-primary-light)', marginTop: '4px' }}>
                <i className="fa-solid fa-route" style={{ marginRight: '4px' }}></i>
                Total jarak tempuh selama sewa: <strong>+{totalKmDriven.toLocaleString('id-ID')} KM</strong>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="comp-damage">
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i> Denda Kerusakan / Keterlambatan (Rp)
            </label>
            <input
              id="comp-damage"
              type="number"
              className="form-control"
              placeholder="0 (Potong dari deposit)"
              value={damageFee}
              onChange={e => setDamageFee(e.target.value)}
              min="0"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="comp-issues">
              <i className="fa-solid fa-robot" style={{ marginRight: '6px' }}></i> Keluhan / Kendala Kendaraan (Untuk AI Diagnostic)
            </label>
            <textarea
              id="comp-issues"
              className="form-control"
              rows={2}
              placeholder="e.g. Rem agak blong, bodi kanan lecet, oli mesin minta ganti..."
              value={issuesReported}
              onChange={e => setIssuesReported(e.target.value)}
              style={{ resize: 'vertical' }}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              *Catatan keluhan akan otomatis dianalisis oleh engine <strong>AI Maintenance & Diagnostic</strong>.
            </div>
          </div>

          <div className="alert alert-info" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Deposit Jaminan Awal:</span>
              <strong>{formatRupiah(deposit)}</strong>
            </div>
            {dmgFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EF4444' }}>
                <span>Dipotong Denda / Kerusakan:</span>
                <strong>-{formatRupiah(dmgFee)}</strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', fontSize: '15px', fontWeight: 800, color: '#22C55E' }}>
              <span>Deposit Yang Dikembalikan Ke Customer:</span>
              <span>{formatRupiah(refundAmount)}</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? (
                <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '4px' }}></i> Menyimpan...</>
              ) : (
                <><i className="fa-solid fa-check" style={{ marginRight: '4px' }}></i> Selesaikan Transaksi</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SuccessModal({ isOpen, onClose, message }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.2)', color: '#22C55E', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <i className="fa-solid fa-circle-check"></i>
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Transaksi Selesai!</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>{message}</p>
        <button className="btn btn-primary btn-block" onClick={onClose}>
          Selesai / Tutup
        </button>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><i className="fa-solid fa-trash-can" style={{ marginRight: '6px' }}></i> Hapus Transaksi?</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Transaksi akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Batal</button>
          <button className="btn btn-danger" onClick={() => { onConfirm(); onClose(); }}>Hapus Permanen</button>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN TRANSACTIONS PAGE =====
export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [completeModal, setCompleteModal] = useState({ open: false, tx: null });
  const [waModal, setWaModal] = useState({ open: false, tx: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, txId: null });
  const [successModal, setSuccessModal] = useState({ open: false, message: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [txRes, vRes] = await Promise.all([
      fetch('/api/transactions'),
      fetch('/api/vehicles'),
    ]);
    const txData = await txRes.json();
    const vData = await vRes.json();
    setTransactions(Array.isArray(txData) ? txData : []);
    setVehicles(Array.isArray(vData) ? vData : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmit = async (formData) => {
    const isEdit = !!editData;
    const url = isEdit ? `/api/transactions/${editData.id}` : '/api/transactions';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setShowModal(false);
      setEditData(null);
      fetchAll();
    } else {
      const err = await res.json();
      alert(`Gagal: ${err.error}`);
    }
  };

  const handleComplete = async (txId, completeData) => {
    const { vehicle_id, km_end, damage_fee, issues_reported } = completeData;

    // 1. Update Transaction status to 'completed'
    const txRes = await fetch(`/api/transactions/${txId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        km_end,
        damage_fee,
        issues_reported,
      }),
    });

    // 2. Update Vehicle odometer & set status back to 'available'
    if (vehicle_id && km_end > 0) {
      await fetch(`/api/vehicles/${vehicle_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_km: km_end,
          status: 'available',
        }),
      });
    }

    if (txRes.ok) {
      const tx = transactions.find(t => t.id === txId);
      const deposit = Number(tx?.deposit) || 0;
      const refund = Math.max(0, deposit - Number(damage_fee));
      setSuccessModal({
        open: true,
        message: `Transaksi telah diselesaikan! Odometer motor diperbarui ke ${km_end.toLocaleString('id-ID')} KM. Deposit sebesar ${formatRupiah(refund)} dikembalikan ke customer.`
      });
      fetchAll();
    } else {
      alert('Gagal menyelesaikan transaksi.');
    }
  };

  const handleDelete = async (id) => {
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchAll();
    } else {
      alert('Gagal menghapus transaksi.');
    }
  };

  const filtered = transactions.filter(tx => {
    const matchSearch =
      tx.renter_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.renter_phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.vehicles?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.vehicles?.plate_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || tx.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2><i className="fa-solid fa-file-invoice-dollar" style={{ marginRight: '8px' }}></i> Kelola Transaksi Sewa</h2>
          <p>Catat transaksi penyewaan motor, kirim invoice WhatsApp, dan kelola deposit jaminan</p>
        </div>
      </div>

      <div className="page-actions">
        <div className="filter-bar">
          <div className="search-bar">
            <span className="search-bar-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
            <input
              type="text"
              className="form-control"
              placeholder="Cari penyewa, no HP, atau nama/plat motor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>
        <button
          id="btn-add-transaction"
          className="btn btn-primary"
          onClick={() => { setEditData(null); setShowModal(true); }}
        >
          <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Transaksi Baru
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          {loading ? (
            <div className="table-empty"><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div className="table-empty">
              <div className="table-empty-icon"><i className="fa-solid fa-file-invoice"></i></div>
              <p>Tidak ada transaksi ditemukan</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Motor</th>
                  <th>Mulai / Selesai</th>
                  <th>KM Odometer</th>
                  <th>Total & Diskon</th>
                  <th>Denda / Deposit</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx, idx) => (
                  <tr key={tx.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-card-hover)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {tx.customer_image_url ? (
                            <img src={tx.customer_image_url} alt={tx.renter_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                          ) : (
                            <i className="fa-solid fa-motorcycle" style={{ fontSize: '14px', color: 'var(--brand-primary)' }}></i>
                          )}
                        </div>
                        <div>
                          <strong>{tx.renter_name}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {tx.renter_phone}
                            {tx.payment_method && (
                              <span style={{ marginLeft: '6px', color: getPaymentMethodMeta(tx.payment_method).color, fontWeight: 600 }}>
                                • <i className={getPaymentMethodMeta(tx.payment_method).icon} style={{ marginRight: '3px' }}></i>
                                {getPaymentMethodMeta(tx.payment_method).label}
                              </span>
                            )}
                          </div>
                          {tx.renter_address && (
                            <div style={{ fontSize: '10.5px', color: 'var(--brand-primary-light)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }} title={tx.renter_address}>
                              <i className="fa-solid fa-location-dot" style={{ marginRight: '3px' }}></i>
                              {tx.renter_address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{tx.vehicles?.name || '-'}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.vehicles?.plate_number}</div>
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      <div><i className="fa-solid fa-calendar-days" style={{ marginRight: '4px', fontSize: '11px', color: 'var(--brand-primary-light)' }}></i> {new Date(tx.start_date).toLocaleDateString('id-ID')} s/d</div>
                      <div><i className="fa-solid fa-calendar-days" style={{ marginRight: '4px', fontSize: '11px', color: 'var(--brand-primary-light)' }}></i> {new Date(tx.end_date).toLocaleDateString('id-ID')} ({tx.duration_days} hari)</div>
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      <div>Start: <strong>{tx.km_start ? `${tx.km_start} KM` : '-'}</strong></div>
                      <div>End: <strong>{tx.km_end ? `${tx.km_end} KM` : '-'}</strong></div>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--brand-primary-light)' }}>{formatRupiah(tx.total_price)}</strong>
                      {tx.discount > 0 && (
                        <div style={{ fontSize: '11px', color: '#F59E0B' }}>
                          Diskon: -{formatRupiah(tx.discount)}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      <div>Dep: {formatRupiah(tx.deposit)}</div>
                      {tx.damage_fee > 0 && (
                        <div style={{ color: '#EF4444', fontWeight: 700 }}>
                          Denda: +{formatRupiah(tx.damage_fee)}
                        </div>
                      )}
                    </td>
                    <td>{statusBadge(tx.status)}</td>
                    <td>
                      <div className="flex gap-2">
                        {/* WhatsApp Invoice Button */}
                        <button
                          className="btn btn-success btn-sm"
                          title="Kirim Invoice WhatsApp"
                          style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
                          onClick={() => setWaModal({ open: true, tx })}
                        >
                          <i className="fa-brands fa-whatsapp"></i>
                        </button>

                        {tx.status === 'active' && (
                          <button
                            className="btn btn-success btn-sm"
                            title="Tandai Selesai & Penyesuaian Deposit"
                            onClick={() => setCompleteModal({ open: true, tx })}
                          >
                            <i className="fa-solid fa-check"></i>
                          </button>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Edit"
                          onClick={() => { setEditData(tx); setShowModal(true); }}
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          title="Hapus"
                          onClick={() => setDeleteModal({ open: true, txId: tx.id })}
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

      {/* Modals */}
      <TransactionModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditData(null); }}
        onSubmit={handleSubmit}
        vehicles={vehicles}
        editData={editData}
      />

      <WhatsAppInvoiceModal
        isOpen={waModal.open}
        onClose={() => setWaModal({ open: false, tx: null })}
        tx={waModal.tx}
        vehicle={waModal.tx?.vehicles}
      />

      <CompleteModal
        isOpen={completeModal.open}
        onClose={() => setCompleteModal({ open: false, tx: null })}
        onConfirm={handleComplete}
        tx={completeModal.tx}
      />

      <SuccessModal
        isOpen={successModal.open}
        onClose={() => setSuccessModal({ open: false, message: '' })}
        message={successModal.message}
      />

      <ConfirmDeleteModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, txId: null })}
        onConfirm={() => handleDelete(deleteModal.txId)}
      />
    </div>
  );
}
