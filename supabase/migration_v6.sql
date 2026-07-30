-- =============================================
-- Boss Rent Pererenan — Migration v6
-- Jalankan di Supabase SQL Editor (sekali saja)
-- =============================================

-- 1. Tambah kolom payment_status ke tabel transactions
--    Default 'paid' agar semua data lama tetap terhitung sebagai sudah lunas
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'paid'
    CHECK (payment_status IN ('paid', 'unpaid'));

-- 2. Pastikan semua transaksi lama yang status-nya 'completed' atau 'active'
--    sudah ter-set payment_status = 'paid' (backward compat)
UPDATE transactions
  SET payment_status = 'paid'
  WHERE payment_status IS NULL;

-- Selesai. Data motor & transaksi yang sudah ada tidak berubah.
