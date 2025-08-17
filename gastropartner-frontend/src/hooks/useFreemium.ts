import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../utils/api';

interface UsageData {
  current: number;
  limit: number;
  percentage: number;
  at_limit: boolean;
}

interface FreemiumUsage {
  organization_id: string;
  plan: string;
  usage: {
    ingredients: UsageData;
    recipes: UsageData;
    menu_items: UsageData;
  };
  upgrade_needed: boolean;
  upgrade_prompts: Record<string, string>;
}

interface UsageLimitsCheck {
  current_ingredients: number;
  max_ingredients: number;
  current_recipes: number;
  max_recipes: number;
  current_menu_items: number;
  max_menu_items: number;
  can_add_ingredient: boolean;
  can_add_recipe: boolean;
  can_add_menu_item: boolean;
  upgrade_needed: boolean;
}

interface PlanComparison {
  current_plan: string;
  plans: {
    free: {
      price: number;
      currency: string;
      billing_period: string;
      features: Record<string, any>;
    };
    enterprise: {
      price: number;
      currency: string;
      billing_period: string;
      features: Record<string, any>;
      upgrade_benefits: string[];
    };
  };
  upgrade_url: string;
  trial_available: boolean;
}

export const useFreemium = () => {
  const [usage, setUsage] = useState<FreemiumUsage | null>(null);
  const [limits, setLimits] = useState<UsageLimitsCheck | null>(null);
  const [planComparison, setPlanComparison] = useState<PlanComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get<FreemiumUsage>('/api/v1/freemium/usage');
      setUsage(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch usage data');
      console.error('Error fetching freemium usage:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLimits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get<UsageLimitsCheck>('/api/v1/freemium/limits');
      setLimits(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch limits data');
      console.error('Error fetching freemium limits:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlanComparison = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get<PlanComparison>('/api/v1/freemium/plan-comparison');
      setPlanComparison(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch plan comparison');
      console.error('Error fetching plan comparison:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const canAddIngredient = (): boolean => {
    return limits?.can_add_ingredient ?? false;
  };

  const canAddRecipe = (): boolean => {
    return limits?.can_add_recipe ?? false;
  };

  const canAddMenuItem = (): boolean => {
    return limits?.can_add_menu_item ?? false;
  };

  const isUpgradeNeeded = (): boolean => {
    return limits?.upgrade_needed ?? usage?.upgrade_needed ?? false;
  };

  const getUsagePercentage = (type: 'ingredients' | 'recipes' | 'menu_items'): number => {
    if (usage) {
      return usage.usage[type].percentage;
    }
    
    if (limits) {
      const current = limits[`current_${type}` as keyof UsageLimitsCheck] as number;
      const max = limits[`max_${type}` as keyof UsageLimitsCheck] as number;
      return max > 0 ? (current / max) * 100 : 0;
    }
    
    return 0;
  };

  const isNearLimit = (type: 'ingredients' | 'recipes' | 'menu_items', threshold = 80): boolean => {
    return getUsagePercentage(type) >= threshold;
  };

  const isAtLimit = (type: 'ingredients' | 'recipes' | 'menu_items'): boolean => {
    if (usage) {
      return usage.usage[type].at_limit;
    }
    
    if (limits) {
      const current = limits[`current_${type}` as keyof UsageLimitsCheck] as number;
      const max = limits[`max_${type}` as keyof UsageLimitsCheck] as number;
      return current >= max;
    }
    
    return false;
  };

  const refresh = useCallback(async () => {
    await Promise.all([fetchUsage(), fetchLimits()]);
  }, [fetchUsage, fetchLimits]);

  // Auto-fetch on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    usage,
    limits,
    planComparison,
    loading,
    error,
    
    // Actions
    fetchUsage,
    fetchLimits,
    fetchPlanComparison,
    refresh,
    
    // Utility functions
    canAddIngredient,
    canAddRecipe,
    canAddMenuItem,
    isUpgradeNeeded,
    getUsagePercentage,
    isNearLimit,
    isAtLimit,
  };
};

export type { FreemiumUsage, UsageLimitsCheck, PlanComparison, UsageData };