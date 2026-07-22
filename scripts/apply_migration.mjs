import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

// Supabase Direct / Pooler connection string formats
const connectionStrings = [
  'postgres://postgres:BossRent2024!@db.eedrziblypwrufdzctvd.supabase.co:5432/postgres',
  'postgres://postgres.eedrziblypwrufdzctvd:BossRent2024!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  'postgres://postgres.eedrziblypwrufdzctvd:BossRent2024!@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres'
];

async function run() {
  const sql = readFileSync('./supabase/schema.sql', 'utf8');

  for (const connStr of connectionStrings) {
    console.log('Trying DB connection...');
    const client = new Client({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log('⚡ Connected to Supabase PostgreSQL!');
      await client.query(sql);
      console.log('✅ Schema migration executed successfully!');
      await client.end();
      return;
    } catch (e) {
      console.log('Connection attempt result:', e.message);
      try { await client.end(); } catch {}
    }
  }

  console.log('Migration via pg direct connection finished or needs manual SQL run in dashboard.');
}

run();
