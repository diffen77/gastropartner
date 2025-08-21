import React, { useState } from 'react';
import { useModuleSettings } from '../../hooks/useModuleSettings';
import './ModuleManager.css';

interface ModuleManagerProps {
  className?: string;
}

export const ModuleManager: React.FC<ModuleManagerProps> = ({ className }) => {
  const { 
    modules, 
    loading, 
    error, 
    updateModuleStatus,
    refreshSettings 
  } = useModuleSettings();
  
  const [updating, setUpdating] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const handleToggleModule = async (moduleId: string, enabled: boolean) => {
    
    setUpdating(moduleId);
    setUpdateError(null);
    setSuccessMessage(null);
    
    try {
      const success = await updateModuleStatus(moduleId, enabled);
      
      if (success) {
        const module = modules.find(m => m.id === moduleId);
        const message = `Modulen "${module?.display_name}" har ${enabled ? 'aktiverats' : 'inaktiverats'}.`;
        setSuccessMessage(message);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
        
        // Refresh settings to ensure UI is in sync
        await refreshSettings();
      } else {
        throw new Error('Failed to update module status');
      }
    } catch (err) {
      const errorMessage = `Kunde inte uppdatera modulen. Fel: ${err instanceof Error ? err.message : 'Okänt fel'}`;
      setUpdateError(errorMessage);
    } finally {
      setUpdating(null);
    }
  };

  const getModuleIcon = (moduleId: string): string => {
    const iconMap: Record<string, string> = {
      'ingredients': '🥕',
      'recipes': '📝', 
      'menu': '🍽️',
      'analytics': '📈',
      'user_testing': '🧪',
      'sales': '💰',
      'super_admin': '🛡️',
    };
    return iconMap[moduleId] || '🧩';
  };

  const getModuleStatus = (enabled: boolean): { text: string; color: string } => {
    return enabled 
      ? { text: 'Aktiverad', color: 'success' }
      : { text: 'Inaktiverad', color: 'danger' };
  };

  if (loading) {
    return (
      <div className={`module-manager ${className || ''}`}>
        <div className="module-manager__loading">
          <div className="loading-spinner"></div>
          <p>Laddar modulinställningar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`module-manager ${className || ''}`}>
        <div className="alert alert--error">
          <p>⚠️ {error}</p>
          <button 
            className="btn btn--secondary btn--small"
            onClick={refreshSettings}
          >
            Försök igen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`module-manager ${className || ''}`}>
      <div className="module-manager__header">
        <h3 className="module-manager__title">Modulhantering</h3>
        <p className="module-manager__description">
          Aktivera eller inaktivera funktionsmoduler för din organisation. 
          Inaktiverade moduler kommer inte att visas i navigeringen.
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="alert alert--success">
          ✅ {successMessage}
        </div>
      )}
      
      {updateError && (
        <div className="alert alert--error">
          ❌ {updateError}
        </div>
      )}

      <div className="module-manager__grid">
        {modules.map((module) => {
          const isUpdating = updating === module.id;
          const status = getModuleStatus(module.enabled);
          
          return (
            <div 
              key={module.id} 
              className={`module-card ${module.enabled ? 'module-card--enabled' : 'module-card--disabled'}`}
            >
              <div className="module-card__header">
                <div className="module-card__icon">
                  {getModuleIcon(module.id)}
                </div>
                <div className="module-card__info">
                  <h4 className="module-card__title">{module.display_name}</h4>
                  <p className="module-card__description">{module.description}</p>
                </div>
                <div className="module-card__status">
                  <span className={`badge badge--${status.color}`}>
                    {status.text}
                  </span>
                </div>
              </div>
              
              <div className="module-card__actions">
                <label className="toggle toggle--large">
                  <input
                    type="checkbox"
                    checked={module.enabled}
                    onChange={(e) => handleToggleModule(module.id, e.target.checked)}
                    disabled={isUpdating}
                  />
                  <span className={`toggle__slider ${isUpdating ? 'toggle__slider--loading' : ''}`}>
                    {isUpdating && <div className="toggle__spinner"></div>}
                  </span>
                </label>
                <span className="module-card__toggle-label">
                  {isUpdating ? 'Uppdaterar...' : (module.enabled ? 'Aktiverad' : 'Inaktiverad')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="module-manager__footer">
        <div className="module-manager__info">
          <p>
            <strong>📋 Totalt:</strong> {modules.length} moduler tillgängliga
          </p>
          <p>
            <strong>✅ Aktiverade:</strong> {modules.filter(m => m.enabled).length} moduler
          </p>
          <p>
            <strong>⚠️ Observera:</strong> Ändringar träder i kraft omedelbart. 
            Användare som har inaktiverade moduler öppna kommer att omdirigeras till startsidan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModuleManager;