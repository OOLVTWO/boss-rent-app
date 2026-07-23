const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eedrziblypwrufdzctvd.supabase.co';
const serviceKey = 'sb_secret_eENyau7M99jlO2J9iCLSyQ_0P4qGgBl';

const supabase = createClient(supabaseUrl, serviceKey);

async function seedMoreIssues() {
  console.log('Fetching vehicles...');
  const { data: vehicles } = await supabase.from('vehicles').select('*');

  const vespa = vehicles.find(v => v.plate_number === 'DK 3109 FBA');
  const scoopy = vehicles.find(v => v.plate_number === 'DK 5932 FCB');
  const aerox = vehicles.find(v => v.plate_number === 'DK 2841 FBE');

  const completedTx = [
    {
      renter_name: 'Lucas Silva',
      renter_phone: '+5511987654321',
      renter_id_number: 'PASSPORT-BR-44120',
      vehicle_id: vespa ? vespa.id : null,
      start_date: '2026-07-05',
      end_date: '2026-07-19',
      total_price: 3200000,
      deposit: 1000000,
      status: 'completed',
      km_start: 14000,
      km_end: 17800, // +3800 KM (Oil & CVT overdue!)
      issues_reported: 'Akselerasi awal terasa gredek di bagian CVT & aki agak tekor saat starter pagi di villa.',
      notes: 'Customer returned Vespa after 14 days trip in Canggu & Ubud.'
    },
    {
      renter_name: 'Sophie Martin',
      renter_phone: '+33698765432',
      renter_id_number: 'PASSPORT-FR-55109',
      vehicle_id: scoopy ? scoopy.id : null,
      start_date: '2026-07-08',
      end_date: '2026-07-18',
      total_price: 900000,
      deposit: 500000,
      status: 'completed',
      km_start: 11000,
      km_end: 14600, // +3600 KM
      issues_reported: 'Rem depan bunyi berdecit saat dipakai turunan jalan Pantai Pererenan & oli mesin sudah lewat batas KM.',
      notes: 'Customer reported squeaking front brakes.'
    },
    {
      renter_name: 'Oliver Smith',
      renter_phone: '+61488990011',
      renter_id_number: 'PASSPORT-AU-11029',
      vehicle_id: aerox ? aerox.id : null,
      start_date: '2026-07-11',
      end_date: '2026-07-21',
      total_price: 1400000,
      deposit: 500000,
      status: 'completed',
      km_start: 16000,
      km_end: 20100, // +4100 KM
      issues_reported: 'Stang terasa agak bergetar saat kecepatan 60 km/jam dan alur ban belakang mulai gundul.',
      notes: 'High distance usage. Needs tire replacement & alignment.'
    }
  ];

  console.log('Inserting 3 More Motorbikes with Reported Issues...');
  for (const tx of completedTx) {
    if (!tx.vehicle_id) continue;

    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('renter_name', tx.renter_name)
      .maybeSingle();

    if (existing) {
      await supabase.from('transactions').update(tx).eq('id', existing.id);
      console.log(`Updated transaction for ${tx.renter_name}`);
    } else {
      const { error } = await supabase.from('transactions').insert(tx);
      if (error) console.error('Insert Error:', error);
      else console.log(`Inserted transaction for ${tx.renter_name}`);
    }
  }

  console.log('Seeding finished successfully!');
}

seedMoreIssues();
