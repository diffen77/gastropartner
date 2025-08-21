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

// Organization Settings interfaces
export interface RestaurantProfile {
  name: string;
  phone?: string;
  timezone: string;
  currency: string;
  address?: string;
  website?: string;
}

export interface BusinessSettings {
  margin_target: number;
  service_charge: number;
  default_prep_time: number;
  operating_hours: Record<string, any>;
}

export interface BusinessSettingsUpdate {
  margin_target?: number;
  service_charge?: number;
  default_prep_time?: number;
  operating_hours?: Record<string, any>;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  sms_notifications: boolean;
  inventory_alerts: boolean;
  cost_alerts: boolean;
  daily_reports: boolean;
  weekly_reports: boolean;
}

export interface OrganizationSettings {
  settings_id: string;
  organization_id: string;
  creator_id: string;
  restaurant_profile: RestaurantProfile;
  business_settings: BusinessSettings;
  notification_preferences: NotificationPreferences;
  has_completed_onboarding: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSettingsCreate {
  restaurant_profile: RestaurantProfile;
  business_settings: BusinessSettings;
  notification_preferences: NotificationPreferences;
}

export interface OrganizationSettingsUpdate {
  restaurant_profile?: RestaurantProfile;
  business_settings?: BusinessSettingsUpdate;
  notification_preferences?: NotificationPreferences;
  has_completed_onboarding?: boolean;
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
    // Use development token from localStorage directly to avoid session fetch loops
    const token = localStorage.getItem('auth_token');

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
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const error = await response.json();
        
        // Handle FastAPI validation errors (422)
        if (response.status === 422 && error.detail) {
          if (Array.isArray(error.detail)) {
            // Multiple validation errors
            errorMessage = error.detail
              .map((err: any) => `${err.loc?.[1] || 'field'}: ${err.msg}`)
              .join(', ');
          } else if (typeof error.detail === 'string') {
            // Single error message
            errorMessage = error.detail;
          } else {
            // Object with message
            errorMessage = error.detail.message || error.message || errorMessage;
          }
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.detail) {
          errorMessage = typeof error.detail === 'string' ? error.detail : errorMessage;
        }
      } catch {
        // If parsing fails, keep the generic HTTP error message
      }
      
      throw new Error(errorMessage);
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
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const error = await response.json();
        
        // Handle FastAPI validation errors (422)
        if (response.status === 422 && error.detail) {
          if (Array.isArray(error.detail)) {
            // Multiple validation errors
            errorMessage = error.detail
              .map((err: any) => `${err.loc?.[1] || 'field'}: ${err.msg}`)
              .join(', ');
          } else if (typeof error.detail === 'string') {
            // Single error message
            errorMessage = error.detail;
          } else {
            // Object with message
            errorMessage = error.detail.message || error.message || errorMessage;
          }
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.detail) {
          errorMessage = typeof error.detail === 'string' ? error.detail : errorMessage;
        }
      } catch {
        // If parsing fails, keep the generic HTTP error message
      }
      
      throw new Error(errorMessage);
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

  async devLogin(email: string, password: string): Promise<AuthResponse> {
    console.log('🔧 Using development login for:', email);
    return this.request<AuthResponse>('/api/v1/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getCurrentUser(accessToken?: string): Promise<User> {
    if (accessToken) {
      // Use provided token directly
      return this.requestWithToken<User>('/api/v1/auth/me', accessToken);
    }
    
    // Use the standard request method which will get token from localStorage
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
      let result: any;
      if (accessToken) {
        result = await this.requestWithToken<any>('/api/v1/organizations/', accessToken);
      } else {
        result = await this.request<any>('/api/v1/organizations/');
      }
      
      // Handle multitenant format: array of {role, organization} objects
      if (Array.isArray(result) && result.length > 0 && result[0].organization) {
        return result.map((item: any) => ({
          ...item.organization,
          id: item.organization.organization_id, // Add id alias for compatibility
        }));
      }
      
      // Handle direct organization array format
      if (Array.isArray(result)) {
        return result.map((org: any) => ({
          ...org,
          id: org.organization_id || org.id, // Add id alias for compatibility
        }));
      }
      
      return [];
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

  // Organization Settings methods
  /**
   * Get organization settings with onboarding status.
   * 🛡️ SECURITY: Multi-tenant secure - user must belong to organization.
   */
  async getOrganizationSettings(organizationId: string): Promise<OrganizationSettings> {
    return this.request<OrganizationSettings>(`/api/v1/organizations/${organizationId}/settings`);
  }

  /**
   * Update organization settings and automatically mark onboarding as completed.
   * 🛡️ SECURITY: Multi-tenant secure - user must belong to organization.
   */
  async updateOrganizationSettings(
    organizationId: string,
    settings: OrganizationSettingsUpdate
  ): Promise<OrganizationSettings> {
    return this.request<OrganizationSettings>(`/api/v1/organizations/${organizationId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  /**
   * Mark organization onboarding as completed.
   * 🛡️ SECURITY: Multi-tenant secure - user must belong to organization.
   */
  async completeOrganizationOnboarding(organizationId: string): Promise<{ message: string; success: boolean }> {
    return this.request<{ message: string; success: boolean }>(
      `/api/v1/organizations/${organizationId}/settings/complete-onboarding`,
      {
        method: 'POST',
      }
    );
  }
}

export const api = new ApiClient(API_BASE_URL);