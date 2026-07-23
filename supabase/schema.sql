-- =============================================
-- Boss Rent Pererenan — Supabase Schema v4 (Expenses & Damage Fee Support)
-- Jalankan script ini di Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABEL VEHICLES (Data Motor)
-- =============================================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  plate_number VARCHAR(20) NOT NULL UNIQUE,
  year INTEGER NOT NULL,
  color VARCHAR(50) NOT NULL,
  category VARCHAR(30) NOT NULL DEFAULT 'honda'
    CHECK (category IN ('honda', 'yamaha', 'suzuki', 'kawasaki', 'vespa', 'other')),
  rate_per_day DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'rented', 'maintenance')),
  image_url TEXT,
  current_km INTEGER DEFAULT 15000,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABEL TRANSACTIONS (Transaksi Sewa)
-- =============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  renter_name VARCHAR(100) NOT NULL,
  renter_phone VARCHAR(20) NOT NULL,
  renter_id_number VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 1,
  total_price DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) DEFAULT 0,
  deposit DECIMAL(12,2) DEFAULT 0,
  damage_fee DECIMAL(12,2) DEFAULT 0,
  customer_image_url TEXT,
  km_start INTEGER DEFAULT 0,
  km_end INTEGER DEFAULT 0,
  issues_reported TEXT,
  payment_method VARCHAR(20) DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'transfer', 'qris')),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABEL EXPENSES (Pengeluaran Operasional)
-- =============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'service',
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ALTER TABLE (Aman dijalankan jika tabel sudah ada)
-- =============================================
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_km INTEGER DEFAULT 15000;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS category VARCHAR(30) DEFAULT 'honda';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_service_km INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_serviced_at TIMESTAMPTZ;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS rate_per_week DECIMAL(12,2) DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS rate_per_month DECIMAL(12,2) DEFAULT 0;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS damage_fee DECIMAL(12,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_image_url TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS km_start INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS km_end INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS issues_reported TEXT;

-- =============================================
-- INDEXES untuk performa query
-- =============================================
CREATE INDEX IF NOT EXISTS idx_transactions_vehicle_id ON transactions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_start_date ON transactions(start_date);
CREATE INDEX IF NOT EXISTS idx_transactions_end_date ON transactions(end_date);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICY FIX
-- =============================================
-- Nonaktifkan RLS agar API Next.js yang menggunakan ANON_KEY / PUBLIC dapat menginsert & meng-update data
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

-- Policy backup jika RLS diaktifkan kembali
DROP POLICY IF EXISTS "vehicles_public_all" ON vehicles;
DROP POLICY IF EXISTS "transactions_public_all" ON transactions;
DROP POLICY IF EXISTS "expenses_public_all" ON expenses;

CREATE POLICY "vehicles_public_all" ON vehicles FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "transactions_public_all" ON transactions FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "expenses_public_all" ON expenses FOR ALL TO public USING (true) WITH CHECK (true);
