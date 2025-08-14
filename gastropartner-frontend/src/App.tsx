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
import SuperAdminDashboard from './components/SuperAdmin/SuperAdminDashboard';
import FreemiumTest from './pages/FreemiumTest';

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
  }, []);

  const columns: TableColumn[] = [
    { key: 'name', label: 'Namn', sortable: true },
    { key: 'marginal', label: 'Marginal %', sortable: true },
    { key: 'marginalKr', label: 'Marginal kr', sortable: true },
    { key: 'price', label: 'Pris', sortable: true },
  ];

  const sampleData = [
    { name: 'Pulled Pork Sandwich', marginal: '45%', marginalKr: '67 kr', price: '149 kr' },
    { name: 'BBQ Ribs', marginal: '52%', marginalKr: '89 kr', price: '179 kr' },
    { name: 'Brisket Platter', marginal: '38%', marginalKr: '76 kr', price: '199 kr' },
  ];

  return (
    <div className="main-content">
      <PageHeader 
        title="Maträtter" 
        subtitle="Skapa maträtter från dina recept"
      >
        <button className="btn btn--primary">
          <span>+</span> Ny Matträtt
        </button>
      </PageHeader>

      <div className="dashboard-content">
        <OrganizationSelector />
        
        <div className="metrics-grid">
          <MetricsCard
            icon="📊"
            title="GENOMSNITTLIG MARGINAL"
            value="0.0%"
            subtitle="0.00 kr/portion"
            color="danger"
          />
          <MetricsCard
            icon="🍽️"
            title="BÄSTA MATTRÄTT"
            value="Ingen data"
            color="neutral"
          />
          <MetricsCard
            icon="📈"
            title="SÄMSTA MATTRÄTT"
            value="Ingen data"
            color="neutral"
          />
          <MetricsCard
            icon="💰"
            title="LÖNSAMHETSFÖRDELNING"
            value="0"
            subtitle="Lönsamma"
            trend="neutral"
            color="success"
          />
        </div>

        <div className="table-section">
          {sampleData.length === 0 ? (
            <EmptyState
              icon="👨‍🍳"
              title="Inga maträtter än"
              description="Skapa din första matträtt från dina recept"
              actionLabel="Skapa Matträtt"
              onAction={() => console.log('Create dish')}
            />
          ) : (
            <SearchableTable
              columns={columns}
              data={sampleData}
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
