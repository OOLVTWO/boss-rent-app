import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

function createInvoicePDF({ isDiscounted, filename }) {
  const outPath = path.join(process.cwd(), 'public', filename);
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const writeStream = fs.createWriteStream(outPath);
  doc.pipe(writeStream);

  const PRIMARY = '#0F172A';
  const ACCENT = '#E85D04';
  const TEXT_MUTED = '#64748B';

  // 1. Header Section (100px height for zero overlap)
  doc.rect(0, 0, 595.28, 95).fill(PRIMARY);

  doc.fillColor('#FFFFFF')
     .fontSize(19)
     .font('Helvetica-Bold')
     .text('BOSS RENT PERERENAN', 40, 22);

  doc.fontSize(9.5)
     .font('Helvetica')
     .text('Jl. Pantai Pererenan No.119, Mengwi, Badung, Bali 80351', 40, 50);

  doc.fillColor('#FFFFFF')
     .fontSize(15)
     .font('Helvetica-Bold')
     .text('INVOICE PROYEK', 350, 20, { width: 205, align: 'right' });

  doc.fillColor('#CBD5E1')
     .fontSize(8.5)
     .font('Helvetica')
     .text('No: INV/2026/07/BR-001', 350, 40, { width: 205, align: 'right' })
     .text('Tgl: 24 Juli 2026', 350, 52, { width: 205, align: 'right' })
     .text('Status: Live Deployed', 350, 64, { width: 205, align: 'right' });

  // 2. Client & Project Info
  doc.y = 115;
  doc.fillColor(PRIMARY).fontSize(11.5).font('Helvetica-Bold').text('INFORMASI PENYELESAIAN PROYEK', 40, 115);
  doc.fontSize(9.5).font('Helvetica').fillColor('#334155');
  doc.text('Nama Klien      : Boss Rent Pererenan (Platform Sewa Motor & Admin Management)');
  doc.text('Waktu Pengerjaan : 4 Hari Kerja Intensif (Sprint Development)');
  doc.text('Infrastruktur    : Next.js 16 + Supabase Cloud DB + Vercel Deployment');

  doc.moveDown(0.8);
  doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.8);

  // 3. Deliverables Table Header
  const startY = doc.y + 8;
  doc.rect(40, startY, 515, 24).fill('#F1F5F9');

  doc.fillColor(PRIMARY).fontSize(9.5).font('Helvetica-Bold');
  doc.text('No', 48, startY + 7);
  doc.text('Modul & Cakupan Hasil Pekerjaan', 75, startY + 7);
  doc.text('Nilai Pekerjaan', 430, startY + 7, { align: 'right' });

  let currentY = startY + 30;
  const items = [
    { no: '1', title: 'Katalog Utama Publik Customer (/fleet)', desc: 'Smart Rate Estimator, Filter Merek Dinamis, Available Fleet Matrix (6 Awal + See More), WA Booking, Bento Photo Showcase, Google Reviews 5.0, FAQ', val: 'Rp 2.000.000' },
    { no: '2', title: 'Admin Dashboard Analytics (/dashboard)', desc: 'KPI Real-time (Omset, Net Profit, Motor Disewa/Tersedia), Bento Rekap Deposit Jaminan (Amber, Violet, Sky Blue), Chart Tren', val: 'Rp 1.200.000' },
    { no: '3', title: 'Modul Armada & Privasi Investor (/vehicles)', desc: 'Manajemen Motor, Odometer KM, Privasi Kepemilikan Investor Bagi Hasil (100% Server-side Rahasia), Custom Merek Input, Directory Investor', val: 'Rp 1.500.000' },
    { no: '4', title: 'Manajemen Transaksi & Struk Nota (/transactions)', desc: 'Input sewa cepat, foto serah terima motor, kalkulasi otomatis deposit/diskon, Generator Struk Nota Pembayaran Digital', val: 'Rp 1.000.000' },
    { no: '5', title: 'Engine Finansial & Export Excel (/reports)', desc: 'Pencatatan arus kas, alokasi servis per motor, registrasi denda damage otomatis, pencarian investor, Export Excel 3 Sheet (.xlsx)', val: 'Rp 1.200.000' },
    { no: '6', title: 'Security & Cloud Infrastructure', desc: 'Supabase Cloud DB, Supabase Auth Guard, Dynamic Favicon Sync, HTTP Security Headers (X-Frame-Options, nosniff, XSS block)', val: 'Rp 600.000' }
  ];

  items.forEach((item) => {
    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(item.no, 48, currentY);
    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(item.title, 75, currentY);
    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(item.val, 430, currentY, { align: 'right' });
    
    currentY += 14;
    doc.fillColor(TEXT_MUTED).fontSize(8).font('Helvetica').text(item.desc, 75, currentY, { width: 340 });
    currentY += 26;

    doc.strokeColor('#F1F5F9').lineWidth(0.5).moveTo(40, currentY - 6).lineTo(555, currentY - 6).stroke();
  });

  // 4. Financial Calculation Summary Box
  doc.y = currentY + 10;
  const summaryY = doc.y;
  const boxHeight = isDiscounted ? 110 : 70;

  doc.rect(40, summaryY, 515, boxHeight).fill('#F8FAFC');
  doc.rect(40, summaryY, 515, boxHeight).strokeColor('#CBD5E1').lineWidth(1).stroke();

  if (isDiscounted) {
    doc.fillColor('#334155').fontSize(9.5).font('Helvetica').text('Total Estimasi Nilai Pasar Standar (Enterprise Market Value) :', 55, summaryY + 18);
    doc.fillColor('#334155').fontSize(9.5).font('Helvetica-Bold').text('Rp 7.500.000', 430, summaryY + 18, { align: 'right' });

    doc.fillColor('#15803D').fontSize(9.5).font('Helvetica').text('Potongan Harga Spesial Sahabat (Friendship Special Discount)  :', 55, summaryY + 40);
    doc.fillColor('#15803D').fontSize(9.5).font('Helvetica-Bold').text('- Rp 7.000.000', 430, summaryY + 40, { align: 'right' });

    doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(55, summaryY + 62).lineTo(540, summaryY + 62).stroke();

    doc.fillColor(PRIMARY).fontSize(12).font('Helvetica-Bold').text('TOTAL BIAYA AKHIR YANG HARUS DIBAYARKAN :', 55, summaryY + 74);
    doc.fillColor(ACCENT).fontSize(14).font('Helvetica-Bold').text('Rp 500.000', 430, summaryY + 73, { align: 'right' });

    doc.fillColor(TEXT_MUTED).fontSize(8.5).font('Helvetica-Oblique').text('( Terbilang: Lima Ratus Ribu Rupiah — Pembayaran Spesial Sahabat )', 55, summaryY + 92);
  } else {
    doc.fillColor(PRIMARY).fontSize(12).font('Helvetica-Bold').text('TOTAL TAGIHAN PEKERJAAN PROYEK :', 55, summaryY + 25);
    doc.fillColor(ACCENT).fontSize(15).font('Helvetica-Bold').text('Rp 7.500.000', 430, summaryY + 23, { align: 'right' });

    doc.fillColor(TEXT_MUTED).fontSize(8.5).font('Helvetica-Oblique').text('( Terbilang: Tujuh Juta Lima Ratus Ribu Rupiah — Standard Enterprise Rate )', 55, summaryY + 48);
  }

  // 5. Payment Method Footer
  doc.y = summaryY + boxHeight + 20;
  doc.fillColor(PRIMARY).fontSize(10).font('Helvetica-Bold').text('Metode Pembayaran:', 40, doc.y);
  doc.fontSize(9).font('Helvetica').fillColor('#334155');
  doc.text(`Pembayaran ${isDiscounted ? 'Rp 500.000' : 'Rp 7.500.000'} dapat ditransfer via Transfer Bank / QRIS / Cash.`);
  doc.text('Status Invoice: Pending Payment (Menunggu Pelunasan)');

  doc.moveDown(1.5);
  doc.fontSize(8.5).fillColor(TEXT_MUTED).font('Helvetica-Oblique').text('Terima kasih atas kepercayaan Boss Rent Pererenan. Semoga sistem ini membawa kemajuan pesat untuk bisnis Anda!', { align: 'center' });

  doc.end();
}

// Generate 3 files
createInvoicePDF({ isDiscounted: true, filename: 'invoice-boss-rent-500k.pdf' });
createInvoicePDF({ isDiscounted: false, filename: 'invoice-boss-rent-7.5jt.pdf' });
createInvoicePDF({ isDiscounted: true, filename: 'invoice-boss-rent.pdf' });

console.log('Generated both 500k and 7.5jt invoice PDFs successfully!');
