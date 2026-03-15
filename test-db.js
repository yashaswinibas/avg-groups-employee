// test-db.js
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.vibxpfshilsapubpscmb:employee@123@456@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: false
});

async function test() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('Database time:', res.rows[0].now);
    client.release();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  } finally {
    await pool.end();
  }
}

test();