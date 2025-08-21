import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFreemium } from '../hooks/useFreemium';
import { useOrganizationSettings } from '../hooks/useOrganizationSettings';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useTranslation } from '../localization/sv';
import PlanStatusWidget from './PlanStatusWidget';
import './Sidebar.css';

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  adminOnly?: boolean;
}

// Navigation items will be translated dynamically
const getNavigationItems = (t: (key: any) => string): NavigationItem[] => [
  { id: 'dashboard', label: t('dashboard'), icon: '📊', path: '/' },
  { id: 'ingredients', label: t('ingredients'), icon: '🥕', path: '/ingredienser' },
  { id: 'recipes', label: t('recipes'), icon: '📝', path: '/recept' },
  { id: 'dishes', label: t('menuItems'), icon: '🍽️', path: '/matratter' },
  { id: 'cost-control', label: t('costAnalysis'), icon: '📈', path: '/kostnadsanalys' },
  { id: 'user-testing', label: t('userTesting'), icon: '🧪', path: '/user-testing' },
  { id: 'sales', label: t('sales'), icon: '💰', path: '/forsaljning' },
  { id: 'modules', label: t('modules'), icon: '🧩', path: '/moduler' },
  { id: 'settings', label: t('settings'), icon: '⚙️', path: '/installningar' },
  { id: 'superadmin', label: t('superAdmin'), icon: '🛡️', path: '/superadmin', adminOnly: true },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  const { usage, fetchPlanComparison } = useFreemium();
  const { restaurantName } = useOrganizationSettings();
  const { featureFlags } = useFeatureFlags();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isSuperAdmin = user?.email?.toLowerCase() === 'diffen@me.com';

  const navigationItems = getNavigationItems(t);
  const visibleItems = navigationItems.filter(item => {
    // Filter admin-only items
    if (item.adminOnly && !isSuperAdmin) {
      return false;
    }
    
    // Filter items based on feature flags
    if (item.id === 'user-testing' && !featureFlags.show_user_testing) {
      return false;
    }
    if (item.id === 'sales' && !featureFlags.show_sales) {
      return false;
    }
    
    return true;
  });

  return (
    <aside className="sidebar">
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
        <div style={{ 
          marginTop: '8px', 
          fontSize: '11px', 
          color: '#6b7280', 
          textAlign: 'center' 
        }}>
          Recepthantering
        </div>
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
  );
}