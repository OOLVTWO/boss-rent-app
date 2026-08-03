// ─────────────────────────────────────────────────────────────
// Unit tests — Shared Finance Engine (@/lib/finance)
//
// Ini adalah test untuk kode yang menghitung UANG (omset, pengeluaran,
// bagi hasil investor). Regresi di sini = salah hitung bagi hasil client.
// Timezone dikunci ke Asia/Makassar via vitest.config.js.
// ─────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
  formatRupiah,
  getLocalDateStr,
  getLocalMonthStr,
  toLocalDateStr,
  isIncomeEntry,
  isPaidTransaction,
  isInvestorVehicle,
  getVehicleSharePct,
  expenseMatchesVehicle,
  calcVehicleRevenue,
  calcInvestorPayouts,
  calcFinancialSummary,
} from './finance';

// ── formatRupiah ──
describe('formatRupiah', () => {
  const compact = s => s.replace(/[\s ]/g, '');

  it('memformat angka dengan pemisah ribuan id-ID', () => {
    expect(compact(formatRupiah(150000))).toBe('Rp150.000');
    expect(compact(formatRupiah(1234567))).toBe('Rp1.234.567');
  });

  it('membulatkan desimal', () => {
    expect(compact(formatRupiah(1234567.6))).toBe('Rp1.234.568');
  });

  it('aman untuk 0, null, dan undefined', () => {
    expect(compact(formatRupiah(0))).toBe('Rp0');
    expect(compact(formatRupiah(null))).toBe('Rp0');
    expect(compact(formatRupiah(undefined))).toBe('Rp0');
  });
});

// ── Helper tanggal lokal (regresi bug timezone UTC vs WITA) ──
describe('getLocalDateStr / getLocalMonthStr', () => {
  it('format YYYY-MM-DD dengan padding nol', () => {
    expect(getLocalDateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(getLocalDateStr(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('format YYYY-MM', () => {
    expect(getLocalMonthStr(new Date(2026, 7, 3))).toBe('2026-08');
    expect(getLocalMonthStr(new Date(2026, 0, 15))).toBe('2026-01');
  });
});

describe('toLocalDateStr (konversi timestamp UTC → tanggal WITA)', () => {
  it('timestamp UTC lewat tengah malam WITA masuk tanggal BERIKUTNYA', () => {
    // 28 Feb 2026 16:30 UTC = 1 Mar 2026 00:30 WITA
    expect(toLocalDateStr('2026-02-28T16:30:00.000Z')).toBe('2026-03-01');
  });

  it('timestamp UTC sebelum jam 16:00 masih di tanggal yang sama', () => {
    // 28 Feb 2026 15:59:59 UTC = 28 Feb 2026 23:59:59 WITA
    expect(toLocalDateStr('2026-02-28T15:59:59.000Z')).toBe('2026-02-28');
  });

  it('menerima timestamp dengan offset eksplisit', () => {
    expect(toLocalDateStr('2026-08-03T10:00:00+08:00')).toBe('2026-08-03');
  });

  it('input kosong / invalid mengembalikan string kosong', () => {
    expect(toLocalDateStr('')).toBe('');
    expect(toLocalDateStr(null)).toBe('');
    expect(toLocalDateStr(undefined)).toBe('');
    expect(toLocalDateStr('bukan-tanggal')).toBe('');
  });
});

// ── isIncomeEntry ──
describe('isIncomeEntry', () => {
  it('type income → true', () => {
    expect(isIncomeEntry({ type: 'income' })).toBe(true);
  });

  it('kategori legacy income_* / *_income → true', () => {
    expect(isIncomeEntry({ category: 'income_rent' })).toBe(true);
    expect(isIncomeEntry({ category: 'other_income' })).toBe(true);
  });

  it('pengeluaran biasa → false', () => {
    expect(isIncomeEntry({ type: 'expense', category: 'service' })).toBe(false);
    expect(isIncomeEntry({ category: 'service' })).toBe(false);
  });

  it('input kosong → false', () => {
    expect(isIncomeEntry(null)).toBe(false);
    expect(isIncomeEntry({})).toBe(false);
  });
});

// ── isPaidTransaction (aturan cash basis) ──
describe('isPaidTransaction', () => {
  it('completed → selalu diakui (meskipun payment_status unpaid)', () => {
    expect(isPaidTransaction({ status: 'completed', payment_status: 'paid' })).toBe(true);
    expect(isPaidTransaction({ status: 'completed', payment_status: 'unpaid' })).toBe(true);
  });

  it('active + paid → diakui', () => {
    expect(isPaidTransaction({ status: 'active', payment_status: 'paid' })).toBe(true);
  });

  it('active + payment_status kosong (data lama) → diakui', () => {
    expect(isPaidTransaction({ status: 'active', payment_status: null })).toBe(true);
    expect(isPaidTransaction({ status: 'active' })).toBe(true);
  });

  it('active + unpaid → BELUM diakui', () => {
    expect(isPaidTransaction({ status: 'active', payment_status: 'unpaid' })).toBe(false);
  });

  it('cancelled → tidak pernah diakui', () => {
    expect(isPaidTransaction({ status: 'cancelled', payment_status: 'paid' })).toBe(false);
  });

  it('input kosong → false', () => {
    expect(isPaidTransaction(null)).toBe(false);
  });
});

// ── Investor helpers ──
describe('isInvestorVehicle', () => {
  it('owner_type investor → true', () => {
    expect(isInvestorVehicle({ owner_type: 'investor', owner_name: '' })).toBe(true);
  });

  it('owner_name terisi (data lama) → true', () => {
    expect(isInvestorVehicle({ owner_type: 'internal', owner_name: 'Pak Made' })).toBe(true);
  });

  it('internal tanpa owner_name → false', () => {
    expect(isInvestorVehicle({ owner_type: 'internal', owner_name: '' })).toBe(false);
    expect(isInvestorVehicle({ owner_type: 'internal', owner_name: '   ' })).toBe(false);
  });
});

describe('getVehicleSharePct', () => {
  it('membaca persentase bagi hasil', () => {
    expect(getVehicleSharePct({ revenue_share_percentage: 60 })).toBe(60);
  });

  it('default 70 jika kosong / nol / invalid', () => {
    expect(getVehicleSharePct({})).toBe(70);
    expect(getVehicleSharePct({ revenue_share_percentage: 0 })).toBe(70);
    expect(getVehicleSharePct({ revenue_share_percentage: 'abc' })).toBe(70);
  });
});

describe('expenseMatchesVehicle', () => {
  const v = { id: 'v1', name: 'Vario 160', plate_number: 'DK 1234 AB' };

  it('cocok via vehicle_id', () => {
    expect(expenseMatchesVehicle({ vehicle_id: 'v1', title: 'Servis rutin' }, v)).toBe(true);
  });

  it('cocok via nama motor di judul (case-insensitive)', () => {
    expect(expenseMatchesVehicle({ title: 'Ganti oli VARIO 160' }, v)).toBe(true);
  });

  it('cocok via plat nomor di judul', () => {
    expect(expenseMatchesVehicle({ title: 'Servis dk 1234 ab' }, v)).toBe(true);
  });

  it('tidak cocok → false', () => {
    expect(expenseMatchesVehicle({ title: 'Bensin operasional' }, v)).toBe(false);
    expect(expenseMatchesVehicle({ vehicle_id: 'lain', title: '' }, v)).toBe(false);
  });
});


// ── calcVehicleRevenue ──
describe('calcVehicleRevenue', () => {
  const v = { id: 'v1', name: 'Vario' };

  it('menjumlahkan hanya transaksi terbayar milik motor tsb', () => {
    const tx = [
      { vehicle_id: 'v1', status: 'completed', total_price: 300000 },
      { vehicle_id: 'v1', status: 'active', payment_status: 'paid', total_price: 200000 },
      { vehicle_id: 'v1', status: 'active', payment_status: 'unpaid', total_price: 400000 }, // dikecualikan
      { vehicle_id: 'v2', status: 'completed', total_price: 999000 }, // motor lain
    ];
    expect(calcVehicleRevenue(v, tx)).toBe(500000);
  });

  it('damage_fee hanya dihitung untuk transaksi completed', () => {
    const tx = [
      { vehicle_id: 'v1', status: 'completed', total_price: 100000, damage_fee: 50000 },
      { vehicle_id: 'v1', status: 'active', payment_status: 'paid', total_price: 100000, damage_fee: 30000 },
    ];
    expect(calcVehicleRevenue(v, tx)).toBe(250000); // 100k+50k + 100k (damage active tidak dihitung)
  });

  it('cocok juga via relasi vehicles.id', () => {
    const tx = [{ vehicles: { id: 'v1' }, status: 'completed', total_price: 150000 }];
    expect(calcVehicleRevenue(v, tx)).toBe(150000);
  });
});

// ── calcInvestorPayouts (bagi hasil — basis NET per motor) ──
describe('calcInvestorPayouts', () => {
  const vehicles = [
    { id: 'v1', name: 'Vario', plate_number: 'DK 1111 AA', owner_type: 'investor', revenue_share_percentage: 70 },
    { id: 'v2', name: 'NMAX', plate_number: 'DK 2222 BB', owner_type: 'internal', owner_name: '' },
  ];
  const transactions = [
    { id: 't1', vehicle_id: 'v1', status: 'completed', total_price: 1000000, damage_fee: 50000 },
    { id: 't2', vehicle_id: 'v1', status: 'active', payment_status: 'unpaid', total_price: 400000 }, // dikecualikan
    { id: 't3', vehicle_id: 'v2', status: 'completed', total_price: 500000 }, // motor internal
  ];
  const expenses = [
    { id: 'e1', title: 'Servis Vario', amount: 100000, type: 'expense' }, // cocok v1 via nama
    { id: 'e2', title: 'Bensin operasional', amount: 50000, type: 'expense' }, // tidak cocok motor mana pun
  ];

  it('payout = sharePct% × (omset motor − biaya servis motor), dibulatkan', () => {
    const { perVehicle } = calcInvestorPayouts({ transactions, expenses, vehicles });
    expect(perVehicle).toHaveLength(1); // hanya motor investor
    const pv = perVehicle[0];
    expect(pv.revenue).toBe(1050000);   // 1.000.000 + damage 50.000
    expect(pv.expenses).toBe(100000);
    expect(pv.net).toBe(950000);
    expect(pv.sharePct).toBe(70);
    expect(pv.payout).toBe(665000);     // 70% × 950.000
  });

  it('total hanya mencakup motor investor', () => {
    const r = calcInvestorPayouts({ transactions, expenses, vehicles });
    expect(r.totalPayout).toBe(665000);
    expect(r.totalRevenue).toBe(1050000);
    expect(r.totalExpenses).toBe(100000);
    expect(r.totalNet).toBe(950000);
  });

  it('pembulatan Math.round untuk hasil pecahan', () => {
    const r = calcInvestorPayouts({
      transactions: [{ vehicle_id: 'v1', status: 'completed', total_price: 99999 }],
      expenses: [],
      vehicles: [{ id: 'v1', name: 'Vario', owner_type: 'investor', revenue_share_percentage: 70 }],
    });
    expect(r.totalPayout).toBe(69999); // 69.999,3 → 69.999
  });

  it('aman untuk input kosong', () => {
    const r = calcInvestorPayouts({ transactions: null, expenses: undefined, vehicles: null });
    expect(r.totalPayout).toBe(0);
    expect(r.perVehicle).toEqual([]);
  });
});


// ── calcFinancialSummary (integrasi semua aturan) ──
describe('calcFinancialSummary', () => {
  it('menerapkan aturan cash basis + damage fee + other income', () => {
    const summary = calcFinancialSummary({
      transactions: [
        { id: 't1', status: 'completed', total_price: 300000, damage_fee: 50000 },
        { id: 't2', status: 'active', payment_status: 'paid', total_price: 200000 },
        { id: 't3', status: 'active', payment_status: 'unpaid', total_price: 400000 },
        { id: 't4', status: 'cancelled', total_price: 999000 },
      ],
      expenses: [
        { id: 'e1', type: 'expense', amount: 80000 },
        { id: 'e2', type: 'income', amount: 25000 },
      ],
      vehicles: [],
    });

    expect(summary.rentalRevenue).toBe(500000);    // 300k + 200k
    expect(summary.damageFeeIncome).toBe(50000);
    expect(summary.otherIncome).toBe(25000);
    expect(summary.totalRevenue).toBe(575000);
    expect(summary.totalExpenses).toBe(80000);
    expect(summary.investorPayout).toBe(0);
    expect(summary.netProfit).toBe(495000);        // 575k − 80k − 0
    expect(summary.totalUnpaid).toBe(400000);
    expect(summary.paidTx).toHaveLength(2);
    expect(summary.unpaidTx).toHaveLength(1);
    expect(summary.completedTx).toHaveLength(1);
  });

  it('netProfit = totalRevenue − totalExpenses − investorPayout', () => {
    const summary = calcFinancialSummary({
      transactions: [
        { id: 't1', vehicle_id: 'v1', status: 'completed', total_price: 1000000, damage_fee: 50000 },
        { id: 't2', vehicle_id: 'v2', status: 'completed', total_price: 500000 },
      ],
      expenses: [
        { id: 'e1', title: 'Servis Vario', amount: 100000, type: 'expense' },
        { id: 'e2', title: 'Bensin operasional', amount: 50000, type: 'expense' },
      ],
      vehicles: [
        { id: 'v1', name: 'Vario', plate_number: 'DK 1111 AA', owner_type: 'investor', revenue_share_percentage: 70 },
        { id: 'v2', name: 'NMAX', plate_number: 'DK 2222 BB', owner_type: 'internal', owner_name: '' },
      ],
    });

    expect(summary.totalRevenue).toBe(1550000);   // 1.050.000 + 500.000
    expect(summary.totalExpenses).toBe(150000);
    expect(summary.investorPayout).toBe(665000);  // 70% × (1.050.000 − 100.000)
    expect(summary.netProfit).toBe(735000);       // 1.550.000 − 150.000 − 665.000
  });

  it('aman untuk input kosong / null', () => {
    const s = calcFinancialSummary({ transactions: null, expenses: undefined, vehicles: null });
    expect(s.totalRevenue).toBe(0);
    expect(s.totalExpenses).toBe(0);
    expect(s.investorPayout).toBe(0);
    expect(s.netProfit).toBe(0);
    expect(s.totalUnpaid).toBe(0);
    expect(s.paidTx).toEqual([]);
  });
});

