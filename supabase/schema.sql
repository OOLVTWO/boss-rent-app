-- =============================================
-- Boss Rent Pererenan — Supabase Schema v5 (Master Schema + RLS Policy Approved)
-- Jalankan script ini di Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABEL VEHICLES (Data Motor & Investor Privasi)
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
  rate_per_week DECIMAL(12,2) DEFAULT 0,
  rate_per_month DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'rented', 'maintenance')),
  image_url TEXT,
  current_km INTEGER DEFAULT 15000,
  last_service_km INTEGER DEFAULT 0,
  last_serviced_at TIMESTAMPTZ,
  notes TEXT,
  -- Fitur Privasi Kepemilikan & Investor Bagi Hasil
  owner_type TEXT DEFAULT 'internal',
  owner_name TEXT,
  owner_contact TEXT,
  revenue_share_percentage INTEGER DEFAULT 70,
  purchase_date DATE,
  purchase_price DECIMAL(14,2) DEFAULT 0,
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
  renter_address TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 1,
  total_price DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) DEFAULT 0,
  deposit DECIMAL(12,2) DEFAULT 0,
  damage_fee DECIMAL(12,2) DEFAULT 0,
  customer_image_url TEXT,
  handover_image_url TEXT,
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
-- TABEL EXPENSES (Keuangan: Pemasukan & Pengeluaran)
-- =============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'service',
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL,
  type VARCHAR(20) DEFAULT 'expense',
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ALTER TABLE (Aman dijalankan jika database sudah ada)
-- =============================================
-- Update Kolom Motor & Investor
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_km INTEGER DEFAULT 15000;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS category VARCHAR(30) DEFAULT 'honda';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_service_km INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_serviced_at TIMESTAMPTZ;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS rate_per_week DECIMAL(12,2) DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS rate_per_month DECIMAL(12,2) DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_type TEXT DEFAULT 'internal';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_contact TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS revenue_share_percentage INTEGER DEFAULT 70;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_date DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(14,2) DEFAULT 0;

-- Update Kolom Transaksi
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS damage_fee DECIMAL(12,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_image_url TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS handover_image_url TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS km_start INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS km_end INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS issues_reported TEXT;

-- Update Kolom Keuangan
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'expense';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL;

-- =============================================
-- INDEXES untuk performa query cepat
-- =============================================
CREATE INDEX IF NOT EXISTS idx_transactions_vehicle_id ON transactions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_start_date ON transactions(start_date);
CREATE INDEX IF NOT EXISTS idx_transactions_end_date ON transactions(end_date);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_id ON expenses(vehicle_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES (FULL PERMISSION)
-- =============================================
-- Enable RLS dengan Policy Akses Penuh untuk Next.js / Vercel API
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicles_all_access" ON vehicles;
DROP POLICY IF EXISTS "transactions_all_access" ON transactions;
DROP POLICY IF EXISTS "expenses_all_access" ON expenses;

DROP POLICY IF EXISTS "vehicles_public_all" ON vehicles;
DROP POLICY IF EXISTS "transactions_public_all" ON transactions;
DROP POLICY IF EXISTS "expenses_public_all" ON expenses;

CREATE POLICY "vehicles_all_access" ON vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "transactions_all_access" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "expenses_all_access" ON expenses FOR ALL USING (true) WITH CHECK (true);
