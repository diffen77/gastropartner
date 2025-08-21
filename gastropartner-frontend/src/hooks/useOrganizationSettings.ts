import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/supabase';
import { OrganizationSettings } from '../utils/api';

export function useOrganizationSettings() {
  const { currentOrganization } = useAuth();
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      if (!currentOrganization) {
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const orgSettings = await api.getOrganizationSettings(currentOrganization.id);
        setSettings(orgSettings);
      } catch (err) {
        console.warn('Could not load organization settings:', err);
        setError('Kunde inte ladda organisationsinställningar');
        setSettings(null);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [currentOrganization]);

  const restaurantName = settings?.restaurant_profile?.name || currentOrganization?.name || 'Min Restaurang';

  return {
    settings,
    loading,
    error,
    restaurantName
  };
}