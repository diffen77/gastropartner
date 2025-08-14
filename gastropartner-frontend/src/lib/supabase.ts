/**
 * Supabase client configuration för GastroPartner frontend
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables från .env
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check .env file for REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY'
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist session in localStorage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Type definitions för authentication
export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  max_ingredients: number;
  max_recipes: number;
  max_menu_items: number;
  current_ingredients: number;
  current_recipes: number;
  current_menu_items: number;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  expires_in: number;
}

// API client för backend endpoints
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Get session with timeout to avoid hanging
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Session fetch timeout in API client')), 5000)
    );
    
    const session = await Promise.race([sessionPromise, timeoutPromise]);
    const token = session.data.session?.access_token;

    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  private async requestWithToken<T>(
    endpoint: string,
    token: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  // Authentication methods
  async register(email: string, password: string, fullName: string) {
    return this.request<{ message: string; success: boolean }>(
      '/api/v1/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
        }),
      }
    );
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getCurrentUser(accessToken?: string): Promise<User> {
    if (accessToken) {
      // Use provided token directly
      return this.requestWithToken<User>('/api/v1/auth/me', accessToken);
    }
    
    // Verify we have a valid session before making the request
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Session check timeout in getCurrentUser')), 5000)
    );
    
    const session = await Promise.race([sessionPromise, timeoutPromise]);
    if (!session.data.session || !session.data.session.access_token) {
      throw new Error('No valid session found');
    }
    return this.request<User>('/api/v1/auth/me');
  }

  async updateUser(fullName: string): Promise<User> {
    return this.request<User>('/api/v1/auth/me', {
      method: 'PUT',
      body: JSON.stringify({ full_name: fullName }),
    });
  }

  // Organization methods
  async getOrganizations(accessToken?: string): Promise<Organization[]> {
    try {
      if (accessToken) {
        return this.requestWithToken<Organization[]>('/api/v1/organizations/', accessToken);
      }
      return this.request<Organization[]>('/api/v1/organizations/');
    } catch (error) {
      // During development, if database tables don't exist yet, return empty array
      console.warn('Organizations endpoint failed, returning empty array:', error);
      return [];
    }
  }

  async createOrganization(name: string, description?: string): Promise<Organization> {
    return this.request<Organization>('/api/v1/organizations/', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async getOrganization(id: string): Promise<Organization> {
    return this.request<Organization>(`/api/v1/organizations/${id}`);
  }

  async getOrganizationUsage(id: string) {
    return this.request<{
      organization_id: string;
      usage: {
        ingredients: { current: number; limit: number; percentage: number };
        recipes: { current: number; limit: number; percentage: number };
        menu_items: { current: number; limit: number; percentage: number };
      };
      upgrade_needed: boolean;
    }>(`/api/v1/organizations/${id}/usage`);
  }
}

export const api = new ApiClient(API_BASE_URL);