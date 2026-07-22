import * as XLSX from 'xlsx';

/**
 * Format angka sebagai Rupiah
 */
export function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
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
