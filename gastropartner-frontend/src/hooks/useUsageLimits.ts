import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ModuleName, ModuleTier } from './useFreemiumService';
import { supabase } from '../lib/supabase';

interface UsageLimits {
  ingredients: { free: number; pro: number; unit: string };
  recipes: { free: number; pro: number; unit: string };
  menu: { free: number; pro: number; unit: string };
  analytics: { free: number; pro: number; unit: string };
  user_testing: { free: number; pro: number; unit: string };
  super_admin: { free: number; pro: number; unit: string };
  sales: { free: number; pro: number; unit: string };
  advanced_analytics: { free: number; pro: number; unit: string };
  mobile_app: { free: number; pro: number; unit: string };
  integrations: { free: number; pro: number; unit: string };
}

interface UsageData {
  [key: string]: {
    used: number;
    limit: number;
    unit: string;
    nearLimit: boolean; // 80% or more
    atLimit: boolean; // 100% or more
    tier: ModuleTier | null;
  };
}

const USAGE_LIMITS: UsageLimits = {
  ingredients: { free: 100, pro: -1, unit: 'ingredienser' }, // -1 means unlimited
  recipes: { free: 5, pro: -1, unit: 'recept' },
  menu: { free: 10, pro: -1, unit: 'maträtter' },
  analytics: { free: 1, pro: -1, unit: 'rapporter/månad' },
  user_testing: { free: 5, pro: -1, unit: 'feedback/månad' },
  super_admin: { free: 1, pro: -1, unit: 'admin användare' },
  sales: { free: 10, pro: -1, unit: 'kunder' },
  advanced_analytics: { free: 1, pro: -1, unit: 'AI-rapporter/månad' },
  mobile_app: { free: 1, pro: -1, unit: 'enheter' },
  integrations: { free: 1, pro: -1, unit: 'integrationer' }
};

export function useUsageLimits() {
  const { currentOrganization } = useAuth();
  const [usageData, setUsageData] = useState<UsageData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsageData = useCallback(async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch current usage for each module
      const usagePromises = Object.keys(USAGE_LIMITS).map(async (moduleName) => {
        const module = moduleName as ModuleName;
        
        // Get current subscription tier
        const { data: subscription } = await supabase
          .from('module_subscriptions')
          .select('tier')
          .eq('organization_id', currentOrganization.id)
          .eq('module_name', module)
          .eq('active', true)
          .single();

        const tier: ModuleTier = subscription?.tier || 'free';
        const limits = USAGE_LIMITS[module];
        const limit = tier === 'pro' ? limits.pro : limits.free;

        // Fetch actual usage based on module type
        let used = 0;
        
        switch (module) {
          case 'ingredients':
            const { data: ingredients, error: ingredientsError } = await supabase
              .from('ingredients')
              .select('id', { count: 'exact' })
              .eq('organization_id', currentOrganization.id);
            
            if (!ingredientsError && ingredients) {
              used = ingredients.length;
            }
            break;

          case 'recipes':
            const { data: recipes, error: recipesError } = await supabase
              .from('recipes')
              .select('id', { count: 'exact' })
              .eq('organization_id', currentOrganization.id);
            
            if (!recipesError && recipes) {
              used = recipes.length;
            }
            break;

          case 'menu':
            const { data: menuItems, error: menuError } = await supabase
              .from('menu_items')
              .select('id', { count: 'exact' })
              .eq('organization_id', currentOrganization.id);
            
            if (!menuError && menuItems) {
              used = menuItems.length;
            }
            break;

          case 'user_testing':
            // Count feedback submissions this month
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { data: feedback, error: feedbackError } = await supabase
              .from('user_feedback')
              .select('id', { count: 'exact' })
              .eq('organization_id', currentOrganization.id)
              .gte('created_at', startOfMonth.toISOString());
            
            if (!feedbackError && feedback) {
              used = feedback.length;
            }
            break;

          case 'analytics':
            // Count report generations this month  
            const startOfMonthAnalytics = new Date();
            startOfMonthAnalytics.setDate(1);
            startOfMonthAnalytics.setHours(0, 0, 0, 0);
            
            const { data: reports, error: reportsError } = await supabase
              .from('analytics_reports')
              .select('id', { count: 'exact' })
              .eq('organization_id', currentOrganization.id)
              .gte('created_at', startOfMonthAnalytics.toISOString());
            
            if (!reportsError && reports) {
              used = reports.length;
            }
            break;

          case 'super_admin':
            // Count admin users
            const { data: adminUsers, error: adminError } = await supabase
              .from('organization_users')
              .select('id', { count: 'exact' })
              .eq('organization_id', currentOrganization.id)
              .eq('role', 'admin');
            
            if (!adminError && adminUsers) {
              used = adminUsers.length;
            }
            break;

          // Coming soon modules - default to 0 usage
          case 'sales':
          case 'advanced_analytics':
          case 'mobile_app':
          case 'integrations':
            used = 0;
            break;

          default:
            used = 0;
        }

        const nearLimit = limit > 0 && (used / limit) >= 0.8;
        const atLimit = limit > 0 && used >= limit;

        return {
          [module]: {
            used,
            limit: limit === -1 ? Infinity : limit,
            unit: limits.unit,
            nearLimit,
            atLimit,
            tier
          }
        };
      });

      const usageResults = await Promise.all(usagePromises);
      const combinedUsage = usageResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      
      setUsageData(combinedUsage);
    } catch (err) {
      console.error('Error fetching usage data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch usage data');
    } finally {
      setLoading(false);
    }
  }, [currentOrganization]);

  // Auto-refresh usage data when organization changes
  useEffect(() => {
    fetchUsageData();
  }, [fetchUsageData]);

  const checkUsageLimit = useCallback((moduleName: ModuleName): boolean => {
    const usage = usageData[moduleName];
    if (!usage) return false;
    return usage.atLimit;
  }, [usageData]);

  const isNearLimit = useCallback((moduleName: ModuleName): boolean => {
    const usage = usageData[moduleName];
    if (!usage) return false;
    return usage.nearLimit;
  }, [usageData]);

  const getUsagePercentage = useCallback((moduleName: ModuleName): number => {
    const usage = usageData[moduleName];
    if (!usage || usage.limit === Infinity) return 0;
    return Math.min((usage.used / usage.limit) * 100, 100);
  }, [usageData]);

  const getRemainingUsage = useCallback((moduleName: ModuleName): number => {
    const usage = usageData[moduleName];
    if (!usage || usage.limit === Infinity) return Infinity;
    return Math.max(usage.limit - usage.used, 0);
  }, [usageData]);

  const shouldShowUpgradePrompt = useCallback((moduleName: ModuleName): boolean => {
    const usage = usageData[moduleName];
    if (!usage) return false;
    return usage.tier === 'free' && usage.atLimit;
  }, [usageData]);

  return {
    usageData,
    loading,
    error,
    refreshUsage: fetchUsageData,
    checkUsageLimit,
    isNearLimit,
    getUsagePercentage,
    getRemainingUsage,
    shouldShowUpgradePrompt
  };
}

export default useUsageLimits;