import React, { useEffect, useState } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { OrganizationSelector } from './components/Organizations/OrganizationSelector';
import { Sidebar } from './components/Sidebar';
import { MetricsCard } from './components/MetricsCard';
import { SearchableTable, TableColumn } from './components/SearchableTable';
import { EmptyState } from './components/EmptyState';
import { MenuItemForm } from './components/MenuItems/MenuItemForm';
import SuperAdminDashboard from './components/SuperAdmin/SuperAdminDashboard';
import FreemiumTest from './pages/FreemiumTest';
import { apiClient, MenuItem, MenuItemCreate } from './utils/api';

interface ApiHealth {
  status: string;
  service: string;
  environment: string;
}

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
  const [apiStatus, setApiStatus] = useState<string>('checking...');
  const [apiData, setApiData] = useState<ApiHealth | null>(null);
  const [backendMessage, setBackendMessage] = useState<string>('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
    // Kontrollera backend health
    fetch(`${process.env.REACT_APP_API_URL}/health`)
      .then(res => res.json())
      .then((data: ApiHealth) => {
        setApiStatus(data.status);
        setApiData(data);
      })
      .catch(() => {
        setApiStatus('offline');
      });

    // Hämta root message
    fetch(`${process.env.REACT_APP_API_URL}/`)
      .then(res => res.json())
      .then(data => {
        setBackendMessage(data.message || '');
      })
      .catch(() => {
        setBackendMessage('Kunde inte ansluta till backend');
      });

    // Ladda maträtter
    loadMenuItems();
  }, []);

  const handleCreateMenuItem = async (data: MenuItemCreate) => {
    setIsLoading(true);
    try {
      await apiClient.createMenuItem(data);
      await loadMenuItems(); // Reload the list
      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod';
      setError(errorMessage);
      throw err; // Re-throw to let the form handle it
    } finally {
      setIsLoading(false);
    }
  };

  const columns: TableColumn[] = [
    { key: 'name', label: 'Namn', sortable: true },
    { key: 'margin_percentage', label: 'Marginal %', sortable: true },
    { key: 'margin', label: 'Marginal kr', sortable: true },
    { key: 'selling_price', label: 'Pris', sortable: true },
  ];

  // Transform menu items for the table
  const tableData = menuItems.map(item => ({
    name: item.name,
    margin_percentage: item.margin_percentage ? `${item.margin_percentage.toFixed(1)}%` : '-',
    margin: item.margin ? `${item.margin.toFixed(0)} kr` : '-',
    selling_price: `${item.selling_price.toFixed(0)} kr`,
    category: item.category,
  }));

  // Calculate metrics
  const activeItems = menuItems.filter(item => item.is_active);
  const avgMargin = activeItems.length > 0 
    ? activeItems.reduce((sum, item) => sum + (item.margin_percentage || 0), 0) / activeItems.length 
    : 0;
  
  const bestItem = activeItems.reduce((best, item) => 
    (item.margin_percentage || 0) > (best?.margin_percentage || 0) ? item : best, null as MenuItem | null);
  
  const worstItem = activeItems.reduce((worst, item) => 
    (item.margin_percentage || 0) < (worst?.margin_percentage || 0) ? item : worst, null as MenuItem | null);
  
  const profitableCount = activeItems.filter(item => (item.margin_percentage || 0) > 30).length;

  return (
    <div className="main-content">
      <PageHeader 
        title="Maträtter" 
        subtitle="Skapa maträtter från dina recept"
      >
        <button 
          className="btn btn--primary"
          onClick={() => setIsFormOpen(true)}
        >
          <span>+</span> Ny Matträtt
        </button>
      </PageHeader>

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
            subtitle={activeItems.length > 0 ? `${(activeItems.reduce((sum, item) => sum + (item.margin || 0), 0) / activeItems.length).toFixed(0)} kr/portion` : "0.00 kr/portion"}
            color={avgMargin > 30 ? "success" : avgMargin > 15 ? "warning" : "danger"}
          />
          <MetricsCard
            icon="🍽️"
            title="BÄSTA MATTRÄTT"
            value={bestItem ? bestItem.name : "Ingen data"}
            subtitle={bestItem ? `${bestItem.margin_percentage?.toFixed(1)}%` : undefined}
            color="success"
          />
          <MetricsCard
            icon="📈"
            title="SÄMSTA MATTRÄTT"
            value={worstItem ? worstItem.name : "Ingen data"}
            subtitle={worstItem ? `${worstItem.margin_percentage?.toFixed(1)}%` : undefined}
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
              actionLabel="Skapa Matträtt"
              onAction={() => setIsFormOpen(true)}
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
        
        <div className="system-status">
          <h3>System Status</h3>
          <p>Frontend Environment: <strong>{process.env.REACT_APP_ENV}</strong></p>
          <p>Backend Status: <strong style={{
            color: apiStatus === 'healthy' ? 'var(--color-success)' : 'var(--color-danger)'
          }}>{apiStatus}</strong></p>
          {apiData && (
            <>
              <p>Backend Service: <strong>{apiData.service}</strong></p>
              <p>Backend Environment: <strong>{apiData.environment}</strong></p>
            </>
          )}
          {backendMessage && <p>{backendMessage}</p>}
        </div>
      </div>

      <MenuItemForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateMenuItem}
        isLoading={isLoading}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <ProtectedRoute>
          <div className="app-layout">
            <Sidebar />
            <main className="app-main">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/matratter" element={<Dashboard />} />
                <Route path="/superadmin" element={<SuperAdminDashboard />} />
                <Route path="/freemium-test" element={<FreemiumTest />} />
              </Routes>
            </main>
          </div>
        </ProtectedRoute>
      </Router>
    </AuthProvider>
  );
}

export default App;
