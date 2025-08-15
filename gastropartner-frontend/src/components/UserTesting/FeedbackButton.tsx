import React, { useState } from 'react';
import { UserFeedbackForm } from './UserFeedbackForm';
import './FeedbackButton.css';

interface FeedbackButtonProps {
  /**
   * Position of the feedback button
   */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  
  /**
   * Pre-fill feedback form with specific data
   */
  initialFeedbackData?: {
    feedback_type?: 'bug' | 'feature_request' | 'general' | 'usability' | 'satisfaction';
    title?: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  };
  
  /**
   * Custom label for the button
   */
  label?: string;
  
  /**
   * Compact mode - shows only icon
   */
  compact?: boolean;
  
  /**
   * Custom CSS class
   */
  className?: string;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  position = 'bottom-right',
  initialFeedbackData,
  label = 'Feedback',
  compact = false,
  className = ''
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleOpenForm = () => {
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
  };

  return (
    <>
      <button
        onClick={handleOpenForm}
        className={`feedback-button feedback-button--${position} ${compact ? 'feedback-button--compact' : ''} ${className}`}
        title="Skicka feedback"
      >
        <span className="feedback-button__icon">💬</span>
        {!compact && <span className="feedback-button__label">{label}</span>}
      </button>

      <UserFeedbackForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        initialData={initialFeedbackData}
      />
    </>
  );
};