import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFreemium } from '../hooks/useFreemium';
import { useOrganizationSettings } from '../hooks/useOrganizationSettings';
import { useModuleSettings } from '../contexts/ModuleSettingsContext';
import { useTranslation } from '../localization/sv';
import { useMobileMenu } from '../contexts/MobileMenuContext';
import PlanStatusWidget from './PlanStatusWidget';
import './Sidebar.css';

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  adminOnly?: boolean;
  moduleId?: string; // Maps to module_id for filtering
  requiresRole?: 'system_admin' | 'org_admin' | 'user'; // New role-based access control
}

// Navigation items will be translated dynamically
const getNavigationItems = (t: (key: any) => string): NavigationItem[] => [
  { id: 'dashboard', label: t('dashboard'), icon: '📊', path: '/' }, // Always visible
  { id: 'recipe-management', label: 'Recepthantering', icon: '🍽️', path: '/recepthantering', moduleId: 'recipes' },
  { id: 'cost-control', label: t('costAnalysis'), icon: '📈', path: '/kostnadsanalys', moduleId: 'analytics' },
  { id: 'analytics', label: 'Affärsanalys', icon: '📊', path: '/analys', moduleId: 'analytics' },
  { id: 'sales', label: t('sales'), icon: '💰', path: '/forsaljning', moduleId: 'sales' },
  { id: 'modules', label: t('modules'), icon: '🧩', path: '/moduler' }, // Always visible - settings page
  { id: 'settings', label: t('settings'), icon: '⚙️', path: '/installningar' }, // Always visible - settings page
  { id: 'systemadmin', label: t('systemAdmin'), icon: '🛡️', path: '/superadmin', requiresRole: 'system_admin' },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  const { usage, fetchPlanComparison } = useFreemium();
  const { restaurantName } = useOrganizationSettings();
  const { isModuleEnabled, loading: moduleLoading } = useModuleSettings();
  const { t } = useTranslation();
  const { isOpen, close } = useMobileMenu();
  const location = useLocation();
  const navigate = useNavigate();
  // Get user role - for now using legacy email check during transition
  const isSystemAdmin = user?.email?.toLowerCase() === 'diffen@me.com';
  // TODO: Replace with proper role checking from user_profiles table
  const getUserRole = (): 'system_admin' | 'org_admin' | 'user' => {
    if (isSystemAdmin) return 'system_admin';
    // TODO: Check if user is org admin based on user_organizations table
    return 'user';
  };
  const userRole = getUserRole();

  const navigationItems = getNavigationItems(t);
  const visibleItems = navigationItems.filter(item => {
    // Filter role-based items
    if (item.requiresRole) {
      switch (item.requiresRole) {
        case 'system_admin':
          return userRole === 'system_admin';
        case 'org_admin':
          return userRole === 'system_admin' || userRole === 'org_admin';
        default:
          return true;
      }
    }

    // Legacy admin-only items (for backward compatibility during transition)
    if (item.adminOnly && !isSystemAdmin) {
      return false;
    }

    // Filter items based on module settings (skip for system admin items)
    if (item.moduleId && !moduleLoading && !item.requiresRole) {
      // Only show if module is enabled
      if (!isModuleEnabled(item.moduleId)) {
        return false;
      }
    }

    return true;
  });

  // Close mobile menu when location changes
  useEffect(() => {
    close();
  }, [location.pathname, close]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="sidebar__mobile-overlay"
          onClick={close}
          aria-label="Stäng navigering"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__header">
        <div className="sidebar__logo">
          <span className="sidebar__logo-icon">🍽️</span>
          <div className="sidebar__brand">
            <h1 className="sidebar__brand-name">{restaurantName}</h1>
            <p className="sidebar__brand-subtitle">GastroPartner.nu</p>
          </div>
        </div>
      </div>

      <nav className="sidebar__nav">
        <ul className="sidebar__nav-list">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.id} className="sidebar__nav-item">
                <Link
                  to={item.path}
                  className={`sidebar__nav-link ${isActive ? 'sidebar__nav-link--active' : ''}`}
                >
                  <span className="sidebar__nav-icon">{item.icon}</span>
                  <span className="sidebar__nav-label">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar__plan-status" style={{ padding: '16px', marginTop: 'auto' }}>
        <PlanStatusWidget 
          plan={usage?.plan || 'free'} 
          compact={true}
          showUpgradeButton={usage?.plan !== 'premium'}
          onUpgrade={() => {
            fetchPlanComparison();
            navigate('/upgrade');
          }}
        />
      </div>

      <div className="sidebar__footer">
        <button 
          onClick={signOut}
          className="sidebar__logout"
        >
          <span className="sidebar__logout-icon">↗</span>
          <span className="sidebar__logout-label">Logga ut</span>
        </button>
      </div>
    </aside>
    </>
  );
}