import * as XLSX from 'xlsx';

/**
 * Format angka sebagai Rupiah
 */
export function formatRupiah(amount) {
  const cleanAmount = Math.round(Number(amount || 0));
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cleanAmount);
}

/**
 * Export transaksi ke file Excel (.xlsx)
 */
export function exportTransactionsToExcel(transactions, filename = 'laporan-boss-rent') {
  const rows = transactions.map((t, index) => ({
    'No': index + 1,
    'Tanggal Transaksi': new Date(t.created_at).toLocaleDateString('id-ID'),
    'Nama Penyewa': t.renter_name,
    'No. HP': t.renter_phone,
    'Motor': t.vehicles?.name || '-',
    'Plat Nomor': t.vehicles?.plate_number || '-',
    'Tanggal Mulai': new Date(t.start_date).toLocaleDateString('id-ID'),
    'Tanggal Selesai': new Date(t.end_date).toLocaleDateString('id-ID'),
    'Durasi (Hari)': t.duration_days,
    'Tarif/Hari': t.vehicles?.rate_per_day || 0,
    'Diskon': t.discount || 0,
    'Total Harga': t.total_price,
    'Biaya Kerusakan': t.damage_fee || 0,
    'Deposit': t.deposit || 0,
    'Metode Bayar': t.payment_method?.toUpperCase() || 'CASH',
    'Status': t.status === 'active' ? 'Aktif' : t.status === 'completed' ? 'Selesai' : 'Dibatalkan',
    'Catatan': t.notes || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  const colWidths = rows.reduce((acc, row) => {
    Object.keys(row).forEach((key, i) => {
      const val = String(row[key]);
      acc[i] = Math.max(acc[i] || 10, val.length + 2, key.length + 2);
    });
    return acc;
  }, {});
  worksheet['!cols'] = Object.values(colWidths).map(w => ({ wch: w }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pemasukan Transaksi');

  const completedTx = transactions.filter(t => t.status === 'completed');
  const totalRevenue = completedTx.reduce((sum, t) => sum + Number(t.total_price), 0);
  const summary = [
    ['BOSS RENT PERERENAN — LAPORAN PEMASUKAN'],
    [''],
    ['Total Transaksi', transactions.length],
    ['Transaksi Selesai', completedTx.length],
    ['Total Pendapatan (Selesai)', formatRupiah(totalRevenue)],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summary);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan Pemasukan');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}-${dateStr}.xlsx`);
}

/**
 * Export pengeluaran ke file Excel (.xlsx)
 */
export function exportExpensesToExcel(expenses, filename = 'laporan-pengeluaran-boss-rent') {
  const rows = expenses.map((e, index) => ({
    'No': index + 1,
    'Tanggal': new Date(e.expense_date).toLocaleDateString('id-ID'),
    'Keterangan': e.title,
    'Kategori': e.category,
    'Jumlah (Rp)': e.amount,
    'Catatan': e.notes || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Pengeluaran');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}-${dateStr}.xlsx`);
}

const CATEGORY_MAP = {
  rental_income: 'Pendapatan Sewa Motor',
  deposit_forfeit: 'Klaim Deposit / Denda Damage',
  addon_services: 'Layanan Tambahan (Helm / Jas Hujan)',
  delivery_fee: 'Biaya Antar-Jemput Motor',
  other_income: 'Pemasukan Lain-lain',
  service: 'Servis & Perawatan',
  sparepart: 'Suku Cadang / Sparepart',
  fuel: 'Bahan Bakar',
  salary: 'Gaji Karyawan',
  other: 'Pengeluaran Lain-lain',
};

const checkIsInc = (item) => {
  if (!item) return false;
  if (item.type === 'income') return true;
  if (typeof item.category === 'string' && (item.category.startsWith('income_') || item.category.includes('income'))) return true;
  return false;
};

const mapRow = (item, index, includeType = true) => {
  const isInc = checkIsInc(item);
  const cleanCat = typeof item.category === 'string' ? item.category.replace(/^income_/, '') : 'other';
  const categoryLabel = CATEGORY_MAP[cleanCat] || item.category || '-';
  const rawAmount = Number(item.amount || 0);

  const rowData = {
    'No': index + 1,
  };

  if (includeType) {
    rowData['Jenis Arus Kas'] = isInc ? 'PEMASUKAN (+)' : 'PENGELUARAN (-)';
  }

  rowData['Tanggal'] = new Date(item.expense_date).toLocaleDateString('id-ID');
  rowData['Keterangan Transaksi'] = item.title;
  rowData['Kategori'] = categoryLabel;

  if (includeType) {
    rowData['Pemasukan (+)'] = isInc ? rawAmount : 0;
    rowData['Pengeluaran (-)'] = !isInc ? rawAmount : 0;
    rowData['Nominal Net (Rp)'] = isInc ? rawAmount : -rawAmount;
  } else {
    rowData['Nominal (Rp)'] = rawAmount;
  }

  rowData['Format Rupiah'] = isInc ? `+ ${formatRupiah(rawAmount)}` : `- ${formatRupiah(rawAmount)}`;
  rowData['Catatan'] = item.notes || '-';

  return rowData;
};

const autoFitSheet = (sheet, rows) => {
  if (!rows || !rows.length) return;
  const colWidths = rows.reduce((acc, row) => {
    Object.keys(row).forEach((key, i) => {
      const val = String(row[key]);
      acc[i] = Math.max(acc[i] || 12, val.length + 3, key.length + 3);
    });
    return acc;
  }, {});
  sheet['!cols'] = Object.values(colWidths).map(w => ({ wch: w }));
};

/**
 * Export laporan keuangan terintegrasi (Pemasukan & Pengeluaran) ke Excel (.xlsx)
 * @param {Array} records - Data transaksi keuangan
 * @param {String} mode - 'all' | 'income' | 'expense'
 * @param {String} filename - Nama file hasil export
 */
export function exportFinancesToExcel(records, mode = 'all', filename = '') {
  const workbook = XLSX.utils.book_new();
  const dateStr = new Date().toISOString().split('T')[0];

  const incomeRecords = records.filter(r => checkIsInc(r));
  const expenseRecords = records.filter(r => !checkIsInc(r));

  const totalIncome = incomeRecords.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalExpense = expenseRecords.reduce((s, r) => s + Number(r.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  if (mode === 'income') {
    // 1. DEDICATED INCOME EXPORT
    const incomeRows = incomeRecords.map((r, i) => mapRow(r, i, false));
    const incomeSheet = XLSX.utils.json_to_sheet(incomeRows);
    autoFitSheet(incomeSheet, incomeRows);
    XLSX.utils.book_append_sheet(workbook, incomeSheet, 'Laporan Pemasukan');

    const summaryData = [
      ['BOSS RENT PERERENAN — LAPORAN PEMASUKAN KEUANGAN'],
      ['Tanggal Export', new Date().toLocaleDateString('id-ID')],
      [''],
      ['Metrik Pemasukan', 'Nilai'],
      ['Total Pemasukan (+)', formatRupiah(totalIncome)],
      ['Jumlah Transaksi Masuk', `${incomeRecords.length} Transaksi`],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan Pemasukan');

    const outName = filename || `laporan-pemasukan-boss-rent-${dateStr}.xlsx`;
    XLSX.writeFile(workbook, outName.endsWith('.xlsx') ? outName : `${outName}.xlsx`);
    return;
  }

  if (mode === 'expense') {
    // 2. DEDICATED EXPENSE EXPORT
    const expenseRows = expenseRecords.map((r, i) => mapRow(r, i, false));
    const expenseSheet = XLSX.utils.json_to_sheet(expenseRows);
    autoFitSheet(expenseSheet, expenseRows);
    XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Laporan Pengeluaran');

    const summaryData = [
      ['BOSS RENT PERERENAN — LAPORAN PENGELUARAN OPERASIONAL'],
      ['Tanggal Export', new Date().toLocaleDateString('id-ID')],
      [''],
      ['Metrik Pengeluaran', 'Nilai'],
      ['Total Pengeluaran (-)', formatRupiah(totalExpense)],
      ['Jumlah Transaksi Keluar', `${expenseRecords.length} Transaksi`],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan Pengeluaran');

    const outName = filename || `laporan-pengeluaran-boss-rent-${dateStr}.xlsx`;
    XLSX.writeFile(workbook, outName.endsWith('.xlsx') ? outName : `${outName}.xlsx`);
    return;
  }

  // 3. COMBINED MULTI-SHEET EXPORT ('all')
  // Sheet 1: Semua Arus Kas Gabungan (Primary Sheet)
  const allRows = records.map((r, i) => mapRow(r, i, true));
  const allSheet = XLSX.utils.json_to_sheet(allRows);
  autoFitSheet(allSheet, allRows);
  XLSX.utils.book_append_sheet(workbook, allSheet, 'Semua Arus Kas');

  // Sheet 2: Pemasukan saja
  if (incomeRecords.length > 0) {
    const incRows = incomeRecords.map((r, i) => mapRow(r, i, false));
    const incSheet = XLSX.utils.json_to_sheet(incRows);
    autoFitSheet(incSheet, incRows);
    XLSX.utils.book_append_sheet(workbook, incSheet, 'Laporan Pemasukan');
  }

  // Sheet 3: Pengeluaran saja
  if (expenseRecords.length > 0) {
    const expRows = expenseRecords.map((r, i) => mapRow(r, i, false));
    const expSheet = XLSX.utils.json_to_sheet(expRows);
    autoFitSheet(expSheet, expRows);
    XLSX.utils.book_append_sheet(workbook, expSheet, 'Laporan Pengeluaran');
  }

  // Sheet 4: Ringkasan Saldo Laba Rugi
  const summaryData = [
    ['BOSS RENT PERERENAN — RINGKASAN ARUS KAS KEUANGAN'],
    ['Tanggal Export', new Date().toLocaleDateString('id-ID')],
    [''],
    ['Metrik Keuangan', 'Jumlah Nominal'],
    ['Total Pemasukan (+)', formatRupiah(totalIncome)],
    ['Total Pengeluaran (-)', formatRupiah(totalExpense)],
    ['Saldo / Laba Bersih', formatRupiah(netBalance)],
    ['Status Arus Kas', netBalance >= 0 ? 'SURPLUS (POSITIF)' : 'DEFISIT (NEGATIF)'],
    ['Total Transaksi Pemasukan', `${incomeRecords.length} Transaksi`],
    ['Total Transaksi Pengeluaran', `${expenseRecords.length} Transaksi`],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 32 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan Saldo');

  const outName = filename || `laporan-keuangan-lengkap-boss-rent-${dateStr}.xlsx`;
  XLSX.writeFile(workbook, outName.endsWith('.xlsx') ? outName : `${outName}.xlsx`);
}
