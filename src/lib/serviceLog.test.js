import { describe, it, expect } from 'vitest';
import {
  getServiceStatus,
  getServiceIntervals,
  normalizeServiceLogInput,
  buildServiceExpenseTitle,
  DEFAULT_SERVICE_INTERVAL_KM,
  DEFAULT_SERVICE_INTERVAL_DAYS,
} from './serviceLog';
import { fitDimensions } from './imageCompressor';

const NOW = new Date(2026, 8, 22); // 22 Sep 2026 (lokal)

describe('getServiceStatus', () => {
  it('unknown kalau belum pernah ada data servis', () => {
    const s = getServiceStatus({ current_km: 15000, last_service_km: 0, last_serviced_at: null }, {}, NOW);
    expect(s.level).toBe('unknown');
    expect(s.kmSince).toBeNull();
    expect(s.daysSince).toBeNull();
  });

  it('ok kalau masih jauh dari batas', () => {
    const s = getServiceStatus(
      { current_km: 10500, last_service_km: 10000, last_serviced_at: '2026-09-12' },
      { km: 2000, days: 60 }, NOW
    );
    expect(s.level).toBe('ok');
    expect(s.kmSince).toBe(500);
    expect(s.daysSince).toBe(10);
    expect(s.kmLeft).toBe(1500);
  });

  it('soon kalau sudah >= 80% batas KM', () => {
    const s = getServiceStatus(
      { current_km: 11700, last_service_km: 10000, last_serviced_at: '2026-09-20' },
      { km: 2000, days: 60 }, NOW
    );
    expect(s.level).toBe('soon');
  });

  it('due kalau hari sudah lewat batas walau KM masih sedikit', () => {
    const s = getServiceStatus(
      { current_km: 10100, last_service_km: 10000, last_serviced_at: '2026-07-01' },
      { km: 2000, days: 60 }, NOW
    );
    expect(s.level).toBe('due');
    expect(s.daysLeft).toBeLessThan(0);
  });

  it('pakai default interval kalau input tidak valid', () => {
    const s = getServiceStatus({ current_km: 1, last_service_km: 1, last_serviced_at: '2026-09-22' }, { km: 'x', days: -3 }, NOW);
    expect(s.intervalKm).toBe(DEFAULT_SERVICE_INTERVAL_KM);
    expect(s.intervalDays).toBe(DEFAULT_SERVICE_INTERVAL_DAYS);
  });
});

describe('getServiceIntervals', () => {
  const fakeStorage = (obj) => ({ getItem: () => (obj === null ? null : JSON.stringify(obj)) });
  it('default kalau belum diatur', () => {
    expect(getServiceIntervals(fakeStorage(null))).toEqual({ km: 2000, days: 60 });
  });
  it('membaca pengaturan baru dan fallback ke oilInterval lama', () => {
    expect(getServiceIntervals(fakeStorage({ serviceIntervalKm: 3000, serviceIntervalDays: 45 }))).toEqual({ km: 3000, days: 45 });
    expect(getServiceIntervals(fakeStorage({ oilInterval: 2500 }))).toEqual({ km: 2500, days: 60 });
  });
  it('tahan terhadap JSON rusak', () => {
    expect(getServiceIntervals({ getItem: () => '{rusak' })).toEqual({ km: 2000, days: 60 });
  });
});

describe('normalizeServiceLogInput', () => {
  it('membersihkan input', () => {
    const out = normalizeServiceLogInput({
      vehicle_id: 'abc', service_date: '2026-09-22', km: '12345', items: ['Ban', ' Ban ', '', 'Aki'],
      workshop: '  Bengkel A ', cost: '85000', notes: ' ok ',
    });
    expect(out).toEqual({
      vehicle_id: 'abc', service_date: '2026-09-22', km: 12345, items: ['Ban', 'Aki'],
      workshop: 'Bengkel A', cost: 85000, notes: 'ok',
    });
  });
  it('menolak tanggal/km/biaya tidak valid', () => {
    const out = normalizeServiceLogInput({ service_date: '22/09/2026', km: '-5', cost: 'abc' });
    expect(out.service_date).toBeNull();
    expect(out.km).toBeNull();
    expect(out.cost).toBe(0);
    expect(out.vehicle_id).toBeNull();
  });
});

describe('buildServiceExpenseTitle', () => {
  it('menyertakan plat nomor agar terhubung ke motor', () => {
    expect(buildServiceExpenseTitle({ name: 'Vario 125', plate_number: 'DK 1234 AB' }, ['Ganti oli mesin', 'Busi']))
      .toBe('Servis Motor: Vario 125 (DK 1234 AB) - Ganti oli mesin, Busi');
  });
});

describe('fitDimensions (kompresi foto)', () => {
  it('foto portrait kamera HP dibatasi kedua sisi', () => {
    expect(fitDimensions(3000, 4000, 1280, 1280)).toEqual({ width: 960, height: 1280 });
  });
  it('gaya lama hanya membatasi lebar', () => {
    expect(fitDimensions(1600, 1200, 800)).toEqual({ width: 800, height: 600 });
  });
  it('tidak memperbesar gambar kecil', () => {
    expect(fitDimensions(400, 300, 1280, 1280)).toEqual({ width: 400, height: 300 });
  });
});
