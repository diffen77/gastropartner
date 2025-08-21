import React, { useEffect, useState } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { AuthForm } from './components/Auth/AuthForm';
import { OrganizationSelector } from './components/Organizations/OrganizationSelector';
import { OnboardingFlow } from './components/UserTesting/OnboardingFlow';
import { Sidebar } from './components/Sidebar';
import { MetricsCard } from './components/MetricsCard';
import { SearchableTable, TableColumn } from './components/SearchableTable';
import { EmptyState } from './components/EmptyState';
import { FeedbackButton } from './components/UserTesting/FeedbackButton';
import ModuleProtectedRoute from './components/ModuleProtectedRoute';
import SuperAdminDashboard from './components/SuperAdmin/SuperAdminDashboard';
import { SuperAdmin } from './pages/SuperAdmin';
import FreemiumTest from './pages/FreemiumTest';
import { Ingredients } from './pages/Ingredients';
import { Recipes } from './pages/Recipes';
import { MenuItems } from './pages/MenuItems';
import CostControlDashboard from './components/CostControl/CostControlDashboard';
import UserTestingDashboard from './pages/UserTestingDashboard';
import { Sales } from './pages/Sales';
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

function OnboardingPage() {
  const { completeOnboarding, createOrganization, refreshOrganizations, getOrganizations } = useAuth();
  
  const handleOnboardingComplete = async (data: any) => {
    try {
      // Always refresh organizations first to get latest data
      await refreshOrganizations();
      
      // Make a direct API call to get fresh organization data instead of relying on state
      let userHasOrganization = false;
      try {
        const freshOrgs = await getOrganizations();
        userHasOrganization = freshOrgs && freshOrgs.length > 0;
        console.log('🏢 Fresh organization check:', userHasOrganization ? 'User has organizations' : 'User has no organizations');
      } catch (orgCheckError) {
        console.warn('Could not check organizations, assuming none exist:', orgCheckError);
        userHasOrganization = false;
      }
      
      // Only try to create organization if user doesn't have any
      if (!userHasOrganization && data?.name) {
        console.log('🏢 Creating organization from restaurant data:', data.name);
        await createOrganization(data.name, `${data.type} (${data.size})`);
      } else if (userHasOrganization) {
        console.log('🏢 User already has organization, skipping creation');
      }
      
      await completeOnboarding();
      // Use navigate instead of direct window location
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      // Always try to complete onboarding regardless of organization creation error
      console.log('🏢 Attempting to complete onboarding regardless of error');
      try {
        // Final attempt: refresh organizations and complete onboarding
        await refreshOrganizations();
        await completeOnboarding();
        window.location.href = '/';
      } catch (completionError) {
        console.error('Final attempt to complete onboarding failed:', completionError);
        // Last resort: just mark as completed locally and redirect
        localStorage.setItem('onboarding_completed', 'true');
        console.log('🚨 Emergency fallback: Onboarding marked as completed locally');
        window.location.href = '/';
      }
    }
  };
  
  const handleOnboardingSkip = async () => {
    try {
      // Always refresh organizations first to get latest data
      await refreshOrganizations();
      
      // Make a direct API call to get fresh organization data instead of relying on state
      let userHasOrganization = false;
      try {
        const freshOrgs = await getOrganizations();
        userHasOrganization = freshOrgs && freshOrgs.length > 0;
        console.log('🏢 Fresh organization check (skip):', userHasOrganization ? 'User has organizations' : 'User has no organizations');
      } catch (orgCheckError) {
        console.warn('Could not check organizations, assuming none exist:', orgCheckError);
        userHasOrganization = false;
      }
      
      // Only try to create organization if user doesn't have any
      if (!userHasOrganization) {
        console.log('🏢 Creating default organization for skipped onboarding');
        await createOrganization('My Restaurant', 'Default organization');
      } else {
        console.log('🏢 User already has organization, skipping creation');
      }
      
      await completeOnboarding();
      // Use navigate instead of direct window location  
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      // Always try to complete onboarding regardless of error
      console.log('🏢 Attempting to complete onboarding regardless of error (skip)');
      try {
        // Final attempt: refresh organizations and complete onboarding
        await refreshOrganizations();
        await completeOnboarding();
        window.location.href = '/';
      } catch (completionError) {
        console.error('Final attempt to complete onboarding failed:', completionError);
        // Last resort: just mark as completed locally and redirect
        localStorage.setItem('onboarding_completed', 'true');
        console.log('🚨 Emergency fallback: Onboarding marked as completed locally (skip)');
        window.location.href = '/';
      }
    }
  };
  
  return (
    <OnboardingFlow 
      onComplete={handleOnboardingComplete}
      onSkip={handleOnboardingSkip}
    />
  );
}

// Onboarding wrapper component
function OnboardingWrapper({ children }: { children: React.ReactNode }) {
  const { hasCompletedOnboarding, onboardingLoading } = useAuth();
  
  // Show loading state while onboarding status is being determined
  if (hasCompletedOnboarding === null || onboardingLoading) {
    return (
      <div className="onboarding-loading">
        <div className="loading-spinner"></div>
        <p>Kontrollerar onboarding status...</p>
      </div>
    );
  }
  
  // Redirect to onboarding if not completed
  if (!hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }
  
  // Show main app if onboarding is completed
  return <>{children}</>;
}

// Main app routes with module protection
function MainAppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route 
        path="/ingredienser" 
        element={
          <ModuleProtectedRoute moduleId="ingredients">
            <Ingredients />
          </ModuleProtectedRoute>
        } 
      />
      <Route 
        path="/recept" 
        element={
          <ModuleProtectedRoute moduleId="recipes">
            <Recipes />
          </ModuleProtectedRoute>
        } 
      />
      <Route 
        path="/matratter" 
        element={
          <ModuleProtectedRoute moduleId="menu">
            <MenuItems />
          </ModuleProtectedRoute>
        } 
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
        path="/user-testing" 
        element={
          <ModuleProtectedRoute moduleId="user_testing">
            <UserTestingDashboard />
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
      <Route path="/moduler" element={<Modules />} />
      <Route path="/installningar" element={<Settings />} />
      <Route path="/upgrade" element={<Upgrade />} />
      <Route 
        path="/superadmin" 
        element={
          <ModuleProtectedRoute moduleId="super_admin">
            <SuperAdminDashboard />
          </ModuleProtectedRoute>
        } 
      />
      <Route 
        path="/superadmin/feature-flags" 
        element={
          <ModuleProtectedRoute moduleId="super_admin">
            <SuperAdmin />
          </ModuleProtectedRoute>
        } 
      />
      <Route path="/freemium-test" element={<FreemiumTest />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
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
          
          {/* Protected onboarding route */}
          <Route 
            path="/onboarding" 
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected main app routes */}
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <OnboardingWrapper>
                  <div className="app-layout">
                    <Sidebar />
                    <main className="app-main">
                      <MainAppRoutes />
                      <FeedbackButton />
                    </main>
                  </div>
                </OnboardingWrapper>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
