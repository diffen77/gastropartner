import React, { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import { ModuleName } from '../utils/modulesApi';
import { useModuleSettings } from '../contexts/ModuleSettingsContext';
import '../styles/feature-flags.css';

interface GlobalModule {
  name: ModuleName;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  category: 'core' | 'analytics' | 'sales' | 'integrations';
}

export function SuperAdmin() {
  const { modules, updateModuleStatus, loading: moduleLoading } = useModuleSettings();
  const [loading, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);

  // Map ModuleConfig to GlobalModule format
  const globalModules: GlobalModule[] = [
    {
      name: 'recipes',
      title: 'Recepthantering',
      description: 'Komplett hantering av ingredienser, recept och menyartiklar',
      icon: '🍽️',
      enabled: modules.find(m => m.id === 'recipes')?.enabled ?? true,
      category: 'core'
    },
    {
      name: 'analytics',
      title: 'Kostnadsanalys',
      description: 'Djupgående analys av kostnader och lönsamhet',
      icon: '📈',
      enabled: modules.find(m => m.id === 'analytics')?.enabled ?? false,
      category: 'analytics'
    },
    {
      name: 'sales',
      title: 'Försäljningsmodul',
      description: 'Komplett försäljningshantering med CRM',
      icon: '💰',
      enabled: modules.find(m => m.id === 'sales')?.enabled ?? false,
      category: 'sales'
    },
    {
      name: 'advanced_analytics',
      title: 'Advanced Analytics',
      description: 'Djupgående dataanalys och AI-insights',
      icon: '📊',
      enabled: false, // Not in ModuleSettingsContext, keep disabled
      category: 'analytics'
    },
    {
      name: 'mobile_app',
      title: 'Mobilapp',
      description: 'Hantera verksamheten från mobilen',
      icon: '📱',
      enabled: false, // Not in ModuleSettingsContext, keep disabled
      category: 'integrations'
    },
    {
      name: 'integrations',
      title: 'Integrationer',
      description: 'Anslut till externa system och tjänster',
      icon: '🔄',
      enabled: false, // Not in ModuleSettingsContext, keep disabled
      category: 'integrations'
    }
  ];

  const handleModuleToggle = async (moduleName: ModuleName, enabled: boolean) => {
    setLoading(true);
    try {
      // Map ModuleName to module_id format used in ModuleSettingsContext
      const moduleIdMap: Record<string, string> = {
        'recipes': 'recipes',
        'analytics': 'analytics', 
        'sales': 'sales',
        'ingredients': 'ingredients',
        'menu': 'menu'
      };

      const moduleId = moduleIdMap[moduleName];
      if (moduleId) {
        const success = await updateModuleStatus(moduleId, enabled);
        if (!success) {
          throw new Error('Failed to update module status');
        }
      }
      
      console.log(`Global module ${moduleName} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error('Error updating global module:', err);
      setError(`Kunde inte uppdatera modul ${moduleName}`);
    } finally {
      setLoading(false);
    }
  };

  const getModulesByCategory = (category: string) => {
    return globalModules.filter(module => module.category === category);
  };

  const getEnabledCount = () => {
    return globalModules.filter(module => module.enabled).length;
  };

  return (
    <RoleProtectedRoute 
      requiredRole="system_admin"
      fallbackMessage="Endast systemadministratörer har tillgång till globala modulinställningar."
    >
      <div className="main-content">
        <PageHeader 
          title="🌐 Globala Standardvärden" 
          subtitle="Hantera vilka moduler som är tillgängliga för alla organisationer"
        />

        <div className="global-modules-container">
          {/* Status Overview */}
          <div className="modules-status">
            <div className="modules-status__item">
              <span className="modules-status__count">{getEnabledCount()}</span>
              <span className="modules-status__label">Aktiverade moduler</span>
            </div>
            <div className="modules-status__item">
              <span className="modules-status__count">{globalModules.length - getEnabledCount()}</span>
              <span className="modules-status__label">Inaktiverade moduler</span>
            </div>
            <div className="modules-status__item">
              <span className="modules-status__count">{globalModules.length}</span>
              <span className="modules-status__label">Totalt moduler</span>
            </div>
          </div>

          {/* Core Modules */}
          <div className="modules-section">
            <h2>Kärnmoduler</h2>
            <p className="modules-section__description">
              Grundläggande funktionalitet som organisationer behöver
            </p>
            <div className="global-modules-grid">
              {getModulesByCategory('core').map(module => (
                <GlobalModuleCard
                  key={module.name}
                  module={module}
                  onToggle={handleModuleToggle}
                  isLoading={loading || moduleLoading}
                />
              ))}
            </div>
          </div>

          {/* Analytics Modules */}
          <div className="modules-section">
            <h2>Analysmoduler</h2>
            <p className="modules-section__description">
              Dataanalys och affärsintelligens
            </p>
            <div className="global-modules-grid">
              {getModulesByCategory('analytics').map(module => (
                <GlobalModuleCard
                  key={module.name}
                  module={module}
                  onToggle={handleModuleToggle}
                  isLoading={loading || moduleLoading}
                />
              ))}
            </div>
          </div>

          {/* Sales Modules */}
          <div className="modules-section">
            <h2>Försäljningsmoduler</h2>
            <p className="modules-section__description">
              CRM och försäljningshantering
            </p>
            <div className="global-modules-grid">
              {getModulesByCategory('sales').map(module => (
                <GlobalModuleCard
                  key={module.name}
                  module={module}
                  onToggle={handleModuleToggle}
                  isLoading={loading || moduleLoading}
                />
              ))}
            </div>
          </div>

          {/* Integration Modules */}
          <div className="modules-section">
            <h2>Integrations- och Tilläggsmoduler</h2>
            <p className="modules-section__description">
              Externa integrationer och mobil funktionalitet
            </p>
            <div className="global-modules-grid">
              {getModulesByCategory('integrations').map(module => (
                <GlobalModuleCard
                  key={module.name}
                  module={module}
                  onToggle={handleModuleToggle}
                  isLoading={loading || moduleLoading}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </RoleProtectedRoute>
  );
}

function GlobalModuleCard({ 
  module, 
  onToggle, 
  isLoading 
}: { 
  module: GlobalModule;
  onToggle: (moduleName: ModuleName, enabled: boolean) => void;
  isLoading: boolean;
}) {
  return (
    <div className={`global-module-card ${module.enabled ? 'enabled' : 'disabled'}`}>
      <div className="global-module-card__header">
        <div className="global-module-card__icon">{module.icon}</div>
        <div className="global-module-card__info">
          <h3 className="global-module-card__title">{module.title}</h3>
          <p className="global-module-card__description">{module.description}</p>
        </div>
      </div>
      
      <div className="global-module-card__actions">
        <div className="global-module-card__status">
          <span className={`status-badge ${module.enabled ? 'active' : 'inactive'}`}>
            {module.enabled ? '✅ Aktiverad' : '❌ Inaktiverad'}
          </span>
        </div>
        
        <button
          className={`toggle-button ${module.enabled ? 'enabled' : 'disabled'}`}
          onClick={() => onToggle(module.name, !module.enabled)}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="loading-spinner small"></div>
          ) : (
            <>
              <div className={`toggle-switch ${module.enabled ? 'on' : 'off'}`}>
                <div className="toggle-handle"></div>
              </div>
              <span>{module.enabled ? 'Inaktivera' : 'Aktivera'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}