const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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

  // Menu Items API
  async getMenuItems(): Promise<MenuItem[]> {
    return this.get<MenuItem[]>('/api/v1/menu-items');
  }

  async createMenuItem(data: MenuItemCreate): Promise<MenuItem> {
    return this.post<MenuItem>('/api/v1/menu-items', data);
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
}

export const apiClient = new ApiClient();
export { ApiClient, type MenuItem, type MenuItemCreate };