import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as modulesApi from '../utils/modulesApi';

export type ModuleTier = modulesApi.ModuleTier;
export type ModuleName = modulesApi.ModuleName;
export type ModuleSubscription = modulesApi.ModuleSubscription;

export interface UseFreemiumServiceReturn {
  subscriptions: ModuleSubscription[];
  loading: boolean;
  error: string | null;
  activateModule: (moduleName: ModuleName, tier: ModuleTier) => Promise<boolean>;
  deactivateModule: (moduleName: ModuleName) => Promise<boolean>;
  getModuleStatus: (moduleName: ModuleName) => { tier: ModuleTier | null; active: boolean };
  refreshSubscriptions: () => Promise<void>;
}

export function useFreemiumService(): UseFreemiumServiceReturn {
  const { user, currentOrganization } = useAuth();
  const [subscriptions, setSubscriptions] = useState<ModuleSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSubscriptions = useCallback(async () => {
    console.log('🔄 refreshSubscriptions called with org:', currentOrganization?.id);
    
    if (!currentOrganization?.id) {
      console.warn('⚠️ No organization ID available, currentOrganization:', currentOrganization);
      setLoading(false);
      setSubscriptions([]); // Clear subscriptions when no organization
      setError(null); // Clear any previous errors
      return;
    }

    console.log('📡 Starting to fetch subscriptions for org:', currentOrganization.id);
    setLoading(true);
    setError(null);

    try {
      const subscriptionsData = await modulesApi.getModuleSubscriptions();

      console.log('📊 API response:', { data: subscriptionsData });

      console.log('✅ Successfully fetched subscriptions:', subscriptionsData?.length || 0, 'items');
      setSubscriptions(subscriptionsData || []);
    } catch (err) {
      console.error('❌ Error fetching module subscriptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscriptions');
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
    loading,
    error,
    activateModule,
    deactivateModule,
    getModuleStatus,
    refreshSubscriptions
  };
}