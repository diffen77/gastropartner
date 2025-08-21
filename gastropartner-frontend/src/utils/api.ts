const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

interface MenuItem {
  menu_item_id: string;
  name: string;
  description?: string;
  category: string;
  selling_price: number;
  target_food_cost_percentage: number;
  food_cost?: number;
  food_cost_percentage?: number;
  margin?: number;
  margin_percentage?: number;
  recipe_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MenuItemCreate {
  name: string;
  description?: string;
  category: string;
  selling_price: number;
  target_food_cost_percentage: number;
  recipe_id?: string;
}

interface Ingredient {
  ingredient_id: string;
  name: string;
  category: string;
  unit: string;
  cost_per_unit: number;
  supplier?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface IngredientCreate {
  name: string;
  category: string;
  unit: string;
  cost_per_unit: number;
  supplier?: string;
  notes?: string;
}

interface IngredientUpdate {
  name?: string;
  category?: string;
  unit?: string;
  cost_per_unit?: number;
  supplier?: string;
  notes?: string;
  is_active?: boolean;
}

interface RecipeIngredient {
  recipe_ingredient_id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  notes?: string;
  ingredient?: Ingredient;
}

interface RecipeIngredientCreate {
  ingredient_id: string;
  quantity: number;
  unit: string;
  notes?: string;
}

interface Recipe {
  recipe_id: string;
  name: string;
  description?: string;
  servings: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  instructions?: string;
  notes?: string;
  ingredients?: RecipeIngredient[];
  total_cost?: number;
  cost_per_serving?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FeatureFlags {
  flags_id: string;
  agency_id: string;
  show_recipe_prep_time: boolean;
  show_recipe_cook_time: boolean;
  show_recipe_instructions: boolean;
  show_recipe_notes: boolean;
  created_at: string;
  updated_at: string;
}

interface RecipeCreate {
  name: string;
  description?: string;
  servings: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  instructions?: string;
  notes?: string;
  ingredients?: RecipeIngredientCreate[];
}

// User Testing interfaces
interface UserFeedback {
  feedback_id: string;
  user_id: string;
  organization_id: string;
  feedback_type: 'bug' | 'feature_request' | 'general' | 'usability' | 'satisfaction';
  title: string;
  description: string;
  rating?: number;
  page_url?: string;
  user_agent?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

interface UserFeedbackCreate {
  feedback_type: 'bug' | 'feature_request' | 'general' | 'usability' | 'satisfaction';
  title: string;
  description: string;
  rating?: number;
  page_url?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface UserTestingMetrics {
  total_users: number;
  active_users_today: number;
  active_users_week: number;
  active_users_month: number;
  avg_session_duration_minutes: number;
  total_feedback_items: number;
  unresolved_feedback: number;
  onboarding_completion_rate: number;
  avg_onboarding_time_minutes: number;
  most_used_features: Array<{ feature: string; count: number }>;
  conversion_rate: number;
}

interface UserAnalyticsEvent {
  event_type: string;
  event_name: string;
  page_url?: string;
  element_id?: string;
  element_text?: string;
  session_id?: string;
  properties?: Record<string, any>;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  updated_at?: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
}

export interface Organization {
  organization_id: string;
  id?: string; // Alias for organization_id
  name: string;
  slug?: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at?: string;
  max_ingredients: number;
  max_recipes: number;
  max_menu_items: number;
  current_ingredients: number;
  current_recipes: number;
  current_menu_items: number;
}

export interface OrganizationCreate {
  name: string;
  description?: string;
}

export interface OrganizationUpdate {
  name?: string;
  description?: string;
}

// Organization Settings interfaces for consistency with supabase.ts
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

export interface OrganizationSettingsUpdate {
  restaurant_profile?: RestaurantProfile;
  business_settings?: BusinessSettingsUpdate;
  notification_preferences?: NotificationPreferences;
  has_completed_onboarding?: boolean;
}

// Module Settings interfaces
export interface ModuleSettings {
  id: string;
  organization_id: string;
  module_id: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModuleConfig {
  id: string;
  name: string;
  display_name: string;
  description: string;
  enabled: boolean;
}

export interface ModuleUpdateRequest {
  enabled: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    // For now, we'll implement a simple token-based auth
    // In the future, this should get the token from AuthContext
    let token = localStorage.getItem('auth_token');
    
    // Development fallback: use development token if no auth token exists
    if (!token && process.env.NODE_ENV === 'development') {
      token = 'dev_token_lediff_gmail_com';
    }
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  async get<T>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers,
    });
    
    if (!response.ok) {
      if (response.status === 402) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Freemium limit reached');
      }
      throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      if (response.status === 402) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Freemium limit reached');
      }
      throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  }

  async delete<T>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  }

  // Menu Items API
  async getMenuItems(): Promise<MenuItem[]> {
    return this.get<MenuItem[]>('/api/v1/menu-items');
  }

  async createMenuItem(data: MenuItemCreate): Promise<MenuItem> {
    return this.post<MenuItem>('/api/v1/menu-items/', data);
  }

  async getMenuItem(id: string): Promise<MenuItem> {
    return this.get<MenuItem>(`/api/v1/menu-items/${id}`);
  }

  async updateMenuItem(id: string, data: Partial<MenuItemCreate>): Promise<MenuItem> {
    return this.put<MenuItem>(`/api/v1/menu-items/${id}`, data);
  }

  async deleteMenuItem(id: string): Promise<{ message: string; success: boolean }> {
    return this.delete(`/api/v1/menu-items/${id}`);
  }

  // Ingredients API
  async getIngredients(): Promise<Ingredient[]> {
    return this.get<Ingredient[]>('/api/v1/ingredients/');
  }

  async createIngredient(data: IngredientCreate): Promise<Ingredient> {
    return this.post<Ingredient>('/api/v1/ingredients/', data);
  }

  async getIngredient(id: string): Promise<Ingredient> {
    return this.get<Ingredient>(`/api/v1/ingredients/${id}`);
  }

  async updateIngredient(id: string, data: Partial<IngredientCreate>): Promise<Ingredient> {
    return this.put<Ingredient>(`/api/v1/ingredients/${id}`, data);
  }

  async deleteIngredient(id: string): Promise<{ message: string; success: boolean }> {
    return this.delete(`/api/v1/ingredients/${id}`);
  }

  async getIngredientCategories(): Promise<string[]> {
    return this.get<string[]>('/api/v1/ingredients/categories');
  }

  // Recipes API
  async getRecipes(): Promise<Recipe[]> {
    return this.get<Recipe[]>('/api/v1/recipes/');
  }

  async createRecipe(data: RecipeCreate): Promise<Recipe> {
    return this.post<Recipe>('/api/v1/recipes/', data);
  }

  async getRecipe(id: string): Promise<Recipe> {
    return this.get<Recipe>(`/api/v1/recipes/${id}`);
  }

  async updateRecipe(id: string, data: Partial<RecipeCreate>): Promise<Recipe> {
    return this.put<Recipe>(`/api/v1/recipes/${id}`, data);
  }

  async deleteRecipe(id: string): Promise<{ message: string; success: boolean }> {
    return this.delete(`/api/v1/recipes/${id}`);
  }

  async getRecipeCostAnalysis(id: string, servings?: number): Promise<any> {
    const params = servings ? `?servings=${servings}` : '';
    return this.get(`/api/v1/recipes/${id}/cost-analysis${params}`);
  }

  // User Testing API
  async createFeedback(data: UserFeedbackCreate): Promise<UserFeedback> {
    return this.post<UserFeedback>('/api/v1/user-testing/feedback', data);
  }

  async getFeedback(statusFilter?: string, feedbackType?: string): Promise<UserFeedback[]> {
    let endpoint = '/api/v1/user-testing/feedback';
    const params = new URLSearchParams();
    
    if (statusFilter) params.append('status_filter', statusFilter);
    if (feedbackType) params.append('feedback_type', feedbackType);
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    return this.get<UserFeedback[]>(endpoint);
  }

  async getUserTestingMetrics(days: number = 30): Promise<UserTestingMetrics> {
    return this.get<UserTestingMetrics>(`/api/v1/user-testing/analytics/metrics?days=${days}`);
  }

  async trackAnalyticsEvent(data: UserAnalyticsEvent): Promise<{ status: string }> {
    return this.post<{ status: string }>('/api/v1/user-testing/analytics/event', data);
  }

  // Feature Flags
  async getFeatureFlags(): Promise<FeatureFlags> {
    return this.get<FeatureFlags>('/api/v1/feature-flags/');
  }

  // Organizations API
  async getOrganizations(token?: string): Promise<Organization[]> {
    return this.get<Organization[]>('/api/v1/organizations/');
  }

  async createOrganization(data: OrganizationCreate): Promise<Organization> {
    return this.post<Organization>('/api/v1/organizations/', data);
  }

  async getOrganization(id: string): Promise<Organization> {
    return this.get<Organization>(`/api/v1/organizations/${id}`);
  }

  async updateOrganization(id: string, data: OrganizationUpdate): Promise<Organization> {
    return this.put<Organization>(`/api/v1/organizations/${id}`, data);
  }

  async deleteOrganization(id: string): Promise<{ message: string; success: boolean }> {
    return this.delete(`/api/v1/organizations/${id}`);
  }

  async getOrganizationUsage(id: string): Promise<any> {
    return this.get(`/api/v1/organizations/${id}/usage`);
  }

  // Organization Settings API
  /**
   * Get organization settings with onboarding status.
   * 🛡️ SECURITY: Multi-tenant secure - user must belong to organization.
   */
  async getOrganizationSettings(id: string): Promise<OrganizationSettings> {
    return this.get<OrganizationSettings>(`/api/v1/organizations/${id}/settings`);
  }

  /**
   * Update organization settings and automatically mark onboarding as completed.
   * 🛡️ SECURITY: Multi-tenant secure - user must belong to organization.
   */
  async updateOrganizationSettings(id: string, settings: OrganizationSettingsUpdate): Promise<OrganizationSettings> {
    return this.put<OrganizationSettings>(`/api/v1/organizations/${id}/settings`, settings);
  }

  /**
   * Mark organization onboarding as completed.
   * 🛡️ SECURITY: Multi-tenant secure - user must belong to organization.
   */
  async completeOrganizationOnboarding(id: string): Promise<{ message: string; success: boolean }> {
    return this.post<{ message: string; success: boolean }>(`/api/v1/organizations/${id}/settings/complete-onboarding`, {});
  }

  // User Auth API
  async getCurrentUser(token?: string): Promise<User> {
    return this.get<User>('/api/v1/auth/me');
  }

  // Module Settings API
  async getModuleSettings(): Promise<ModuleSettings[]> {
    return this.get<ModuleSettings[]>('/api/v1/modules/settings');
  }

  async updateModuleStatus(moduleId: string, enabled: boolean): Promise<{ success: boolean; message: string; enabled: boolean }> {
    return this.put<{ success: boolean; message: string; enabled: boolean }>(`/api/v1/modules/settings/${moduleId}`, { enabled });
  }

  async getModuleEnabledStatus(moduleId: string): Promise<{ enabled: boolean }> {
    return this.get<{ enabled: boolean }>(`/api/v1/modules/settings/${moduleId}/enabled`);
  }
}

export const apiClient = new ApiClient();
export { 
  ApiClient, 
  type MenuItem, 
  type MenuItemCreate, 
  type Ingredient, 
  type IngredientCreate,
  type IngredientUpdate,
  type Recipe,
  type RecipeCreate,
  type RecipeIngredient,
  type RecipeIngredientCreate,
  type FeatureFlags,
  type UserFeedback,
  type UserFeedbackCreate,
  type UserTestingMetrics,
  type UserAnalyticsEvent
};