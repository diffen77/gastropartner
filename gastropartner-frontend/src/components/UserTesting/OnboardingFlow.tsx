import React, { useState, useEffect } from 'react';
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
          Nästa steg
        </button>
      </form>
    </div>
  );
};

// Step 2: Cost Control Goals
const CostControlGoalsStep: React.FC<OnboardingStepProps> = ({ onNext, onSkip }) => {
  const [goals, setGoals] = useState({
    primary_goal: 'reduce_costs' as 'reduce_costs' | 'improve_margins' | 'track_expenses' | 'optimize_menu',
    current_margin: '15' as string,
    target_margin: '25' as string,
    biggest_challenge: 'food_waste' as 'food_waste' | 'supplier_costs' | 'portion_control' | 'menu_pricing',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(goals);
  };

  return (
    <div className="onboarding-step">
      <div className="step-header">
        <h2>📊 Dina kostnadskontrollen-mål</h2>
        <p>Hjälp oss förstå vad du vill uppnå med kostnadskontroll.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="step-form">
        <div className="form-group">
          <label>Vad är ditt främsta mål?</label>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                value="reduce_costs"
                checked={goals.primary_goal === 'reduce_costs'}
                onChange={(e) => setGoals(prev => ({ ...prev, primary_goal: e.target.value as any }))}
              />
              <span>💰 Minska kostnader</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                value="improve_margins"
                checked={goals.primary_goal === 'improve_margins'}
                onChange={(e) => setGoals(prev => ({ ...prev, primary_goal: e.target.value as any }))}
              />
              <span>📈 Förbättra marginaler</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                value="track_expenses"
                checked={goals.primary_goal === 'track_expenses'}
                onChange={(e) => setGoals(prev => ({ ...prev, primary_goal: e.target.value as any }))}
              />
              <span>📝 Spåra utgifter</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                value="optimize_menu"
                checked={goals.primary_goal === 'optimize_menu'}
                onChange={(e) => setGoals(prev => ({ ...prev, primary_goal: e.target.value as any }))}
              />
              <span>🍽️ Optimera meny</span>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="current-margin">Nuvarande marginal (%)</label>
            <select
              id="current-margin"
              value={goals.current_margin}
              onChange={(e) => setGoals(prev => ({ ...prev, current_margin: e.target.value }))}
            >
              <option value="5">Under 5%</option>
              <option value="15">5-15%</option>
              <option value="25">15-25%</option>
              <option value="35">25-35%</option>
              <option value="45">Över 35%</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="target-margin">Målmarginal (%)</label>
            <select
              id="target-margin"
              value={goals.target_margin}
              onChange={(e) => setGoals(prev => ({ ...prev, target_margin: e.target.value }))}
            >
              <option value="15">15%</option>
              <option value="25">25%</option>
              <option value="30">30%</option>
              <option value="40">40%</option>
              <option value="50">50%+</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Vad är din största utmaning?</label>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                value="food_waste"
                checked={goals.biggest_challenge === 'food_waste'}
                onChange={(e) => setGoals(prev => ({ ...prev, biggest_challenge: e.target.value as any }))}
              />
              <span>🗑️ Matsvinn</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                value="supplier_costs"
                checked={goals.biggest_challenge === 'supplier_costs'}
                onChange={(e) => setGoals(prev => ({ ...prev, biggest_challenge: e.target.value as any }))}
              />
              <span>🚚 Leverantörskostnader</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                value="portion_control"
                checked={goals.biggest_challenge === 'portion_control'}
                onChange={(e) => setGoals(prev => ({ ...prev, biggest_challenge: e.target.value as any }))}
              />
              <span>⚖️ Portionskontroll</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                value="menu_pricing"
                checked={goals.biggest_challenge === 'menu_pricing'}
                onChange={(e) => setGoals(prev => ({ ...prev, biggest_challenge: e.target.value as any }))}
              />
              <span>💵 Menyprissättning</span>
            </label>
          </div>
        </div>

        <div className="step-actions">
          <button type="button" onClick={onSkip} className="btn btn--secondary">
            Hoppa över
          </button>
          <button type="submit" className="btn btn--primary">
            Nästa steg
          </button>
        </div>
      </form>
    </div>
  );
};

// Step 3: Feature Tour
const FeatureTourStep: React.FC<OnboardingStepProps> = ({ onNext, onSkip }) => {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  
  const features = [
    {
      id: 'ingredients',
      title: 'Ingredienshantering',
      description: 'Håll koll på ingredienskostnader och leverantörer',
      icon: '🥕'
    },
    {
      id: 'recipes',
      title: 'Receptanalys',
      description: 'Beräkna kostnad per portion och optimera recept',
      icon: '📝'
    },
    {
      id: 'menu_items',
      title: 'Meny-optimering',
      description: 'Analysera lönsamhet för varje maträtt',
      icon: '🍽️'
    },
    {
      id: 'cost_analysis',
      title: 'Kostnadsanalys',
      description: 'Få detaljerade rapporter och insikter',
      icon: '📊'
    },
  ];

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev => 
      prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({ interested_features: selectedFeatures });
  };

  return (
    <div className="onboarding-step">
      <div className="step-header">
        <h2>🎯 Vilka funktioner intresserar dig mest?</h2>
        <p>Välj de funktioner som du är mest intresserad av att utforska.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="step-form">
        <div className="features-grid">
          {features.map(feature => (
            <div
              key={feature.id}
              className={`feature-card ${selectedFeatures.includes(feature.id) ? 'selected' : ''}`}
              onClick={() => toggleFeature(feature.id)}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              <div className="feature-checkbox">
                <input
                  type="checkbox"
                  checked={selectedFeatures.includes(feature.id)}
                  onChange={() => toggleFeature(feature.id)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="step-actions">
          <button type="button" onClick={onSkip} className="btn btn--secondary">
            Hoppa över
          </button>
          <button type="submit" className="btn btn--primary">
            Slutför onboarding
          </button>
        </div>
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
      id: 'goals',
      title: 'Mål',
      description: 'Sätt dina kostnadskontrollen-mål',
      icon: '📊',
      component: CostControlGoalsStep
    },
    {
      id: 'features',
      title: 'Funktioner',
      description: 'Utforska viktiga funktioner',
      icon: '🎯',
      component: FeatureTourStep
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