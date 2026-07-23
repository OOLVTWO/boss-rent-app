import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eedrziblypwrufdzctvd.supabase.co';
const SERVICE_KEY = 'sb_secret_eENyau7M99jlO2J9iCLSyQ_0P4qGgBl';
const ANON_KEY = 'sb_publishable_zUqMMF85DjjkO4HMiiZcvQ_ZWdKiFpF';
const ADMIN_EMAIL = 'admin@bossrent.com';
const ADMIN_PASS = 'BossRent2024!';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🚀 Boss Rent Pererenan — Setup Script');
  console.log('=====================================\n');

  // ── Step 1: Cek tabel database ──────────────────────
  console.log('📦 Step 1: Cek tabel database...');

  const { error: vErr } = await admin.from('vehicles').select('id').limit(1);
  const vehiclesOk = !vErr || vErr.code !== '42P01';

  const { error: tErr } = await admin.from('transactions').select('id').limit(1);
  const transactionsOk = !tErr || tErr.code !== '42P01';

  if (vehiclesOk && transactionsOk) {
    console.log('  ✅ Tabel vehicles ada');
    console.log('  ✅ Tabel transactions ada');
  } else {
    console.log('  ⚠️  Tabel belum dibuat!');
    console.log('  👉 Jalankan schema.sql di:');
    console.log('     https://supabase.com/dashboard/project/eedrziblypwrufdzctvd/sql/new\n');
  }

  // ── Step 2: Konfirmasi / buat user admin ─────────────
  console.log('\n👤 Step 2: Setup user admin...');

  const { data: { users }, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) {
    console.log('  ❌ Gagal list users:', listErr.message);
    process.exit(1);
  }

  const existing = users.find(u => u.email === ADMIN_EMAIL);

  if (existing) {
    console.log('  📧 User ditemukan:', existing.email);
    if (!existing.email_confirmed_at) {
      const { error: confErr } = await admin.auth.admin.updateUserById(existing.id, {
        email_confirm: true
      });
      if (confErr) {
        console.log('  ❌ Gagal konfirmasi:', confErr.message);
      } else {
        console.log('  ✅ Email berhasil dikonfirmasi!');
      }
    } else {
      console.log('  ✅ Email sudah dikonfirmasi');
    }
  } else {
    console.log('  📝 Membuat user admin baru...');
    const { error: createErr } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASS,
      email_confirm: true
    });
    if (createErr) {
      console.log('  ❌ Gagal buat user:', createErr.message);
      process.exit(1);
    }
    console.log('  ✅ User admin berhasil dibuat!');
  }

  // ── Step 3: Test login ────────────────────────────────
  console.log('\n🔑 Step 3: Test login...');
  const anon = createClient(SUPABASE_URL, ANON_KEY);
  const { data: loginData, error: loginErr } = await anon.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASS
  });

  if (loginErr) {
    console.log('  ❌ Login gagal:', loginErr.message);
    process.exit(1);
  }

  console.log('  ✅ LOGIN BERHASIL!');
  console.log('  👤 User:', loginData.user.email);
  console.log('  🔐 Session aktif:', !!loginData.session?.access_token);

  console.log('\n=====================================');
  console.log('🎉 SETUP SELESAI! Buka browser dan login di:');
  console.log('   URL     : http://localhost:3000');
  console.log('   Email   : admin@bossrent.com');
  console.log('   Password: BossRent2024!');
  console.log('=====================================\n');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
