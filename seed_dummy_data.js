const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eedrziblypwrufdzctvd.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceKey);

const vehiclesData = [
  {
    name: 'Yamaha NMax 155 Connected',
    category: 'yamaha',
    color: 'Matte Black',
    plate_number: 'DK 4821 FBG',
    rate_per_day: 150000,
    rate_per_week: 950000,
    rate_per_month: 3200000,
    status: 'available',
    year: 2024,
    image_url: '/images/vehicle_nmax.png'
  },
  {
    name: 'Honda Scoopy Prestige',
    category: 'honda',
    color: 'Mint Green',
    plate_number: 'DK 5932 FCB',
    rate_per_day: 90000,
    rate_per_week: 550000,
    rate_per_month: 1800000,
    status: 'rented',
    year: 2023,
    image_url: '/images/vehicle_scoopy.png'
  },
  {
    name: 'Vespa Sprint 150 i-Get',
    category: 'vespa',
    color: 'Pearl White',
    plate_number: 'DK 3109 FBA',
    rate_per_day: 250000,
    rate_per_week: 1600000,
    rate_per_month: 5000000,
    status: 'rented',
    year: 2024,
    image_url: '/images/vehicle_vespa.png'
  },
  {
    name: 'Honda PCX 160 ABS',
    category: 'honda',
    color: 'Brilliant Red',
    plate_number: 'DK 6210 FBD',
    rate_per_day: 160000,
    rate_per_week: 1000000,
    rate_per_month: 3400000,
    status: 'available',
    year: 2024,
    image_url: '/images/vehicle_pcx.png'
  },
  {
    name: 'Yamaha Aerox 155 CyberCity',
    category: 'yamaha',
    color: 'Matte Blue',
    plate_number: 'DK 2841 FBE',
    rate_per_day: 140000,
    rate_per_week: 880000,
    rate_per_month: 3000000,
    status: 'rented',
    year: 2023,
    image_url: '/images/vehicle_aerox.png'
  },
  {
    name: 'Honda Vario 160 CBS',
    category: 'honda',
    color: 'Matte Black',
    plate_number: 'DK 7419 FBF',
    rate_per_day: 110000,
    rate_per_week: 680000,
    rate_per_month: 2300000,
    status: 'available',
    year: 2023,
    image_url: '/images/vehicle_vario.png'
  }
];

async function seed() {
  console.log('Seeding 6 Motorbike Records...');
  
  for (const v of vehiclesData) {
    const { data: existing } = await supabase
      .from('vehicles')
      .select('id')
      .eq('plate_number', v.plate_number)
      .maybeSingle();

    if (existing) {
      await supabase.from('vehicles').update(v).eq('id', existing.id);
      console.log(`Updated vehicle: ${v.name} (${v.plate_number})`);
    } else {
      const { data: inserted, error } = await supabase.from('vehicles').insert(v).select('id').single();
      if (error) console.error('Insert error:', error);
      else console.log(`Inserted vehicle: ${v.name} (${v.plate_number})`);
    }
  }

  // Fetch updated vehicle IDs for transactions
  const { data: allVehicles } = await supabase.from('vehicles').select('*');
  const scoopy = allVehicles.find(x => x.plate_number === 'DK 5932 FCB');
  const vespa = allVehicles.find(x => x.plate_number === 'DK 3109 FBA');
  const aerox = allVehicles.find(x => x.plate_number === 'DK 2841 FBE');

  const transactionsData = [
    {
      renter_name: 'Alexandre Mercier',
      renter_phone: '+33612345678',
      renter_id_number: 'PASSPORT-FR-88912',
      vehicle_id: scoopy ? scoopy.id : null,
      start_date: '2026-07-15',
      end_date: '2026-07-29',
      total_price: 1100000,
      deposit: 500000,
      status: 'active',
      notes: 'Weekly rental (2 weeks @ Rp 550.000). Delivered to Villa Bambu, Pererenan with 2 sanitized helmets.'
    },
    {
      renter_name: 'Charlotte Harrison',
      renter_phone: '+447700900077',
      renter_id_number: 'PASSPORT-UK-44109',
      vehicle_id: vespa ? vespa.id : null,
      start_date: '2026-07-01',
      end_date: '2026-07-31',
      total_price: 5000000,
      deposit: 1000000,
      status: 'active',
      notes: 'Monthly rental package. Full tank option & extra helmet delivered to Canggu Beach Residence, Pererenan.'
    },
    {
      renter_name: 'Dmitry Volkov',
      renter_phone: '+61412345678',
      renter_id_number: 'PASSPORT-AU-99120',
      vehicle_id: aerox ? aerox.id : null,
      start_date: '2026-07-20',
      end_date: '2026-07-27',
      total_price: 880000,
      deposit: 500000,
      status: 'active',
      notes: '7-day weekly rate. Delivered to Surf Haven Villa, Pantai Pererenan No. 45 with surfboard rack.'
    }
  ];

  console.log('Seeding 3 Weekly & Monthly Customer Transactions...');
  for (const tx of transactionsData) {
    if (!tx.vehicle_id) continue;

    const { data: existingTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('renter_name', tx.renter_name)
      .maybeSingle();

    if (existingTx) {
      await supabase.from('transactions').update(tx).eq('id', existingTx.id);
      console.log(`Updated transaction for ${tx.renter_name}`);
    } else {
      const { error: txErr } = await supabase.from('transactions').insert(tx);
      if (txErr) console.error('TX Error:', txErr);
      else console.log(`Inserted transaction for ${tx.renter_name}`);
    }
  }

  console.log('Seeding finished successfully!');
}

seed();
