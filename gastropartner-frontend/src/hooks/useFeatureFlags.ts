import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface FeatureFlags {
  show_recipe_prep_time: boolean;
  show_recipe_cook_time: boolean;
  show_recipe_instructions: boolean;
  show_recipe_notes: boolean;
  enable_notifications_section: boolean;
  enable_advanced_settings_section: boolean;
  enable_account_management_section: boolean;
  show_user_testing: boolean;
  show_sales: boolean;
}

export const useFeatureFlags = () => {
  const { session } = useAuth();
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({
    show_recipe_prep_time: false,
    show_recipe_cook_time: false,
    show_recipe_instructions: false,
    show_recipe_notes: false,
    enable_notifications_section: false,
    enable_advanced_settings_section: false,
    enable_account_management_section: false,
    show_user_testing: false,
    show_sales: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeatureFlags = async () => {
      if (!session) {
        // Use default flags for unauthenticated users
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const response = await fetch('/api/v1/feature-flags/organization', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch feature flags: ${response.statusText}`);
        }

        const flags = await response.json();
        setFeatureFlags(flags);
      } catch (err) {
        console.warn('Could not load feature flags, using defaults:', err);
        setError('Could not load feature flags');
        // Keep default values on error
      } finally {
        setLoading(false);
      }
    };

    fetchFeatureFlags();
  }, [session]);

  return { featureFlags, loading, error };
};