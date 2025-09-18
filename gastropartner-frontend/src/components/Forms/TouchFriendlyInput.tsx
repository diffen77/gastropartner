import React, { useState, useEffect } from 'react';
import './TouchFriendlyInput.css';

interface TouchFriendlyInputProps {
  type?: 'text' | 'number' | 'email' | 'password';
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  'aria-label'?: string;
  'data-testid'?: string;
}

export function TouchFriendlyInput({
  type = 'text',
  value,
  onChange,
  placeholder,
  label,
  unit,
  min,
  max,
  step = 1,
  disabled = false,
  required = false,
  className = '',
  'aria-label': ariaLabel,
  'data-testid': testId
}: TouchFriendlyInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isTouched, setIsTouched] = useState(false);

  const inputId = `touch-input-${Math.random().toString(36).substr(2, 9)}`;

  const handleFocus = () => {
    setIsFocused(true);
    setIsTouched(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const incrementValue = () => {
    if (type === 'number' && !disabled) {
      const currentValue = parseFloat(value.toString()) || 0;
      const newValue = currentValue + (step || 1);
      if (max === undefined || newValue <= max) {
        onChange(newValue.toString());
      }
    }
  };

  const decrementValue = () => {
    if (type === 'number' && !disabled) {
      const currentValue = parseFloat(value.toString()) || 0;
      const newValue = currentValue - (step || 1);
      if (min === undefined || newValue >= min) {
        onChange(newValue.toString());
      }
    }
  };

  const hasValue = value !== '' && value !== null && value !== undefined;

  return (
    <div className={`touch-friendly-input ${className} ${isTouched ? 'touch-friendly-input--touched' : ''}`}>
      {label && (
        <label
          htmlFor={inputId}
          className={`touch-input-label ${isFocused || hasValue ? 'touch-input-label--active' : ''}`}
        >
          {label}
          {required && <span className="required-marker" aria-label="obligatorisk">*</span>}
        </label>
      )}

      <div className={`touch-input-wrapper ${isFocused ? 'touch-input-wrapper--focused' : ''} ${hasValue ? 'touch-input-wrapper--has-value' : ''} ${disabled ? 'touch-input-wrapper--disabled' : ''}`}>
        {type === 'number' && (
          <button
            type="button"
            className="touch-input-decrement"
            onClick={decrementValue}
            disabled={disabled || (min !== undefined && parseFloat(value.toString()) <= min)}
            aria-label={`Minska ${label || 'värde'}`}
            tabIndex={-1}
          >
            −
          </button>
        )}

        <input
          id={inputId}
          type={type}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          required={required}
          className="touch-input-field"
          aria-label={ariaLabel || label}
          data-testid={testId}
          autoComplete="off"
          spellCheck={false}
        />

        {unit && (
          <div className="touch-input-unit" aria-label={`Enhet: ${unit}`}>
            {unit}
          </div>
        )}

        {type === 'number' && (
          <button
            type="button"
            className="touch-input-increment"
            onClick={incrementValue}
            disabled={disabled || (max !== undefined && parseFloat(value.toString()) >= max)}
            aria-label={`Öka ${label || 'värde'}`}
            tabIndex={-1}
          >
            +
          </button>
        )}
      </div>

      {required && !hasValue && isTouched && (
        <div className="touch-input-error" role="alert">
          Detta fält är obligatoriskt
        </div>
      )}
    </div>
  );
}