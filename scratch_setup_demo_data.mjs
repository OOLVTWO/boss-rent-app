import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eedrziblypwrufdzctvd.supabase.co';
const supabaseKey = 'sb_secret_eENyau7M99jlO2J9iCLSyQ_0P4qGgBl';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching vehicles...');
  const { data: vehicles, error: vErr } = await supabase.from('vehicles').select('*');
  if (vErr) {
    console.error('Error fetching vehicles:', vErr);
    return;
  }
  console.log(`Found ${vehicles.length} vehicles:`);
  vehicles.forEach((v, idx) => console.log(`${idx + 1}. [${v.id}] ${v.name} (${v.plate_number}) - ${v.status}`));

  if (vehicles.length >= 3) {
    const v1 = vehicles[0]; // Set available
    const v2 = vehicles[1]; // Set rented
    const v3 = vehicles[2]; // Set maintenance

    console.log(`\nUpdating status:`);
    console.log(`1. ${v1.name} -> available`);
    await supabase.from('vehicles').update({ status: 'available' }).eq('id', v1.id);

    console.log(`2. ${v2.name} -> rented`);
    await supabase.from('vehicles').update({ status: 'rented' }).eq('id', v2.id);

    console.log(`3. ${v3.name} -> maintenance`);
    await supabase.from('vehicles').update({ status: 'maintenance' }).eq('id', v3.id);

    // Also check if v2 has an active transaction or create one for realistic demo
    const { data: existingTx } = await supabase.from('transactions').select('*').eq('vehicle_id', v2.id).eq('status', 'active');
    if (!existingTx || existingTx.length === 0) {
      console.log(`Creating active transaction for ${v2.name}...`);
      const today = new Date().toISOString().split('T')[0];
      const next3Days = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
      await supabase.from('transactions').insert({
        vehicle_id: v2.id,
        renter_name: 'Budi Santoso (Demo Sewa)',
        renter_phone: '081234567890',
        renter_address: 'Jl. Pantai Pererenan No. 88, Canggu, Bali',
        start_date: today,
        end_date: next3Days,
        duration_days: 3,
        price_per_day: v2.daily_rate || 120000,
        total_price: (v2.daily_rate || 120000) * 3,
        deposit: 200000,
        status: 'active',
        payment_method: 'bank_transfer',
        km_start: 15420
      });
      console.log('Active transaction created successfully!');
    }
  } else {
    console.log('Fewer than 3 vehicles found.');
  }
}

run();
