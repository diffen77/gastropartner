import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFreemium } from '../hooks/useFreemium';
import PlanStatusWidget from './PlanStatusWidget';
import './Sidebar.css';

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  adminOnly?: boolean;
}

const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/' },
  { id: 'ingredients', label: 'Ingredienser', icon: '🥕', path: '/ingredienser' },
  { id: 'recipes', label: 'Recept', icon: '📝', path: '/recept' },
  { id: 'dishes', label: 'Maträtter', icon: '🍽️', path: '/matratter' },
  { id: 'cost-control', label: 'Kostnadsanalys', icon: '📈', path: '/kostnadsanalys' },
  { id: 'user-testing', label: 'User Testing', icon: '🧪', path: '/user-testing' },
  { id: 'sales', label: 'Försäljning', icon: '💰', path: '/forsaljning' },
  { id: 'modules', label: 'Moduler', icon: '🧩', path: '/moduler' },
  { id: 'settings', label: 'Inställningar', icon: '⚙️', path: '/installningar' },
  { id: 'superadmin', label: 'SuperAdmin', icon: '🛡️', path: '/superadmin', adminOnly: true },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  const { usage, fetchPlanComparison } = useFreemium();
  const location = useLocation();
  const navigate = useNavigate();
  const isSuperAdmin = user?.email?.toLowerCase() === 'diffen@me.com';

  const visibleItems = navigationItems.filter(item => 
    !item.adminOnly || (item.adminOnly && isSuperAdmin)
  );

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__logo">
          <span className="sidebar__logo-icon">🍽️</span>
          <div className="sidebar__brand">
            <h1 className="sidebar__brand-name">Härryda BBQ</h1>
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