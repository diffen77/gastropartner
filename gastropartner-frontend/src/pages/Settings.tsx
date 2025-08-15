import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function PageHeader({ title, subtitle, children }: { 
  title: string; 
  subtitle?: string; 
  children?: React.ReactNode; 
}) {
  return (
    <div className="page-header">
      <div className="page-header__content">
        <div className="page-header__text">
          <h1 className="page-header__title">{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
        {children && (
          <div className="page-header__actions">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

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
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    // Profile settings (working examples)
    restaurantName: 'Härryda BBQ',
    contactEmail: user?.email || '',
    phoneNumber: '',
    language: 'sv',
    timezone: 'Europe/Stockholm',
    
    // Business settings (working examples)
    defaultCurrency: 'SEK',
    taxRate: 25,
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

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // This will be implemented when backend settings API is ready
    alert('Inställningar sparade! (Exempel - kommer integreras med backend)');
  };

  return (
    <div className="main-content">
      <PageHeader 
        title="⚙️ Inställningar" 
        subtitle="Konfigurera systemet efter dina behov"
      >
        <button 
          className="btn btn--primary"
          onClick={handleSave}
        >
          💾 Spara inställningar
        </button>
      </PageHeader>

      <div className="settings-container">
        {/* Profile & Company Settings */}
        <SettingsSection
          icon="🏢"
          title="Företagsprofil"
          description="Grundläggande information om din verksamhet"
        >
          <SettingsItem
            label="Restaurangnamn"
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

        {/* Business Settings */}
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
            label="Momssats (%)"
            description="Standard momssats för beräkningar"
            type="number"
            value={settings.taxRate}
            onChange={(value) => handleSettingChange('taxRate', value)}
          />
          <SettingsItem
            label="Standard marginalmål (%)"
            description="Förvalda marginalmål för nya produkter"
            type="number"
            value={settings.defaultMarginTarget}
            onChange={(value) => handleSettingChange('defaultMarginTarget', value)}
          />
        </SettingsSection>

        {/* Notification Settings */}
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

        {/* Advanced Settings - Coming Soon */}
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

        {/* Account Management - Coming Soon */}
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

        <div className="settings-footer">
          <div className="settings-footer__info">
            <p><strong>System version:</strong> 1.0.0-beta</p>
            <p><strong>Senast uppdaterad:</strong> {new Date().toLocaleDateString('sv-SE')}</p>
            <p><strong>Support:</strong> support@gastropartner.nu</p>
          </div>
        </div>
      </div>
    </div>
  );
}