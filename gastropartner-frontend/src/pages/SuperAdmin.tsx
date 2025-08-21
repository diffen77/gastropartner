import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface FeatureFlag {
  flags_id: string;
  organization_id: string;
  show_recipe_prep_time: boolean;
  show_recipe_cook_time: boolean;
  show_recipe_instructions: boolean;
  show_recipe_notes: boolean;
  enable_notifications_section: boolean;
  enable_advanced_settings_section: boolean;
  enable_account_management_section: boolean;
  enable_company_profile_section: boolean;
  enable_business_settings_section: boolean;
  enable_settings_header: boolean;
  enable_settings_footer: boolean;
  created_at: string;
  updated_at: string;
}

interface Organization {
  organization_id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
}

export function SuperAdmin() {
  const { session } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!session) return;

      try {
        setError(null);
        const token = session.access_token;

        // Fetch organizations
        const orgResponse = await fetch('/api/v1/superadmin/agencies', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (orgResponse.ok) {
          const orgData = await orgResponse.json();
          setOrganizations(orgData.agencies || []);
        }

        // Fetch all feature flags
        const flagsResponse = await fetch('/api/v1/superadmin/feature-flags', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (flagsResponse.ok) {
          const flagsData = await flagsResponse.json();
          setFeatureFlags(flagsData.feature_flags || []);
        }

      } catch (err) {
        console.error('Error fetching super admin data:', err);
        setError('Failed to load super admin data. Make sure you have super admin privileges.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  const updateFeatureFlag = async (organizationId: string, flagName: string, value: boolean) => {
    if (!session) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = session.access_token;
      const response = await fetch(`/api/v1/superadmin/feature-flags/${organizationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [flagName]: value,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update feature flag: ${response.statusText}`);
      }

      await response.json();
      
      // Update local state
      setFeatureFlags(prev => 
        prev.map(flag => 
          flag.organization_id === organizationId 
            ? { ...flag, [flagName]: value }
            : flag
        )
      );

      setSuccess(`✅ Feature flag updated successfully!`);
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('Error updating feature flag:', err);
      setError(`Failed to update feature flag: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const getOrganizationFlags = (orgId: string): FeatureFlag | undefined => {
    return featureFlags.find(flag => flag.organization_id === orgId);
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="page-header">
          <div className="page-header__content">
            <div className="page-header__text">
              <h1 className="page-header__title">🔧 Super Admin</h1>
              <p className="page-header__subtitle">Loading super admin panel...</p>
            </div>
          </div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading super admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <div className="page-header__content">
          <div className="page-header__text">
            <h1 className="page-header__title">🔧 Super Admin</h1>
            <p className="page-header__subtitle">Feature Flag Management</p>
          </div>
        </div>
      </div>

      <div className="settings-container">
        {/* Success/Error Messages */}
        {success && (
          <div className="alert alert--success">
            {success}
          </div>
        )}
        
        {error && (
          <div className="alert alert--error">
            {error}
          </div>
        )}

        {/* Organization Selector */}
        <div className="settings-section">
          <div className="settings-section__header">
            <div className="settings-section__icon">🏢</div>
            <div className="settings-section__info">
              <h3 className="settings-section__title">Organization Selection</h3>
              <p className="settings-section__description">Select an organization to manage feature flags</p>
            </div>
          </div>
          <div className="settings-section__content">
            <div className="settings-item">
              <div className="settings-item__info">
                <label className="settings-item__label">Organization</label>
                <p className="settings-item__description">Choose organization to modify feature flags</p>
              </div>
              <div className="settings-item__control">
                <select 
                  value={selectedOrganization}
                  onChange={(e) => setSelectedOrganization(e.target.value)}
                  className="input"
                >
                  <option value="">Select Organization...</option>
                  {organizations.map(org => (
                    <option key={org.organization_id} value={org.organization_id}>
                      {org.name} ({org.slug}) - {org.plan}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Flags Management */}
        {selectedOrganization && (
          <div className="settings-section">
            <div className="settings-section__header">
              <div className="settings-section__icon">🚩</div>
              <div className="settings-section__info">
                <h3 className="settings-section__title">Feature Flags</h3>
                <p className="settings-section__description">
                  Manage feature flags for {organizations.find(o => o.organization_id === selectedOrganization)?.name}
                </p>
              </div>
            </div>
            <div className="settings-section__content">
              {(() => {
                const orgFlags = getOrganizationFlags(selectedOrganization);
                
                if (!orgFlags) {
                  return (
                    <div className="settings-item">
                      <p>No feature flags found for this organization. They will be created automatically when first accessed.</p>
                    </div>
                  );
                }

                return (
                  <>
                    {/* Settings Page Section Flags */}
                    <h4 style={{ marginBottom: '1rem', color: '#6b7280' }}>Settings Page Sections</h4>
                    
                    <div className="settings-item">
                      <div className="settings-item__info">
                        <label className="settings-item__label">Enable Notifications Section</label>
                        <p className="settings-item__description">Show/hide notifications settings section</p>
                      </div>
                      <div className="settings-item__control">
                        <label className="toggle">
                          <input 
                            type="checkbox" 
                            checked={orgFlags.enable_notifications_section}
                            onChange={(e) => updateFeatureFlag(selectedOrganization, 'enable_notifications_section', e.target.checked)}
                            disabled={saving}
                          />
                          <span className="toggle__slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="settings-item">
                      <div className="settings-item__info">
                        <label className="settings-item__label">Enable Advanced Settings Section</label>
                        <p className="settings-item__description">Show/hide advanced settings section (API access, data export, etc.)</p>
                      </div>
                      <div className="settings-item__control">
                        <label className="toggle">
                          <input 
                            type="checkbox" 
                            checked={orgFlags.enable_advanced_settings_section}
                            onChange={(e) => updateFeatureFlag(selectedOrganization, 'enable_advanced_settings_section', e.target.checked)}
                            disabled={saving}
                          />
                          <span className="toggle__slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="settings-item">
                      <div className="settings-item__info">
                        <label className="settings-item__label">Enable Account Management Section</label>
                        <p className="settings-item__description">Show/hide account management section (password change, billing, etc.)</p>
                      </div>
                      <div className="settings-item__control">
                        <label className="toggle">
                          <input 
                            type="checkbox" 
                            checked={orgFlags.enable_account_management_section}
                            onChange={(e) => updateFeatureFlag(selectedOrganization, 'enable_account_management_section', e.target.checked)}
                            disabled={saving}
                          />
                          <span className="toggle__slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="settings-item">
                      <div className="settings-item__info">
                        <label className="settings-item__label">Enable Company Profile Section</label>
                        <p className="settings-item__description">Show/hide company profile section (restaurant name, contact info, etc.)</p>
                      </div>
                      <div className="settings-item__control">
                        <label className="toggle">
                          <input 
                            type="checkbox" 
                            checked={orgFlags.enable_company_profile_section}
                            onChange={(e) => updateFeatureFlag(selectedOrganization, 'enable_company_profile_section', e.target.checked)}
                            disabled={saving}
                          />
                          <span className="toggle__slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="settings-item">
                      <div className="settings-item__info">
                        <label className="settings-item__label">Enable Business Settings Section</label>
                        <p className="settings-item__description">Show/hide business settings section (currency, margin targets, etc.)</p>
                      </div>
                      <div className="settings-item__control">
                        <label className="toggle">
                          <input 
                            type="checkbox" 
                            checked={orgFlags.enable_business_settings_section}
                            onChange={(e) => updateFeatureFlag(selectedOrganization, 'enable_business_settings_section', e.target.checked)}
                            disabled={saving}
                          />
                          <span className="toggle__slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="settings-item">
                      <div className="settings-item__info">
                        <label className="settings-item__label">Enable Settings Header</label>
                        <p className="settings-item__description">Show/hide settings page header and save button</p>
                      </div>
                      <div className="settings-item__control">
                        <label className="toggle">
                          <input 
                            type="checkbox" 
                            checked={orgFlags.enable_settings_header}
                            onChange={(e) => updateFeatureFlag(selectedOrganization, 'enable_settings_header', e.target.checked)}
                            disabled={saving}
                          />
                          <span className="toggle__slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="settings-item">
                      <div className="settings-item__info">
                        <label className="settings-item__label">Enable Settings Footer</label>
                        <p className="settings-item__description">Show/hide settings page footer with system version info</p>
                      </div>
                      <div className="settings-item__control">
                        <label className="toggle">
                          <input 
                            type="checkbox" 
                            checked={orgFlags.enable_settings_footer}
                            onChange={(e) => updateFeatureFlag(selectedOrganization, 'enable_settings_footer', e.target.checked)}
                            disabled={saving}
                          />
                          <span className="toggle__slider"></span>
                        </label>
                      </div>
                    </div>

                    {/* Recipe Feature Flags */}
                    <h4 style={{ marginBottom: '1rem', marginTop: '2rem', color: '#6b7280' }}>Recipe Features</h4>
                    
                    <div className="settings-item">
                      <div className="settings-item__info">
                        <label className="settings-item__label">Show Recipe Prep Time</label>
                        <p className="settings-item__description">Display prep time in recipe forms</p>
                      </div>
                      <div className="settings-item__control">
                        <label className="toggle">
                          <input 
                            type="checkbox" 
                            checked={orgFlags.show_recipe_prep_time}
                            onChange={(e) => updateFeatureFlag(selectedOrganization, 'show_recipe_prep_time', e.target.checked)}
                            disabled={saving}
                          />
                          <span className="toggle__slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="settings-item">
                      <div className="settings-item__info">
                        <label className="settings-item__label">Show Recipe Cook Time</label>
                        <p className="settings-item__description">Display cook time in recipe forms</p>
                      </div>
                      <div className="settings-item__control">
                        <label className="toggle">
                          <input 
                            type="checkbox" 
                            checked={orgFlags.show_recipe_cook_time}
                            onChange={(e) => updateFeatureFlag(selectedOrganization, 'show_recipe_cook_time', e.target.checked)}
                            disabled={saving}
                          />
                          <span className="toggle__slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="settings-item">
                      <div className="settings-item__info">
                        <label className="settings-item__label">Show Recipe Instructions</label>
                        <p className="settings-item__description">Display instructions field in recipe forms</p>
                      </div>
                      <div className="settings-item__control">
                        <label className="toggle">
                          <input 
                            type="checkbox" 
                            checked={orgFlags.show_recipe_instructions}
                            onChange={(e) => updateFeatureFlag(selectedOrganization, 'show_recipe_instructions', e.target.checked)}
                            disabled={saving}
                          />
                          <span className="toggle__slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="settings-item">
                      <div className="settings-item__info">
                        <label className="settings-item__label">Show Recipe Notes</label>
                        <p className="settings-item__description">Display notes field in recipe forms</p>
                      </div>
                      <div className="settings-item__control">
                        <label className="toggle">
                          <input 
                            type="checkbox" 
                            checked={orgFlags.show_recipe_notes}
                            onChange={(e) => updateFeatureFlag(selectedOrganization, 'show_recipe_notes', e.target.checked)}
                            disabled={saving}
                          />
                          <span className="toggle__slider"></span>
                        </label>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        <div className="settings-footer">
          <div className="settings-footer__info">
            <p><strong>Super Admin Panel</strong></p>
            <p><strong>Organizations:</strong> {organizations.length}</p>
            <p><strong>Feature Flag Records:</strong> {featureFlags.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}