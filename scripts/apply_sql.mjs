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

async function main() {
  console.log('Testing SQL ALTER TABLE execution...');

  const sqls = [
    `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_km INTEGER DEFAULT 0;`,
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount DECIMAL(12,2) DEFAULT 0;`,
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_image_url TEXT;`,
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS km_start INTEGER DEFAULT 0;`,
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS km_end INTEGER DEFAULT 0;`,
    `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS issues_reported TEXT;`
  ];

  for (const sql of sqls) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
      });
      console.log('SQL Exec Status:', res.status, await res.text());
    } catch (e) {
      console.error(e);
    }
  }
}

main();
