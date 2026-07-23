import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eedrziblypwrufdzctvd.supabase.co';
const SERVICE_KEY = 'sb_secret_eENyau7M99jlO2J9iCLSyQ_0P4qGgBl';

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

  // 3. Add columns to expenses table
  const expenseColumns = [
    { name: 'type', type: "VARCHAR(20) DEFAULT 'expense'" }
  ];

  const { data: eRow } = await admin.from('expenses').select('*').limit(1);
  console.log('Current expense columns:', eRow ? Object.keys(eRow[0] || {}) : 'empty table');

  console.log('✅ Migration check finished!');
}

runMigration().catch(console.error);
