import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/supabase';
import { useFeatureFlags } from '../hooks/useFeatureFlags';

function SettingsSection({ 
  icon, 
  title, 
  description, 
  children,
  comingSoon = false
}: { 
  icon: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  comingSoon?: boolean;
}) {
  return (
    <div className={`settings-section ${comingSoon ? 'settings-section--coming-soon' : ''}`}>
      <div className="settings-section__header">
        <div className="settings-section__icon">{icon}</div>
        <div className="settings-section__info">
          <h3 className="settings-section__title">
            {title}
            {comingSoon && <span className="badge badge--info">Kommer snart</span>}
          </h3>
          <p className="settings-section__description">{description}</p>
        </div>
      </div>
      <div className="settings-section__content">
        {children}
      </div>
    </div>
  );
}

function SettingsItem({ 
  label, 
  description, 
  type = 'text',
  value,
  onChange,
  disabled = false,
  options,
  placeholder
}: {
  label: string;
  description?: string;
  type?: 'text' | 'email' | 'select' | 'toggle' | 'number';
  value: string | boolean | number;
  onChange?: (value: any) => void;
  disabled?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}) {
  const renderInput = () => {
    if (type === 'toggle') {
      return (
        <label className="toggle">
          <input 
            type="checkbox" 
            checked={value as boolean}
            onChange={(e) => onChange?.(e.target.checked)}
            disabled={disabled}
          />
          <span className="toggle__slider"></span>
        </label>
      );
    }
    
    if (type === 'select' && options) {
      return (
        <select 
          value={value as string}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className="input"
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }
    
    return (
      <input
        type={type}
        value={value as string | number}
        onChange={(e) => onChange?.(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="input"
      />
    );
  };

  return (
    <div className="settings-item">
      <div className="settings-item__info">
        <label className="settings-item__label">{label}</label>
        {description && <p className="settings-item__description">{description}</p>}
      </div>
      <div className="settings-item__control">
        {renderInput()}
      </div>
    </div>
  );
}

export function Settings() {
  const { user, currentOrganization } = useAuth();
  const { featureFlags, loading: flagsLoading } = useFeatureFlags();
  const [settings, setSettings] = useState({
    // Profile settings (working examples)
    restaurantName: 'Härryda BBQ',
    contactEmail: user?.email || '',
    phoneNumber: '',
    language: 'sv',
    timezone: 'Europe/Stockholm',
    
    // Business settings (working examples)
    defaultCurrency: 'SEK',
    defaultMarginTarget: 30,
    
    // Notification settings (working examples)
    emailNotifications: true,
    stockAlerts: true,
    reportReminders: true,
    
    // Advanced settings (coming soon)
    apiAccess: false,
    dataExport: false,
    auditLogging: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load settings from backend on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!currentOrganization) {
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const orgSettings = await api.getOrganizationSettings(currentOrganization.id);
        
        // Map backend settings to frontend format
        setSettings(prev => ({
          ...prev,
          restaurantName: orgSettings.restaurant_profile.name || prev.restaurantName,
          contactEmail: user?.email || prev.contactEmail,
          phoneNumber: orgSettings.restaurant_profile.phone || prev.phoneNumber,
          language: 'sv', // Not stored in backend yet, keep default
          timezone: orgSettings.restaurant_profile.timezone || prev.timezone,
          defaultCurrency: orgSettings.restaurant_profile.currency || prev.defaultCurrency,
          defaultMarginTarget: Number(orgSettings.business_settings.margin_target) || prev.defaultMarginTarget,
          emailNotifications: orgSettings.notification_preferences.email_notifications ?? prev.emailNotifications,
          stockAlerts: orgSettings.notification_preferences.inventory_alerts ?? prev.stockAlerts,
          reportReminders: orgSettings.notification_preferences.weekly_reports ?? prev.reportReminders,
        }));
      } catch (err) {
        console.warn('Could not load organization settings:', err);
        setError('Kunde inte ladda inställningar från servern. Standardvärden används.');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [currentOrganization, user?.email]);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // Clear success/error messages when user makes changes
    if (successMessage) setSuccessMessage(null);
    if (error) setError(null);
  };

  const handleSave = async () => {
    if (!currentOrganization) {
      setError('Ingen organisation vald. Kan inte spara inställningar.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      // Map frontend settings to backend format
      const backendSettings: import('../utils/api').OrganizationSettingsUpdate = {
        restaurant_profile: {
          name: settings.restaurantName,
          phone: settings.phoneNumber || undefined,
          timezone: settings.timezone,
          currency: settings.defaultCurrency,
          address: undefined, // Not implemented in frontend yet
          website: undefined, // Not implemented in frontend yet
        },
        business_settings: {
          margin_target: settings.defaultMarginTarget,
          service_charge: 0, // Not implemented in frontend yet
          default_prep_time: 30, // Not implemented in frontend yet
          operating_hours: {}, // Not implemented in frontend yet
        },
        notification_preferences: {
          email_notifications: settings.emailNotifications,
          sms_notifications: false, // Not implemented in frontend yet
          inventory_alerts: settings.stockAlerts,
          cost_alerts: true, // Not implemented in frontend yet, use default
          daily_reports: false, // Not implemented in frontend yet
          weekly_reports: settings.reportReminders,
        },
      };

      console.log('Saving settings to backend:', backendSettings);
      
      // Save settings via API
      await api.updateOrganizationSettings(currentOrganization.id, backendSettings);
      console.log('Settings saved successfully to database!');
      
      setSuccessMessage('✅ Inställningar sparade framgångsrikt!');
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
            
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('❌ Fel vid sparande av inställningar: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || flagsLoading) {
    return (
      <div className="main-content">
        <PageHeader 
          title="⚙️ Inställningar" 
          subtitle="Laddar inställningar..."
        />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Laddar dina inställningar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <PageHeader 
        title="⚙️ Inställningar" 
        subtitle="Konfigurera systemet efter dina behov"
      >
        <button 
          className={`btn btn--primary ${saving ? 'btn--loading' : ''}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '💾 Sparar...' : '💾 Spara inställningar'}
        </button>
      </PageHeader>

      <div className="modules-container">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="alert alert--success">
            {successMessage}
          </div>
        )}
        
        {error && (
          <div className="alert alert--error">
            {error}
          </div>
        )}
        
        {/* Profile & Company Settings */}
        <div className="modules-section">
          <SettingsSection
            icon="🏢"
            title="Företagsprofil"
            description="Grundläggande information om din verksamhet"
          >
          <SettingsItem
            label="Namn på organisationen"
            description="Namnet som visas i systemet och rapporter"
            value={settings.restaurantName}
            onChange={(value) => handleSettingChange('restaurantName', value)}
            placeholder="T.ex. Härryda BBQ"
          />
          <SettingsItem
            label="Kontakt-email"
            description="Primär e-postadress för systemnotifikationer"
            type="email"
            value={settings.contactEmail}
            onChange={(value) => handleSettingChange('contactEmail', value)}
            placeholder="info@minrestaurang.se"
          />
          <SettingsItem
            label="Telefonnummer"
            description="Telefonnummer för support och kontakt"
            value={settings.phoneNumber}
            onChange={(value) => handleSettingChange('phoneNumber', value)}
            placeholder="+46 70 123 45 67"
          />
          <SettingsItem
            label="Språk"
            description="Systemspråk för användargränssnitt"
            type="select"
            value={settings.language}
            onChange={(value) => handleSettingChange('language', value)}
            options={[
              { value: 'sv', label: 'Svenska' },
              { value: 'en', label: 'English' },
              { value: 'no', label: 'Norsk' },
              { value: 'da', label: 'Dansk' }
            ]}
          />
          <SettingsItem
            label="Tidszon"
            description="Tidszon för rapporter och schemaläggning"
            type="select"
            value={settings.timezone}
            onChange={(value) => handleSettingChange('timezone', value)}
            options={[
              { value: 'Europe/Stockholm', label: 'Stockholm (CET/CEST)' },
              { value: 'Europe/London', label: 'London (GMT/BST)' },
              { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' }
            ]}
          />
          </SettingsSection>
        </div>

        {/* Business Settings */}
        <div className="modules-section">
          <SettingsSection
            icon="💼"
            title="Affärsinställningar"
            description="Grundläggande affärsregler och standardvärden"
          >
          <SettingsItem
            label="Standard valuta"
            description="Valuta som används för kostnader och priser"
            type="select"
            value={settings.defaultCurrency}
            onChange={(value) => handleSettingChange('defaultCurrency', value)}
            options={[
              { value: 'SEK', label: 'SEK (Kronor)' },
              { value: 'EUR', label: 'EUR (Euro)' },
              { value: 'USD', label: 'USD (Dollar)' },
              { value: 'NOK', label: 'NOK (Norska kronor)' }
            ]}
          />
          <SettingsItem
            label="Standard marginalmål (%)"
            description="Förvalda marginalmål för nya produkter"
            type="number"
            value={settings.defaultMarginTarget}
            onChange={(value) => handleSettingChange('defaultMarginTarget', value)}
          />
          </SettingsSection>
        </div>

        {/* Notification Settings - Feature Flag Controlled */}
        {featureFlags.enable_notifications_section && (
          <div className="modules-section">
            <SettingsSection
              icon="🔔"
              title="Notifikationer"
              description="Hantera e-post och systemnotifikationer"
            >
            <SettingsItem
              label="E-postnotifikationer"
              description="Få viktiga uppdateringar via e-post"
              type="toggle"
              value={settings.emailNotifications}
              onChange={(value) => handleSettingChange('emailNotifications', value)}
            />
            <SettingsItem
              label="Lagervarningar"
              description="Notifikationer när ingredienser börjar ta slut"
              type="toggle"
              value={settings.stockAlerts}
              onChange={(value) => handleSettingChange('stockAlerts', value)}
            />
            <SettingsItem
              label="Rapportpåminnelser"
              description="Automatiska påminnelser om periodiska rapporter"
              type="toggle"
              value={settings.reportReminders}
              onChange={(value) => handleSettingChange('reportReminders', value)}
            />
            </SettingsSection>
          </div>
        )}

        {/* Advanced Settings - Feature Flag Controlled */}
        {featureFlags.enable_advanced_settings_section && (
          <div className="modules-section">
            <SettingsSection
              icon="🚀"
              title="Avancerade inställningar"
              description="Utvecklarfunktioner och systemintegration"
              comingSoon={true}
            >
            <SettingsItem
              label="API-åtkomst"
              description="Aktivera API-åtkomst för tredjepartsintegrationer"
              type="toggle"
              value={settings.apiAccess}
              onChange={(value) => handleSettingChange('apiAccess', value)}
              disabled={true}
            />
            <SettingsItem
              label="Dataexport"
              description="Automatisk export av data till externa system"
              type="toggle"
              value={settings.dataExport}
              onChange={(value) => handleSettingChange('dataExport', value)}
              disabled={true}
            />
            <SettingsItem
              label="Auditloggning"
              description="Detaljerad loggning av alla systemändringar"
              type="toggle"
              value={settings.auditLogging}
              onChange={(value) => handleSettingChange('auditLogging', value)}
              disabled={true}
            />
            </SettingsSection>
          </div>
        )}

        {/* Account Management - Feature Flag Controlled */}
        {featureFlags.enable_account_management_section && (
          <div className="modules-section">
            <SettingsSection
              icon="👤"
              title="Kontohantering"
              description="Säkerhet, lösenord och prenumerationsinställningar"
              comingSoon={true}
            >
            <div className="coming-soon-notice">
              <h4>Kommande funktioner:</h4>
              <ul>
                <li>✨ Lösenordsändring och tvåfaktorsautentisering</li>
                <li>✨ Prenumerationshantering och faktureringshistorik</li>
                <li>✨ Dataexport och GDPR-verktyg</li>
                <li>✨ Användaraktivitetslogg</li>
                <li>✨ Säkerhetsinställningar och åtkomstlogg</li>
              </ul>
              <p className="coming-soon-notice__subtitle">
                Kontakta support för assistans med kontorelaterade frågor.
              </p>
            </div>
            </SettingsSection>
          </div>
        )}

        {/* Settings Footer */}
        <div className="modules-section">
          <div className="settings-footer">
          <div className="settings-footer__info">
            <p><strong>System version:</strong> 1.0.0-beta</p>
            <p><strong>Senast uppdaterad:</strong> {new Date().toLocaleDateString('sv-SE')}</p>
            <p><strong>Support:</strong> support@gastropartner.nu</p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}