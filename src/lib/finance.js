// ─────────────────────────────────────────────────────────────
// Boss Rent Pererenan — Shared Finance Engine
// SATU-SATUNYA sumber kebenaran untuk kalkulasi keuangan.
// Dipakai oleh: Dashboard, Laporan (Reports), StatCards, Charts.
//
// Aturan bisnis yang diterapkan konsisten di semua halaman:
//  1. Pengakuan pendapatan (cash basis):
//     - status 'completed' → selalu diakui sebagai pemasukan
//     - status 'active' + payment_status 'paid' (atau null utk data lama) → diakui
//     - status 'active' + payment_status 'unpaid' → BELUM diakui
//     - status 'cancelled' → tidak pernah diakui
//  2. Bagi hasil investor dihitung per motor dari basis NET:
//     payout = sharePct% × (omset motor − biaya servis motor tsb)
//  3. Klaim denda kerusakan (damage_fee) diakui saat transaksi selesai.
//  4. Laba Bersih Boss Rent = Total Pemasukan − Pengeluaran − Bagi Hasil Investor
// ─────────────────────────────────────────────────────────────

// ── Format ──
export function formatRupiah(amount) {
  const cleanAmount = Math.round(Number(amount || 0));
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cleanAmount);
}

// ── Date helpers (aman timezone — memakai waktu LOKAL, bukan UTC) ──
// new Date().toISOString() mengembalikan UTC sehingga "hari ini" bergeser
// untuk bisnis di WITA (UTC+8). Helper ini menghindari bug tersebut.
export function getLocalDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLocalMonthStr(date = new Date()) {
  return getLocalDateStr(date).substring(0, 7);
}

// Konversi timestamp (UTC ISO dari Supabase) ke tanggal lokal YYYY-MM-DD
export function toLocalDateStr(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  return getLocalDateStr(d);
}

// ── Klasifikasi pemasukan/pengeluaran pada tabel expenses ──
export function isIncomeEntry(e) {
  if (!e) return false;
  if (e.type === 'income') return true;
  if (typeof e.category === 'string' && (e.category.startsWith('income_') || e.category.includes('income'))) return true;
  return false;
}

// ── Pengakuan pendapatan transaksi (cash basis) ──
export function isPaidTransaction(t) {
  if (!t) return false;
  return t.status === 'completed' ||
    (t.status === 'active' && (t.payment_status === 'paid' || !t.payment_status));
}

// ── Investor / bagi hasil ──
export function isInvestorVehicle(v) {
  return v.owner_type === 'investor' || (typeof v.owner_name === 'string' && v.owner_name.trim() !== '');
}

export function getVehicleSharePct(v) {
  return Number(v.revenue_share_percentage) || 70;
}

// Expense dianggap milik motor tertentu jika vehicle_id cocok,
// atau judulnya menyebut nama / plat motor (data lama tanpa vehicle_id)
export function expenseMatchesVehicle(e, v) {
  if (e.vehicle_id && v.id && e.vehicle_id === v.id) return true;
  if (typeof e.title === 'string' && e.title) {
    const title = e.title.toLowerCase();
    if (v.name && title.includes(v.name.toLowerCase())) return true;
    if (v.plate_number && title.includes(v.plate_number.toLowerCase())) return true;
  }
  return false;
}

// Total omset sebuah motor dari transaksi yang sudah diakui (paid).
// Klaim denda hanya dihitung untuk transaksi selesai.
export function calcVehicleRevenue(vehicle, transactions) {
  return transactions
    .filter(t => (t.vehicle_id === vehicle.id || t.vehicles?.id === vehicle.id) && isPaidTransaction(t))
    .reduce((s, t) => s + Number(t.total_price || 0) + (t.status === 'completed' ? Number(t.damage_fee || 0) : 0), 0);
}

// Kalkulasi bagi hasil SEMUA motor investor, per motor (basis NET).
export function calcInvestorPayouts({ transactions, expenses, vehicles }) {
  const safeTx = Array.isArray(transactions) ? transactions : [];
  const safeExp = Array.isArray(expenses) ? expenses : [];
  const safeVeh = Array.isArray(vehicles) ? vehicles : [];

  const realExpenses = safeExp.filter(e => !isIncomeEntry(e));
  const investorVehicles = safeVeh.filter(isInvestorVehicle);

  let totalPayout = 0;
  let totalRevenue = 0;
  let totalExpenses = 0;

  const perVehicle = investorVehicles.map(v => {
    const revenue = calcVehicleRevenue(v, safeTx);
    const vehicleExpenses = realExpenses
      .filter(e => expenseMatchesVehicle(e, v))
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const net = revenue - vehicleExpenses;
    const sharePct = getVehicleSharePct(v);
    const payout = Math.round(net * (sharePct / 100));

    totalPayout += payout;
    totalRevenue += revenue;
    totalExpenses += vehicleExpenses;

    return { vehicle: v, revenue, expenses: vehicleExpenses, net, sharePct, payout };
  });

  return {
    perVehicle,
    totalPayout,
    totalRevenue,
    totalExpenses,
    totalNet: totalRevenue - totalExpenses,
  };
}

// ── Ringkasan keuangan global (dipakai Dashboard & Reports) ──
export function calcFinancialSummary({ transactions, expenses, vehicles }) {
  const safeTx = Array.isArray(transactions) ? transactions : [];
  const safeExp = Array.isArray(expenses) ? expenses : [];

  const paidTx = safeTx.filter(isPaidTransaction);
  const completedTx = safeTx.filter(t => t.status === 'completed');
  const unpaidTx = safeTx.filter(t => t.status === 'active' && t.payment_status === 'unpaid');

  const rentalRevenue = paidTx.reduce((s, t) => s + Number(t.total_price || 0), 0);
  const damageFeeIncome = completedTx.reduce((s, t) => s + Number(t.damage_fee || 0), 0);
  const otherIncome = safeExp.filter(isIncomeEntry).reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalRevenue = rentalRevenue + damageFeeIncome + otherIncome;
  const totalExpenses = safeExp.filter(e => !isIncomeEntry(e)).reduce((s, e) => s + Number(e.amount || 0), 0);

  const { totalPayout: investorPayout } = calcInvestorPayouts({ transactions: safeTx, expenses: safeExp, vehicles });

  const netProfit = totalRevenue - totalExpenses - investorPayout;

  return {
    paidTx,
    completedTx,
    unpaidTx,
    rentalRevenue,
    damageFeeIncome,
    otherIncome,
    totalRevenue,
    totalExpenses,
    investorPayout,
    netProfit,
    totalUnpaid: unpaidTx.reduce((s, t) => s + Number(t.total_price || 0), 0),
  };
}

