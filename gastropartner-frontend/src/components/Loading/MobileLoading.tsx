import React from 'react';
import './MobileLoading.css';

interface MobileLoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'spinner' | 'dots' | 'pulse';
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string;
}

export function MobileLoading({
  message = 'Laddar...',
  size = 'medium',
  variant = 'spinner',
  fullScreen = false,
  overlay = false,
  className = ''
}: MobileLoadingProps) {
  const renderSpinner = () => (
    <div className={`mobile-loading__spinner mobile-loading__spinner--${size}`}>
      <div className="spinner-ring">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  );

  const renderDots = () => (
    <div className={`mobile-loading__dots mobile-loading__dots--${size}`}>
      <div className="dot"></div>
      <div className="dot"></div>
      <div className="dot"></div>
    </div>
  );

  const renderPulse = () => (
    <div className={`mobile-loading__pulse mobile-loading__pulse--${size}`}>
      <div className="pulse-circle"></div>
    </div>
  );

  const renderVariant = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      default:
        return renderSpinner();
    }
  };

  const content = (
    <div className="mobile-loading__content">
      {renderVariant()}
      {message && (
        <p className={`mobile-loading__message mobile-loading__message--${size}`}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={`mobile-loading mobile-loading--fullscreen ${className}`}>
        {content}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className={`mobile-loading mobile-loading--overlay ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <div className={`mobile-loading mobile-loading--inline ${className}`}>
      {content}
    </div>
  );
}

// Convenient presets
export function MobileLoadingSpinner(props: Omit<MobileLoadingProps, 'variant'>) {
  return <MobileLoading {...props} variant="spinner" />;
}

export function MobileLoadingDots(props: Omit<MobileLoadingProps, 'variant'>) {
  return <MobileLoading {...props} variant="dots" />;
}

export function MobileLoadingPulse(props: Omit<MobileLoadingProps, 'variant'>) {
  return <MobileLoading {...props} variant="pulse" />;
}

// Full-screen loading overlay
export function MobileLoadingOverlay(props: Omit<MobileLoadingProps, 'fullScreen' | 'overlay'>) {
  return <MobileLoading {...props} fullScreen overlay />;
}