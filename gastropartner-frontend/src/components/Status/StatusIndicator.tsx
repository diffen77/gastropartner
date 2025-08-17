import React from 'react';
import './StatusIndicator.css';

interface StatusIndicatorProps {
  status: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  animated?: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'medium',
  showLabel = false,
  animated = true
}) => {
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'operational':
      case 'online':
        return '#22c55e'; // green
      case 'degraded':
      case 'warning':
      case 'slow':
        return '#f59e0b'; // yellow/amber
      case 'unhealthy':
      case 'down':
      case 'offline':
      case 'error':
        return '#ef4444'; // red
      case 'maintenance':
        return '#8b5cf6'; // purple
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'healthy':
        return 'Healthy';
      case 'degraded':
        return 'Degraded';
      case 'unhealthy':
        return 'Unhealthy';
      case 'maintenance':
        return 'Maintenance';
      case 'operational':
        return 'Operational';
      case 'down':
        return 'Down';
      case 'offline':
        return 'Offline';
      case 'online':
        return 'Online';
      case 'warning':
        return 'Warning';
      case 'error':
        return 'Error';
      case 'slow':
        return 'Slow';
      default:
        return 'Unknown';
    }
  };

  const getSizeClass = (size: string): string => {
    switch (size) {
      case 'small':
        return 'status-indicator--small';
      case 'large':
        return 'status-indicator--large';
      default:
        return 'status-indicator--medium';
    }
  };

  const color = getStatusColor(status);
  const label = getStatusLabel(status);

  return (
    <div 
      className={`status-indicator ${getSizeClass(size)} ${animated ? 'status-indicator--animated' : ''}`}
      title={label}
    >
      <div 
        className="status-indicator__dot"
        style={{ backgroundColor: color }}
      >
        <div 
          className="status-indicator__pulse"
          style={{ backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span 
          className="status-indicator__label"
          style={{ color }}
        >
          {label}
        </span>
      )}
    </div>
  );
};

export default StatusIndicator;