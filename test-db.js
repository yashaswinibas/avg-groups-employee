const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:Yashu%402004@localhost:5432/agilavetri_db';

console.log('Attempting to connect with:', connectionString);

const client = new Client({ connectionString });

client.connect()
  .then(() => {
    console.log('✅ Database connected successfully!');
    return client.end();
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
  });