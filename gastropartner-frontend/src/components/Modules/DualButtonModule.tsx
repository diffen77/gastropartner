import React from 'react';
import './DualButtonModule.css';

export interface ModuleFeature {
  name: string;
  included: 'free' | 'pro' | 'both';
  description?: string;
}

export interface DualButtonModuleProps {
  icon: string;
  title: string;
  description: string;
  status: 'active' | 'beta' | 'coming-soon' | 'available';
  currentTier?: 'free' | 'pro' | null;
  features: ModuleFeature[];
  freeFeatures: string[];
  proFeatures: string[];
  proPrice?: string;
  onFreeClick?: () => void;
  onProClick?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function DualButtonModule({
  icon,
  title,
  description,
  status,
  currentTier,
  features,
  freeFeatures,
  proFeatures,
  proPrice = "299 kr/månad",
  onFreeClick,
  onProClick,
  isLoading = false,
  className = ""
}: DualButtonModuleProps) {
  const handleFreeClick = () => {
    if (!isLoading && onFreeClick) {
      onFreeClick();
    }
  };

  const handleProClick = () => {
    if (!isLoading && onProClick) {
      onProClick();
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'beta':
        return 'status-beta';
      case 'coming-soon':
        return 'status-coming-soon';
      case 'available':
        return 'status-available';
      default:
        return 'status-available';
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'active' && currentTier) {
      return `Aktiverad (${currentTier.toUpperCase()})`;
    }
    
    switch (status) {
      case 'active':
        return 'Aktiverad';
      case 'beta':
        return 'Beta';
      case 'coming-soon':
        return 'Kommer snart';
      case 'available':
        return 'Tillgänglig';
      default:
        return 'Tillgänglig';
    }
  };

  return (
    <div className={`dual-module-card ${className}`}>
      <div className="dual-module-card__header">
        <div className="dual-module-card__icon">{icon}</div>
        <div className="dual-module-card__info">
          <h3 className="dual-module-card__title">{title}</h3>
          <span className={`dual-module-card__status ${getStatusClass(status)}`}>
            {getStatusLabel(status)}
          </span>
        </div>
      </div>

      <p className="dual-module-card__description">{description}</p>

      {/* Features Comparison Grid */}
      <div className="features-comparison">
        <div className="features-section free-features">
          <h4>
            <span>🆓</span>
            <span>GRATIS VERSION</span>
          </h4>
          <ul className="features-list">
            {freeFeatures.map((feature, index) => (
              <li key={`free-${index}`}>{feature}</li>
            ))}
          </ul>
        </div>
        
        <div className="features-section pro-features">
          <h4>
            <span>💎</span>
            <span>PRO VERSION</span>
          </h4>
          <ul className="features-list">
            {proFeatures.map((feature, index) => (
              <li key={`pro-${index}`}>{feature}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Dual Button System */}
      <div className="buttons-container">
        <button
          className={`btn-free ${isLoading ? 'btn-loading' : ''} ${currentTier === 'free' ? 'btn-active' : ''}`}
          onClick={handleFreeClick}
          disabled={isLoading || status === 'coming-soon'}
        >
          <span className="btn-title">
            {status === 'coming-soon' ? 'Kommer snart' : currentTier === 'free' ? '✅ AKTIV GRATIS' : 'GRATIS'}
          </span>
          <span className="btn-price">0 kr/månad</span>
        </button>

        <button
          className={`btn-pro ${isLoading ? 'btn-loading' : ''} ${currentTier === 'pro' ? 'btn-active' : ''}`}
          onClick={handleProClick}
          disabled={isLoading || status === 'coming-soon'}
        >
          <span className="btn-title">
            {status === 'coming-soon' ? 'Kommer snart' : currentTier === 'pro' ? '✅ AKTIV PRO' : 'PRO'}
          </span>
          <span className="btn-price">{proPrice}</span>
        </button>
      </div>

      {status === 'coming-soon' && (
        <div className="coming-soon-notice">
          <p>✨ Denna modul utvecklas för närvarande och kommer att finnas tillgänglig snart.</p>
        </div>
      )}
    </div>
  );
}

export default DualButtonModule;