import pg from 'pg';
const { Pool } = pg;

const urls = [
  'postgresql://postgres.eudmubhpxjuuruwilsgv:madhu2006%40123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  'postgresql://postgres.eudmubhpxjuuruwilsgv:madhu2006%40123@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
  'postgresql://postgres.eudmubhpxjuuruwilsgv:madhu2006%40123@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  'postgresql://postgres.eudmubhpxjuuruwilsgv:madhu2006%40123@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres',
];

for (const url of urls) {
  const host = new URL(url).host;
  try {
    const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
    const _res = await pool.query('SELECT 1 as test');
    console.log(`✅ SUCCESS: ${host}`);
    await pool.end();
  } catch (e) {
    console.log(`❌ FAILED: ${host} → ${e.message?.substring(0, 80)}`);
  }
}
process.exit(0);
