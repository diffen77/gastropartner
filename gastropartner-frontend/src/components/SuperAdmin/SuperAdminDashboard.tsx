import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface SystemStatus {
  status: string;
  timestamp: string;
  components: Record<string, string>;
  version: string;
}

interface SuperAdminStats {
  total_agencies: number;
  total_sessions: number;
  total_leads: number;
  total_messages: number;
  active_sessions: number;
  system_health: string;
}

const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Check if user is superadmin
  const isSuperAdmin = user?.email?.toLowerCase() === 'diffen@me.com';

  useEffect(() => {
    if (!isSuperAdmin) {
      setError('Åtkomst nekad. Endast superadmin har tillgång till denna sida.');
      setLoading(false);
      return;
    }

    loadDashboardData();
  }, [isSuperAdmin]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, you would make API calls here
      // For now, we'll simulate the data
      
      const mockSystemStatus: SystemStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        components: {
          database: 'healthy',
          redis: 'healthy',
          api: 'healthy',
          frontend: 'healthy'
        },
        version: '1.0.0'
      };

      const mockStats: SuperAdminStats = {
        total_agencies: 0,
        total_sessions: 0,
        total_leads: 0,
        total_messages: 0,
        active_sessions: 0,
        system_health: 'excellent'
      };

      setSystemStatus(mockSystemStatus);
      setStats(mockStats);
      setError(null);
    } catch (err) {
      setError('Kunde inte ladda dashboard-data');
      console.error('Dashboard data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMaintenanceToggle = async () => {
    try {
      // In real implementation, make API call to toggle maintenance mode
      setMaintenanceMode(!maintenanceMode);
      alert(`Underhållsläge ${!maintenanceMode ? 'aktiverat' : 'avaktiverat'}`);
    } catch (err) {
      alert('Kunde inte ändra underhållsläge');
    }
  };

  const handleClearCache = async () => {
    try {
      // In real implementation, make API call to clear cache
      alert('Systemcache rensad!');
    } catch (err) {
      alert('Kunde inte rensa cache');
    }
  };

  const handleDataCleanup = async () => {
    if (window.confirm('Är du säker på att du vill rensa gammal data? Denna åtgärd kan inte ångras.')) {
      try {
        // In real implementation, make API call for data cleanup
        alert('Datarensning initierad!');
      } catch (err) {
        alert('Kunde inte genomföra datarensning');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Laddar superadmin dashboard...</div>
      </div>
    );
  }

  if (!isSuperAdmin || error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Åtkomst Nekad</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'excellent':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🛡️ SuperAdmin Dashboard
        </h1>
        <p className="text-gray-600">
          Välkommen {user?.email} - Fullständig systemkontroll
        </p>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Systemstatus</h2>
          {systemStatus && (
            <div>
              <div className={`text-lg font-medium mb-2 ${getStatusColor(systemStatus.status)}`}>
                Status: {systemStatus.status.toUpperCase()}
              </div>
              <div className="text-sm text-gray-500 mb-4">
                Senast uppdaterad: {new Date(systemStatus.timestamp).toLocaleString('sv-SE')}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(systemStatus.components).map(([component, status]) => (
                  <div key={component} className="flex justify-between">
                    <span className="capitalize">{component}:</span>
                    <span className={getStatusColor(status)}>{status}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Version: {systemStatus.version}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* System Statistics */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Systemstatistik</h2>
          {stats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total_agencies}</div>
                <div className="text-sm text-gray-600">Totala Agenter</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.active_sessions}</div>
                <div className="text-sm text-gray-600">Aktiva Sessioner</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.total_leads}</div>
                <div className="text-sm text-gray-600">Totala Leads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.total_messages}</div>
                <div className="text-sm text-gray-600">Totala Meddelanden</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-6">Systemkontroller</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Maintenance Mode */}
          <button
            onClick={handleMaintenanceToggle}
            className={`p-4 rounded-lg text-white font-medium transition-colors ${
              maintenanceMode 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-yellow-500 hover:bg-yellow-600'
            }`}
          >
            {maintenanceMode ? '🔴 Avaktivera Underhåll' : '🟡 Aktivera Underhåll'}
          </button>

          {/* Clear Cache */}
          <button
            onClick={handleClearCache}
            className="p-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
          >
            🗄️ Rensa Cache
          </button>

          {/* Data Cleanup */}
          <button
            onClick={handleDataCleanup}
            className="p-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
          >
            🧹 Rensa Gammal Data
          </button>

          {/* Refresh Dashboard */}
          <button
            onClick={loadDashboardData}
            className="p-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
          >
            🔄 Uppdatera Dashboard
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Snabbåtgärder</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium mb-2">📊 Systemloggar</h3>
            <p className="text-sm text-gray-600 mb-3">Visa senaste systemloggar</p>
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              Visa Loggar →
            </button>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium mb-2">👥 Användaraktivitet</h3>
            <p className="text-sm text-gray-600 mb-3">Monitor användaraktivitet</p>
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              Visa Aktivitet →
            </button>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium mb-2">📢 Systemmeddelande</h3>
            <p className="text-sm text-gray-600 mb-3">Skicka systemmeddelande</p>
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              Skicka Meddelande →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;