import React from 'react';
import './EmptyState.css';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export function EmptyState({
  icon = '👨‍🍳',
  title,
  description,
  actionLabel,
  onAction,
  size = 'medium'
}: EmptyStateProps) {
  return (
    <div className={`empty-state empty-state--${size}`}>
      <div className="empty-state__content">
        <div className="empty-state__icon">{icon}</div>
        <h3 className="empty-state__title">{title}</h3>
        <p className="empty-state__description">{description}</p>
        
        {actionLabel && onAction && (
          <button 
            className="empty-state__action"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}