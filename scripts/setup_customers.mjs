import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eedrziblypwrufdzctvd.supabase.co';
const SERVICE_KEY = 'sb_secret_eENyau7M99jlO2J9iCLSyQ_0P4qGgBl';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function setupCustomersTable() {
  console.log('🚀 Boss Rent Pererenan — Customers Database Setup');
  console.log('===============================================\n');

  try {
    const { error: cErr } = await admin.from('customers').select('id').limit(1);
    if (!cErr) {
      console.log('✅ Tabel `customers` sudah ada dan aktif di Supabase!');
      return;
    }

    if (cErr.code === '42P01') {
      console.log('⚠️ Tabel `customers` belum ada di database.');
      console.log('👉 Membuka koneksi RPC / SQL editor untuk menjalankan schema...');
      console.log('Silakan jalankan SQL berikut di Supabase Dashboard SQL Editor:');
      console.log(`
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  id_number VARCHAR(50),
  address TEXT,
  notes TEXT,
  customer_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers_all_access" ON customers;
CREATE POLICY "customers_all_access" ON customers FOR ALL USING (true) WITH CHECK (true);
      `);
    } else {
      console.log('Notice / Status tabel customers:', cErr.message);
    }
  } catch (err) {
    console.error('Error checking customers table:', err);
  }
}

setupCustomersTable();
