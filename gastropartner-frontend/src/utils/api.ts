const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// Swedish VAT rates as per Skatteverket
export enum SwedishVATRate {
  STANDARD = '25',      // 25% - Standard rate (dine-in, alcohol, etc.)
  FOOD_REDUCED = '12',  // 12% - Food takeaway, groceries
  CULTURAL = '6',       // 6% - Books, newspapers, cultural activities
  ZERO = '0'            // 0% - Exports, some medical services
}

export enum VATCalculationType {
  INCLUSIVE = 'inclusive',  // Price includes VAT (Swedish default for B2C)
  EXCLUSIVE = 'exclusive'   // Price excludes VAT (B2B transactions)
}

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
  vat_rate: SwedishVATRate;
  vat_calculation_type: VATCalculationType;
  vat_amount?: number;
  price_excluding_vat?: number;
  price_including_vat?: number;
}

interface MenuItemCreate {
  name: string;
  description?: string;
  category: string;
  selling_price: number;
  target_food_cost_percentage: number;
  recipe_id?: string;
  vat_rate?: SwedishVATRate;
  vat_calculation_type?: VATCalculationType;
}

// Sales interfaces
interface Sale {
  sale_id: string;
  organization_id: string;
  creator_id: string;
  sale_date: string;
  total_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface SaleCreate {
  sale_date: string;
  total_amount: number;
  notes?: string;
}

interface SaleUpdate {
  sale_date?: string;
  total_amount?: number;
  notes?: string;
}

interface SaleItem {
  sale_item_id: string;
  sale_id: string;
  product_type: 'recipe' | 'menu_item';
  product_id: string;
  product_name: string;
  quantity_sold: number;
  unit_price: number;
  total_price: number;
  vat_rate: SwedishVATRate;
  vat_amount: number;
  created_at: string;
  updated_at: string;
}

interface SaleItemCreate {
  product_type: 'recipe' | 'menu_item';
  product_id: string;
  quantity_sold: number;
  unit_price: number;
  total_price: number;
  vat_rate: SwedishVATRate;
  vat_amount: number;
}

// Reports interfaces
interface ProfitabilityReport {
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_cost: number;
  profit: number;
  profit_margin_percentage: number;
  total_sales_count: number;
  average_sale_value: number;
}

interface ProductProfitability {
  product_id: string;
  product_name: string;
  product_type: 'recipe' | 'menu_item';
  units_sold: number;
  revenue: number;
  estimated_cost: number;
  profit: number;
  profit_margin_percentage: number;
}

interface SalesReport {
  period_start: string;
  period_end: string;
  total_sales: number;
  total_revenue: number;
  daily_breakdown: {
    date: string;
    sales: number;
    revenue: number;
  }[];
  product_breakdown: ProductProfitability[];
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
  // ===== MODULES & PAGES =====
  show_ingredients: boolean;
  show_recipes: boolean;
  show_menu_items: boolean;
  show_sales: boolean;
  show_inventory: boolean;
  show_reports: boolean;
  show_analytics: boolean;
  show_suppliers: boolean;
  
  // Recipe-specific features
  show_recipe_prep_time: boolean;
  show_recipe_cook_time: boolean;
  show_recipe_instructions: boolean;
  show_recipe_notes: boolean;
  
  // ===== UI COMPONENTS =====
  enable_dark_mode: boolean;
  enable_mobile_app_banner: boolean;
  enable_quick_actions: boolean;
  enable_dashboard_widgets: boolean;
  enable_advanced_search: boolean;
  enable_data_export: boolean;
  enable_bulk_operations: boolean;
  
  // Settings page sections
  enable_notifications_section: boolean;
  enable_advanced_settings_section: boolean;
  enable_account_management_section: boolean;
  enable_company_profile_section: boolean;
  enable_business_settings_section: boolean;
  enable_settings_header: boolean;
  enable_settings_footer: boolean;
  
  // ===== SYSTEM FEATURES =====
  enable_api_access: boolean;
  enable_webhooks: boolean;
  enable_email_notifications: boolean;
  enable_sms_notifications: boolean;
  enable_push_notifications: boolean;
  enable_multi_language: boolean;
  enable_offline_mode: boolean;
  
  // ===== LIMITS & QUOTAS =====
  max_ingredients_limit: number;
  max_recipes_limit: number;
  max_menu_items_limit: number;
  max_users_per_org: number;
  api_rate_limit: number;
  storage_quota_mb: number;
  
  // ===== BETA FEATURES =====
  enable_ai_suggestions: boolean;
  enable_predictive_analytics: boolean;
  enable_voice_commands: boolean;
  enable_automated_ordering: boolean;
  enable_advanced_pricing: boolean;
  enable_customer_portal: boolean;
  
  // ===== INTEGRATIONS =====
  enable_pos_integration: boolean;
  enable_accounting_sync: boolean;
  enable_delivery_platforms: boolean;
  enable_payment_processing: boolean;
  enable_loyalty_programs: boolean;
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

// Task Management Types
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';

export interface Task {
  task_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  tags?: string[];
  assigned_to?: string;
  created_by: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  tags?: string[];
  assigned_to?: string;
  due_date?: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  tags?: string[];
  assigned_to?: string;
  due_date?: string;
}

export interface TaskStats {
  total_tasks: number;
  incomplete_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
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
    const token = localStorage.getItem('auth_token');
    
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

  async patch<T>(endpoint: string, data: any): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
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

  // Sales API
  async getSales(): Promise<Sale[]> {
    return this.get<Sale[]>('/api/v1/sales/');
  }

  async createSale(saleData: SaleCreate, saleItems: SaleItemCreate[]): Promise<Sale> {
    // Backend API expects sale_data and sale_items as combined payload
    const payload = {
      ...saleData,
      sale_items: saleItems
    };
    return this.post<Sale>('/api/v1/sales/', payload);
  }

  async getSale(id: string): Promise<Sale> {
    return this.get<Sale>(`/api/v1/sales/${id}`);
  }

  async updateSale(id: string, data: SaleUpdate): Promise<Sale> {
    return this.put<Sale>(`/api/v1/sales/${id}`, data);
  }

  async deleteSale(id: string): Promise<{ message: string; success: boolean }> {
    return this.delete(`/api/v1/sales/${id}`);
  }

  async getSaleItems(saleId: string): Promise<SaleItem[]> {
    return this.get<SaleItem[]>(`/api/v1/sales/${saleId}/items`);
  }

  // Reports API
  async getProfitabilityReport(startDate: string, endDate: string): Promise<ProfitabilityReport> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    return this.get<ProfitabilityReport>(`/api/v1/reports/profitability?${params}`);
  }

  async getSalesReport(startDate: string, endDate: string): Promise<SalesReport> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    return this.get<SalesReport>(`/api/v1/reports/sales?${params}`);
  }

  async getProductProfitability(startDate: string, endDate: string, limit?: number): Promise<ProductProfitability[]> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    if (limit) {
      params.append('limit', limit.toString());
    }
    return this.get<ProductProfitability[]>(`/api/v1/reports/product-profitability?${params}`);
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


  // User Auth API
  async getCurrentUser(token?: string): Promise<User> {
    return this.get<User>('/api/v1/auth/me');
  }

  // Authentication API methods
  async login(email: string, password: string): Promise<{
    access_token: string;
    refresh_token: string; 
    user: User;
    expires_in: number;
  }> {
    return this.post<{
      access_token: string;
      refresh_token: string;
      user: User;
      expires_in: number;
    }>('/api/v1/auth/login', { email, password });
  }

  async register(email: string, password: string, full_name: string): Promise<{
    message: string;
    success: boolean;
  }> {
    return this.post<{
      message: string;
      success: boolean;
    }>('/api/v1/auth/register', { email, password, full_name });
  }

  async refreshToken(refresh_token: string): Promise<{
    access_token: string;
    refresh_token: string;
    user?: User;
    expires_in: number;
  }> {
    return this.post<{
      access_token: string;
      refresh_token: string;
      user?: User;
      expires_in: number;
    }>('/api/v1/auth/refresh', { refresh_token });
  }

  async logout(): Promise<{
    message: string;
    success: boolean;
  }> {
    return this.post<{
      message: string;
      success: boolean;
    }>('/api/v1/auth/logout', {});
  }

  // Legacy development login method for backward compatibility
  async devLogin(email: string, password?: string): Promise<{
    access_token: string;
    refresh_token: string;
    user: User;
    expires_in: number;
  }> {
    // Use standard login endpoint for dev login
    return this.login(email, password || 'devpassword123');
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

  // Task Management API
  async getTasks(params?: { status?: string; priority?: string; category?: string; assigned_to?: string; due_before?: string; incomplete_only?: boolean }): Promise<Task[]> {
    let endpoint = '/api/v1/tasks/';
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      });
    }
    
    const queryString = searchParams.toString();
    if (queryString) {
      endpoint += '?' + queryString;
    }
    
    return this.get<Task[]>(endpoint);
  }

  async getIncompleteTasks(): Promise<Task[]> {
    return this.get<Task[]>('/api/v1/tasks/incomplete');
  }

  async getTask(id: string): Promise<Task> {
    return this.get<Task>(`/api/v1/tasks/${id}`);
  }

  async createTask(data: TaskCreate): Promise<Task> {
    return this.post<Task>('/api/v1/tasks/', data);
  }

  async updateTask(id: string, data: TaskUpdate): Promise<Task> {
    return this.put<Task>(`/api/v1/tasks/${id}`, data);
  }

  async deleteTask(id: string): Promise<void> {
    return this.delete(`/api/v1/tasks/${id}`);
  }

  async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    return this.patch<Task>(`/api/v1/tasks/${id}/status?status=${status}`, {});
  }

  async getTaskStats(): Promise<TaskStats> {
    return this.get<TaskStats>('/api/v1/tasks/stats/summary');
  }
}

export const apiClient = new ApiClient();
export const api = apiClient; // Backward compatibility alias
export { 
  ApiClient, 
  type MenuItem, 
  type MenuItemCreate, 
  type Sale,
  type SaleCreate,
  type SaleUpdate,
  type SaleItem,
  type SaleItemCreate,
  type ProfitabilityReport,
  type ProductProfitability,
  type SalesReport,
  type Ingredient, 
  type IngredientCreate,
  type IngredientUpdate,
  type Recipe,
  type RecipeCreate,
  type RecipeIngredient,
  type RecipeIngredientCreate,
  type FeatureFlags,
};