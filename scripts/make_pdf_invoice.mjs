import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const outPath = path.join(process.cwd(), 'public', 'invoice-boss-rent.pdf');

const doc = new PDFDocument({ margin: 40, size: 'A4' });
const writeStream = fs.createWriteStream(outPath);
doc.pipe(writeStream);

// Primary Palette
const PRIMARY = '#0F172A';
const ACCENT = '#E85D04';
const PURPLE = '#7C3AED';
const TEXT_MUTED = '#64748B';

// Header Section
doc.rect(0, 0, 595.28, 90).fill(PRIMARY);

doc.fillColor('#FFFFFF')
   .fontSize(20)
   .font('Helvetica-Bold')
   .text('BOSS RENT PERERENAN', 40, 25);

doc.fontSize(10)
   .font('Helvetica')
   .text('Jl. Pantai Pererenan No.119, Mengwi, Badung, Bali 80351', 40, 52);

doc.fillColor('#FFFFFF')
   .fontSize(16)
   .font('Helvetica-Bold')
   .text('INVOICE PROYEK', 420, 25, { align: 'right' });

doc.fontSize(9)
   .font('Helvetica')
   .text('No: INV/2026/07/BR-001\nTgl: 24 Juli 2026\nStatus: Live Deployed', 420, 48, { align: 'right' });

// Client & Project Info
doc.y = 110;
doc.fillColor(PRIMARY).fontSize(12).font('Helvetica-Bold').text('INFORMASI PENYELESAIAN PROYEK', 40, 110);
doc.fontSize(9.5).font('Helvetica').fillColor('#334155');
doc.text('Nama Klien      : Boss Rent Pererenan (Platform Sewa Motor & Admin Management)');
doc.text('Waktu Pengerjaan : 4 Hari Kerja Intensif (Sprint Development)');
doc.text('Infrastruktur    : Next.js 16 + Supabase Cloud DB + Vercel Deployment');

doc.moveDown(1);
doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
doc.moveDown(1);

// Deliverables Table Header
const startY = doc.y + 10;
doc.rect(40, startY, 515, 24).fill('#F1F5F9');

doc.fillColor(PRIMARY).fontSize(9.5).font('Helvetica-Bold');
doc.text('No', 48, startY + 7);
doc.text('Modul & Cakupan Hasil Pekerjaan', 75, startY + 7);
doc.text('Estimasi Nilai Pasar', 430, startY + 7, { align: 'right' });

let currentY = startY + 30;
const items = [
  { no: '1', title: 'Katalog Utama Publik Customer (/fleet)', desc: 'Smart Rate Estimator, Filter Merek Dinamis, Available Fleet Matrix (6 Awal + See More), WA Booking, Bento Photo Showcase, Google Reviews 5.0, FAQ', val: 'Rp 2.000.000' },
  { no: '2', title: 'Admin Dashboard Analytics (/dashboard)', desc: 'KPI Real-time (Omset, Net Profit, Motor Disewa/Tersedia), Bento Rekap Deposit Jaminan (Amber, Violet, Sky Blue), Chart Tren', val: 'Rp 1.200.000' },
  { no: '3', title: 'Modul Armada & Privasi Investor (/vehicles)', desc: 'Manajemen Motor, Odometer KM, Privasi Kepemilikan Investor Bagi Hasil (100% Server-side Rahasia), Custom Merek Input, Directory Investor', val: 'Rp 1.500.000' },
  { no: '4', title: 'Manajemen Transaksi & Struk Nota (/transactions)', desc: 'Input sewa cepat, foto serah terima motor, kalkulasi otomatis deposit/diskon, Generator Struk Nota Pembayaran Digital', val: 'Rp 1.000.000' },
  { no: '5', title: 'Engine Finansial & Export Excel (/reports)', desc: 'Pencatatan arus kas, alokasi servis per motor, registrasi denda damage otomatis, pencarian investor, Export Excel 3 Sheet (.xlsx)', val: 'Rp 1.200.000' },
  { no: '6', title: 'Security & Cloud Infrastructure', desc: 'Supabase Cloud DB, Supabase Auth Guard, Dynamic Favicon Sync, HTTP Security Headers (X-Frame-Options, nosniff, XSS block)', val: 'Rp 600.000' }
];

items.forEach((item, idx) => {
  doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(item.no, 48, currentY);
  doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(item.title, 75, currentY);
  doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(item.val, 430, currentY, { align: 'right' });
  
  currentY += 14;
  doc.fillColor(TEXT_MUTED).fontSize(8).font('Helvetica').text(item.desc, 75, currentY, { width: 340 });
  currentY += 26;

  doc.strokeColor('#F1F5F9').lineWidth(0.5).moveTo(40, currentY - 6).lineTo(555, currentY - 6).stroke();
});

// Financial Calculation Summary Box
doc.y = currentY + 10;
const summaryY = doc.y;

doc.rect(40, summaryY, 515, 110).fill('#F8FAFC');
doc.rect(40, summaryY, 515, 110).strokeColor('#CBD5E1').lineWidth(1).stroke();

doc.fillColor('#334155').fontSize(9.5).font('Helvetica').text('Total Estimasi Nilai Pasar Standar (Enterprise Market Value) :', 55, summaryY + 18);
doc.fillColor('#334155').fontSize(9.5).font('Helvetica-Bold').text('Rp 7.500.000', 430, summaryY + 18, { align: 'right' });

doc.fillColor('#15803D').fontSize(9.5).font('Helvetica').text('Potongan Harga Spesial Sahabat (Friendship Special Discount)  :', 55, summaryY + 40);
doc.fillColor('#15803D').fontSize(9.5).font('Helvetica-Bold').text('- Rp 7.000.000', 430, summaryY + 40, { align: 'right' });

doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(55, summaryY + 62).lineTo(540, summaryY + 62).stroke();

doc.fillColor(PRIMARY).fontSize(12).font('Helvetica-Bold').text('TOTAL BIAYA AKHIR YANG HARUS DIBAYARKAN :', 55, summaryY + 74);
doc.fillColor(ACCENT).fontSize(14).font('Helvetica-Bold').text('Rp 500.000', 430, summaryY + 73, { align: 'right' });

doc.fillColor(TEXT_MUTED).fontSize(8.5).font('Helvetica-Oblique').text('( Terbilang: Lima Ratus Ribu Rupiah — Pembayaran Spesial Sahabat )', 55, summaryY + 92);

// Payment Method Footer
doc.y = summaryY + 130;
doc.fillColor(PRIMARY).fontSize(10).font('Helvetica-Bold').text('Metode Pembayaran:', 40, doc.y);
doc.fontSize(9).font('Helvetica').fillColor('#334155');
doc.text('Pembayaran Rp 500.000 dapat ditransfer via Transfer Bank / QRIS / Cash.');
doc.text('Status Invoice: Pending Payment (Menunggu Pelunasan)');

doc.moveDown(1.5);
doc.fontSize(8.5).fillColor(TEXT_MUTED).font('Helvetica-Oblique').text('Terima kasih atas kepercayaan Boss Rent Pererenan. Semoga sistem ini membawa kemajuan pesat untuk bisnis Anda!', { align: 'center' });

doc.end();

writeStream.on('finish', () => {
  console.log('PDF Invoice generated successfully at:', outPath);
});
