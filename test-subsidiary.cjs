// test-subsidiary.cjs
const { Pool } = require('pg');
require('dotenv').config();

const subsidiaryPool = new Pool({
  connectionString: process.env.SUBSIDIARY_DATABASE_URL || 'postgres://postgres:Yashu%402004@localhost:5432/subsidiary_db'
});

async function testConnection() {
  try {
    const client = await subsidiaryPool.connect();
    console.log('✅ Connected to subsidiary database!');
    
    const result = await client.query('SELECT NOW() as time');
    console.log('Database time:', result.rows[0].time);
    
    client.release();
    await subsidiaryPool.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
}

testConnection();