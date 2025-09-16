import { apiClient } from './api';

export type ModuleTier = 'free' | 'pro';
export type ModuleName = 'ingredients' | 'recipes' | 'menu' | 'analytics' | 'sales' | 'advanced_analytics' | 'mobile_app' | 'integrations';

export interface ModuleSubscription {
  id: string;
  module_name: ModuleName;
  tier: ModuleTier;
  organization_id: string;
  user_id: string;
  active: boolean;
  price: number;
  currency: string;
  activated_at: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ModuleActivationRequest {
  module_name: ModuleName;
  tier: ModuleTier;
}

export interface ModuleStatus {
  tier: ModuleTier | null;
  active: boolean;
  expires_at?: string;
  price: number;
}

/**
 * 🔒 SECURE API: Get active module subscriptions for the current organization.
 * Uses backend API which enforces multi-tenant data isolation.
 */
export async function getModuleSubscriptions(): Promise<ModuleSubscription[]> {
  const response = await apiClient.get<ModuleSubscription[]>('/api/v1/modules/subscriptions');
  return response;
}

/**
 * 🔒 SECURE API: Activate a module subscription for the current organization.
 * Uses backend API which enforces multi-tenant data isolation.
 */
export async function activateModule(moduleName: ModuleName, tier: ModuleTier): Promise<{ success: boolean; message: string; subscription?: any }> {
  const response = await apiClient.post<{ success: boolean; message: string; subscription?: any }>('/api/v1/modules/subscriptions/activate', {
    module_name: moduleName,
    tier: tier
  });
  return response;
}

/**
 * 🔒 SECURE API: Deactivate a module subscription for the current organization.
 * Uses backend API which enforces multi-tenant data isolation.
 */
export async function deactivateModule(moduleName: ModuleName): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(`/api/v1/modules/subscriptions/${moduleName}/deactivate`, {});
  return response;
}

/**
 * 🔒 SECURE API: Get status of a specific module for the current organization.
 * Uses backend API which enforces multi-tenant data isolation.
 */
export async function getModuleStatus(moduleName: ModuleName): Promise<ModuleStatus> {
  const response = await apiClient.get<ModuleStatus>(`/api/v1/modules/subscriptions/${moduleName}/status`);
  return response;
}

// NEW: Module availability interfaces and functions
export interface ModuleAvailability {
  organization_id: string;
  available_modules: {
    id: ModuleName;
    name: string;
    available: boolean;
  }[];
  total_available: number;
  message: string;
}

export interface ModuleAvailabilityCheck {
  module_id: ModuleName;
  module_name: string;
  organization_id: string;
  available: boolean;
  message: string;
}

/**
 * 🔒 SECURE API: Get modules available for the current organization.
 * Only shows modules that SuperAdmin has made available.
 */
export async function getAvailableModules(): Promise<ModuleAvailability> {
  const response = await apiClient.get<ModuleAvailability>('/api/v1/modules/availability');
  return response;
}

/**
 * 🔒 SECURE API: Check if a specific module is available for the current organization.
 */
export async function checkModuleAvailability(moduleId: ModuleName): Promise<ModuleAvailabilityCheck> {
  const response = await apiClient.get<ModuleAvailabilityCheck>(`/api/v1/modules/availability/${moduleId}`);
  return response;
}