import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fallback for individual variables if needed
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  if (!dbUrl && !dbHost) {
    console.warn('\n' + '='.repeat(50));
    console.warn('⚠️  DATABASE NOT CONFIGURED');
    console.warn('Running in DEMO MODE with in-memory data.');
    console.warn('To connect PostgreSQL: Add DATABASE_URL in Settings.');
    console.warn('='.repeat(50) + '\n');
  } else if (dbHost === 'host' || dbHost === 'base' || (dbUrl && (dbUrl.includes('@host') || dbUrl.includes('@base')))) {
    console.warn('\n' + '='.repeat(50));
    console.warn('⚠️  PLACEHOLDER DATABASE DETECTED');
    console.warn('Running in DEMO MODE.');
    console.warn('Please provide a real DATABASE_URL in Settings.');
    console.warn('='.repeat(50) + '\n');
  } else {
    try {
      console.log(`🔌 Connecting to PostgreSQL...`);
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
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS client_visits (
          id TEXT PRIMARY KEY,
          so_id TEXT NOT NULL,
          client_id TEXT NOT NULL,
          notes TEXT,
          visit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS branches (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          bm_name TEXT NOT NULL,
          total_collection REAL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      for (const u of seedUsers) {
        await pool.query(`
          INSERT INTO users (id, name, email, password, role, aadhar, phone, referral_code, referred_by, parent_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, [u.id, u.name, u.email, u.password, u.role, u.aadhar, u.phone, u.referral_code, u.referred_by, u.parent_id]);
      }

      for (const p of seedProjects) {
        await pool.query(`
          INSERT INTO projects (id, title, description, category, budget)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING
        `, [p.id, p.title, p.description, p.category, p.budget]);
      }

      for (const b of seedBranches) {
        await pool.query(`
          INSERT INTO branches (id, name, bm_name, total_collection)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO NOTHING
        `, [b.id, b.name, b.bm_name, b.total_collection]);
      }
      isDbConnected = true;
      console.log('\n' + '='.repeat(50));
      console.log('✅ POSTGRESQL CONNECTED SUCCESSFULLY');
      console.log('Application is now using your live database.');
      console.log('='.repeat(50) + '\n');
    } catch (err) {
      console.error('\n' + '='.repeat(50));
      console.error('❌ DATABASE CONNECTION FAILED');
      console.error('Falling back to DEMO MODE.');
      console.error('Error:', err instanceof Error ? err.message : err);
      console.error('='.repeat(50) + '\n');
    }
  }

  // API Routes
  app.get('/api/health', async (req, res) => {
    const dbConfigured = !!(dbUrl || dbHost);
    let dbConnected = isDbConnected;
    res.json({ dbConfigured, dbConnected });
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
        const result = await pool.query('SELECT * FROM users');
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
      await pool.query('UPDATE branches SET name = $1, bm_name = $2, total_collection = $3 WHERE id = $4', 
        [name, bm_name, total_collection, req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update branch' });
    }
  });

  app.delete('/api/branches/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM branches WHERE id = $1', [req.params.id]);
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

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
