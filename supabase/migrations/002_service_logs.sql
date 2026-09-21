-- ============================================================
-- Boss Rent Pererenan — Migration 002: Jejak Servis Motor
-- Aman dijalankan ulang (idempotent). Hanya MENAMBAH objek baru;
-- tidak mengubah/menghapus data tabel lain.
-- ============================================================

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Tabel service_logs: satu baris = satu kali servis ──
create table if not exists public.service_logs (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references public.vehicles(id) on delete cascade,
  service_date date not null default current_date,
  km           integer check (km is null or km >= 0),
  items        text[] not null default '{}',
  workshop     text not null default '',
  cost         numeric not null default 0 check (cost >= 0),
  notes        text not null default '',
  -- Pengeluaran di menu Keuangan yang dibuat otomatis dari servis ini (opsional)
  expense_id   uuid references public.expenses(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_service_logs_vehicle_date
  on public.service_logs (vehicle_id, service_date desc);
create index if not exists idx_service_logs_date
  on public.service_logs (service_date desc);
create unique index if not exists uq_service_logs_expense_id
  on public.service_logs (expense_id) where expense_id is not null;

drop trigger if exists set_updated_at_service_logs on public.service_logs;
create trigger set_updated_at_service_logs
  before update on public.service_logs
  for each row execute function public.set_updated_at();

-- ── RLS: HANYA admin yang login ──
alter table public.service_logs enable row level security;

drop policy if exists "service_logs_admin_all" on public.service_logs;
create policy "service_logs_admin_all"
  on public.service_logs for all
  to authenticated
  using (true) with check (true);

-- Grant eksplisit (Supabase mewajibkan grant eksplisit untuk Data API
-- pada tabel baru). anon sengaja TIDAK diberi akses.
revoke all on public.service_logs from anon;
grant select, insert, update, delete on public.service_logs to authenticated;
grant all on public.service_logs to service_role;
