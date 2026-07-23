const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eedrziblypwrufdzctvd.supabase.co';
const serviceKey = 'sb_secret_eENyau7M99jlO2J9iCLSyQ_0P4qGgBl';

const supabase = createClient(supabaseUrl, serviceKey);

async function seedCompletedTransactionsWithIssues() {
  console.log('Fetching vehicles to associate transactions...');
  const { data: vehicles } = await supabase.from('vehicles').select('*');

  const nmax = vehicles.find(v => v.plate_number === 'DK 4821 FBG');
  const pcx = vehicles.find(v => v.plate_number === 'DK 6210 FBD');
  const vario = vehicles.find(v => v.plate_number === 'DK 7419 FBF');

  const completedTx = [
    {
      renter_name: 'Liam O’Connor',
      renter_phone: '+61491570156',
      renter_id_number: 'PASSPORT-AU-77182',
      vehicle_id: nmax ? nmax.id : null,
      start_date: '2026-07-10',
      end_date: '2026-07-20',
      total_price: 1500000,
      deposit: 500000,
      status: 'completed',
      km_start: 15000,
      km_end: 18200, // +3200 km (Oil change overdue!)
      issues_reported: 'Rem belakang terasa kurang pakem saat turunan, serta ada bunyi getaran gredek pada CVT tarikan awal.',
      notes: 'Customer returned motorbike in Canggu. Reported brake & CVT issues.'
    },
    {
      renter_name: 'Emma Watson',
      renter_phone: '+447911123456',
      renter_id_number: 'PASSPORT-UK-33918',
      vehicle_id: pcx ? pcx.id : null,
      start_date: '2026-07-12',
      end_date: '2026-07-22',
      total_price: 1600000,
      deposit: 500000,
      status: 'completed',
      km_start: 12000,
      km_end: 15600, // +3600 km
      issues_reported: 'Ban belakang terasa agak kempes/kurang angin saat perjalanan jauh ke Uluwatu, mohon ganti oli mesin.',
      notes: 'Completed 10-day trip. Oil change and tire check needed.'
    },
    {
      renter_name: 'Hans Gruber',
      renter_phone: '+4915123456789',
      renter_id_number: 'PASSPORT-DE-99123',
      vehicle_id: vario ? vario.id : null,
      start_date: '2026-07-14',
      end_date: '2026-07-21',
      total_price: 770000,
      deposit: 500000,
      status: 'completed',
      km_start: 8000,
      km_end: 11800, // +3800 km
      issues_reported: 'Lampu utama dekat agak redup dan stang terasa sedikit berat ke kanan saat pengereman mendadak.',
      notes: 'Customer reported headlamp brightness issue & alignment.'
    }
  ];

  console.log('Inserting 3 Completed Customer Transactions with Reported Issues...');
  for (const tx of completedTx) {
    if (!tx.vehicle_id) continue;

    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('renter_name', tx.renter_name)
      .maybeSingle();

    if (existing) {
      await supabase.from('transactions').update(tx).eq('id', existing.id);
      console.log(`Updated completed transaction for ${tx.renter_name}`);
    } else {
      const { error } = await supabase.from('transactions').insert(tx);
      if (error) console.error('Insert Error:', error);
      else console.log(`Inserted completed transaction for ${tx.renter_name}`);
    }
  }

  // Also seed 2 dummy service history logs into expenses so the History Log tab has data!
  const historyExpenses = [
    {
      title: 'Servis Rutin & Ganti Oli Mesin MPX2: Yamaha NMax 155 (DK 4821 FBG)',
      category: 'service',
      amount: 145000,
      expense_date: '2026-06-25',
      notes: 'Ganti Oli Yamalube Matic, ganti oli gardan & pembersihan saringan udara bengkel resmi.'
    },
    {
      title: 'Servis CVT & Ganti Kampas Rem: Honda Scoopy (DK 5932 FCB)',
      category: 'sparepart',
      amount: 320000,
      expense_date: '2026-07-02',
      notes: 'Ganti roller 12 gram, ganti v-belt original, & kampas rem depan belakang.'
    }
  ];

  console.log('Seeding Service History Expenses...');
  for (const exp of historyExpenses) {
    const { data: existingExp } = await supabase
      .from('expenses')
      .select('id')
      .eq('title', exp.title)
      .maybeSingle();

    if (!existingExp) {
      await supabase.from('expenses').insert(exp);
      console.log(`Inserted service history expense: ${exp.title}`);
    }
  }

  console.log('Seeding completed successfully!');
}

seedCompletedTransactionsWithIssues();
