import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Replace the pool configuration in server.ts with this:
const pool = new Pool({
  host: 'aws-1-ap-southeast-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.vibxpfshilsapubpscmb',
  password: 'employee@123@456',
  database: 'postgres',
  ssl: false
});

// Test database connection with retry logic
async function testDatabaseConnection(retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      console.log(`✅ Database connection attempt ${i + 1}: SUCCESS`);
      
      // Test the connection with a simple query
      const result = await client.query('SELECT NOW() as current_time');
      console.log(`📅 Database time: ${result.rows[0].current_time}`);
      
      client.release();
      return true;
    } catch (err) {
      console.error(`❌ Database connection attempt ${i + 1} failed:`, err instanceof Error ? err.message : err);
      if (i < retries - 1) {
        console.log(`Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  return false;
}

const app = express();
const DEFAULT_PORT = 3000;
const PORT = process.env.PORT || DEFAULT_PORT;

app.use(express.json());

// Initialize Database
const dbUrl = process.env.DATABASE_URL;
const dbHost = process.env.DB_HOST;
let isDbConnected = false;

// In-memory store for fallback
let memoryStore: any = {
  users: [],
  projects: [],
  money_tracking: [],
  client_visits: [],
  branches: []
};

const seedUsers = [
  { id: 'u1', name: 'Managing Director', email: 'md@avg.com', password: 'password123', role: 'MD', aadhar: '123456789012', phone: '9876543210', referral_code: 'AVG001', referred_by: null, parent_id: null },
  // Directors
  ...Array.from({ length: 10 }).map((_, i) => ({
    id: `dir${i + 1}`, name: `Director ${i + 1}`, email: `director${i + 1}@avg.com`, password: 'password123', role: 'Director', aadhar: `10000000000${i}`, phone: `900000000${i}`, referral_code: `DIR${100 + i}`, referred_by: 'AVG001', parent_id: 'u1'
  })),
  // GMs
  ...Array.from({ length: 7 }).map((_, i) => ({
    id: `gm${i + 1}`, name: `GM ${i + 1}`, email: `gm${i + 1}@avg.com`, password: 'password123', role: 'GM', aadhar: `20000000000${i}`, phone: `800000000${i}`, referral_code: `GM${100 + i}`, referred_by: 'DIR100', parent_id: 'dir1'
  })),
  // BMs
  ...Array.from({ length: 5 }).map((_, i) => ({
    id: `bm${i + 1}`, name: `BM ${i + 1}`, email: `bm${i + 1}@avg.com`, password: 'password123', role: 'Branch Manager', aadhar: `30000000000${i}`, phone: `700000000${i}`, referral_code: `BM${100 + i}`, referred_by: 'GM100', parent_id: 'gm1'
  })),
  // ABMs
  ...Array.from({ length: 6 }).map((_, i) => ({
    id: `abm${i + 1}`, name: `ABM ${i + 1}`, email: `abm${i + 1}@avg.com`, password: 'password123', role: 'ABM', aadhar: `40000000000${i}`, phone: `600000000${i}`, referral_code: `ABM${100 + i}`, referred_by: 'BM100', parent_id: 'bm1'
  })),
  // SOs
  ...Array.from({ length: 7 }).map((_, i) => ({
    id: `so${i + 1}`, name: `SO ${i + 1}`, email: `so${i + 1}@avg.com`, password: 'password123', role: 'Sales Officer', aadhar: `50000000000${i}`, phone: `500000000${i}`, referral_code: `SO${100 + i}`, referred_by: 'ABM100', parent_id: 'abm1'
  })),
  // Clients
  ...Array.from({ length: 19 }).map((_, i) => ({
    id: `c${i + 1}`, name: `Client ${i + 1}`, email: `client${i + 1}@avg.com`, password: 'password123', role: 'Client', aadhar: `60000000000${i}`, phone: `400000000${i}`, referral_code: `CL${100 + i}`, referred_by: 'SO100', parent_id: 'so1'
  })),
];

const seedProjects = [
  { id: 'p1', title: 'Agila Vetri Jewellers', description: 'Premium gold and diamond jewellery collections.', category: 'Jewellery', budget: '50 Cr' },
  { id: 'p2', title: 'Agila Vetri Builders', description: 'Luxury residential and commercial construction.', category: 'Construction', budget: '100 Cr' },
  { id: 'p3', title: 'Agila Vetri Promoters', description: 'Land development and real estate marketing.', category: 'Real Estate', budget: '75 Cr' },
  { id: 'p4', title: 'Agila Vetri Resort', description: 'Eco-friendly luxury resorts in Kodaikanal.', category: 'Hospitality', budget: '30 Cr' },
  { id: 'p5', title: 'Agila Vetri Trading Academy', description: 'Professional stock and crypto trading education.', category: 'Education', budget: '10 Cr' },
];

const seedBranches = [
  { id: 'b1', name: 'VEPPUR', bm_name: 'SELVI', total_collection: 8875500 },
  { id: 'b2', name: 'KALLAKURICHI', bm_name: 'ISMAIL', total_collection: 4385500 },
  { id: 'b3', name: 'THIRUPATHI', bm_name: 'SADASIVAM', total_collection: 3821000 },
  { id: 'b4', name: 'ULUNDURPET', bm_name: 'SUBRAMANI', total_collection: 2367500 },
  { id: 'b5', name: 'AVALURPET', bm_name: 'PAVITHRA', total_collection: 1965500 },
  { id: 'b6', name: 'POLUR', bm_name: 'NADHIYA', total_collection: 1482000 },
  { id: 'b7', name: 'VILLUPURAM', bm_name: 'MURUGAN', total_collection: 1478000 },
];

// Initialize memory store
memoryStore.users = [...seedUsers];
memoryStore.projects = [...seedProjects];
memoryStore.branches = [...seedBranches];

// Check database configuration
if (!dbUrl && !dbHost) {
  console.warn('\n' + '='.repeat(50));
  console.warn('⚠️  DATABASE NOT CONFIGURED');
  console.warn('Running in DEMO MODE with in-memory data.');
  console.warn('To connect to Supabase PostgreSQL:');
  console.warn('1. Copy your Supabase connection string');
  console.warn('2. Add it to your .env file as DATABASE_URL');
  console.warn('='.repeat(50) + '\n');
} else {
  // Test the connection
  testDatabaseConnection().then(connected => {
    isDbConnected = connected;
    
    if (isDbConnected) {
      initializeDatabase();
    } else {
      console.warn('\n' + '='.repeat(50));
      console.warn('⚠️  DATABASE CONNECTION FAILED');
      console.warn('Running in DEMO MODE with in-memory data.');
      console.warn('Please check your Supabase credentials:');
      console.warn('- Verify DATABASE_URL is correct');
      console.warn('- Ensure Supabase project is active');
      console.warn('- Check if IP is allowed (if IP restrictions enabled)');
      console.warn('='.repeat(50) + '\n');
    }
  });
}

async function initializeDatabase() {
  try {
    console.log(`🔌 Creating database tables...`);
    
    // Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        aadhar TEXT UNIQUE NOT NULL,
        phone TEXT,
        referral_code TEXT UNIQUE NOT NULL,
        referred_by TEXT,
        parent_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        budget TEXT,
        status TEXT DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS money_tracking (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        description TEXT,
        type TEXT NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS client_visits (
        id TEXT PRIMARY KEY,
        so_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        notes TEXT,
        visit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (so_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS branches (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        bm_name TEXT NOT NULL,
        total_collection REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_referral ON users(referral_code);
      CREATE INDEX IF NOT EXISTS idx_money_user ON money_tracking(user_id);
      CREATE INDEX IF NOT EXISTS idx_visits_so ON client_visits(so_id);
      CREATE INDEX IF NOT EXISTS idx_visits_client ON client_visits(client_id);
    `);

    // Insert seed data if tables are empty
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log('🌱 Seeding initial data...');
      
      // Insert seed users
      for (const u of seedUsers) {
        await pool.query(`
          INSERT INTO users (id, name, email, password, role, aadhar, phone, referral_code, referred_by, parent_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, [u.id, u.name, u.email, u.password, u.role, u.aadhar, u.phone, u.referral_code, u.referred_by, u.parent_id]);
      }

      // Insert seed projects
      for (const p of seedProjects) {
        await pool.query(`
          INSERT INTO projects (id, title, description, category, budget)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING
        `, [p.id, p.title, p.description, p.category, p.budget]);
      }

      // Insert seed branches
      for (const b of seedBranches) {
        await pool.query(`
          INSERT INTO branches (id, name, bm_name, total_collection)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO NOTHING
        `, [b.id, b.name, b.bm_name, b.total_collection]);
      }
      
      console.log('✅ Seed data inserted successfully');
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ SUPABASE POSTGRESQL CONNECTED SUCCESSFULLY');
    console.log('Application is now using your production database on Supabase.');
    console.log('='.repeat(50) + '\n');
  } catch (err) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ DATABASE INITIALIZATION FAILED');
    console.error('Error:', err instanceof Error ? err.message : err);
    console.error('Falling back to DEMO MODE.');
    console.error('='.repeat(50) + '\n');
    isDbConnected = false;
  }
}

// API Routes
app.get('/api/health', async (req, res) => {
  const dbConfigured = !!(dbUrl || dbHost);
  let dbConnected = isDbConnected;
  
  // If connected, do a quick ping to verify
  if (dbConnected) {
    try {
      await pool.query('SELECT 1');
    } catch (err) {
      dbConnected = false;
      isDbConnected = false;
    }
  }
  
  res.json({ 
    status: 'ok', 
    dbConfigured, 
    dbConnected,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password, aadhar } = req.body;
  
  try {
    if (isDbConnected) {
      let result;
      if (aadhar) {
        result = await pool.query('SELECT * FROM users WHERE aadhar = $1 AND password = $2', [aadhar, password]);
      } else {
        result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
      }

      if (result.rows.length > 0) {
        return res.json(result.rows[0]);
      }
    } else {
      // Fallback to memoryStore
      const user = memoryStore.users.find((u: any) => 
        (aadhar ? u.aadhar === aadhar : u.email === email) && u.password === password
      );
      if (user) return res.json(user);
    }
    
    res.status(401).json({ error: 'Invalid credentials. Please check your details or register.' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, aadhar, phone, referredBy } = req.body;

  try {
    if (isDbConnected) {
      const existing = await pool.query('SELECT * FROM users WHERE aadhar = $1 OR email = $2', [aadhar, email]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Malpractice detected: Account already exists with this Aadhar or Email.' });
      }

      const id = Math.random().toString(36).substr(2, 9);
      const referral_code = 'AVG' + Math.floor(1000 + Math.random() * 9000);
      const parentResult = await pool.query('SELECT * FROM users WHERE referral_code = $1', [referredBy]);
      const parent = parentResult.rows[0];

      await pool.query(`
        INSERT INTO users (id, name, email, password, role, aadhar, phone, referral_code, referred_by, parent_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [id, name, email, password, role, aadhar, phone, referral_code, referredBy, parent?.id || null]);

      const newUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      res.json(newUser.rows[0]);
    } else {
      const existing = memoryStore.users.find((u: any) => u.aadhar === aadhar || u.email === email);
      if (existing) return res.status(400).json({ error: 'Account already exists' });

      const id = Math.random().toString(36).substr(2, 9);
      const referral_code = 'AVG' + Math.floor(1000 + Math.random() * 9000);
      const parent = memoryStore.users.find((u: any) => u.referral_code === referredBy);
      
      const newUser = { id, name, email, password, role, aadhar, phone, referral_code, referred_by: referredBy, parent_id: parent?.id || null };
      memoryStore.users.push(newUser);
      res.json(newUser);
    }
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    if (isDbConnected) {
      const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
      res.json(result.rows);
    } else {
      res.json(memoryStore.users);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', async (req, res) => {
  const { name, email, password, role, aadhar, phone, referred_by, parent_id } = req.body;
  try {
    if (isDbConnected) {
      const existing = await pool.query('SELECT * FROM users WHERE aadhar = $1 OR email = $2', [aadhar, email]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Malpractice detected: Account already exists with this Aadhar or Email.' });
      }
      const id = Math.random().toString(36).substr(2, 9);
      const referral_code = 'AVG' + Math.floor(1000 + Math.random() * 9000);
      await pool.query(`
        INSERT INTO users (id, name, email, password, role, aadhar, phone, referral_code, referred_by, parent_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [id, name, email, password, role, aadhar, phone, referral_code, referred_by || null, parent_id || null]);
      res.json({ success: true, id });
    } else {
      const id = Math.random().toString(36).substr(2, 9);
      const referral_code = 'AVG' + Math.floor(1000 + Math.random() * 9000);
      memoryStore.users.push({ id, name, email, password, role, aadhar, phone, referral_code, referred_by, parent_id });
      res.json({ success: true, id });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to add user' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { name, email, role, aadhar, phone } = req.body;
  try {
    if (isDbConnected) {
      await pool.query('UPDATE users SET name = $1, email = $2, role = $3, aadhar = $4, phone = $5 WHERE id = $6', 
        [name, email, role, aadhar, phone, req.params.id]);
    } else {
      const index = memoryStore.users.findIndex((u: any) => u.id === req.params.id);
      if (index !== -1) {
        memoryStore.users[index] = { ...memoryStore.users[index], name, email, role, aadhar, phone };
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.post('/api/users/:id/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    if (!isDbConnected) {
      return res.status(503).json({ error: 'Password change requires database connection' });
    }
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    const user = result.rows[0];
    
    if (!user || user.password !== currentPassword) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [newPassword, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    if (isDbConnected) {
      await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    } else {
      memoryStore.users = memoryStore.users.filter((u: any) => u.id !== req.params.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    if (isDbConnected) {
      const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
      res.json(result.rows);
    } else {
      res.json(memoryStore.projects);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/api/projects', async (req, res) => {
  const { title, description, category, budget } = req.body;
  const id = 'p' + Math.random().toString(36).substr(2, 5);
  try {
    if (isDbConnected) {
      await pool.query('INSERT INTO projects (id, title, description, category, budget) VALUES ($1, $2, $3, $4, $5)', 
        [id, title, description, category, budget]);
    } else {
      memoryStore.projects.push({ id, title, description, category, budget, status: 'Active' });
    }
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add project' });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  const { title, description, category, budget } = req.body;
  try {
    if (isDbConnected) {
      await pool.query('UPDATE projects SET title = $1, description = $2, category = $3, budget = $4 WHERE id = $5', 
        [title, description, category, budget, req.params.id]);
    } else {
      const index = memoryStore.projects.findIndex((p: any) => p.id === req.params.id);
      if (index !== -1) {
        memoryStore.projects[index] = { ...memoryStore.projects[index], title, description, category, budget };
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    if (isDbConnected) {
      await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    } else {
      memoryStore.projects = memoryStore.projects.filter((p: any) => p.id !== req.params.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

app.get('/api/money-tracking', async (req, res) => {
  try {
    if (isDbConnected) {
      const result = await pool.query(`
        SELECT mt.*, u.name as user_name 
        FROM money_tracking mt 
        JOIN users u ON mt.user_id = u.id 
        ORDER BY mt.date DESC
      `);
      res.json(result.rows);
    } else {
      const records = memoryStore.money_tracking.map((m: any) => ({
        ...m,
        user_name: memoryStore.users.find((u: any) => u.id === m.user_id)?.name || 'Unknown'
      }));
      res.json(records);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch money tracking data' });
  }
});

app.post('/api/money-tracking', async (req, res) => {
  const { user_id, amount, currency, description, type } = req.body;
  const id = 'mt' + Math.random().toString(36).substr(2, 5);
  try {
    if (isDbConnected) {
      await pool.query('INSERT INTO money_tracking (id, user_id, amount, currency, description, type) VALUES ($1, $2, $3, $4, $5, $6)', 
        [id, user_id, amount, currency, description, type]);
    } else {
      memoryStore.money_tracking.push({ id, user_id, amount, currency, description, type, date: new Date().toISOString() });
    }
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add money record' });
  }
});

app.put('/api/money-tracking/:id', async (req, res) => {
  const { amount, currency, description, type } = req.body;
  try {
    if (isDbConnected) {
      await pool.query('UPDATE money_tracking SET amount = $1, currency = $2, description = $3, type = $4 WHERE id = $5', 
        [amount, currency, description, type, req.params.id]);
    } else {
      const index = memoryStore.money_tracking.findIndex((m: any) => m.id === req.params.id);
      if (index !== -1) {
        memoryStore.money_tracking[index] = { ...memoryStore.money_tracking[index], amount, currency, description, type };
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update money record' });
  }
});

app.delete('/api/money-tracking/:id', async (req, res) => {
  try {
    if (isDbConnected) {
      await pool.query('DELETE FROM money_tracking WHERE id = $1', [req.params.id]);
    } else {
      memoryStore.money_tracking = memoryStore.money_tracking.filter((m: any) => m.id !== req.params.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete money record' });
  }
});

app.get('/api/visits', async (req, res) => {
  try {
    if (isDbConnected) {
      const result = await pool.query(`
        SELECT cv.*, u_so.name as so_name, u_client.name as client_name 
        FROM client_visits cv
        JOIN users u_so ON cv.so_id = u_so.id
        JOIN users u_client ON cv.client_id = u_client.id
        ORDER BY cv.visit_date DESC
      `);
      res.json(result.rows);
    } else {
      const visits = memoryStore.client_visits.map((v: any) => ({
        ...v,
        so_name: memoryStore.users.find((u: any) => u.id === v.so_id)?.name || 'Unknown',
        client_name: memoryStore.users.find((u: any) => u.id === v.client_id)?.name || 'Unknown'
      }));
      res.json(visits);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

app.get('/api/branches', async (req, res) => {
  try {
    if (isDbConnected) {
      const result = await pool.query('SELECT * FROM branches ORDER BY total_collection DESC');
      res.json(result.rows);
    } else {
      res.json([...memoryStore.branches].sort((a, b) => b.total_collection - a.total_collection));
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

app.post('/api/branches', async (req, res) => {
  const { name, bm_name, total_collection } = req.body;
  const id = 'b' + Math.random().toString(36).substr(2, 5);
  try {
    if (isDbConnected) {
      await pool.query('INSERT INTO branches (id, name, bm_name, total_collection) VALUES ($1, $2, $3, $4)', 
        [id, name, bm_name, total_collection]);
    } else {
      memoryStore.branches.push({ id, name, bm_name, total_collection });
    }
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add branch' });
  }
});

app.put('/api/branches/:id', async (req, res) => {
  const { name, bm_name, total_collection } = req.body;
  try {
    if (isDbConnected) {
      await pool.query('UPDATE branches SET name = $1, bm_name = $2, total_collection = $3 WHERE id = $4', 
        [name, bm_name, total_collection, req.params.id]);
    } else {
      const index = memoryStore.branches.findIndex((b: any) => b.id === req.params.id);
      if (index !== -1) {
        memoryStore.branches[index] = { ...memoryStore.branches[index], name, bm_name, total_collection };
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update branch' });
  }
});

app.delete('/api/branches/:id', async (req, res) => {
  try {
    if (isDbConnected) {
      await pool.query('DELETE FROM branches WHERE id = $1', [req.params.id]);
    } else {
      memoryStore.branches = memoryStore.branches.filter((b: any) => b.id !== req.params.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete branch' });
  }
});

app.post('/api/visits', async (req, res) => {
  const { so_id, client_id, notes } = req.body;
  const id = 'v' + Math.random().toString(36).substr(2, 5);
  try {
    if (isDbConnected) {
      await pool.query('INSERT INTO client_visits (id, so_id, client_id, notes) VALUES ($1, $2, $3, $4)', 
        [id, so_id, client_id, notes]);
    } else {
      memoryStore.client_visits.push({ id, so_id, client_id, notes, visit_date: new Date().toISOString() });
    }
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add visit' });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Closing database pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Closing database pool...');
  await pool.end();
  process.exit(0);
});

// Function to find an available port - UPDATED VERSION (no require)
async function findAvailablePort(startPort: number): Promise<number> {
  const { createServer } = await import('http');
  
  return new Promise((resolve, reject) => {
    const server = createServer();
    
    server.listen(startPort, '0.0.0.0', () => {
      server.close(() => {
        resolve(startPort);
      });
    });
    
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use, try the next one
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
  });
}

// Vite middleware setup (only in development)
if (process.env.NODE_ENV !== 'production') {
  // This needs to be inside an async function since createViteServer returns a promise
  (async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  })();
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Only start the server if not in Vercel environment
if (process.env.VERCEL !== '1') {
  findAvailablePort(Number(PORT)).then(availablePort => {
    app.listen(availablePort, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${availablePort}`);
      console.log(`Health check: http://localhost:${availablePort}/api/health`);
      
      if (availablePort !== Number(PORT)) {
        console.log(`Note: Port ${PORT} was in use, using port ${availablePort} instead`);
      }
    });
  }).catch(err => {
    console.error('Failed to find available port:', err);
    process.exit(1);
  });
}

// Export for Vercel serverless
export default app;