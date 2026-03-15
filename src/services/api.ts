// src/services/api.ts

// API Base URL - empty for proxy in dev, full URL in production
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://your-railway-app.up.railway.app' // Replace with your Railway URL
  : ''; // Empty for development (uses proxy)

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  aadhar: string;
  phone: string;
  referral_code: string;
  referred_by: string | null;
  parent_id: string | null;
  created_at?: string;
}

export interface LoginCredentials {
  email?: string;
  password: string;
  aadhar?: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
    console.log('API Base URL:', this.baseUrl || '(using proxy)');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('Fetching:', url);
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `API request failed: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    return this.request('/api/health');
  }

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<User> {
    return this.request<User>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  // Users endpoints
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/api/users');
  }
}

export const api = new ApiService();