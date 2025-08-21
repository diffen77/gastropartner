import React from 'react';
import DualButtonModule from '../components/Modules/DualButtonModule';
import { useFreemiumService } from '../hooks/useFreemiumService';
import { useUsageLimits } from '../hooks/useUsageLimits';

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
    loading,
    error,
    activateModule,
    refreshSubscriptions,
    getModuleStatus
  } = useFreemiumService();
  
  const { usageData, isNearLimit, getUsagePercentage, refreshUsage } = useUsageLimits();

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
  if (loading) {
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
            <span className="modules-status__count">4</span>
            <span className="modules-status__label">Aktiva moduler</span>
          </div>
          <div className="modules-status__item">
            <span className="modules-status__count">2</span>
            <span className="modules-status__label">Beta-moduler</span>
          </div>
          <div className="modules-status__item">
            <span className="modules-status__count">6</span>
            <span className="modules-status__label">Kommer snart</span>
          </div>
        </div>

        <div className="modules-section">
          <h2>Aktiva Moduler</h2>
          <div className="modules-grid">
            <DualButtonModule
              icon="🥕"
              title="Ingredienshantering"
              description="Hantera ingredienser, leverantörer och kostnader"
              status={getModuleStatus('ingredients').active ? "active" : "available"}
              currentTier={getModuleStatus('ingredients').tier}
              features={[]}
              freeFeatures={[
                "100 ingredienser maximum",
                "Grundläggande kategorier",
                "Manuell kostnadsinmatning"
              ]}
              proFeatures={[
                "Obegränsat antal ingredienser",
                "Automatisk leverantörsintegration",
                "Realtids prisuppdateringar",
                "Avancerad kostnadsspårning"
              ]}
              onFreeClick={() => handleModuleActivation('ingredients', 'free')}
              onProClick={() => handleModuleActivation('ingredients', 'pro')}
              isLoading={loading}
            />
            
            <DualButtonModule
              icon="📝"
              title="Recepthantering"
              description="Skapa och hantera recept med kostnadsberäkningar"
              status={getModuleStatus('recipes').active ? "active" : "available"}
              currentTier={getModuleStatus('recipes').tier}
              features={[]}
              freeFeatures={[
                "5 recept maximum",
                "Grundläggande kostnadsberäkning",
                "Standard portionsstorlekar"
              ]}
              proFeatures={[
                "Obegränsat antal recept",
                "Avancerad näringsanalys",
                "Batch-kostnadsberäkningar",
                "Export till kalkylark"
              ]}
              onFreeClick={() => handleModuleActivation('recipes', 'free')}
              onProClick={() => handleModuleActivation('recipes', 'pro')}
              isLoading={loading}
            />
            
            <DualButtonModule
              icon="🍽️"
              title="Menyhantering"
              description="Skapa maträtter och beräkna lönsamhet"
              status={getModuleStatus('menu').active ? "active" : "available"}
              currentTier={getModuleStatus('menu').tier}
              features={[]}
              freeFeatures={[
                "10 maträtter maximum",
                "Grundläggande prissättning",
                "Standard lönsamhetsanalys"
              ]}
              proFeatures={[
                "Obegränsat antal maträtter",
                "Dynamisk prissättning",
                "Avancerad marginalanalys",
                "Säsongsmeny och kampanjer"
              ]}
              onFreeClick={() => handleModuleActivation('menu', 'free')}
              onProClick={() => handleModuleActivation('menu', 'pro')}
              isLoading={loading}
            />
            
            <DualButtonModule
              icon="📈"
              title="Kostnadsanalys"
              description="Djupgående analys av kostnader och lönsamhet"
              status={getModuleStatus('analytics').active ? "active" : "available"}
              currentTier={getModuleStatus('analytics').tier}
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
          </div>
        </div>

        <div className="modules-section">
          <h2>Beta-moduler</h2>
          <div className="modules-grid">
            <DualButtonModule
              icon="🧪"
              title="User Testing"
              description="Samla användarfeedback och förbättra upplevelsen"
              status="beta"
              features={[]}
              freeFeatures={[
                "5 feedbackformulär per månad",
                "Grundläggande analytics",
                "Manual rapportering"
              ]}
              proFeatures={[
                "Obegränsade feedbackformulär",
                "Avancerad användaranalys",
                "A/B-testning av funktioner",
                "Automatiserad rapportering"
              ]}
              proPrice="199 kr/månad"
              onFreeClick={() => handleModuleActivation('user_testing', 'free')}
              onProClick={() => handleModuleActivation('user_testing', 'pro')}
              isLoading={loading}
            />
            
            <DualButtonModule
              icon="🛡️"
              title="SuperAdmin"
              description="Avancerade administratörsfunktioner"
              status="beta"
              features={[]}
              freeFeatures={[
                "Grundläggande användarhantering",
                "Standard systemkonfiguration",
                "Manuell säkerhetsövervakning"
              ]}
              proFeatures={[
                "Avancerad användarhantering",
                "Fullständig systemkonfiguration",
                "Realtids säkerhetsövervakning",
                "Automatisk dataexport och backup"
              ]}
              proPrice="399 kr/månad"
              onFreeClick={() => handleModuleActivation('super_admin', 'free')}
              onProClick={() => handleModuleActivation('super_admin', 'pro')}
              isLoading={loading}
            />
          </div>
        </div>

        <div className="modules-section">
          <h2>Kommer Snart</h2>
          <div className="modules-grid">
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
          </div>
        </div>
      </div>
    </div>
  );
}