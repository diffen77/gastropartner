import React from 'react';
import { OnboardingFlow } from './OnboardingFlow';
import './OnboardingModal.css';

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
  if (!isOpen) {
    return null;
  }

  return (
    <div className="onboarding-modal">
      <div className="onboarding-modal__backdrop" />
      <div className="onboarding-modal__container">
        <OnboardingFlow 
          onComplete={onComplete}
          onSkip={onSkip}
        />
      </div>
    </div>
  );
};