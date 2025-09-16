import { useState } from 'react';

export interface GlobalFeatureFlags {
  [key: string]: boolean;
}

export function useGlobalFeatureFlags() {
  const [flags, setFlags] = useState<GlobalFeatureFlags>({
    recipes: true,
    analytics: false,
    sales: true,
    reports: true,
    cost_control: true,
  });
  const [loading, setLoading] = useState(false);

  const isModuleGloballyAvailable = (moduleId: string): boolean => {
    return flags[moduleId] ?? false;
  };

  const toggleGlobalFlag = async (moduleId: string): Promise<boolean> => {
    try {
      setLoading(true);
      // TODO: Implement actual API call
      setFlags(prev => ({
        ...prev,
        [moduleId]: !prev[moduleId]
      }));
      return true;
    } catch (error) {
      console.error('Failed to toggle global flag:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    flags,
    isModuleGloballyAvailable,
    toggleGlobalFlag,
    loading,
  };
}