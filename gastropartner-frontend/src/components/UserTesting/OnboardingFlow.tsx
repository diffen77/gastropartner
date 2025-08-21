import React, { useState } from 'react';
import { apiClient } from '../../utils/api';
import './OnboardingFlow.css';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  component: React.ComponentType<OnboardingStepProps>;
}

interface OnboardingStepProps {
  onNext: (data?: any) => void;
  onSkip?: () => void;
  stepData?: any;
}

// Step 1: Welcome and Restaurant Profile
const WelcomeStep: React.FC<OnboardingStepProps> = ({ onNext }) => {
  const [restaurantData, setRestaurantData] = useState({
    name: '',
    type: 'restaurant' as 'restaurant' | 'cafe' | 'bakery' | 'catering',
    size: 'small' as 'small' | 'medium' | 'large',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(restaurantData);
  };

  return (
    <div className="onboarding-step">
      <div className="step-header">
        <h2>🍽️ Välkommen till GastroPartner!</h2>
        <p>Låt oss först lära känna din restaurang för att anpassa upplevelsen.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="step-form">
        <div className="form-group">
          <label htmlFor="restaurant-name">Restaurangens namn</label>
          <input
            id="restaurant-name"
            type="text"
            value={restaurantData.name}
            onChange={(e) => setRestaurantData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="t.ex. Härryda BBQ"
            autoComplete="organization"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="restaurant-type">Typ av verksamhet</label>
          <select
            id="restaurant-type"
            value={restaurantData.type}
            onChange={(e) => setRestaurantData(prev => ({ ...prev, type: e.target.value as any }))}
          >
            <option value="restaurant">Restaurang</option>
            <option value="cafe">Café</option>
            <option value="bakery">Bageri</option>
            <option value="catering">Catering</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="restaurant-size">Verksamhetens storlek</label>
          <select
            id="restaurant-size"
            value={restaurantData.size}
            onChange={(e) => setRestaurantData(prev => ({ ...prev, size: e.target.value as any }))}
          >
            <option value="small">Liten (1-10 anställda)</option>
            <option value="medium">Medel (11-50 anställda)</option>
            <option value="large">Stor (50+ anställda)</option>
          </select>
        </div>

        <button type="submit" className="btn btn--primary btn--full-width">
          Slutför onboarding
        </button>
      </form>
    </div>
  );
};



// Step 4: Completion
const CompletionStep: React.FC<OnboardingStepProps> = ({ onNext }) => {
  return (
    <div className="onboarding-step completion-step">
      <div className="completion-content">
        <div className="completion-icon">🎉</div>
        <h2>Välkommen ombord!</h2>
        <p>Du är nu redo att börja använda GastroPartner för kostnadskontroll.</p>
        
        <div className="next-steps">
          <h3>Nästa steg:</h3>
          <ul>
            <li>📝 Lägg till dina första ingredienser</li>
            <li>🍽️ Skapa ett recept</li>
            <li>📊 Analysera din första maträtt</li>
          </ul>
        </div>

        <button
          onClick={() => onNext()}
          className="btn btn--primary btn--large"
        >
          Börja använda GastroPartner
        </button>
      </div>
    </div>
  );
};

interface OnboardingFlowProps {
  onComplete: (data: any) => void;
  onSkip?: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Välkommen',
      description: 'Berätta om din restaurang',
      icon: '🍽️',
      component: WelcomeStep
    },
    {
      id: 'completion',
      title: 'Klart!',
      description: 'Börja använda systemet',
      icon: '🎉',
      component: CompletionStep
    }
  ];

  const handleNext = async (stepData?: any) => {
    const updatedData = { ...onboardingData, ...stepData };
    setOnboardingData(updatedData);

    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      
      // Track onboarding progress
      try {
        await apiClient.trackAnalyticsEvent({
          event_type: 'onboarding',
          event_name: 'step_completed',
          properties: {
            step: steps[currentStep].id,
            step_number: currentStep + 1,
            data: stepData
          }
        });
      } catch (error) {
        console.error('Failed to track onboarding step:', error);
      }
    } else {
      // Final step - complete onboarding
      setIsLoading(true);
      try {
        await apiClient.trackAnalyticsEvent({
          event_type: 'onboarding',
          event_name: 'completed',
          properties: updatedData
        });
        
        onComplete(updatedData);
      } catch (error) {
        console.error('Failed to complete onboarding:', error);
        // Still complete onboarding even if tracking fails
        onComplete(updatedData);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSkipStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else if (onSkip) {
      onSkip();
    }
  };

  const handleSkipAll = () => {
    if (onSkip) {
      onSkip();
    }
  };

  const CurrentStepComponent = steps[currentStep].component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  if (isLoading) {
    return (
      <div className="onboarding-loading">
        <div className="loading-spinner"></div>
        <p>Slutför onboarding...</p>
      </div>
    );
  }

  return (
    <div className="onboarding-flow">
      <div className="onboarding-header">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="step-indicator">
          <span>Steg {currentStep + 1} av {steps.length}</span>
        </div>
        <button
          onClick={handleSkipAll}
          className="skip-button"
          type="button"
        >
          Hoppa över onboarding
        </button>
      </div>

      <div className="onboarding-content">
        <CurrentStepComponent 
          onNext={handleNext}
          onSkip={handleSkipStep}
          stepData={onboardingData}
        />
      </div>
    </div>
  );
};