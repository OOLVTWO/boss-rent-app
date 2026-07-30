import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eedrziblypwrufdzctvd.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_eENyau7M99jlO2J9iCLSyQ_0P4qGgBl';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigration() {
  console.log('🔄 Checking database columns and running migrations...');

  const { data: vRow } = await admin.from('vehicles').select('*').limit(1);
  console.log('Current vehicle table columns:', vRow ? Object.keys(vRow[0] || {}) : 'empty table');

  const { data: eRow } = await admin.from('expenses').select('*').limit(1);
  console.log('Current expense table columns:', eRow ? Object.keys(eRow[0] || {}) : 'empty table');

  console.log(`
===================================================================
📋 PASTE THIS SQL DIRECTLY INTO YOUR SUPABASE SQL EDITOR TO AGREE:
===================================================================

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_type TEXT DEFAULT 'internal';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_contact TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS revenue_share_percentage INTEGER DEFAULT 70;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_date DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(14,2) DEFAULT 0;

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_km INTEGER DEFAULT 15000;

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'expense';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL;
===================================================================
  `);

  console.log('✅ Migration instructions output successfully!');
}

runMigration().catch(console.error);
