/**
 * WizardStep Base Component
 *
 * Reusable base component for all wizard steps with:
 * - Consistent layout and styling
 * - Accessibility features (ARIA labels, focus management)
 * - Animation and transition support
 * - Error display and validation feedback
 * - Loading states and progress indicators
 * - Mobile-responsive design
 */

import React, { ReactNode } from 'react';
import { WizardStep as WizardStepType } from '../../hooks/useWizardState';
import './WizardStep.css';

export interface WizardStepProps {
  /** Unique step identifier */
  stepId: WizardStepType;
  /** Step title for accessibility */
  title: string;
  /** Step description for context */
  description: string;
  /** Step content */
  children: ReactNode;
  /** Is this step currently active */
  isActive: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Validation errors for this step */
  errors?: string[];
  /** Step completion status */
  isCompleted?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Called when step becomes active */
  onActivate?: () => void;
}

export function WizardStep({
  stepId,
  title,
  description,
  children,
  isActive,
  isLoading = false,
  errors = [],
  isCompleted = false,
  className = '',
  onActivate,
}: WizardStepProps) {
  const hasErrors = errors.length > 0;

  return (
    <div
      className={`wizard-step-panel ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${hasErrors ? 'has-errors' : ''} ${className}`}
      id={`wizard-panel-${stepId}`}
      role="tabpanel"
      aria-labelledby={`wizard-step-${stepId}`}
      aria-describedby={`wizard-step-description-${stepId}`}
      hidden={!isActive}
      onFocus={onActivate}
    >
      {/* Step Header */}
      <div className="wizard-step-header">
        <div className="wizard-step-info">
          <h2 className="wizard-step-title" id={`wizard-step-${stepId}`}>
            {title}
            {isCompleted && (
              <span className="wizard-step-completed-indicator" aria-label="Slutfört">
                <svg viewBox="0 0 20 20" fill="currentColor" className="wizard-step-check-icon">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </h2>
          <p className="wizard-step-description" id={`wizard-step-description-${stepId}`}>
            {description}
          </p>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="wizard-step-loading" aria-label="Laddar">
            <div className="wizard-step-spinner" />
            <span className="wizard-step-loading-text">Laddar...</span>
          </div>
        )}
      </div>

      {/* Error Messages */}
      {hasErrors && (
        <div className="wizard-step-errors" role="alert" aria-live="polite">
          <div className="wizard-step-error-header">
            <svg viewBox="0 0 20 20" fill="currentColor" className="wizard-step-error-icon">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="wizard-step-error-title">
              {errors.length === 1 ? 'Ett fel behöver åtgärdas:' : `${errors.length} fel behöver åtgärdas:`}
            </span>
          </div>
          <ul className="wizard-step-error-list">
            {errors.map((error, index) => (
              <li key={index} className="wizard-step-error-item">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Step Content */}
      <div className="wizard-step-content">
        {children}
      </div>
    </div>
  );
}

/**
 * WizardStepSection - Reusable section component for organizing step content
 */
export interface WizardStepSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  isOptional?: boolean;
}

export function WizardStepSection({
  title,
  description,
  children,
  className = '',
  isOptional = false,
}: WizardStepSectionProps) {
  return (
    <section className={`wizard-step-section ${className}`}>
      {title && (
        <div className="wizard-step-section-header">
          <h3 className="wizard-step-section-title">
            {title}
            {isOptional && (
              <span className="wizard-step-optional-badge">Valfritt</span>
            )}
          </h3>
          {description && (
            <p className="wizard-step-section-description">{description}</p>
          )}
        </div>
      )}
      <div className="wizard-step-section-content">
        {children}
      </div>
    </section>
  );
}

/**
 * WizardStepActions - Action buttons for step-specific operations
 */
export interface WizardStepActionsProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function WizardStepActions({
  children,
  className = '',
  align = 'right',
}: WizardStepActionsProps) {
  return (
    <div className={`wizard-step-actions wizard-step-actions-${align} ${className}`}>
      {children}
    </div>
  );
}

/**
 * WizardStepHint - Contextual hints and tips for users
 */
export interface WizardStepHintProps {
  children: ReactNode;
  type?: 'info' | 'tip' | 'warning' | 'success';
  className?: string;
}

export function WizardStepHint({
  children,
  type = 'info',
  className = '',
}: WizardStepHintProps) {
  const icons = {
    info: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="wizard-hint-icon">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    tip: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="wizard-hint-icon">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ),
    warning: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="wizard-hint-icon">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    success: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="wizard-hint-icon">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
  };

  return (
    <div className={`wizard-step-hint wizard-step-hint-${type} ${className}`}>
      {icons[type]}
      <div className="wizard-hint-content">
        {children}
      </div>
    </div>
  );
}