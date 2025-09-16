import React from 'react';
import StatusIndicator from './StatusIndicator';
import './IncidentHistory.css';

interface Incident {
  id: string;
  title: string;
  status: string;
  created_at: string;
  resolved_at?: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  affected_services?: string[];
}

interface IncidentHistoryProps {
  incidents: Incident[];
  showResolved?: boolean;
  maxIncidents?: number;
}

const IncidentHistory: React.FC<IncidentHistoryProps> = ({
  incidents,
  showResolved = true,
  maxIncidents = 10
}) => {
  // TODO: Color-coding function for incident status display - will be used in enhanced UI
  // const getIncidentStatusColor = (status: string): string => {
  //   switch (status.toLowerCase()) {
  //     case 'investigating':
  //       return '#f59e0b'; // amber
  //     case 'identified':
  //       return '#3b82f6'; // blue
  //     case 'monitoring':
  //       return '#8b5cf6'; // purple
  //     case 'resolved':
  //       return '#22c55e'; // green
  //     default:
  //       return '#6b7280'; // gray
  //   }
  // };

  const getSeverityColor = (severity?: string): string => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return '#dc2626'; // red
      case 'high':
        return '#ea580c'; // orange
      case 'medium':
        return '#ca8a04'; // yellow
      case 'low':
        return '#16a34a'; // green
      default:
        return '#6b7280'; // gray
    }
  };

  const getSeverityIcon = (severity?: string): string => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔵';
      default:
        return '📋';
    }
  };

  const formatDuration = (startTime: string, endTime?: string): string => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = end.getTime() - start.getTime();
    
    const minutes = Math.floor(duration / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const filteredIncidents = incidents
    .filter(incident => showResolved || incident.status !== 'resolved')
    .slice(0, maxIncidents)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (filteredIncidents.length === 0) {
    return (
      <div className="incident-history">
        <div className="no-incidents">
          <div className="no-incidents__icon">✅</div>
          <h3>No Recent Incidents</h3>
          <p>All systems are operating normally. No incidents in the past 7 days.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="incident-history">
      <div className="incident-list">
        {filteredIncidents.map((incident) => (
          <div 
            key={incident.id} 
            className={`incident-card incident-card--${incident.status.toLowerCase()}`}
          >
            <div className="incident-header">
              <div className="incident-title-row">
                <div className="incident-severity">
                  <span 
                    className="severity-badge"
                    style={{ backgroundColor: getSeverityColor(incident.severity) }}
                    title={`Severity: ${incident.severity || 'Unknown'}`}
                  >
                    {getSeverityIcon(incident.severity)}
                  </span>
                </div>
                <h4 className="incident-title">{incident.title}</h4>
                <StatusIndicator 
                  status={incident.status} 
                  size="small" 
                  showLabel={true}
                  animated={incident.status !== 'resolved'}
                />
              </div>
              
              <div className="incident-meta">
                <span className="incident-time">
                  Started: {new Date(incident.created_at).toLocaleString()}
                </span>
                {incident.resolved_at && (
                  <span className="incident-time">
                    Resolved: {new Date(incident.resolved_at).toLocaleString()}
                  </span>
                )}
                <span className="incident-duration">
                  Duration: {formatDuration(incident.created_at, incident.resolved_at)}
                </span>
              </div>
            </div>

            {incident.description && (
              <div className="incident-description">
                <p>{incident.description}</p>
              </div>
            )}

            {incident.affected_services && incident.affected_services.length > 0 && (
              <div className="affected-services">
                <strong>Affected services:</strong>
                <div className="service-tags">
                  {incident.affected_services.map((service, index) => (
                    <span key={index} className="service-tag">
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="incident-footer">
              <span className="incident-id">ID: {incident.id}</span>
              <div className="incident-actions">
                <button 
                  className="incident-action"
                  onClick={() => window.open(`/incidents/${incident.id}`, '_blank')}
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {incidents.length > maxIncidents && (
        <div className="incident-history__footer">
          <button 
            className="view-all-button"
            onClick={() => window.open('/incidents', '_blank')}
          >
            View All Incidents ({incidents.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default IncidentHistory;