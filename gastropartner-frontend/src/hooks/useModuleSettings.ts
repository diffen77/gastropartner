import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient, ModuleSettings, ModuleConfig } from '../utils/api';

// Available modules in the system
const AVAILABLE_MODULES: ModuleConfig[] = [
  { id: 'ingredients', name: 'ingredients', display_name: 'Ingredienser', description: 'Hantera ingredienser och kostnadskalkylering', enabled: true },
  { id: 'recipes', name: 'recipes', display_name: 'Recept', description: 'Skapa och hantera recept', enabled: true },
  { id: 'menu', name: 'menu', display_name: 'Maträtter', description: 'Hantera menyrätter och prissättning', enabled: true },
  { id: 'analytics', name: 'analytics', display_name: 'Kostnadsanalys', description: 'Analys av kostnader och lönsamhet', enabled: true },
  { id: 'user_testing', name: 'user_testing', display_name: 'Användartestning', description: 'Feedback och användarbeteende', enabled: false },
  { id: 'sales', name: 'sales', display_name: 'Försäljning', description: 'Försäljningsdata och prognoser', enabled: false },
  { id: 'super_admin', name: 'super_admin', display_name: 'Superadmin', description: 'Avancerad systemadministration', enabled: false },
];

export interface UseModuleSettingsResult {
  moduleSettings: ModuleSettings[];
  modules: ModuleConfig[];
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
  updateModuleStatus: (moduleId: string, enabled: boolean) => Promise<boolean>;
  isModuleEnabled: (moduleId: string) => boolean;
}

export const useModuleSettings = (): UseModuleSettingsResult => {
  const { session, user, currentOrganization } = useAuth();
  const [moduleSettings, setModuleSettings] = useState<ModuleSettings[]>([]);
  const [modules, setModules] = useState<ModuleConfig[]>(AVAILABLE_MODULES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModuleSettings = useCallback(async () => {
    if (!session || !user || !currentOrganization) {
      // Use default settings for unauthenticated users or no organization
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      
      const settings = await apiClient.getModuleSettings();
      setModuleSettings(settings);
      
      // Update modules with actual enabled status
      const updatedModules = AVAILABLE_MODULES.map(module => {
        const setting = settings.find(s => s.module_id === module.id);
        return {
          ...module,
          enabled: setting?.enabled ?? true // Default to enabled if no setting exists
        };
      });
      setModules(updatedModules);
      
    } catch (err) {
      console.warn('Could not load module settings, using defaults:', err);
      setError('Could not load module settings');
      // Keep default values on error
      setModules(AVAILABLE_MODULES);
    } finally {
      setLoading(false);
    }
  }, [session, user, currentOrganization]);

  const updateModuleStatus = useCallback(async (moduleId: string, enabled: boolean): Promise<boolean> => {
    if (!session || !user || !currentOrganization) {
      return false;
    }

    try {
      setError(null);
      
      const result = await apiClient.updateModuleStatus(moduleId, enabled);
      
      if (result.success) {
        // Update local state optimistically
        setModuleSettings(prev => {
          const existing = prev.find(s => s.module_id === moduleId);
          if (existing) {
            // Update existing setting
            return prev.map(s => 
              s.module_id === moduleId 
                ? { ...s, enabled, updated_at: new Date().toISOString() }
                : s
            );
          } else {
            // Add new setting
            const newSetting: ModuleSettings = {
              id: crypto.randomUUID(),
              organization_id: currentOrganization.id || '',
              module_id: moduleId,
              enabled,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            return [...prev, newSetting];
          }
        });

        // Update modules state
        setModules(prev => 
          prev.map(module => 
            module.id === moduleId 
              ? { ...module, enabled }
              : module
          )
        );

        return true;
      } else {
        throw new Error(result.message || 'Failed to update module status');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update module status';
      setError(errorMessage);
      return false;
    }
  }, [session, user, currentOrganization]);

  const isModuleEnabled = useCallback((moduleId: string): boolean => {
    const module = modules.find(m => m.id === moduleId);
    return module?.enabled ?? true; // Default to enabled if module not found
  }, [modules]);

  useEffect(() => {
    fetchModuleSettings();
  }, [fetchModuleSettings]);

  return {
    moduleSettings,
    modules,
    loading,
    error,
    refreshSettings: fetchModuleSettings,
    updateModuleStatus,
    isModuleEnabled
  };
};