-- ============================================================
-- Boss Rent Pererenan — Migration 001: Schema + RLS + Indexes
-- Jalankan di Supabase Dashboard → SQL Editor (sekali saja).
-- Aman dijalankan ulang (idempotent: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- ============================================================

-- ── Extension (gen_random_uuid) ──
create extension if not exists pgcrypto;

-- ── Trigger helper: auto-update updated_at ──
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- TABEL VEHICLES
-- ============================================================
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plate_number text,
  year int,
  color text default '',
  category text default 'honda',
  rate_per_day numeric default 0,
  rate_per_week numeric default 0,
  rate_per_month numeric default 0,
  status text default 'available',
  image_url text,
  current_km int default 15000,
  last_service_km int default 0,
  last_serviced_at timestamptz,
  notes text default '',
  owner_type text default 'internal',
  owner_name text default '',
  owner_contact text default '',
  revenue_share_percentage int default 70,
  purchase_date date,
  purchase_price numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Kolom tambahan jika tabel sudah ada (migrasi aman dari versi lama)
alter table public.vehicles add column if not exists last_service_km int default 0;
alter table public.vehicles add column if not exists last_serviced_at timestamptz;
alter table public.vehicles add column if not exists notes text default '';
alter table public.vehicles add column if not exists owner_type text default 'internal';
alter table public.vehicles add column if not exists owner_name text default '';
alter table public.vehicles add column if not exists owner_contact text default '';
alter table public.vehicles add column if not exists revenue_share_percentage int default 70;
alter table public.vehicles add column if not exists purchase_date date;
alter table public.vehicles add column if not exists purchase_price numeric default 0;

drop trigger if exists set_updated_at_vehicles on public.vehicles;
create trigger set_updated_at_vehicles
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABEL TRANSACTIONS
-- ============================================================
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete set null,
  renter_name text not null,
  renter_phone text,
  renter_id_number text,
  renter_address text,
  start_date date,
  end_date date,
  duration_days int,
  total_price numeric default 0,
  deposit numeric default 0,
  damage_fee numeric default 0,
  discount numeric default 0,
  km_start int,
  km_end int,
  payment_status text default 'paid',
  payment_method text,
  status text default 'active',
  issues_reported text,
  customer_image_url text,
  handover_image_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.transactions add column if not exists renter_id_number text;
alter table public.transactions add column if not exists renter_address text;
alter table public.transactions add column if not exists damage_fee numeric default 0;
alter table public.transactions add column if not exists discount numeric default 0;
alter table public.transactions add column if not exists km_start int;
alter table public.transactions add column if not exists km_end int;
alter table public.transactions add column if not exists payment_status text default 'paid';
alter table public.transactions add column if not exists payment_method text;
alter table public.transactions add column if not exists issues_reported text;
alter table public.transactions add column if not exists customer_image_url text;
alter table public.transactions add column if not exists handover_image_url text;
alter table public.transactions add column if not exists notes text;

drop trigger if exists set_updated_at_transactions on public.transactions;
create trigger set_updated_at_transactions
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABEL EXPENSES  (keuangan: pengeluaran + pemasukan lain)
-- ============================================================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  type text default 'expense',
  title text not null,
  category text default 'service',
  amount numeric default 0,
  expense_date date default current_date,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  notes text default '',
  is_auto_transaction boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.expenses add column if not exists type text default 'expense';
alter table public.expenses add column if not exists category text default 'service';
alter table public.expenses add column if not exists vehicle_id uuid references public.vehicles(id) on delete set null;
alter table public.expenses add column if not exists is_auto_transaction boolean default false;

drop trigger if exists set_updated_at_expenses on public.expenses;
create trigger set_updated_at_expenses
  before update on public.expenses
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABEL CUSTOMERS
-- ============================================================
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  id_number text,
  address text,
  customer_image_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.customers add column if not exists id_number text;
alter table public.customers add column if not exists address text;
alter table public.customers add column if not exists customer_image_url text;
alter table public.customers add column if not exists notes text;

drop trigger if exists set_updated_at_customers on public.customers;
create trigger set_updated_at_customers
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABEL BUSINESS_SETTINGS (publik: nama, alamat, jam, logo)
-- ============================================================
create table if not exists public.business_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb,
  updated_at timestamptz default now()
);

-- ============================================================
-- INDEXES (percepat dashboard & laporan)
-- ============================================================
create index if not exists idx_transactions_created_at on public.transactions (created_at desc);
create index if not exists idx_transactions_vehicle_id on public.transactions (vehicle_id);
create index if not exists idx_transactions_status on public.transactions (status);
create index if not exists idx_vehicles_status on public.vehicles (status);
create index if not exists idx_expenses_expense_date on public.expenses (expense_date desc);
create index if not exists idx_customers_phone on public.customers (phone);

-- ============================================================
-- ROW LEVEL SECURITY
-- Filosofi:
--  - anon (publik): hanya bisa SELECT vehicles (katalog /fleet) &
--    business_settings. TIDAK bisa menyentuh transactions/customers/expenses.
--  - authenticated (admin yang login): akses penuh (CRUD) ke semua tabel.
--  - service_role (API admin, createAdminClient): bypass RLS otomatis.
-- ============================================================
alter table public.vehicles enable row level security;
alter table public.transactions enable row level security;
alter table public.expenses enable row level security;
alter table public.customers enable row level security;
alter table public.business_settings enable row level security;

-- ── Vehicles: publik baca (katalog), admin CRUD ──
drop policy if exists "vehicles_public_select" on public.vehicles;
create policy "vehicles_public_select"
  on public.vehicles for select
  to anon, authenticated
  using (true);

drop policy if exists "vehicles_admin_all" on public.vehicles;
create policy "vehicles_admin_all"
  on public.vehicles for all
  to authenticated
  using (true) with check (true);

-- ── Transactions: HANYA admin ──
drop policy if exists "transactions_admin_all" on public.transactions;
create policy "transactions_admin_all"
  on public.transactions for all
  to authenticated
  using (true) with check (true);

-- ── Expenses: HANYA admin ──
drop policy if exists "expenses_admin_all" on public.expenses;
create policy "expenses_admin_all"
  on public.expenses for all
  to authenticated
  using (true) with check (true);

-- ── Customers (PII): HANYA admin ──
drop policy if exists "customers_admin_all" on public.customers;
create policy "customers_admin_all"
  on public.customers for all
  to authenticated
  using (true) with check (true);

-- ── Business settings: publik baca, admin tulis ──
drop policy if exists "settings_public_select" on public.business_settings;
create policy "settings_public_select"
  on public.business_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "settings_admin_all" on public.business_settings;
create policy "settings_admin_all"
  on public.business_settings for all
  to authenticated
  using (true) with check (true);

-- ── Revoke default anon write (lapisan kedua; RLS sudah menolak) ──
revoke all on public.transactions, public.expenses, public.customers from anon;

-- ============================================================
-- CATATAN SANITASI DATA LAMA (dinonaktifkan):
-- Sebelumnya mengubah transaksi 'active' + payment_status null menjadi
-- 'unpaid'. TIDAK disarankan: aplikasi memperlakukan null sebagai lunas
-- (perilaku historis cash basis) — lihat isPaidTransaction() di finance.js.
-- ============================================================
-- update public.transactions
--    set payment_status = 'unpaid'
--  where status = 'active'
--    and (payment_status is null or payment_status = '');
