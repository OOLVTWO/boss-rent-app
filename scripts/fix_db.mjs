import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eedrziblypwrufdzctvd.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('Fixing transactions table duration_days column...');

  // Try creating a transaction without duration_days to see if DB calculates it generated or if it expects duration_days
  const { data: v } = await admin.from('vehicles').select('id').limit(1);
  if (!v || !v.length) {
    console.log('No vehicles found');
    return;
  }

  const testPayload = {
    vehicle_id: v[0].id,
    renter_name: 'Test Duration',
    renter_phone: '08111111111',
    start_date: '2026-07-21',
    end_date: '2026-07-23',
    total_price: 150000,
    deposit: 0,
    payment_method: 'cash',
    status: 'active'
  };

  const { data: res1, error: err1 } = await admin.from('transactions').insert([testPayload]).select().single();
  if (err1) {
    console.log('Insert without duration_days error:', err1);
  } else {
    console.log('Insert without duration_days SUCCESS! Created tx:', res1);
    // Cleanup test tx
    await admin.from('transactions').delete().eq('id', res1.id);
  }
}

main();
