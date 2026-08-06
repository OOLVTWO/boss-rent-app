import { describe, it, expect } from 'vitest';
import {
  isPaidTransaction,
  expenseMatchesVehicle,
  calcVehicleRevenue,
  calcInvestorPayouts,
  calcFinancialSummary,
  formatRupiah,
  getLocalDateStr,
  toLocalDateStr,
  isIncomeEntry,
} from '../src/lib/finance.js';

describe('isPaidTransaction (cash basis)', () => {
  it('completed → selalu lunas', () => {
    expect(isPaidTransaction({ status: 'completed', payment_status: null })).toBe(true);
  });
  it('active + paid → lunas', () => {
    expect(isPaidTransaction({ status: 'active', payment_status: 'paid' })).toBe(true);
  });
  it('active + unpaid → BELUM lunas', () => {
    expect(isPaidTransaction({ status: 'active', payment_status: 'unpaid' })).toBe(false);
  });
  it('active + null → BELUM lunas (fix: tidak lagi dianggap paid)', () => {
    expect(isPaidTransaction({ status: 'active', payment_status: null })).toBe(false);
    expect(isPaidTransaction({ status: 'active' })).toBe(false);
  });
  it('cancelled → tidak pernah lunas', () => {
    expect(isPaidTransaction({ status: 'cancelled', payment_status: 'paid' })).toBe(false);
  });
  it('null/undefined → false', () => {
    expect(isPaidTransaction(null)).toBe(false);
    expect(isPaidTransaction(undefined)).toBe(false);
  });
});

describe('expenseMatchesVehicle (token-based, fix C3)', () => {
  const vario = { id: 'v1', name: 'Vario 160', plate_number: 'DK 1234 AB' };
  const beat = { id: 'v2', name: 'Beat', plate_number: 'DK 5678 CD' };

  it('vehicle_id cocok → match', () => {
    expect(expenseMatchesVehicle({ vehicle_id: 'v1', title: 'Servis' }, vario)).toBe(true);
  });
  it('judul menyebut nama motor → match', () => {
    expect(expenseMatchesVehicle({ title: 'Servis Vario 160' }, vario)).toBe(true);
  });
  it('judul menyebut plat (case-insensitive) → match', () => {
    expect(expenseMatchesVehicle({ title: 'Ganti oli dk 1234 ab' }, vario)).toBe(true);
  });
  it('TIDAK false-positive: "variasi" vs "Vario"', () => {
    expect(expenseMatchesVehicle({ title: 'Servis variasi motor' }, vario)).toBe(false);
  });
  it('TIDAK match motor lain', () => {
    expect(expenseMatchesVehicle({ title: 'Servis Beat' }, vario)).toBe(false);
    expect(expenseMatchesVehicle({ title: 'Servis Vario' }, beat)).toBe(false);
  });
  it('judul hanya kata umum → tidak match', () => {
    expect(expenseMatchesVehicle({ title: 'Servis berkala' }, vario)).toBe(false);
  });
});

describe('calcInvestorPayouts (fix C2: clamp negatif)', () => {
  const investor = { id: 'v1', owner_type: 'investor', owner_name: 'Budi', revenue_share_percentage: 70 };
  const internal = { id: 'v2', owner_type: 'internal' };

  it('payout normal 70% dari net positif', () => {
    const tx = [{ vehicle_id: 'v1', status: 'completed', payment_status: 'paid', total_price: 1000000, damage_fee: 0 }];
    const res = calcInvestorPayouts({ transactions: tx, expenses: [], vehicles: [investor] });
    expect(res.perVehicle[0].payout).toBe(700000);
    expect(res.totalPayout).toBe(700000);
  });

  it('payout NEGATIF di-clamp ke 0 (rugi tidak jadi hutang)', () => {
    const tx = [{ vehicle_id: 'v1', status: 'completed', payment_status: 'paid', total_price: 100000, damage_fee: 0 }];
    const exp = [{ title: 'Servis Vario', amount: 500000 }];
    const res = calcInvestorPayouts({ transactions: tx, expenses: exp, vehicles: [investor] });
    expect(res.perVehicle[0].net).toBe(-400000);
    expect(res.perVehicle[0].payout).toBe(0);
    expect(res.perVehicle[0].loss).toBe(400000);
    expect(res.totalLoss).toBe(400000);
  });

  it('motor internal tidak dihitung sebagai investor', () => {
    const tx = [{ vehicle_id: 'v2', status: 'completed', payment_status: 'paid', total_price: 500000, damage_fee: 0 }];
    const res = calcInvestorPayouts({ transactions: tx, expenses: [], vehicles: [internal] });
    expect(res.perVehicle).toHaveLength(0);
    expect(res.totalPayout).toBe(0);
  });
});

describe('calcFinancialSummary', () => {
  const vehicles = [{ id: 'v1', owner_type: 'internal' }];
  const tx = [
    { id: 't1', vehicle_id: 'v1', status: 'completed', payment_status: 'paid', total_price: 1000000, damage_fee: 100000 },
    { id: 't2', vehicle_id: 'v1', status: 'active', payment_status: 'paid', total_price: 500000, damage_fee: 0 },
    { id: 't3', vehicle_id: 'v1', status: 'active', payment_status: 'unpaid', total_price: 300000, damage_fee: 0 },
    { id: 't4', vehicle_id: 'v1', status: 'active', payment_status: null, total_price: 200000, damage_fee: 0 },
    { id: 't5', vehicle_id: 'v1', status: 'cancelled', payment_status: 'paid', total_price: 900000, damage_fee: 0 },
  ];
  const expenses = [
    { title: 'Bensin', amount: 50000, type: 'expense', category: 'service' },
    { title: 'Komisi', amount: 100000, type: 'income', category: 'other_income' },
  ];

  it('hanya transaksi lunas yang dihitung; null & unpaid & cancelled TIDAK', () => {
    const s = calcFinancialSummary({ transactions: tx, expenses, vehicles });
    expect(s.rentalRevenue).toBe(1500000); // t1 + t2
    expect(s.damageFeeIncome).toBe(100000); // t1 completed
    expect(s.otherIncome).toBe(100000);
    expect(s.totalRevenue).toBe(1700000);
    expect(s.totalExpenses).toBe(50000);
    expect(s.totalUnpaid).toBe(500000); // t3 + t4
    expect(s.paidTx).toHaveLength(2);
  });
});

describe('formatRupiah & date helpers', () => {
  it('formatRupiah memakai pemisah id-ID', () => {
    expect(formatRupiah(1500000)).toBe('Rp1.500.000');
    expect(formatRupiah(0)).toBe('Rp0');
    expect(formatRupiah(null)).toBe('Rp0');
  });
  it('getLocalDateStr memakai komponen lokal', () => {
    const d = new Date(2025, 0, 5, 10, 0, 0); // 5 Jan 2025, lokal
    expect(getLocalDateStr(d)).toBe('2025-01-05');
  });
  it('toLocalDateStr menangani input kosong / invalid', () => {
    expect(toLocalDateStr(null)).toBe('');
    expect(toLocalDateStr('not-a-date')).toBe('');
  });
  it('isIncomeEntry', () => {
    expect(isIncomeEntry({ type: 'income' })).toBe(true);
    expect(isIncomeEntry({ category: 'other_income' })).toBe(true);
    expect(isIncomeEntry({ type: 'expense', category: 'service' })).toBe(false);
  });
});
