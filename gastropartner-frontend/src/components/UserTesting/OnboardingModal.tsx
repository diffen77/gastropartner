import React, { useEffect } from 'react';
import { OnboardingFlow } from './OnboardingFlow';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (data: any) => void;
  onSkip: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  onSkip
}) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onSkip();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onSkip]);

  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onSkip();
    }
  };

  return (
    <div 
      className={`modal-overlay ${isOpen ? 'modal-open' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
        <OnboardingFlow 
          onComplete={onComplete}
          onSkip={onSkip}
        />
      </div>
    </div>
  );
};