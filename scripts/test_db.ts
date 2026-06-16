import { Pool } from 'pg';

async function testConnection() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set.');
    return;
  }

  console.log('Testing connection to:', connectionString.split('@')[1]);
  
  const pool = new Pool({ 
    connectionString,
    max: 1,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Connection successful! Current DB time:', result.rows[0].now);
    client.release();
  } catch (error) {
    console.error('Connection failed:', error);
  } finally {
    await pool.end();
  }
}

testConnection();
