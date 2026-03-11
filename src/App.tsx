import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  Settings, 
  LogOut, 
  Plus, 
  Search, 
  Bell, 
  ChevronRight, 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  MapPin, 
  Calendar, 
  MessageSquare, 
  Send, 
  UserPlus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  CreditCard, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck, 
  Menu, 
  X, 
  Copy, 
  ExternalLink,
  Eye,
  EyeOff,
  User,
  Smartphone,
  CreditCard as AadharIcon,
  Trophy,
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type Role = 'MD' | 'Director' | 'GM' | 'Branch Manager' | 'ABM' | 'Sales Officer' | 'Client';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: Role;
  aadhar: string;
  phone: string;
  referral_code: string;
  referred_by?: string;
  parent_id?: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: string;
  status: string;
}

interface MoneyRecord {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  currency: string;
  description: string;
  type: 'Income' | 'Expense';
  date: string;
}

interface Visit {
  id: string;
  so_id: string;
  so_name: string;
  client_id: string;
  client_name: string;
  notes: string;
  visit_date: string;
}

interface Branch {
  id: string;
  name: string;
  bm_name: string;
  total_collection: number;
}

// --- Constants ---
const ROLES: Role[] = ['MD', 'Director', 'GM', 'Branch Manager', 'ABM', 'Sales Officer', 'Client'];

const ROLE_PERMISSIONS: Record<Role, Role[]> = {
  'MD': ['Director', 'GM', 'Branch Manager', 'ABM', 'Sales Officer', 'Client'],
  'Director': ['GM', 'Branch Manager', 'ABM', 'Sales Officer', 'Client'],
  'GM': [],
  'Branch Manager': [],
  'ABM': ['Sales Officer'],
  'Sales Officer': ['Client'],
  'Client': []
};

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
        : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard = ({ label, value, icon: Icon, trend, color }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      {trend && (
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <h3 className="text-slate-500 text-sm font-medium mb-1">{label}</h3>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [loginMethod, setLoginMethod] = useState<'email' | 'aadhar'>('email');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [referralFromUrl, setReferralFromUrl] = useState('');

  // Data States
  const [users, setUsers] = useState<UserData[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [moneyRecords, setMoneyRecords] = useState<MoneyRecord[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<{configured: boolean, connected: boolean}>({configured: true, connected: true});
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setDbStatus({ configured: data.dbConfigured, connected: data.dbConnected });
      setBackendStatus('online');
    } catch (err) {
      console.error('Health check failed');
      setBackendStatus('offline');
    }
  };

  // Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<'user' | 'project' | 'money' | 'visit' | 'branch'>('user');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', email: '' });

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name, phone: user.phone || '', email: user.email });
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralFromUrl(ref);
      // Stay on login page but show the referral badge
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, pRes, mRes, vRes, bRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/projects'),
        fetch('/api/money-tracking'),
        fetch('/api/visits'),
        fetch('/api/branches')
      ]);
      setUsers(await uRes.json());
      setProjects(await pRes.json());
      setMoneyRecords(await mRes.json());
      setVisits(await vRes.json());
      setBranches(await bRes.json());
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (res.ok) {
        setUser(result);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Login failed');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (res.ok) {
        setSuccess('Registration successful! Please login.');
        setIsLogin(true);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Registration failed');
    }
  };

  const handleAction = async (type: string, action: 'add' | 'edit' | 'delete', data?: any) => {
    const endpoint = type === 'user' ? '/api/users' : 
                     type === 'project' ? '/api/projects' : 
                     type === 'money' ? '/api/money-tracking' :
                     type === 'branch' ? '/api/branches' :
                     '/api/visits';
    const method = action === 'add' ? 'POST' : action === 'edit' ? 'PUT' : 'DELETE';
    const url = action === 'delete' || action === 'edit' ? `${endpoint}/${data.id}` : endpoint;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: action !== 'delete' ? JSON.stringify(data) : undefined
      });
      if (res.ok) {
        fetchData();
        setShowAddModal(false);
        setEditingItem(null);
      } else {
        const result = await res.json();
        setError(result.error || 'Action failed');
      }
    } catch (err) {
      console.error('Action failed:', err);
      setError('Network error: Action failed');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl border border-slate-100"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
              <ShieldCheck size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">AGILAVETRI GROUPS</h1>
            <p className="text-slate-500 mt-2">Secure Organizational Portal</p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              Login
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${!isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              Register
            </button>
          </div>

          {referralFromUrl && (
            <div className="mb-6 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserPlus size={16} className="text-indigo-600" />
                <span className="text-xs font-bold text-indigo-700">Referred by: {referralFromUrl}</span>
              </div>
              <button 
                onClick={() => { setReferralFromUrl(''); window.history.replaceState({}, document.title, window.location.pathname); }}
                className="text-indigo-400 hover:text-indigo-600"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="flex justify-center space-x-4 mb-4">
                <button 
                  type="button"
                  onClick={() => setLoginMethod('email')}
                  className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${loginMethod === 'email' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-slate-200 text-slate-400'}`}
                >
                  Email Login
                </button>
                <button 
                  type="button"
                  onClick={() => setLoginMethod('aadhar')}
                  className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${loginMethod === 'aadhar' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-slate-200 text-slate-400'}`}
                >
                  Aadhar Login
                </button>
              </div>

              {loginMethod === 'email' ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                  <input name="email" type="email" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="name@avg.com" />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aadhar Number</label>
                  <input name="aadhar" type="text" required maxLength={12} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="12-digit Aadhar" />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <input name="password" type="password" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="••••••••" />
              </div>

              <button 
                type="submit" 
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
              >
                Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <input name="name" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role</label>
                  <select name="role" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                <input name="email" type="email" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aadhar</label>
                  <input name="aadhar" required maxLength={12} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                  <input name="phone" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Referral Code</label>
                <input name="referredBy" defaultValue={referralFromUrl} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Optional" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <input name="password" type="password" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <button 
                type="submit" 
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
              >
                Create Account
              </button>
            </form>
          )}

          {error && <div className="mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl flex items-center space-x-2"><XCircle size={16} /><span>{error}</span></div>}
          {success && <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm rounded-xl flex items-center space-x-2"><CheckCircle2 size={16} /><span>{success}</span></div>}
        </motion.div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Network" value={users.length} icon={Users} trend={12} color="bg-indigo-500" />
        <StatCard label="Active Projects" value={projects.length} icon={Briefcase} color="bg-emerald-500" />
        <StatCard label="Total Transactions" value={moneyRecords.length} icon={DollarSign} trend={8} color="bg-amber-500" />
        <StatCard label="Client Visits" value={visits.length} icon={Calendar} trend={15} color="bg-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Recent Money Tracking</h2>
          <div className="space-y-4">
            {moneyRecords.slice(0, 5).map(record => (
              <div key={record.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${record.type === 'Income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {record.type === 'Income' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{record.description}</p>
                    <p className="text-xs text-slate-500">{record.user_name} • {new Date(record.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className={`font-bold ${record.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {record.type === 'Income' ? '+' : '-'}{record.currency} {record.amount}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Active Projects</h2>
          <div className="space-y-4">
            {projects.slice(0, 5).map(project => (
              <div key={project.id} className="p-4 border border-slate-100 rounded-2xl hover:border-indigo-100 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-900">{project.title}</h3>
                  <span className="text-xs font-bold px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full">{project.category}</span>
                </div>
                <p className="text-sm text-slate-500 mb-3">{project.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-700">Budget: {project.budget}</span>
                  <span className="text-xs text-slate-400">Status: {project.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderHierarchy = () => (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900">Organizational Hierarchy</h2>
        {ROLE_PERMISSIONS[user.role].length > 0 && (
          <button 
            onClick={() => { setModalType('user'); setShowAddModal(true); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2 hover:bg-indigo-700 transition-all"
          >
            <UserPlus size={18} />
            <span>Add Member</span>
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Aadhar</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Referral Code</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold text-xs">
                      {u.name.charAt(0)}
                    </div>
                    <span className="font-medium text-slate-900">{u.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    u.role === 'MD' ? 'bg-indigo-100 text-indigo-700' :
                    u.role === 'Director' ? 'bg-amber-100 text-amber-700' :
                    u.role === 'Client' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{u.aadhar}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold">{u.referral_code}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    {user.role === 'MD' && (
                      <>
                        <button onClick={() => { setEditingItem(u); setModalType('user'); setShowAddModal(true); }} className="text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={18} /></button>
                        <button onClick={() => handleAction('user', 'delete', u)} className="text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={18} /></button>
                      </>
                    )}
                    {user.role === 'Director' && u.role !== 'MD' && (
                      <button onClick={() => { setEditingItem(u); setModalType('user'); setShowAddModal(true); }} className="text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={18} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderBranches = () => (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 bg-orange-100 border-b border-orange-200 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">AGILAVETRI GROUPS</h1>
          <h2 className="text-lg font-bold text-slate-700">BM'S BRANCH COLLECTION</h2>
        </div>
        {user.role === 'MD' && (
          <button 
            onClick={() => { setModalType('branch'); setShowAddModal(true); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2 hover:bg-indigo-700 transition-all"
          >
            <Plus size={18} />
            <span>Add Branch</span>
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b-2 border-slate-200">
            <tr>
              <th className="px-4 py-4 text-center text-xs font-black text-slate-900 uppercase">S.NO</th>
              <th className="px-6 py-4 text-left text-xs font-black text-slate-900 uppercase">NAME OF THE BRANCH</th>
              <th className="px-6 py-4 text-left text-xs font-black text-slate-900 uppercase">BM'S NAME</th>
              <th className="px-6 py-4 text-right text-xs font-black text-slate-900 uppercase">TOTAL COLLECTION</th>
              <th className="px-6 py-4 text-center text-xs font-black text-slate-900 uppercase">ORDER VICE</th>
              {user.role === 'MD' && <th className="px-6 py-4 text-center text-xs font-black text-slate-900 uppercase">ACTIONS</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {branches.map((b, index) => (
              <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-4 text-center font-bold text-slate-900">{index + 1}</td>
                <td className="px-6 py-4 font-black text-slate-900 uppercase">{b.name}</td>
                <td className="px-6 py-4 font-bold text-slate-700 uppercase">{b.bm_name}</td>
                <td className="px-6 py-4 text-right font-bold text-slate-900">{b.total_collection.toLocaleString()}</td>
                <td className="px-6 py-4 text-center">
                  {index === 0 ? (
                    <div className="flex flex-col items-center">
                      <Trophy size={24} className="text-amber-400" />
                      <span className="text-[10px] font-black text-amber-600 uppercase">1st Place</span>
                    </div>
                  ) : index === 1 ? (
                    <div className="flex flex-col items-center">
                      <Trophy size={24} className="text-slate-400" />
                      <span className="text-[10px] font-black text-slate-500 uppercase">2nd Place</span>
                    </div>
                  ) : index === 2 ? (
                    <div className="flex flex-col items-center">
                      <Trophy size={24} className="text-amber-700" />
                      <span className="text-[10px] font-black text-amber-800 uppercase">3rd Place</span>
                    </div>
                  ) : (
                    <span className="text-xs font-black text-slate-400 uppercase">{index + 1}th Place</span>
                  )}
                </td>
                {user.role === 'MD' && (
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center space-x-2">
                      <button onClick={() => { setEditingItem(b); setModalType('branch'); setShowAddModal(true); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleAction('branch', 'delete', b)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            <tr className="bg-slate-100 font-black">
              <td colSpan={3} className="px-6 py-4 text-right uppercase">TOTAL</td>
              <td className="px-6 py-4 text-right">{branches.reduce((sum, b) => sum + b.total_collection, 0).toLocaleString()}</td>
              <td colSpan={user.role === 'MD' ? 2 : 1}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderProjects = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Projects Management</h2>
        {user.role === 'MD' && (
          <button 
            onClick={() => { setModalType('project'); setShowAddModal(true); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2 hover:bg-indigo-700 transition-all"
          >
            <Plus size={18} />
            <span>New Project</span>
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(p => (
          <div key={p.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Briefcase size={24} />
              </div>
              <div className="flex space-x-2">
                {user.role === 'MD' && (
                  <>
                    <button onClick={() => { setEditingItem(p); setModalType('project'); setShowAddModal(true); }} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 size={16} /></button>
                    <button onClick={() => handleAction('project', 'delete', p)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 size={16} /></button>
                  </>
                )}
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{p.title}</h3>
            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{p.description}</p>
            <div className="flex justify-between items-center pt-4 border-t border-slate-50">
              <span className="text-sm font-bold text-indigo-600">{p.budget}</span>
              <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-full uppercase tracking-wider">{p.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMoneyTracking = () => (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900">Money Tracking</h2>
        {user.role !== 'Client' && (
          <button 
            onClick={() => { setModalType('money'); setShowAddModal(true); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2 hover:bg-indigo-700 transition-all"
          >
            <Plus size={18} />
            <span>Add Record</span>
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {moneyRecords.map(m => (
              <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{m.user_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{m.description}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${m.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {m.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{m.currency} {m.amount}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(m.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    {(user.role === 'MD' || user.id === m.user_id) && (
                      <>
                        <button onClick={() => { setEditingItem(m); setModalType('money'); setShowAddModal(true); }} className="text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={18} /></button>
                        <button onClick={() => handleAction('money', 'delete', m)} className="text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={18} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderClientVisits = () => (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900">Client Visits</h2>
        {['Sales Officer', 'ABM', 'Branch Manager'].includes(user.role) && (
          <button 
            onClick={() => { setModalType('visit'); setShowAddModal(true); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2 hover:bg-indigo-700 transition-all"
          >
            <Plus size={18} />
            <span>Log Visit</span>
          </button>
        )}
      </div>
      <div className="p-6 space-y-4">
        {visits.map(v => (
          <div key={v.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-slate-900">Client: {v.client_name}</h3>
                <p className="text-xs text-slate-500">Logged by: {v.so_name}</p>
              </div>
              <span className="text-xs font-medium text-slate-400">{new Date(v.visit_date).toLocaleString()}</span>
            </div>
            <p className="text-sm text-slate-600 mt-2 italic">"{v.notes}"</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900 mb-8">Profile Settings</h2>
        <div className="space-y-6">
          <div className="flex items-center space-x-6 pb-6 border-b border-slate-50">
            <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 text-3xl font-bold">
              {user.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{user.name}</h3>
              <p className="text-slate-500">{user.role} • {user.email}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
              <input 
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
              <input 
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
              <input 
                type="text"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aadhar Number (Read-only)</label>
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-slate-500 font-mono">{user.aadhar}</div>
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Referral Link</label>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-700 font-bold flex justify-between items-center">
                <span className="truncate mr-2">{`${window.location.origin}?ref=${user.referral_code}`}</span>
                <button onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}?ref=${user.referral_code}`);
                  setSuccess('Referral link copied!');
                  setTimeout(() => setSuccess(''), 3000);
                }} className="text-indigo-400 hover:text-indigo-600 flex-shrink-0"><Copy size={16} /></button>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button 
              onClick={async () => {
                try {
                  const res = await fetch(`/api/users/${user.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ...user,
                      name: profileForm.name,
                      email: profileForm.email,
                      phone: profileForm.phone
                    })
                  });
                  if (res.ok) {
                    setSuccess('Profile updated successfully!');
                    setUser({ ...user, ...profileForm });
                    setTimeout(() => setSuccess(''), 3000);
                  } else {
                    const data = await res.json();
                    setError(data.error || 'Failed to update profile');
                    setTimeout(() => setError(''), 3000);
                  }
                } catch (err) {
                  setError('Failed to update profile');
                  setTimeout(() => setError(''), 3000);
                }
              }}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              Update Profile
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Security</h2>
        <div className="space-y-4">
          <button 
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <ShieldCheck className="text-indigo-600" />
              <span className="font-medium text-slate-700">Change Password</span>
            </div>
            <ChevronRight size={20} className="text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className={`bg-white border-r border-slate-100 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col`}>
        <div className="p-6 flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 flex-shrink-0">
            <ShieldCheck size={24} className="text-white" />
          </div>
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight text-slate-900">AVG PORTAL</span>}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => setActiveTab('Dashboard')} />
          <SidebarItem icon={Users} label="Hierarchy" active={activeTab === 'Hierarchy'} onClick={() => setActiveTab('Hierarchy')} />
          <SidebarItem icon={MapPin} label="Branches" active={activeTab === 'Branches'} onClick={() => setActiveTab('Branches')} />
          <SidebarItem icon={Briefcase} label="Projects" active={activeTab === 'Projects'} onClick={() => setActiveTab('Projects')} />
          <SidebarItem icon={DollarSign} label="Money Tracking" active={activeTab === 'Money Tracking'} onClick={() => setActiveTab('Money Tracking')} />
          {['Sales Officer', 'ABM', 'Branch Manager', 'GM', 'Director', 'MD'].includes(user.role) && (
            <SidebarItem icon={Calendar} label="Client Visits" active={activeTab === 'Client Visits'} onClick={() => setActiveTab('Client Visits')} />
          )}
          <SidebarItem icon={Settings} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
        </nav>

        <div className="p-4 border-t border-slate-50">
          <button 
            onClick={() => setUser(null)}
            className="w-full flex items-center space-x-3 px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white h-20 border-b border-slate-100 flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-bold text-slate-900">{activeTab}</h1>
          </div>

          <div className="flex items-center space-x-6">
            <div className={`hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              backendStatus === 'online'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                : 'bg-rose-50 text-rose-700 border-rose-100'
            }`}>
              <div className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? 'bg-indigo-500 animate-pulse' : 'bg-rose-500'}`}></div>
              <span>Backend: {backendStatus === 'online' ? 'Online' : 'Offline'}</span>
            </div>
            <div className={`hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              dbStatus.connected 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                : 'bg-amber-50 text-amber-700 border-amber-100'
            }`}>
              {dbStatus.connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{dbStatus.connected ? 'PostgreSQL Connected' : 'Demo Mode'}</span>
            </div>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Search..." className="bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none w-64 transition-all" />
            </div>
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center space-x-3 pl-6 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500 font-medium">{user.role}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                {user.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'Dashboard' && renderDashboard()}
              {activeTab === 'Hierarchy' && renderHierarchy()}
              {activeTab === 'Branches' && renderBranches()}
              {activeTab === 'Projects' && renderProjects()}
              {activeTab === 'Money Tracking' && renderMoneyTracking()}
              {activeTab === 'Client Visits' && renderClientVisits()}
              {activeTab === 'Settings' && renderSettings()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">Change Password</h2>
                <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (passwordForm.new !== passwordForm.confirm) {
                  setError('New passwords do not match');
                  return;
                }
                try {
                  const res = await fetch(`/api/users/${user.id}/password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      currentPassword: passwordForm.current,
                      newPassword: passwordForm.new
                    })
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setSuccess('Password updated successfully!');
                    setShowPasswordModal(false);
                    setPasswordForm({ current: '', new: '', confirm: '' });
                    setTimeout(() => setSuccess(''), 3000);
                  } else {
                    setError(data.error || 'Failed to update password');
                  }
                } catch (err) {
                  setError('Failed to update password');
                }
              }} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Current Password</label>
                  <input 
                    type="password"
                    required
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({...passwordForm, current: e.target.value})}
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">New Password</label>
                  <input 
                    type="password"
                    required
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Confirm New Password</label>
                  <input 
                    type="password"
                    required
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  Update Password
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingItem ? 'Edit' : 'Add New'} {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
                </h2>
                <button onClick={() => { setShowAddModal(false); setEditingItem(null); setError(''); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                  <X size={20} />
                </button>
              </div>
              {error && (
                <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-medium flex items-center space-x-2">
                  <XCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const data = Object.fromEntries(formData);
                const payload = modalType === 'user' && !editingItem 
                  ? { ...data, parent_id: user.id, referred_by: user.referral_code } 
                  : { ...editingItem, ...data };
                handleAction(modalType, editingItem ? 'edit' : 'add', payload);
              }} className="p-6 space-y-4">
                {modalType === 'user' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Name</label>
                        <input name="name" defaultValue={editingItem?.name} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role</label>
                        <select name="role" defaultValue={editingItem?.role} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                          {ROLE_PERMISSIONS[user.role].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                      <input name="email" type="email" defaultValue={editingItem?.email} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aadhar</label>
                        <input name="aadhar" defaultValue={editingItem?.aadhar} required maxLength={12} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                        <input name="phone" defaultValue={editingItem?.phone} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                    </div>
                    {!editingItem && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                        <input name="password" type="password" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                    )}
                  </>
                )}

                {modalType === 'project' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Project Title</label>
                      <input name="title" defaultValue={editingItem?.title} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                        <input name="category" defaultValue={editingItem?.category} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Budget</label>
                        <input name="budget" defaultValue={editingItem?.budget} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                      <textarea name="description" defaultValue={editingItem?.description} rows={3} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                    </div>
                  </>
                )}

                {modalType === 'money' && (
                  <>
                    <input type="hidden" name="user_id" value={user.id} />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</label>
                        <input name="amount" type="number" defaultValue={editingItem?.amount} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</label>
                        <select name="type" defaultValue={editingItem?.type} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                          <option value="Income">Income</option>
                          <option value="Expense">Expense</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                      <input name="description" defaultValue={editingItem?.description} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </>
                )}

                {modalType === 'visit' && (
                  <>
                    <input type="hidden" name="so_id" value={user.id} />
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Client</label>
                      <select name="client_id" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                        {users.filter(u => u.role === 'Client').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meeting Notes</label>
                      <textarea name="notes" rows={4} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="What was discussed?" />
                    </div>
                  </>
                )}

                {modalType === 'branch' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Name</label>
                      <input name="name" defaultValue={editingItem?.name} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">BM's Name</label>
                      <input name="bm_name" defaultValue={editingItem?.bm_name} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Collection</label>
                      <input name="total_collection" type="number" defaultValue={editingItem?.total_collection} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </>
                )}

                <div className="pt-4">
                  <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                    {editingItem ? 'Save Changes' : 'Create Entry'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
