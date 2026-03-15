import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// ============ DATABASE CONFIGURATION ============
// Main database connection
const mainPool = new Pool({
  connectionString: process.env.MAIN_DATABASE_URL || process.env.DATABASE_URL,
  host: process.env.MAIN_DB_HOST,
  port: parseInt(process.env.MAIN_DB_PORT || '5432'),
  user: process.env.MAIN_DB_USER,
  password: process.env.MAIN_DB_PASSWORD,
  database: process.env.MAIN_DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Connection pool settings for production
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Subsidiary database connection
const subsidiaryPool = new Pool({
  connectionString: process.env.SUBSIDIARY_DATABASE_URL,
  host: process.env.SUBSIDIARY_DB_HOST,
  port: parseInt(process.env.SUBSIDIARY_DB_PORT || '5432'),
  user: process.env.SUBSIDIARY_DB_USER,
  password: process.env.SUBSIDIARY_DB_PASSWORD,
  database: process.env.SUBSIDIARY_DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function startServer() {
  const app = express();
  // Use Railway's PORT or fallback to 3000
  const PORT = process.env.PORT || 3000;

  // Middleware
  app.use(express.json());
  
  // Add CORS headers for production
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Request logging in production
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  // Initialize Databases
  const mainDbUrl = process.env.MAIN_DATABASE_URL || process.env.DATABASE_URL;
  const mainDbHost = process.env.MAIN_DB_HOST;
  const subsidiaryDbUrl = process.env.SUBSIDIARY_DATABASE_URL;
  
  let isMainDbConnected = false;
  let isSubsidiaryDbConnected = false;

  // In-memory store for fallback
  let memoryStore: any = {
    users: [],
    projects: [],
    money_tracking: [],
    client_visits: [],
    branches: [],
    subsidiary_data: []
  };

  const seedUsers = [
    { id: 'u1', name: 'Managing Director', email: 'md@avg.com', password: 'password123', role: 'MD', aadhar: '123456789012', phone: '9876543210', referral_code: 'AVG001', referred_by: null, parent_id: null },
    ...Array.from({ length: 10 }).map((_, i) => ({
      id: `dir${i + 1}`, name: `Director ${i + 1}`, email: `director${i + 1}@avg.com`, password: 'password123', role: 'Director', aadhar: `10000000000${i}`, phone: `900000000${i}`, referral_code: `DIR${100 + i}`, referred_by: 'AVG001', parent_id: 'u1'
    })),
    ...Array.from({ length: 7 }).map((_, i) => ({
      id: `gm${i + 1}`, name: `GM ${i + 1}`, email: `gm${i + 1}@avg.com`, password: 'password123', role: 'GM', aadhar: `20000000000${i}`, phone: `800000000${i}`, referral_code: `GM${100 + i}`, referred_by: 'DIR100', parent_id: 'dir1'
    })),
    ...Array.from({ length: 5 }).map((_, i) => ({
      id: `bm${i + 1}`, name: `BM ${i + 1}`, email: `bm${i + 1}@avg.com`, password: 'password123', role: 'Branch Manager', aadhar: `30000000000${i}`, phone: `700000000${i}`, referral_code: `BM${100 + i}`, referred_by: 'GM100', parent_id: 'gm1'
    })),
    ...Array.from({ length: 6 }).map((_, i) => ({
      id: `abm${i + 1}`, name: `ABM ${i + 1}`, email: `abm${i + 1}@avg.com`, password: 'password123', role: 'ABM', aadhar: `40000000000${i}`, phone: `600000000${i}`, referral_code: `ABM${100 + i}`, referred_by: 'BM100', parent_id: 'bm1'
    })),
    ...Array.from({ length: 7 }).map((_, i) => ({
      id: `so${i + 1}`, name: `SO ${i + 1}`, email: `so${i + 1}@avg.com`, password: 'password123', role: 'Sales Officer', aadhar: `50000000000${i}`, phone: `500000000${i}`, referral_code: `SO${100 + i}`, referred_by: 'ABM100', parent_id: 'abm1'
    })),
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

  const seedSubsidiaryData = [
    { id: 's1', name: 'Subsidiary Branch 1', location: 'Chennai', revenue: 1500000, expenses: 800000, profit: 700000 },
    { id: 's2', name: 'Subsidiary Branch 2', location: 'Coimbatore', revenue: 1200000, expenses: 600000, profit: 600000 },
    { id: 's3', name: 'Subsidiary Branch 3', location: 'Madurai', revenue: 900000, expenses: 450000, profit: 450000 },
  ];

  // Initialize memory store
  memoryStore.users = [...seedUsers];
  memoryStore.projects = [...seedProjects];
  memoryStore.branches = [...seedBranches];
  memoryStore.subsidiary_data = [...seedSubsidiaryData];

  // ============ DATABASE CONNECTION ============
  if (!mainDbUrl && !mainDbHost) {
    console.warn('\n' + '='.repeat(50));
    console.warn('⚠️  MAIN DATABASE NOT CONFIGURED');
    console.warn('Running main app in DEMO MODE with in-memory data.');
    console.warn('='.repeat(50) + '\n');
  } else {
    try {
      console.log(`🔌 Connecting to Main PostgreSQL...`);
      
      // Test connection
      await mainPool.query('SELECT 1');
      
      // Create tables
      await mainPool.query(`
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

      // Seed data if tables are empty
      const userCount = await mainPool.query('SELECT COUNT(*) FROM users');
      if (parseInt(userCount.rows[0].count) === 0) {
        for (const u of seedUsers) {
          await mainPool.query(`
            INSERT INTO users (id, name, email, password, role, aadhar, phone, referral_code, referred_by, parent_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO NOTHING
          `, [u.id, u.name, u.email, u.password, u.role, u.aadhar, u.phone, u.referral_code, u.referred_by, u.parent_id]);
        }
      }

      const projectCount = await mainPool.query('SELECT COUNT(*) FROM projects');
      if (parseInt(projectCount.rows[0].count) === 0) {
        for (const p of seedProjects) {
          await mainPool.query(`
            INSERT INTO projects (id, title, description, category, budget)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO NOTHING
          `, [p.id, p.title, p.description, p.category, p.budget]);
        }
      }

      const branchCount = await mainPool.query('SELECT COUNT(*) FROM branches');
      if (parseInt(branchCount.rows[0].count) === 0) {
        for (const b of seedBranches) {
          await mainPool.query(`
            INSERT INTO branches (id, name, bm_name, total_collection)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO NOTHING
          `, [b.id, b.name, b.bm_name, b.total_collection]);
        }
      }

      isMainDbConnected = true;
      console.log('\n' + '='.repeat(50));
      console.log('✅ MAIN DATABASE CONNECTED SUCCESSFULLY');
      console.log('='.repeat(50) + '\n');
    } catch (err) {
      console.error('\n' + '='.repeat(50));
      console.error('❌ MAIN DATABASE CONNECTION FAILED');
      console.error('Falling back to DEMO MODE for main app.');
      console.error('Error:', err instanceof Error ? err.message : err);
      console.error('='.repeat(50) + '\n');
    }
  }

  // Connect to Subsidiary Database
  if (!subsidiaryDbUrl && !process.env.SUBSIDIARY_DB_HOST) {
    console.warn('\n' + '='.repeat(50));
    console.warn('⚠️  SUBSIDIARY DATABASE NOT CONFIGURED');
    console.warn('Running subsidiary features in DEMO MODE with in-memory data.');
    console.warn('='.repeat(50) + '\n');
  } else {
    try {
      console.log(`🔌 Connecting to Subsidiary PostgreSQL...`);
      
      // Test connection
      await subsidiaryPool.query('SELECT 1');
      
      await subsidiaryPool.query(`
        CREATE TABLE IF NOT EXISTS subsidiary_branches (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          location TEXT,
          revenue REAL DEFAULT 0,
          expenses REAL DEFAULT 0,
          profit REAL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS subsidiary_transactions (
          id TEXT PRIMARY KEY,
          branch_id TEXT NOT NULL,
          amount REAL NOT NULL,
          type TEXT NOT NULL,
          description TEXT,
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS subsidiary_employees (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          position TEXT NOT NULL,
          branch_id TEXT NOT NULL,
          salary REAL DEFAULT 0,
          joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const subBranchCount = await subsidiaryPool.query('SELECT COUNT(*) FROM subsidiary_branches');
      if (parseInt(subBranchCount.rows[0].count) === 0) {
        for (const s of seedSubsidiaryData) {
          await subsidiaryPool.query(`
            INSERT INTO subsidiary_branches (id, name, location, revenue, expenses, profit)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO NOTHING
          `, [s.id, s.name, s.location, s.revenue, s.expenses, s.profit]);
        }
      }

      isSubsidiaryDbConnected = true;
      console.log('\n' + '='.repeat(50));
      console.log('✅ SUBSIDIARY DATABASE CONNECTED SUCCESSFULLY');
      console.log('='.repeat(50) + '\n');
    } catch (err) {
      console.error('\n' + '='.repeat(50));
      console.error('❌ SUBSIDIARY DATABASE CONNECTION FAILED');
      console.error('Falling back to DEMO MODE for subsidiary features.');
      console.error('Error:', err instanceof Error ? err.message : err);
      console.error('='.repeat(50) + '\n');
    }
  }

  // ============ API ROUTES ============
  
  // Health check endpoint (used by Railway)
  app.get('/api/health', async (req, res) => {
    const mainDbConfigured = !!(mainDbUrl || mainDbHost);
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      mainDbConfigured, 
      mainDbConnected: isMainDbConnected,
      subsidiaryDbConfigured: !!(subsidiaryDbUrl || process.env.SUBSIDIARY_DB_HOST),
      subsidiaryDbConnected: isSubsidiaryDbConnected 
    });
  });

  // Root endpoint
  app.get('/api', (req, res) => {
    res.json({
      name: 'Agila Vetri Groups Portal API',
      version: '1.0.0',
      status: 'running',
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Auth endpoints
  app.post('/api/auth/login', async (req, res) => {
    const { email, password, aadhar } = req.body;
    
    try {
      if (isMainDbConnected) {
        let result;
        if (aadhar) {
          result = await mainPool.query('SELECT * FROM users WHERE aadhar = $1 AND password = $2', [aadhar, password]);
        } else {
          result = await mainPool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
        }

        if (result.rows.length > 0) {
          const user = result.rows[0];
          // Don't send password back
          delete user.password;
          return res.json(user);
        }
      } else {
        const user = memoryStore.users.find((u: any) => 
          (aadhar ? u.aadhar === aadhar : u.email === email) && u.password === password
        );
        if (user) {
          const { password, ...userWithoutPassword } = user;
          return res.json(userWithoutPassword);
        }
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
      if (isMainDbConnected) {
        const existing = await mainPool.query('SELECT * FROM users WHERE aadhar = $1 OR email = $2', [aadhar, email]);
        if (existing.rows.length > 0) {
          return res.status(400).json({ error: 'Malpractice detected: Account already exists with this Aadhar or Email.' });
        }

        const id = Math.random().toString(36).substr(2, 9);
        const referral_code = 'AVG' + Math.floor(1000 + Math.random() * 9000);
        const parentResult = await mainPool.query('SELECT * FROM users WHERE referral_code = $1', [referredBy]);
        const parent = parentResult.rows[0];

        await mainPool.query(`
          INSERT INTO users (id, name, email, password, role, aadhar, phone, referral_code, referred_by, parent_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [id, name, email, password, role, aadhar, phone, referral_code, referredBy, parent?.id || null]);

        const newUser = await mainPool.query('SELECT * FROM users WHERE id = $1', [id]);
        const { password: _, ...userWithoutPassword } = newUser.rows[0];
        res.json(userWithoutPassword);
      } else {
        const existing = memoryStore.users.find((u: any) => u.aadhar === aadhar || u.email === email);
        if (existing) return res.status(400).json({ error: 'Account already exists' });

        const id = Math.random().toString(36).substr(2, 9);
        const referral_code = 'AVG' + Math.floor(1000 + Math.random() * 9000);
        const parent = memoryStore.users.find((u: any) => u.referral_code === referredBy);
        
        const newUser = { id, name, email, password, role, aadhar, phone, referral_code, referred_by: referredBy, parent_id: parent?.id || null };
        memoryStore.users.push(newUser);
        const { password: _, ...userWithoutPassword } = newUser;
        res.json(userWithoutPassword);
      }
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // User endpoints
  app.get('/api/users', async (req, res) => {
    try {
      if (isMainDbConnected) {
        const result = await mainPool.query('SELECT id, name, email, role, aadhar, phone, referral_code, referred_by, parent_id, created_at FROM users');
        res.json(result.rows);
      } else {
        const usersWithoutPassword = memoryStore.users.map(({ password, ...user }: any) => user);
        res.json(usersWithoutPassword);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    try {
      if (isMainDbConnected) {
        const result = await mainPool.query('SELECT id, name, email, role, aadhar, phone, referral_code, referred_by, parent_id, created_at FROM users WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
      } else {
        const user = memoryStore.users.find((u: any) => u.id === req.params.id);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  app.post('/api/users', async (req, res) => {
    const { name, email, password, role, aadhar, phone, referred_by, parent_id } = req.body;
    try {
      if (isMainDbConnected) {
        const existing = await mainPool.query('SELECT * FROM users WHERE aadhar = $1 OR email = $2', [aadhar, email]);
        if (existing.rows.length > 0) {
          return res.status(400).json({ error: 'Malpractice detected: Account already exists with this Aadhar or Email.' });
        }
        const id = Math.random().toString(36).substr(2, 9);
        const referral_code = 'AVG' + Math.floor(1000 + Math.random() * 9000);
        await mainPool.query(`
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
      console.error('Error creating user:', err);
      res.status(500).json({ error: 'Failed to add user' });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    const { name, email, role, aadhar, phone } = req.body;
    try {
      if (isMainDbConnected) {
        await mainPool.query('UPDATE users SET name = $1, email = $2, role = $3, aadhar = $4, phone = $5 WHERE id = $6', 
          [name, email, role, aadhar, phone, req.params.id]);
      } else {
        const index = memoryStore.users.findIndex((u: any) => u.id === req.params.id);
        if (index !== -1) {
          memoryStore.users[index] = { ...memoryStore.users[index], name, email, role, aadhar, phone };
        }
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error updating user:', err);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  app.post('/api/users/:id/password', async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
      if (!isMainDbConnected) {
        return res.status(503).json({ error: 'Database not connected' });
      }
      
      const result = await mainPool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
      const user = result.rows[0];
      
      if (!user || user.password !== currentPassword) {
        return res.status(401).json({ error: 'Incorrect current password' });
      }

      await mainPool.query('UPDATE users SET password = $1 WHERE id = $2', [newPassword, req.params.id]);
      res.json({ success: true });
    } catch (err) {
      console.error('Error changing password:', err);
      res.status(500).json({ error: 'Failed to update password' });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      if (isMainDbConnected) {
        await mainPool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
      } else {
        memoryStore.users = memoryStore.users.filter((u: any) => u.id !== req.params.id);
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting user:', err);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // Project endpoints
  app.get('/api/projects', async (req, res) => {
    try {
      if (isMainDbConnected) {
        const result = await mainPool.query('SELECT * FROM projects ORDER BY created_at DESC');
        res.json(result.rows);
      } else {
        res.json(memoryStore.projects);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  app.post('/api/projects', async (req, res) => {
    const { title, description, category, budget } = req.body;
    const id = 'p' + Math.random().toString(36).substr(2, 5);
    try {
      if (isMainDbConnected) {
        await mainPool.query('INSERT INTO projects (id, title, description, category, budget) VALUES ($1, $2, $3, $4, $5)', 
          [id, title, description, category, budget]);
      } else {
        memoryStore.projects.push({ id, title, description, category, budget, status: 'Active' });
      }
      res.json({ success: true, id });
    } catch (err) {
      console.error('Error creating project:', err);
      res.status(500).json({ error: 'Failed to add project' });
    }
  });

  app.put('/api/projects/:id', async (req, res) => {
    const { title, description, category, budget } = req.body;
    try {
      if (isMainDbConnected) {
        await mainPool.query('UPDATE projects SET title = $1, description = $2, category = $3, budget = $4 WHERE id = $5', 
          [title, description, category, budget, req.params.id]);
      } else {
        const index = memoryStore.projects.findIndex((p: any) => p.id === req.params.id);
        if (index !== -1) {
          memoryStore.projects[index] = { ...memoryStore.projects[index], title, description, category, budget };
        }
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error updating project:', err);
      res.status(500).json({ error: 'Failed to update project' });
    }
  });

  app.delete('/api/projects/:id', async (req, res) => {
    try {
      if (isMainDbConnected) {
        await mainPool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
      } else {
        memoryStore.projects = memoryStore.projects.filter((p: any) => p.id !== req.params.id);
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting project:', err);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  });

  // Money tracking endpoints
  app.get('/api/money-tracking', async (req, res) => {
    try {
      if (isMainDbConnected) {
        const result = await mainPool.query(`
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
      console.error('Error fetching money records:', err);
      res.status(500).json({ error: 'Failed to fetch money tracking data' });
    }
  });

  app.post('/api/money-tracking', async (req, res) => {
    const { user_id, amount, currency, description, type } = req.body;
    const id = 'mt' + Math.random().toString(36).substr(2, 5);
    try {
      if (isMainDbConnected) {
        await mainPool.query('INSERT INTO money_tracking (id, user_id, amount, currency, description, type) VALUES ($1, $2, $3, $4, $5, $6)', 
          [id, user_id, amount, currency, description, type]);
      } else {
        memoryStore.money_tracking.push({ id, user_id, amount, currency, description, type, date: new Date().toISOString() });
      }
      res.json({ success: true, id });
    } catch (err) {
      console.error('Error creating money record:', err);
      res.status(500).json({ error: 'Failed to add money record' });
    }
  });

  app.put('/api/money-tracking/:id', async (req, res) => {
    const { amount, currency, description, type } = req.body;
    try {
      if (isMainDbConnected) {
        await mainPool.query('UPDATE money_tracking SET amount = $1, currency = $2, description = $3, type = $4 WHERE id = $5', 
          [amount, currency, description, type, req.params.id]);
      } else {
        const index = memoryStore.money_tracking.findIndex((m: any) => m.id === req.params.id);
        if (index !== -1) {
          memoryStore.money_tracking[index] = { ...memoryStore.money_tracking[index], amount, currency, description, type };
        }
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error updating money record:', err);
      res.status(500).json({ error: 'Failed to update money record' });
    }
  });

  app.delete('/api/money-tracking/:id', async (req, res) => {
    try {
      if (isMainDbConnected) {
        await mainPool.query('DELETE FROM money_tracking WHERE id = $1', [req.params.id]);
      } else {
        memoryStore.money_tracking = memoryStore.money_tracking.filter((m: any) => m.id !== req.params.id);
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting money record:', err);
      res.status(500).json({ error: 'Failed to delete money record' });
    }
  });

  // Visits endpoints
  app.get('/api/visits', async (req, res) => {
    try {
      if (isMainDbConnected) {
        const result = await mainPool.query(`
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
      console.error('Error fetching visits:', err);
      res.status(500).json({ error: 'Failed to fetch visits' });
    }
  });

  app.post('/api/visits', async (req, res) => {
    const { so_id, client_id, notes } = req.body;
    const id = 'v' + Math.random().toString(36).substr(2, 5);
    try {
      if (isMainDbConnected) {
        await mainPool.query('INSERT INTO client_visits (id, so_id, client_id, notes) VALUES ($1, $2, $3, $4)', 
          [id, so_id, client_id, notes]);
      } else {
        memoryStore.client_visits.push({ id, so_id, client_id, notes, visit_date: new Date().toISOString() });
      }
      res.json({ success: true, id });
    } catch (err) {
      console.error('Error creating visit:', err);
      res.status(500).json({ error: 'Failed to add visit' });
    }
  });

  // Branches endpoints
  app.get('/api/branches', async (req, res) => {
    try {
      if (isMainDbConnected) {
        const result = await mainPool.query('SELECT * FROM branches ORDER BY total_collection DESC');
        res.json(result.rows);
      } else {
        res.json([...memoryStore.branches].sort((a, b) => b.total_collection - a.total_collection));
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      res.status(500).json({ error: 'Failed to fetch branches' });
    }
  });

  app.post('/api/branches', async (req, res) => {
    const { name, bm_name, total_collection } = req.body;
    const id = 'b' + Math.random().toString(36).substr(2, 5);
    try {
      if (isMainDbConnected) {
        await mainPool.query('INSERT INTO branches (id, name, bm_name, total_collection) VALUES ($1, $2, $3, $4)', 
          [id, name, bm_name, total_collection]);
      } else {
        memoryStore.branches.push({ id, name, bm_name, total_collection });
      }
      res.json({ success: true, id });
    } catch (err) {
      console.error('Error creating branch:', err);
      res.status(500).json({ error: 'Failed to add branch' });
    }
  });

  app.put('/api/branches/:id', async (req, res) => {
    const { name, bm_name, total_collection } = req.body;
    try {
      if (isMainDbConnected) {
        await mainPool.query('UPDATE branches SET name = $1, bm_name = $2, total_collection = $3 WHERE id = $4', 
          [name, bm_name, total_collection, req.params.id]);
      } else {
        const index = memoryStore.branches.findIndex((b: any) => b.id === req.params.id);
        if (index !== -1) {
          memoryStore.branches[index] = { ...memoryStore.branches[index], name, bm_name, total_collection };
        }
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error updating branch:', err);
      res.status(500).json({ error: 'Failed to update branch' });
    }
  });

  app.delete('/api/branches/:id', async (req, res) => {
    try {
      if (isMainDbConnected) {
        await mainPool.query('DELETE FROM branches WHERE id = $1', [req.params.id]);
      } else {
        memoryStore.branches = memoryStore.branches.filter((b: any) => b.id !== req.params.id);
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting branch:', err);
      res.status(500).json({ error: 'Failed to delete branch' });
    }
  });

  // ============ SUBSIDIARY DATABASE API ROUTES ============
  
  app.get('/api/subsidiary/branches', async (req, res) => {
    try {
      if (isSubsidiaryDbConnected) {
        const result = await subsidiaryPool.query('SELECT * FROM subsidiary_branches ORDER BY created_at DESC');
        res.json(result.rows);
      } else {
        res.json(memoryStore.subsidiary_data);
      }
    } catch (err) {
      console.error('Error fetching subsidiary branches:', err);
      res.status(500).json({ error: 'Failed to fetch subsidiary branches' });
    }
  });

  app.post('/api/subsidiary/branches', async (req, res) => {
    const { name, location, revenue, expenses, profit } = req.body;
    const id = 'sub' + Math.random().toString(36).substr(2, 5);
    try {
      if (isSubsidiaryDbConnected) {
        await subsidiaryPool.query(
          'INSERT INTO subsidiary_branches (id, name, location, revenue, expenses, profit) VALUES ($1, $2, $3, $4, $5, $6)', 
          [id, name, location, revenue || 0, expenses || 0, profit || 0]
        );
        res.json({ success: true, id });
      } else {
        memoryStore.subsidiary_data.push({ 
          id, name, location, 
          revenue: revenue || 0, 
          expenses: expenses || 0, 
          profit: profit || 0 
        });
        res.json({ success: true, id });
      }
    } catch (err) {
      console.error('Error creating subsidiary branch:', err);
      res.status(500).json({ error: 'Failed to add subsidiary branch' });
    }
  });

  app.put('/api/subsidiary/branches/:id', async (req, res) => {
    const { name, location, revenue, expenses, profit } = req.body;
    try {
      if (isSubsidiaryDbConnected) {
        await subsidiaryPool.query(
          'UPDATE subsidiary_branches SET name = $1, location = $2, revenue = $3, expenses = $4, profit = $5 WHERE id = $6',
          [name, location, revenue, expenses, profit, req.params.id]
        );
      } else {
        const index = memoryStore.subsidiary_data.findIndex((s: any) => s.id === req.params.id);
        if (index !== -1) {
          memoryStore.subsidiary_data[index] = { 
            ...memoryStore.subsidiary_data[index], 
            name, location, revenue, expenses, profit 
          };
        }
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error updating subsidiary branch:', err);
      res.status(500).json({ error: 'Failed to update subsidiary branch' });
    }
  });

  app.delete('/api/subsidiary/branches/:id', async (req, res) => {
    try {
      if (isSubsidiaryDbConnected) {
        await subsidiaryPool.query('DELETE FROM subsidiary_branches WHERE id = $1', [req.params.id]);
      } else {
        memoryStore.subsidiary_data = memoryStore.subsidiary_data.filter((s: any) => s.id !== req.params.id);
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting subsidiary branch:', err);
      res.status(500).json({ error: 'Failed to delete subsidiary branch' });
    }
  });

  app.get('/api/subsidiary/stats', async (req, res) => {
    try {
      if (isSubsidiaryDbConnected) {
        const result = await subsidiaryPool.query(`
          SELECT 
            COUNT(*) as total_branches,
            COALESCE(SUM(revenue), 0) as total_revenue,
            COALESCE(SUM(expenses), 0) as total_expenses,
            COALESCE(SUM(profit), 0) as total_profit
          FROM subsidiary_branches
        `);
        res.json(result.rows[0]);
      } else {
        const stats = memoryStore.subsidiary_data.reduce((acc: any, curr: any) => {
          acc.total_branches = (acc.total_branches || 0) + 1;
          acc.total_revenue = (acc.total_revenue || 0) + (curr.revenue || 0);
          acc.total_expenses = (acc.total_expenses || 0) + (curr.expenses || 0);
          acc.total_profit = (acc.total_profit || 0) + (curr.profit || 0);
          return acc;
        }, { total_branches: 0, total_revenue: 0, total_expenses: 0, total_profit: 0 });
        res.json(stats);
      }
    } catch (err) {
      console.error('Error fetching subsidiary stats:', err);
      res.status(500).json({ error: 'Failed to fetch subsidiary stats' });
    }
  });

  // Combined data endpoint
  app.get('/api/combined/branch-performance', async (req, res) => {
    try {
      let mainBranches = [];
      let subsidiaryBranches = [];

      if (isMainDbConnected) {
        const result = await mainPool.query('SELECT id, name, bm_name, total_collection FROM branches');
        mainBranches = result.rows;
      } else {
        mainBranches = memoryStore.branches;
      }

      if (isSubsidiaryDbConnected) {
        const result = await subsidiaryPool.query('SELECT id, name, location, revenue, profit FROM subsidiary_branches');
        subsidiaryBranches = result.rows;
      } else {
        subsidiaryBranches = memoryStore.subsidiary_data;
      }

      res.json({
        main_branches: mainBranches,
        subsidiary_branches: subsidiaryBranches,
        total_main_collection: mainBranches.reduce((sum, b) => sum + (b.total_collection || 0), 0),
        total_subsidiary_revenue: subsidiaryBranches.reduce((sum, b) => sum + (b.revenue || 0), 0)
      });
    } catch (err) {
      console.error('Error fetching combined data:', err);
      res.status(500).json({ error: 'Failed to fetch combined data' });
    }
  });

  // ============ STATIC FILE SERVING ============
  
  if (process.env.NODE_ENV === 'production') {
    // In production, serve static files from dist
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    
    // All non-API routes go to index.html
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  } else {
    // In development, use Vite's dev server
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // ============ START SERVER ============
  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(50));
    console.log(`🚀 Server is running!`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Main DB: ${isMainDbConnected ? 'Connected' : 'Demo Mode'}`);
    console.log(`💾 Subsidiary DB: ${isSubsidiaryDbConnected ? 'Connected' : 'Demo Mode'}`);
    console.log('='.repeat(50) + '\n');
  });
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  await mainPool.end().catch(console.error);
  await subsidiaryPool.end().catch(console.error);
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing connections...');
  await mainPool.end().catch(console.error);
  await subsidiaryPool.end().catch(console.error);
  process.exit(0);
});

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});