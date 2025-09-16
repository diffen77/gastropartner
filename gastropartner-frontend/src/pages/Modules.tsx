import React from 'react';
import DualButtonModule from '../components/Modules/DualButtonModule';
import { useFreemiumService } from '../hooks/useFreemiumService';
import { ModuleName } from '../utils/modulesApi';
import { useModuleSettings } from '../contexts/ModuleSettingsContext';
// import { useUsageLimits } from '../hooks/useUsageLimits';

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

export function Modules() {
  const {
    subscriptions,
    availableModules,
    loading,
    error,
    activateModule,
    refreshSubscriptions,
    getModuleStatus,
    isModuleAvailable
  } = useFreemiumService();
  
  const { isModuleEnabled, loading: settingsLoading } = useModuleSettings();
  
  // const { usageData, isNearLimit, getUsagePercentage, refreshUsage } = useUsageLimits();

  // Helper function to determine actual module status
  const getActualModuleStatus = (moduleName: ModuleName) => {
    const subscription = getModuleStatus(moduleName);
    const settingsEnabled = isModuleEnabled(moduleName);
    
    return {
      ...subscription,
      // A module is active if it's enabled in settings, regardless of subscription status
      // Subscription is only needed for premium features
      active: settingsEnabled,
      hasSubscription: subscription.active
    };
  };

  console.log('🧩 Modules component render:', { 
    subscriptionsCount: subscriptions.length, 
    loading, 
    error,
    hasRefreshSubscriptions: !!refreshSubscriptions 
  });

  const handleModuleActivation = async (moduleName: string, tier: 'free' | 'pro') => {
    const success = await activateModule(moduleName as any, tier);
    if (success) {
      console.log(`✅ ${moduleName} activated successfully with ${tier} tier`);
    } else {
      console.error(`❌ Failed to activate ${moduleName}`);
    }
  };

  // Show loading state while fetching subscriptions
  if (loading || settingsLoading) {
    return (
      <div className="main-content">
        <PageHeader 
          title="🧩 Moduler" 
          subtitle="Hantera och aktivera olika funktionsmoduler i ditt system"
        />
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Laddar moduldata...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content">
        <PageHeader 
          title="🧩 Moduler" 
          subtitle="Hantera och aktivera olika funktionsmoduler i ditt system"
        />
        <div className="error-banner">
          <span>⚠️ Fel vid laddning av moduler: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <PageHeader 
        title="🧩 Moduler" 
        subtitle="Hantera och aktivera olika funktionsmoduler i ditt system"
      />

      <div className="modules-container">
        <div className="modules-status">
          <div className="modules-status__item">
            <span className="modules-status__count">
              {availableModules ? 
                availableModules.available_modules.filter(m => 
                  ['recipes', 'analytics'].includes(m.id) && m.available
                ).length 
                : 0}
            </span>
            <span className="modules-status__label">Aktiva moduler</span>
          </div>
          <div className="modules-status__item">
            <span className="modules-status__count">0</span>
            <span className="modules-status__label">Beta-moduler</span>
          </div>
          <div className="modules-status__item">
            <span className="modules-status__count">
              {availableModules ? 
                availableModules.available_modules.filter(m => 
                  ['sales', 'advanced_analytics', 'mobile_app', 'integrations'].includes(m.id) && m.available
                ).length 
                : 0}
            </span>
            <span className="modules-status__label">Kommer snart</span>
          </div>
        </div>

        <div className="modules-section">
          <h2>Aktiva Moduler</h2>
          <div className="modules-grid">
            {/* Only show Recipes module if available */}
            {isModuleAvailable('recipes') && (
              <DualButtonModule
                icon="🍽️"
                title="Recepthantering"
                description="Komplett hantering av ingredienser, recept och menyartiklar"
                status={getActualModuleStatus('recipes').active ? "active" : "available"}
                currentTier={getActualModuleStatus('recipes').hasSubscription ? getActualModuleStatus('recipes').tier : 'free'}
                features={[]}
                freeFeatures={[
                  "50 ingredienser maximum",
                  "5 recept maximum", 
                  "2 menyartiklar maximum",
                  "Grundläggande kostnadsberäkning",
                  "Standard portionsstorlekar"
                ]}
                proFeatures={[
                  "Obegränsat antal ingredienser",
                  "Obegränsat antal recept",
                  "Obegränsade menyartiklar",
                  "Avancerad näringsanalys",
                  "Automatisk leverantörsintegration", 
                  "Realtids prisuppdateringar",
                  "Avancerad marginalanalys",
                  "Export till kalkylark"
                ]}
                onFreeClick={() => handleModuleActivation('recipes', 'free')}
                onProClick={() => handleModuleActivation('recipes', 'pro')}
                isLoading={loading}
              />
            )}
            
            {/* Only show Analytics module if available */}
            {isModuleAvailable('analytics') && (
              <DualButtonModule
                icon="📈"
                title="Kostnadsanalys"
                description="Djupgående analys av kostnader och lönsamhet"
                status={getActualModuleStatus('analytics').active ? "active" : "available"}
                currentTier={getActualModuleStatus('analytics').hasSubscription ? getActualModuleStatus('analytics').tier : 'free'}
                features={[]}
                freeFeatures={[
                  "Grundläggande rapporter",
                  "Månadsvis analys",
                  "Standard marginalanalys"
                ]}
                proFeatures={[
                  "Realtidskostnadsberäkning",
                  "Daglig trendspårning",
                  "Jämförelser och benchmarks",
                  "Prediktiv analys"
                ]}
                onFreeClick={() => handleModuleActivation('analytics', 'free')}
                onProClick={() => handleModuleActivation('analytics', 'pro')}
                isLoading={loading}
              />
            )}
          </div>
        </div>

        <div className="modules-section">
          <h2>Beta-moduler</h2>
          <div className="modules-grid">
            {/* SuperAdmin removed - not a module, it's an administrative function accessible via role permissions */}
            {/* Quality control test comment */}
          </div>
        </div>

        <div className="modules-section">
          <h2>Kommer Snart</h2>
          <div className="modules-grid">
            {/* Only show Sales module if available */}
            {isModuleAvailable('sales') && (
              <DualButtonModule
                icon="💰"
                title="Försäljningsmodul"
                description="Komplett försäljningshantering med CRM"
                status="coming-soon"
                features={[]}
                freeFeatures={[
                  "10 kunder maximum",
                  "Grundläggande orderhantering",
                  "Standard försäljningsrapporter"
                ]}
                proFeatures={[
                  "Obegränsade kunder",
                  "Avancerad CRM-funktionalitet",
                  "Automatisk fakturering",
                  "Integrationer med kassasystem"
                ]}
                proPrice="499 kr/månad"
                onFreeClick={() => handleModuleActivation('sales', 'free')}
                onProClick={() => handleModuleActivation('sales', 'pro')}
                isLoading={loading}
              />
            )}
            
            {/* Only show Advanced Analytics module if available */}
            {isModuleAvailable('advanced_analytics') && (
              <DualButtonModule
                icon="📊"
                title="Advanced Analytics"
                description="Djupgående dataanalys och AI-insights"
                status="coming-soon"
                features={[]}
                freeFeatures={[
                  "Grundläggande trendanalys",
                  "Månadsrapporter",
                  "Standard prognoser"
                ]}
                proFeatures={[
                  "Prediktiv analys och prognoser",
                  "Automatisk trend-detection",
                  "Personaliserade AI-rekommendationer",
                  "Export till Business Intelligence"
                ]}
                proPrice="599 kr/månad"
                onFreeClick={() => handleModuleActivation('advanced_analytics', 'free')}
                onProClick={() => handleModuleActivation('advanced_analytics', 'pro')}
                isLoading={loading}
              />
            )}
            
            {/* Only show Mobile App module if available */}
            {isModuleAvailable('mobile_app') && (
              <DualButtonModule
                icon="📱"
                title="Mobilapp"
                description="Hantera verksamheten från mobilen"
                status="coming-soon"
                features={[]}
                freeFeatures={[
                  "Grundläggande ingrediensvisning",
                  "Enkel receptsökning",
                  "Basic notifikationer"
                ]}
                proFeatures={[
                  "Fullständig ingredienshantering",
                  "Avancerad receptsökning",
                  "Push-notifikationer",
                  "Offline-läge för viktiga data"
                ]}
                proPrice="199 kr/månad"
                onFreeClick={() => handleModuleActivation('mobile_app', 'free')}
                onProClick={() => handleModuleActivation('mobile_app', 'pro')}
                isLoading={loading}
              />
            )}
            
            {/* Only show Integrations module if available */}
            {isModuleAvailable('integrations') && (
              <DualButtonModule
                icon="🔄"
                title="Integrationer"
                description="Anslut till externa system och tjänster"
                status="coming-soon"
                features={[]}
                freeFeatures={[
                  "1 integration maximum",
                  "Grundläggande API-access",
                  "Manuell datasynk"
                ]}
                proFeatures={[
                  "Obegränsade integrationer",
                  "Fullständig API för utvecklare",
                  "Automatisk datasynkronisering",
                  "Premium partnertjänster"
                ]}
                proPrice="399 kr/månad"
                onFreeClick={() => handleModuleActivation('integrations', 'free')}
                onProClick={() => handleModuleActivation('integrations', 'pro')}
                isLoading={loading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}