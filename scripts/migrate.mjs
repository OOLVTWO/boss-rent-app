import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eedrziblypwrufdzctvd.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigration() {
  console.log('🔄 Running database migrations for new features...');

  // 1. Add columns to vehicles table
  const vehicleColumns = [
    { name: 'image_url', type: 'TEXT' },
    { name: 'current_km', type: 'INTEGER DEFAULT 0' }
  ];

  // 2. Add columns to transactions table
  const transactionColumns = [
    { name: 'discount', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'customer_image_url', type: 'TEXT' },
    { name: 'km_start', type: 'INTEGER DEFAULT 0' },
    { name: 'km_end', type: 'INTEGER DEFAULT 0' },
    { name: 'issues_reported', type: 'TEXT' }
  ];

  // Check existing columns by selecting 1 row
  const { data: vRow } = await admin.from('vehicles').select('*').limit(1);
  console.log('Current vehicle columns:', vRow ? Object.keys(vRow[0] || {}) : 'empty table');

  const { data: tRow } = await admin.from('transactions').select('*').limit(1);
  console.log('Current transaction columns:', tRow ? Object.keys(tRow[0] || {}) : 'empty table');

  console.log('✅ Migration check finished!');
}

runMigration().catch(console.error);
