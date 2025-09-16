import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as modulesApi from '../utils/modulesApi';

export type ModuleTier = modulesApi.ModuleTier;
export type ModuleName = modulesApi.ModuleName;
export type ModuleSubscription = modulesApi.ModuleSubscription;
export type ModuleAvailability = modulesApi.ModuleAvailability;

export interface UseFreemiumServiceReturn {
  subscriptions: ModuleSubscription[];
  availableModules: ModuleAvailability | null;
  loading: boolean;
  error: string | null;
  activateModule: (moduleName: ModuleName, tier: ModuleTier) => Promise<boolean>;
  deactivateModule: (moduleName: ModuleName) => Promise<boolean>;
  getModuleStatus: (moduleName: ModuleName) => { tier: ModuleTier | null; active: boolean };
  isModuleAvailable: (moduleName: ModuleName) => boolean;
  refreshSubscriptions: () => Promise<void>;
}

export function useFreemiumService(): UseFreemiumServiceReturn {
  const { user, currentOrganization } = useAuth();
  const [subscriptions, setSubscriptions] = useState<ModuleSubscription[]>([]);
  const [availableModules, setAvailableModules] = useState<ModuleAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSubscriptions = useCallback(async () => {
    console.log('🔄 refreshSubscriptions called with org:', currentOrganization?.organization_id);
    
    if (!currentOrganization?.organization_id) {
      console.warn('⚠️ No organization ID available, currentOrganization:', currentOrganization);
      setLoading(false);
      setSubscriptions([]); // Clear subscriptions when no organization
      setAvailableModules(null); // Clear available modules when no organization
      setError(null); // Clear any previous errors
      return;
    }

    console.log('📡 Starting to fetch data for org:', currentOrganization.organization_id);
    setLoading(true);
    setError(null);

    try {
      // Fetch both subscriptions and available modules in parallel
      const [subscriptionsData, availabilityData] = await Promise.all([
        modulesApi.getModuleSubscriptions(),
        modulesApi.getAvailableModules()
      ]);

      console.log('📊 API response:', { 
        subscriptions: subscriptionsData?.length || 0,
        availableModules: availabilityData?.available_modules?.length || 0 
      });

      console.log('✅ Successfully fetched data:', {
        subscriptions: subscriptionsData?.length || 0,
        availableModules: availabilityData?.total_available || 0
      });
      
      setSubscriptions(subscriptionsData || []);
      setAvailableModules(availabilityData || null);
    } catch (err) {
      console.error('❌ Error fetching module data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch module data');
    } finally {
      console.log('🏁 refreshSubscriptions complete, setting loading to false');
      setLoading(false);
    }
  }, [currentOrganization]);

  const activateModule = useCallback(async (moduleName: ModuleName, tier: ModuleTier): Promise<boolean> => {
    if (!currentOrganization?.id || !user?.id) {
      setError('User authentication required');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await modulesApi.activateModule(moduleName, tier);
      
      if (result.success) {
        // Refresh subscriptions to get updated data
        await refreshSubscriptions();
        console.log(`Successfully activated ${moduleName} with ${tier} tier`);
        return true;
      } else {
        throw new Error(result.message || 'Failed to activate module');
      }

    } catch (err) {
      console.error('Error activating module:', err);
      setError(err instanceof Error ? err.message : 'Failed to activate module');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, currentOrganization, refreshSubscriptions]);

  const deactivateModule = useCallback(async (moduleName: ModuleName): Promise<boolean> => {
    if (!currentOrganization?.id) {
      setError('User authentication required');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await modulesApi.deactivateModule(moduleName);
      
      if (result.success) {
        // Refresh subscriptions to get updated data
        await refreshSubscriptions();
        console.log(`Successfully deactivated ${moduleName}`);
        return true;
      } else {
        throw new Error(result.message || 'Failed to deactivate module');
      }

    } catch (err) {
      console.error('Error deactivating module:', err);
      setError(err instanceof Error ? err.message : 'Failed to deactivate module');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentOrganization, refreshSubscriptions]);

  const getModuleStatus = useCallback((moduleName: ModuleName): { tier: ModuleTier | null; active: boolean } => {
    const subscription = subscriptions.find(
      s => s.module_name === moduleName && s.active
    );

    return {
      tier: subscription?.tier || null,
      active: !!subscription
    };
  }, [subscriptions]);

  const isModuleAvailable = useCallback((moduleName: ModuleName): boolean => {
    if (!availableModules) return false;
    
    return availableModules.available_modules.some(
      module => module.id === moduleName && module.available
    );
  }, [availableModules]);

  // Automatically refresh subscriptions when organization changes
  useEffect(() => {
    console.log('🔄 Organization changed, refreshing subscriptions:', currentOrganization?.id);
    if (currentOrganization?.id) {
      refreshSubscriptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id]); // Remove refreshSubscriptions to avoid infinite loop

  return {
    subscriptions,
    availableModules,
    loading,
    error,
    activateModule,
    deactivateModule,
    getModuleStatus,
    isModuleAvailable,
    refreshSubscriptions
  };
}