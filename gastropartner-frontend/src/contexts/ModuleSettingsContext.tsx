import React, { createContext, useContext, useState } from 'react';
import { devLogger } from '../utils/logger';

export interface Module {
  id: string;
  display_name: string;
  description: string;
  enabled: boolean;
  category?: string;
}

// TODO: ModuleSettings interface for future module configuration functionality
// interface ModuleSettings {
//   [key: string]: boolean;
// }

interface ModuleSettingsContextType {
  modules: Module[];
  toggleModule: (moduleId: string) => Promise<boolean>;
  isModuleEnabled: (moduleId: string) => boolean;
  loading: boolean;
  error: string | null;
  updateModuleStatus: (moduleId: string, enabled: boolean) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
}

const ModuleSettingsContext = createContext<ModuleSettingsContextType | undefined>(undefined);

export function ModuleSettingsProvider({ 
  children, 
  onModuleStatusChanged 
}: { 
  children: React.ReactNode;
  onModuleStatusChanged?: (moduleId: string, enabled: boolean) => Promise<void>;
}) {
  const [modules, setModules] = useState<Module[]>([
    {
      id: 'recipes',
      display_name: 'Recept & Meny',
      description: 'Hantering av ingredienser, recept och menyartiklar',
      enabled: true,
      category: 'core'
    },
    {
      id: 'analytics',
      display_name: 'Analys & Rapporter',
      description: 'Djupgående analys av kostnader och lönsamhet',
      enabled: false,
      category: 'analytics'
    },
    {
      id: 'sales',
      display_name: 'Försäljning & CRM',
      description: 'Komplett försäljningshantering med CRM',
      enabled: true,
      category: 'sales'
    },
    {
      id: 'reports',
      display_name: 'Rapporter',
      description: 'Detaljerade rapporter och insikter',
      enabled: true,
      category: 'analytics'
    },
    {
      id: 'cost_control',
      display_name: 'Kostnadskontroll',
      description: 'Övervakning av kostnader och lönsamhet',
      enabled: true,
      category: 'finance'
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleModule = async (moduleId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const module = modules.find(m => m.id === moduleId);
        
      if (!module) {
        throw new Error(`Module ${moduleId} not found`);
      }
      
      const newEnabled = !module.enabled;
      
      // Update local state
      setModules(prev => prev.map(m => 
        m.id === moduleId ? { ...m, enabled: newEnabled } : m
      ));
      
      // Call parent callback if provided
      if (onModuleStatusChanged) {
        await onModuleStatusChanged(moduleId, newEnabled);
      }
      
      return true;
    } catch (err) {
      devLogger.error('Failed to toggle module:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateModuleStatus = async (moduleId: string, enabled: boolean): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      // Update local state
      setModules(prev => prev.map(m => 
        m.id === moduleId ? { ...m, enabled } : m
      ));
      
      // Call parent callback if provided
      if (onModuleStatusChanged) {
        await onModuleStatusChanged(moduleId, enabled);
      }
      
      return true;
    } catch (err) {
      devLogger.error('Failed to update module status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshSettings = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      // TODO: Implement actual API call to refresh settings
      devLogger.module('Refreshing module settings...');
    } catch (err) {
      devLogger.error('Failed to refresh settings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const isModuleEnabled = (moduleId: string): boolean => {
    const module = modules.find(m => m.id === moduleId);
    return module?.enabled ?? false;
  };

  return (
    <ModuleSettingsContext.Provider value={{ 
      modules, 
      toggleModule, 
      isModuleEnabled, 
      loading, 
      error, 
      updateModuleStatus, 
      refreshSettings 
    }}>
      {children}
    </ModuleSettingsContext.Provider>
  );
}

export function useModuleSettings() {
  const context = useContext(ModuleSettingsContext);
  if (context === undefined) {
    throw new Error('useModuleSettings must be used within a ModuleSettingsProvider');
  }
  return context;
}