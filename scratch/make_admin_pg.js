const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres.teznqmnumcntmkkkmdjk:HACKBOATS.ONETOONE@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const email = 'akhil031215n@gmail.com';
  const id = 'cl' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  const query = `
    INSERT INTO "User" (id, email, role, "isApproved")
    VALUES ($1, $2, 'ADMIN', true)
    ON CONFLICT (email)
    DO UPDATE SET role = 'ADMIN', "isApproved" = true;
  `;
  
  await pool.query(query, [id, email]);
  console.log('User upserted successfully as ADMIN:', email);
  pool.end();
}

main().catch(console.error);
