import React, { useEffect, useState } from 'react';
import { useSystemStatus } from '../hooks/useSystemStatus';
import StatusIndicator from '../components/Status/StatusIndicator';
import IncidentHistory from '../components/Status/IncidentHistory';
import './Status.css';

/* SystemStatus interface preserved for future status page functionality
interface SystemStatus {
  overall_status: string;
  last_updated: string;
  services: Array<{
    name: string;
    status: string;
    response_time_ms?: number;
    last_updated: string;
    description: string;
  }>;
  incidents: Array<{
    id: string;
    title: string;
    status: string;
    created_at: string;
    resolved_at?: string;
  }>;
  maintenance: Array<{
    id: string;
    title: string;
    scheduled_start: string;
    scheduled_end: string;
    description: string;
  }>;
}
*/

const Status: React.FC = () => {
  const { status, loading, error, refreshStatus } = useSystemStatus();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      refreshStatus();
      setLastRefresh(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshStatus]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy':
        return '#22c55e'; // green
      case 'degraded':
        return '#f59e0b'; // yellow
      case 'unhealthy':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'unhealthy':
        return '❌';
      default:
        return '❓';
    }
  };

  if (loading && !status) {
    return (
      <div className="status-page">
        <div className="status-header">
          <h1>System Status</h1>
          <div className="loading">Loading system status...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-page">
        <div className="status-header">
          <h1>System Status</h1>
          <div className="error">
            <p>Unable to load system status</p>
            <p className="error-details">{error}</p>
            <button onClick={refreshStatus} className="retry-button">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="status-page">
      <div className="status-header">
        <h1>GastroPartner System Status</h1>
        <div className="status-summary">
          <StatusIndicator
            status={status?.overall_status || 'unknown'}
            size="large"
          />
          <div className="status-text">
            <h2 style={{ color: getStatusColor(status?.overall_status || 'unknown') }}>
              {getStatusIcon(status?.overall_status || 'unknown')} 
              {status?.overall_status === 'healthy' && 'All Systems Operational'}
              {status?.overall_status === 'degraded' && 'Some Systems Degraded'}
              {status?.overall_status === 'unhealthy' && 'System Issues Detected'}
              {!status?.overall_status && 'Status Unknown'}
            </h2>
            <p className="last-updated">
              Last updated: {status?.last_updated ? 
                new Date(status.last_updated).toLocaleString() : 
                lastRefresh.toLocaleString()
              }
            </p>
          </div>
        </div>
        <button onClick={refreshStatus} className="refresh-button" disabled={loading}>
          {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      <div className="services-section">
        <h3>Service Status</h3>
        <div className="services-grid">
          {status?.services?.map((service, index) => (
            <div key={index} className="service-card">
              <div className="service-header">
                <StatusIndicator status={service.status} size="small" />
                <h4>{service.description}</h4>
              </div>
              <div className="service-details">
                <p className="service-name">{service.name}</p>
                {service.response_time_ms && (
                  <p className="response-time">
                    Response time: {service.response_time_ms.toFixed(0)}ms
                  </p>
                )}
                <p className="service-status" style={{ color: getStatusColor(service.status) }}>
                  {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {status?.incidents && status.incidents.length > 0 && (
        <div className="incidents-section">
          <h3>Current Incidents</h3>
          <IncidentHistory incidents={status.incidents} />
        </div>
      )}

      {status?.maintenance && status.maintenance.length > 0 && (
        <div className="maintenance-section">
          <h3>Scheduled Maintenance</h3>
          <div className="maintenance-list">
            {status.maintenance.map((maintenance, index) => (
              <div key={index} className="maintenance-card">
                <h4>{maintenance.title}</h4>
                <p>{maintenance.description}</p>
                <p className="maintenance-schedule">
                  <strong>Scheduled:</strong> {new Date(maintenance.scheduled_start).toLocaleString()} - {new Date(maintenance.scheduled_end).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="footer">
        <p>
          For technical support, contact{' '}
          <a href="mailto:support@gastropartner.com">support@gastropartner.com</a>
        </p>
        <p>
          Subscribe to updates:{' '}
          <a href="/status/subscribe">Get notified of incidents</a>
        </p>
      </div>
    </div>
  );
};

export default Status;