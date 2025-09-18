/**
 * WizardNavigation Component
 *
 * Comprehensive navigation component for the Recipe-MenuItem Creation Wizard with:
 * - Visual progress indicator with step completion status
 * - Keyboard navigation support for accessibility
 * - Mobile-optimized responsive design
 * - Intelligent navigation controls (Next/Previous with validation)
 * - Breadcrumb navigation for direct step jumping
 * - Undo/Redo functionality
 * - Step validation visual feedback
 *
 * Features:
 * - Touch-friendly design for mobile devices
 * - ARIA labels for screen readers
 * - Smart step skipping for optional steps
 * - Visual feedback for validation errors
 * - Smooth animations and transitions
 */

import React, { useCallback, useMemo } from 'react';
import { WizardStep, WizardStepConfig, WIZARD_STEPS } from '../../hooks/useWizardState';
import './WizardNavigation.css';

export interface WizardNavigationProps {
  /** Current active step */
  currentStep: WizardStep;
  /** Set of completed steps */
  completedSteps: Set<WizardStep>;
  /** Validation errors per step */
  errors: { [stepId: string]: string[] };
  /** Can navigate to next step */
  canGoNext: boolean;
  /** Can navigate to previous step */
  canGoPrevious: boolean;
  /** Can undo last action */
  canUndo: boolean;
  /** Can redo last undone action */
  canRedo: boolean;
  /** Loading state */
  isLoading: boolean;

  /** Navigation callbacks */
  onGoToStep: (step: WizardStep) => void;
  onGoNext: () => void;
  onGoPrevious: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave?: () => void; // For final step
  onCancel?: () => void; // To exit wizard
}

export function WizardNavigation({
  currentStep,
  completedSteps,
  errors,
  canGoNext,
  canGoPrevious,
  canUndo,
  canRedo,
  isLoading,
  onGoToStep,
  onGoNext,
  onGoPrevious,
  onUndo,
  onRedo,
  onSave,
  onCancel,
}: WizardNavigationProps) {
  const currentStepIndex = useMemo(() => {
    return WIZARD_STEPS.findIndex(step => step.id === currentStep);
  }, [currentStep]);

  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    return ((currentStepIndex + 1) / WIZARD_STEPS.length) * 100;
  }, [currentStepIndex]);

  // Handle step click for direct navigation
  const handleStepClick = useCallback((step: WizardStepConfig, stepIndex: number) => {
    // Only allow navigation to completed steps or adjacent steps
    const isCompleted = completedSteps.has(step.id);
    const isAdjacent = Math.abs(stepIndex - currentStepIndex) <= 1;
    const isAccessible = stepIndex <= currentStepIndex; // Can always go back to previous steps

    if (isCompleted || isAdjacent || isAccessible) {
      onGoToStep(step.id);
    }
  }, [completedSteps, currentStepIndex, onGoToStep]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        if (canGoNext) {
          event.preventDefault();
          onGoNext();
        }
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        if (canGoPrevious) {
          event.preventDefault();
          onGoPrevious();
        }
        break;
      case 'Home':
        event.preventDefault();
        onGoToStep(WIZARD_STEPS[0].id);
        break;
      case 'End':
        event.preventDefault();
        onGoToStep(WIZARD_STEPS[WIZARD_STEPS.length - 1].id);
        break;
      case 'z':
        if (event.ctrlKey || event.metaKey) {
          if (event.shiftKey && canRedo) {
            event.preventDefault();
            onRedo();
          } else if (canUndo) {
            event.preventDefault();
            onUndo();
          }
        }
        break;
    }
  }, [canGoNext, canGoPrevious, canUndo, canRedo, onGoNext, onGoPrevious, onUndo, onRedo, onGoToStep]);

  return (
    <nav
      className="wizard-navigation"
      aria-label="Wizard navigation"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Progress Bar */}
      <div className="wizard-progress" role="progressbar" aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100}>
        <div className="wizard-progress-track">
          <div
            className="wizard-progress-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <span className="wizard-progress-text" aria-live="polite">
          Steg {currentStepIndex + 1} av {WIZARD_STEPS.length}
        </span>
      </div>

      {/* Step Indicators */}
      <div className="wizard-steps" role="tablist">
        {WIZARD_STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.has(step.id);
          const hasErrors = errors[step.id]?.length > 0;
          const isAccessible = isCompleted || Math.abs(index - currentStepIndex) <= 1 || index <= currentStepIndex;

          return (
            <div key={step.id} className="wizard-step-container">
              {/* Step Indicator */}
              <button
                className={`wizard-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${hasErrors ? 'error' : ''}`}
                onClick={() => handleStepClick(step, index)}
                disabled={!isAccessible || isLoading}
                role="tab"
                aria-selected={isActive}
                aria-controls={`wizard-panel-${step.id}`}
                aria-describedby={`wizard-step-description-${step.id}`}
                title={`${step.title}: ${step.description}`}
              >
                <span className="wizard-step-number">
                  {isCompleted ? (
                    <svg className="wizard-step-check" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : hasErrors ? (
                    <svg className="wizard-step-error" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>

                <div className="wizard-step-content">
                  <div className="wizard-step-title">{step.title}</div>
                  <div
                    className="wizard-step-description"
                    id={`wizard-step-description-${step.id}`}
                  >
                    {step.description}
                  </div>
                </div>
              </button>

              {/* Error Message */}
              {hasErrors && (
                <div className="wizard-step-errors" role="alert">
                  {errors[step.id].map((error, errorIndex) => (
                    <div key={errorIndex} className="wizard-step-error-message">
                      {error}
                    </div>
                  ))}
                </div>
              )}

              {/* Connector Line */}
              {index < WIZARD_STEPS.length - 1 && (
                <div className={`wizard-connector ${isCompleted ? 'completed' : ''}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation Controls */}
      <div className="wizard-controls">
        {/* Secondary Actions */}
        <div className="wizard-controls-secondary">
          {/* Undo/Redo */}
          <div className="wizard-history-controls">
            <button
              className="wizard-btn wizard-btn-secondary"
              onClick={onUndo}
              disabled={!canUndo || isLoading}
              title="Ångra senaste ändring (Ctrl+Z)"
              aria-label="Ångra senaste ändring"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="wizard-btn-icon">
                <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Ångra
            </button>

            <button
              className="wizard-btn wizard-btn-secondary"
              onClick={onRedo}
              disabled={!canRedo || isLoading}
              title="Gör om ändring (Ctrl+Shift+Z)"
              aria-label="Gör om ändring"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="wizard-btn-icon">
                <path fillRule="evenodd" d="M12.293 3.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 9H9a5 5 0 00-5 5v2a1 1 0 11-2 0v-2a7 7 0 017-7h5.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Gör om
            </button>
          </div>

          {/* Cancel Button */}
          {onCancel && (
            <button
              className="wizard-btn wizard-btn-secondary"
              onClick={onCancel}
              disabled={isLoading}
              aria-label="Avbryt wizard"
            >
              Avbryt
            </button>
          )}
        </div>

        {/* Primary Actions */}
        <div className="wizard-controls-primary">
          {/* Previous Button */}
          <button
            className="wizard-btn wizard-btn-secondary"
            onClick={onGoPrevious}
            disabled={!canGoPrevious || isLoading}
            aria-label="Gå till föregående steg"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="wizard-btn-icon">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Föregående
          </button>

          {/* Next/Save Button */}
          {isLastStep ? (
            <button
              className="wizard-btn wizard-btn-primary"
              onClick={onSave}
              disabled={!canGoNext || isLoading}
              aria-label="Spara och slutför"
            >
              {isLoading ? (
                <>
                  <div className="wizard-spinner" />
                  Sparar...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="wizard-btn-icon">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Spara
                </>
              )}
            </button>
          ) : (
            <button
              className="wizard-btn wizard-btn-primary"
              onClick={onGoNext}
              disabled={!canGoNext || isLoading}
              aria-label="Gå till nästa steg"
            >
              Nästa
              <svg viewBox="0 0 20 20" fill="currentColor" className="wizard-btn-icon">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="wizard-keyboard-help" aria-label="Tangentbordsgenvägar">
        <small>
          Använd <kbd>←</kbd>/<kbd>→</kbd> för navigation, <kbd>Ctrl+Z</kbd> för ångra
        </small>
      </div>
    </nav>
  );
}