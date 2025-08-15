/**
 * Authentication form component - Login och Register
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface AuthFormProps {
  mode: 'login' | 'register';
  onModeChange: (mode: 'login' | 'register') => void;
  onSuccess?: () => void;
}

export function AuthForm({ mode, onModeChange, onSuccess }: AuthFormProps) {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const { [name]: removed, ...rest } = prev;
        return rest;
      });
    }
    
    // Clear general message when user makes changes
    if (message) {
      setMessage(null);
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    
    // Email validation
    if (!formData.email) {
      errors.email = 'E-post krävs';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Ogiltig e-postadress';
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'Lösenord krävs';
    } else if (formData.password.length < 8) {
      errors.password = 'Lösenord måste vara minst 8 tecken långt';
    }
    
    // Full name validation for registration
    if (mode === 'register' && !formData.fullName.trim()) {
      errors.fullName = 'Fullt namn krävs';
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setValidationErrors({});

    // Client-side validation
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setLoading(false);
      return;
    }

    try {
      let result;
      
      if (mode === 'register') {
        result = await signUp(formData.email, formData.password, formData.fullName);
      } else {
        result = await signIn(formData.email, formData.password);
      }

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        
        if (mode === 'login') {
          // Redirect after successful login
          const from = location.state?.from?.pathname || '/dashboard';
          setTimeout(() => {
            navigate(from, { replace: true });
          }, 500); // Small delay to show success message
          
          if (onSuccess) {
            onSuccess();
          }
        }
        
        // Clear form on successful registration
        if (mode === 'register') {
          setFormData({ email: '', password: '', fullName: '' });
        }
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <form onSubmit={handleSubmit} className="auth-form__form">
        <h2 className="auth-form__title">
          {mode === 'login' ? 'Logga in' : 'Skapa konto'}
        </h2>

        {message && (
          <div className={`auth-form__message auth-form__message--${message.type}`}>
            {message.text}
          </div>
        )}

        {mode === 'register' && (
          <div className="auth-form__field">
            <label htmlFor="fullName" className="auth-form__label">
              Fullt namn
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className={`auth-form__input ${validationErrors.fullName ? 'auth-form__input--error' : ''}`}
              autoComplete="name"
              required
              disabled={loading}
            />
            {validationErrors.fullName && (
              <div className="auth-form__error">{validationErrors.fullName}</div>
            )}
          </div>
        )}

        <div className="auth-form__field">
          <label htmlFor="email" className="auth-form__label">
            E-post
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`auth-form__input ${validationErrors.email ? 'auth-form__input--error' : ''}`}
            autoComplete="email"
            required
            disabled={loading}
          />
          {validationErrors.email && (
            <div className="auth-form__error">{validationErrors.email}</div>
          )}
        </div>

        <div className="auth-form__field">
          <label htmlFor="password" className="auth-form__label">
            Lösenord
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={`auth-form__input ${validationErrors.password ? 'auth-form__input--error' : ''}`}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={8}
            required
            disabled={loading}
          />
          {validationErrors.password && (
            <div className="auth-form__error">{validationErrors.password}</div>
          )}
          {mode === 'register' && (
            <small className="auth-form__hint">
              Minst 8 tecken
            </small>
          )}
        </div>

        <button
          type="submit"
          className="auth-form__submit"
          disabled={loading}
        >
          {loading ? (
            <span>
              {mode === 'login' ? 'Loggar in...' : 'Skapar konto...'}
            </span>
          ) : (
            <span>
              {mode === 'login' ? 'Logga in' : 'Skapa konto'}
            </span>
          )}
        </button>

        <div className="auth-form__switch">
          {mode === 'login' ? (
            <p>
              Har du inget konto?{' '}
              <button
                type="button"
                className="auth-form__link"
                onClick={() => onModeChange('register')}
              >
                Skapa konto
              </button>
            </p>
          ) : (
            <p>
              Har du redan ett konto?{' '}
              <button
                type="button"
                className="auth-form__link"
                onClick={() => onModeChange('login')}
              >
                Logga in
              </button>
            </p>
          )}
        </div>
      </form>
    </div>
  );
}