import React, { useEffect, useState, useCallback } from 'react';
import './App.css';
import './styles/mobile-enhancements.css';
// Quality control system test - validation triggers automatically after changes
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { MobileMenuProvider, useMobileMenu } from './contexts/MobileMenuContext';
import { ModuleSettingsProvider } from './contexts/ModuleSettingsContext';
import { useFreemiumService } from './hooks/useFreemiumService';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { AuthForm } from './components/Auth/AuthForm';
import { OrganizationSelector } from './components/Organizations/OrganizationSelector';
import { Sidebar } from './components/Sidebar';
import { MetricsCard } from './components/MetricsCard';
import { SearchableTable, TableColumn } from './components/SearchableTable';
import { EmptyState } from './components/EmptyState';
import ModuleProtectedRoute from './components/ModuleProtectedRoute';
import { SuperAdmin } from './pages/SuperAdmin';
import FreemiumTest from './pages/FreemiumTest';
// Import working functional components
import { RecipeManagement } from './pages/RecipeManagement';
import CostControlDashboard from './components/CostControl/CostControlDashboard';
import { Sales } from './pages/Sales';
import { Reports } from './pages/Reports';
import { Analytics } from './pages/Analytics';
import { Modules } from './pages/Modules';
import { Settings } from './pages/Settings';
import Upgrade from './pages/Upgrade';
import Status from './pages/Status';
import { apiClient, MenuItem } from './utils/api';


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

function Dashboard() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState<string>('');

  const loadMenuItems = async () => {
    try {
      const items = await apiClient.getMenuItems();
      setMenuItems(items);
      setError('');
    } catch (err) {
      console.error('Failed to load menu items:', err);
      setError('Kunde inte ladda maträtter');
    }
  };

  useEffect(() => {
    // Ladda maträtter
    loadMenuItems();
  }, []);


  const columns: TableColumn[] = [
    { key: 'name', label: 'Namn', sortable: true },
    { key: 'margin_percentage', label: 'Marginal %', sortable: true },
    { key: 'margin', label: 'Marginal kr', sortable: true },
    { key: 'selling_price', label: 'Pris', sortable: true },
  ];

  // Transform menu items for the table
  const tableData = menuItems.map(item => ({
    name: item.name,
    margin_percentage: item.margin_percentage != null && typeof item.margin_percentage === 'number' 
      ? `${item.margin_percentage.toFixed(1)}%` 
      : '-',
    margin: item.margin != null && typeof item.margin === 'number' 
      ? `${item.margin.toFixed(0)} kr` 
      : '-',
    selling_price: item.selling_price != null && typeof item.selling_price === 'number'
      ? `${item.selling_price.toFixed(0)} kr`
      : '-',
    category: item.category,
  }));

  // Calculate metrics
  const activeItems = menuItems.filter(item => item.is_active);
  
  // Helper function to safely get numeric value
  const getNumericValue = (value: number | undefined | null): number => {
    return typeof value === 'number' && !isNaN(value) ? value : 0;
  };
  
  const avgMargin = activeItems.length > 0 
    ? activeItems.reduce((sum, item) => sum + getNumericValue(item.margin_percentage), 0) / activeItems.length 
    : 0;
  
  const bestItem = activeItems.reduce((best, item) => 
    getNumericValue(item.margin_percentage) > getNumericValue(best?.margin_percentage) ? item : best, null as MenuItem | null);
  
  const worstItem = activeItems.reduce((worst, item) => 
    getNumericValue(item.margin_percentage) < getNumericValue(worst?.margin_percentage) ? item : worst, null as MenuItem | null);
  
  const profitableCount = activeItems.filter(item => getNumericValue(item.margin_percentage) > 30).length;

  return (
    <div className="main-content">
      <PageHeader 
        title="Maträtter" 
        subtitle="Skapa maträtter från dina recept"
      />

      <div className="dashboard-content">
        <OrganizationSelector />
        
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}
        
        <div className="metrics-grid">
          <MetricsCard
            icon="📊"
            title="GENOMSNITTLIG MARGINAL"
            value={`${avgMargin.toFixed(1)}%`}
            subtitle={activeItems.length > 0 ? `${(activeItems.reduce((sum, item) => sum + getNumericValue(item.margin), 0) / activeItems.length).toFixed(0)} kr/portion` : "0.00 kr/portion"}
            color={avgMargin > 30 ? "success" : avgMargin > 15 ? "warning" : "danger"}
          />
          <MetricsCard
            icon="🍽️"
            title="BÄSTA MATTRÄTT"
            value={bestItem ? bestItem.name : "Ingen data"}
            subtitle={bestItem && bestItem.margin_percentage != null && typeof bestItem.margin_percentage === 'number' 
              ? `${bestItem.margin_percentage.toFixed(1)}%` 
              : undefined}
            color="success"
          />
          <MetricsCard
            icon="📈"
            title="SÄMSTA MATTRÄTT"
            value={worstItem ? worstItem.name : "Ingen data"}
            subtitle={worstItem && worstItem.margin_percentage != null && typeof worstItem.margin_percentage === 'number' 
              ? `${worstItem.margin_percentage.toFixed(1)}%` 
              : undefined}
            color="danger"
          />
          <MetricsCard
            icon="💰"
            title="LÖNSAMHETSFÖRDELNING"
            value={profitableCount.toString()}
            subtitle="Lönsamma"
            trend="neutral"
            color="success"
          />
        </div>

        <div className="table-section">
          {tableData.length === 0 ? (
            <EmptyState
              icon="👨‍🍳"
              title="Inga maträtter än"
              description="Skapa din första matträtt från dina recept"
            />
          ) : (
            <SearchableTable
              columns={columns}
              data={tableData}
              searchPlaceholder="Sök maträtter..."
              emptyMessage="Inga maträtter hittades"
            />
          )}
        </div>
      </div>

    </div>
  );
}

function LoginPage() {
  const [authMode, setAuthMode] = React.useState<'login' | 'register'>('login');

  return (
    <div className="protected-route__auth">
      <div className="auth-container">
        <div className="auth-container__header">
          <h1>GastroPartner</h1>
          <p>SaaS för restauranger och livsmedelsproducenter</p>
        </div>
        <AuthForm mode={authMode} onModeChange={setAuthMode} />
      </div>
    </div>
  );
}


// Mobile header component
function MobileHeader() {
  const { toggle } = useMobileMenu();

  return (
    <header className="mobile-header">
      <button
        className="mobile-header__menu-button"
        onClick={toggle}
        aria-label="Öppna navigeringsmeny"
      >
        <span className="mobile-header__menu-icon">☰</span>
      </button>
      <div className="mobile-header__title">
        <span className="mobile-header__logo">🍽️</span>
        <span className="mobile-header__brand">GastroPartner</span>
      </div>
    </header>
  );
}

// Main app routes with module protection
function MainAppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route 
        path="/recepthantering" 
        element={<RecipeManagement />}
      />
      {/* Backward compatibility redirects */}
      <Route
        path="/ingredienser"
        element={<Navigate to="/recepthantering?tab=ingredients" replace />}
      />
      <Route
        path="/recept"
        element={<Navigate to="/recepthantering?tab=recipes" replace />}
      />
      <Route
        path="/matratter"
        element={<Navigate to="/recepthantering?tab=menu-items" replace />}
      />
      <Route 
        path="/kostnadsanalys" 
        element={
          <ModuleProtectedRoute moduleId="analytics">
            <CostControlDashboard />
          </ModuleProtectedRoute>
        } 
      />
      <Route 
        path="/forsaljning" 
        element={
          <ModuleProtectedRoute moduleId="sales">
            <Sales />
          </ModuleProtectedRoute>
        } 
      />
      <Route
        path="/rapporter"
        element={
          <ModuleProtectedRoute moduleId="analytics">
            <Reports />
          </ModuleProtectedRoute>
        }
      />
      <Route
        path="/analys"
        element={
          <ModuleProtectedRoute moduleId="analytics">
            <Analytics />
          </ModuleProtectedRoute>
        }
      />
      <Route path="/moduler" element={<Modules />} />
      <Route path="/installningar" element={<Settings />} />
      <Route path="/upgrade" element={<Upgrade />} />
      <Route 
        path="/superadmin" 
        element={<SuperAdmin />}
      />
      <Route 
        path="/superadmin/dashboard" 
        element={<Navigate to="/superadmin" replace />}
      />
      <Route path="/freemium-test" element={<FreemiumTest />} />
    </Routes>
  );
}

// Wrapper component to handle module sync
function ModuleSyncWrapper({ children }: { children: React.ReactNode }) {
  const { refreshSubscriptions } = useFreemiumService();

  // Callback to sync freemium data when module settings change
  const handleModuleStatusChanged = useCallback(async (moduleId: string, enabled: boolean) => {
    console.log(`🔄 Module ${moduleId} status changed to ${enabled}, syncing freemium data...`);
    await refreshSubscriptions();
  }, [refreshSubscriptions]);

  return (
    <ModuleSettingsProvider onModuleStatusChanged={handleModuleStatusChanged}>
      {children}
    </ModuleSettingsProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <ModuleSyncWrapper>
        <Router>
        <Routes>
          {/* Public route for authentication */}
          <Route 
            path="/login" 
            element={<LoginPage />} 
          />
          
          {/* Public status page */}
          <Route 
            path="/status" 
            element={<Status />} 
          />
          
          
          {/* Protected main app routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MobileMenuProvider>
                  <div className="app-layout">
                    <MobileHeader />
                    <Sidebar />
                    <main className="app-main">
                      <MainAppRoutes />
                    </main>
                  </div>
                </MobileMenuProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
        </Router>
      </ModuleSyncWrapper>
    </AuthProvider>
  );
}

export default App;
