import React, { useState, useEffect } from 'react';
import { apiClient } from '../../utils/api';
import './UserFeedbackForm.css';

export interface UserFeedbackFormData {
  feedback_type: 'bug' | 'feature_request' | 'general' | 'usability' | 'satisfaction';
  title: string;
  description: string;
  rating?: number;
  page_url?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface UserFeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: UserFeedbackFormData) => Promise<void>;
  initialData?: Partial<UserFeedbackFormData>;
}

export const UserFeedbackForm: React.FC<UserFeedbackFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData
}) => {
  const [formData, setFormData] = useState<UserFeedbackFormData>({
    feedback_type: 'general',
    title: '',
    description: '',
    rating: undefined,
    page_url: window.location.href,
    priority: 'medium',
    ...initialData
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
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
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        await apiClient.createFeedback(formData);
      }
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        // Reset form
        setFormData({
          feedback_type: 'general',
          title: '',
          description: '',
          rating: undefined,
          page_url: window.location.href,
          priority: 'medium',
        });
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof UserFeedbackFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderRatingStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          type="button"
          className={`rating-star ${(formData.rating || 0) >= i ? 'active' : ''}`}
          onClick={() => handleChange('rating', i)}
        >
          ⭐
        </button>
      );
    }
    return stars;
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className={`modal-overlay ${isOpen ? 'modal-open' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className="modal-content modal-content--medium" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💬 Skicka Feedback</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {success ? (
            <div className="feedback-success">
              <div className="success-icon">✅</div>
              <h3>Tack för din feedback!</h3>
              <p>Vi uppskattar verkligen att du tog dig tid att hjälpa oss förbättra GastroPartner.</p>
            </div>
          ) : (
            <form id="feedback-form" onSubmit={handleSubmit} className="feedback-form">
            <div className="form-group">
              <label htmlFor="feedback_type">Typ av feedback</label>
              <select
                id="feedback_type"
                value={formData.feedback_type}
                onChange={(e) => handleChange('feedback_type', e.target.value)}
                required
              >
                <option value="general">Allmän feedback</option>
                <option value="bug">🐛 Bugg/Problem</option>
                <option value="feature_request">💡 Funktionsförslag</option>
                <option value="usability">🎯 Användbarhet</option>
                <option value="satisfaction">😊 Nöjdhet</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="title">Rubrik</label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Kort beskrivning av din feedback..."
                autoComplete="off"
                required
                maxLength={255}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Detaljerad beskrivning</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Berätta mer om din upplevelse, vad som hände, eller vad du skulle vilja se..."
                rows={5}
                required
                maxLength={2000}
              />
              <small className="char-count">
                {formData.description.length}/2000 tecken
              </small>
            </div>

            {formData.feedback_type === 'satisfaction' && (
              <div className="form-group">
                <label>Betyg (valfritt)</label>
                <div className="rating-container">
                  <div className="rating-stars">
                    {renderRatingStars()}
                  </div>
                  {formData.rating && (
                    <span className="rating-text">
                      {formData.rating === 1 && "Mycket missnöjd"}
                      {formData.rating === 2 && "Missnöjd"}
                      {formData.rating === 3 && "Neutral"}
                      {formData.rating === 4 && "Nöjd"}
                      {formData.rating === 5 && "Mycket nöjd"}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="priority">Prioritet</label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
              >
                <option value="low">Låg</option>
                <option value="medium">Medium</option>
                <option value="high">Hög</option>
                <option value="critical">Kritisk</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="page_url">Aktuell sida</label>
              <input
                type="url"
                id="page_url"
                value={formData.page_url}
                onChange={(e) => handleChange('page_url', e.target.value)}
                placeholder="URL för sidan där problemet uppstod..."
                autoComplete="url"
                maxLength={500}
              />
            </div>

            {error && (
              <div className="error-message">
                <span>⚠️ {error}</span>
              </div>
            )}
          </form>
          )}
        </div>

        {!success && (
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn--secondary">
              Avbryt
            </button>
            <button 
              type="submit" 
              form="feedback-form"
              className="btn btn--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Skickar...' : 'Skicka Feedback'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};