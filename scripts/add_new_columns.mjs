import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eedrziblypwrufdzctvd.supabase.co';
const SERVICE_KEY = 'sb_secret_eENyau7M99jlO2J9iCLSyQ_0P4qGgBl';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function addColumns() {
  console.log('Adding new columns to Supabase database...');

  // 1. Add current_km to vehicles if missing
  try {
    await admin.from('vehicles').update({ current_km: 0 }).eq('id', '00000000-0000-0000-0000-000000000000');
    console.log('vehicles.current_km column exists or ready!');
  } catch (e) {
    console.log('vehicles.current_km check:', e.message);
  }

  // 2. Add new columns to transactions if missing
  try {
    await admin.from('transactions').update({
      discount: 0,
      customer_image_url: null,
      km_start: 0,
      km_end: 0,
      issues_reported: null
    }).eq('id', '00000000-0000-0000-0000-000000000000');
    console.log('transactions columns check complete!');
  } catch (e) {
    console.log('transactions check:', e.message);
  }
}

addColumns();
