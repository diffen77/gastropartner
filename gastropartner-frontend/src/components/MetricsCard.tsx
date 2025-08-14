import React from 'react';
import './MetricsCard.css';

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'primary' | 'success' | 'danger' | 'warning' | 'neutral';
  icon?: string;
  loading?: boolean;
}

export function MetricsCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  color = 'neutral',
  icon,
  loading = false
}: MetricsCardProps) {
  if (loading) {
    return (
      <div className="metrics-card metrics-card--loading">
        <div className="metrics-card__skeleton">
          <div className="skeleton skeleton--title"></div>
          <div className="skeleton skeleton--value"></div>
          <div className="skeleton skeleton--subtitle"></div>
        </div>
      </div>
    );
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      default: return '→';
    }
  };

  const getTrendClass = () => {
    switch (trend) {
      case 'up': return 'metrics-card__trend--up';
      case 'down': return 'metrics-card__trend--down';
      default: return 'metrics-card__trend--neutral';
    }
  };

  return (
    <div className={`metrics-card metrics-card--${color}`}>
      <div className="metrics-card__header">
        {icon && <span className="metrics-card__icon">{icon}</span>}
        <h3 className="metrics-card__title">{title}</h3>
      </div>
      
      <div className="metrics-card__content">
        <div className="metrics-card__value">{value}</div>
        
        {subtitle && (
          <p className="metrics-card__subtitle">{subtitle}</p>
        )}
        
        {trend && trendValue && (
          <div className={`metrics-card__trend ${getTrendClass()}`}>
            <span className="metrics-card__trend-icon">{getTrendIcon()}</span>
            <span className="metrics-card__trend-value">{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}