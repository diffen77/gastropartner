import React from 'react';
import { Navigate } from 'react-router-dom';
import { useModuleSettings } from '../contexts/ModuleSettingsContext';
import { useGlobalFeatureFlags } from '../hooks/useGlobalFeatureFlags';

interface ModuleProtectedRouteProps {
  children: React.ReactNode;
  moduleId: string;
  fallbackPath?: string;
  showDisabledMessage?: boolean;
}

const ModuleDisabledMessage: React.FC<{ 
  moduleId: string; 
  isGloballyDisabled?: boolean; 
}> = ({ moduleId, isGloballyDisabled = false }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '2rem',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    margin: '2rem'
  }}>
    <div style={{
      fontSize: '3rem',
      marginBottom: '1rem',
      opacity: 0.5
    }}>
      🚫
    </div>
    <h2 style={{
      fontSize: '1.5rem',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '0.5rem'
    }}>
      {isGloballyDisabled ? 'Modulen är inte tillgänglig' : 'Modulen är inaktiverad'}
    </h2>
    <p style={{
      color: '#6b7280',
      marginBottom: '1.5rem',
      maxWidth: '400px'
    }}>
      {isGloballyDisabled 
        ? `Modulen "${moduleId}" är för närvarande inte tillgänglig. Den är under utveckling och kommer att vara tillgänglig snart.`
        : `Modulen "${moduleId}" är för närvarande inaktiverad för din organisation. Kontakta en administratör för att aktivera den.`
      }
    </p>
    {!isGloballyDisabled && (
      <a
        href="/installningar"
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          transition: 'background-color 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
      >
        Gå till Inställningar
      </a>
    )}
  </div>
);

export const ModuleProtectedRoute: React.FC<ModuleProtectedRouteProps> = ({
  children,
  moduleId,
  fallbackPath = '/',
  showDisabledMessage = true
}) => {
  const { isModuleEnabled, loading: moduleSettingsLoading } = useModuleSettings();
  const { isModuleGloballyAvailable, loading: globalFlagsLoading } = useGlobalFeatureFlags();

  // Show loading state while checking module status
  if (moduleSettingsLoading || globalFlagsLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        color: '#6b7280'
      }}>
        Laddar...
      </div>
    );
  }

  // 🚨 CRITICAL: TWO-LEVEL MODULE VALIDATION
  // LEVEL 1: Check global feature flag first (SuperAdmin control)
  const globallyAvailable = isModuleGloballyAvailable(moduleId as any);
  
  if (!globallyAvailable) {
    // Module is globally disabled by SuperAdmin - not available for any organization
    if (showDisabledMessage) {
      return <ModuleDisabledMessage moduleId={moduleId} isGloballyDisabled={true} />;
    } else {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // LEVEL 2: Check organization-specific setting
  const orgModuleEnabled = isModuleEnabled(moduleId);
  
  if (!orgModuleEnabled) {
    // Module is globally available but disabled for this organization
    if (showDisabledMessage) {
      return <ModuleDisabledMessage moduleId={moduleId} isGloballyDisabled={false} />;
    } else {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // ✅ Module is both globally available AND enabled for this organization
  return <>{children}</>;
};

export default ModuleProtectedRoute;