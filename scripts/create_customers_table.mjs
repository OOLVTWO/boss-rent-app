import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eedrziblypwrufdzctvd.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ Env SUPABASE_SERVICE_ROLE_KEY belum di-set. Jalankan dulu:');
  console.error('   $env:SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."  (PowerShell)');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createCustomersTable() {
  console.log('Attempting to create customers table...');
  const createSql = `
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
  `;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: createSql })
    });
    console.log('exec_sql status:', res.status, await res.text());
  } catch (err) {
    console.error('RPC exec_sql error:', err);
  }

  // Check if customers table is accessible now
  const { data, error } = await admin.from('customers').select('*').limit(1);
  console.log('Select check:', { data, error });
}

createCustomersTable();
