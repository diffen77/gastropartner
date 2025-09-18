/**
 * PreparationStep - Wizard step for preparation instructions and timing
 *
 * This component allows users to:
 * - Enter detailed cooking instructions with rich text editing
 * - Set preparation time in minutes
 * - Set cooking time in minutes
 * - Preview and format instructions for clarity
 * - Auto-save instructions as they type
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Preparation } from '../../../hooks/useRecipeMenuWizardState';

export interface PreparationStepProps {
  /** Current preparation data */
  preparation: Preparation;
  /** Current creation type affecting preparation behavior */
  creationType: 'recipe' | 'menu-item' | null;
  /** Validation errors for this step */
  errors: string[];
  /** Loading state from parent */
  isLoading: boolean;
  /** Callback when preparation data changes */
  onPreparationUpdate: (preparation: Preparation) => void;
}

/**
 * Instructions editor with basic formatting and helpful features
 */
interface InstructionsEditorProps {
  instructions: string;
  onChange: (instructions: string) => void;
  disabled: boolean;
}

function InstructionsEditor({ instructions, onChange, disabled }: InstructionsEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [instructions, adjustTextareaHeight]);

  // Format instructions for preview
  const formatInstructions = (text: string) => {
    return text
      .split('\n')
      .map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Auto-number steps if they aren't already numbered
        const isNumbered = /^\d+\.?\s/.test(trimmed);
        if (!isNumbered && trimmed.length > 0) {
          return `${index + 1}. ${trimmed}`;
        }
        return trimmed;
      })
      .filter(Boolean)
      .join('\n');
  };

  // Insert helpful templates
  const insertTemplate = (template: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;

    const newText = currentText.substring(0, start) + template + currentText.substring(end);
    onChange(newText);

    // Focus and position cursor after template
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + template.length, start + template.length);
    }, 0);
  };

  const templates = [
    { name: 'Tillagningssteg', template: '1. Förbered ingredienserna\n2. Värm ugnen till 180°C\n3. ' },
    { name: 'Tid & Temp', template: 'Tillagningstid: X minuter vid Y°C' },
    { name: 'Tips', template: '💡 Tips: ' },
    { name: 'Varning', template: '⚠️ Viktigt: ' },
  ];

  return (
    <div className="instructions-editor">
      <div className="editor-header">
        <div className="editor-actions">
          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            disabled={disabled}
            className={`btn btn--small ${isPreviewMode ? 'btn--primary' : 'btn--secondary'}`}
          >
            {isPreviewMode ? '✏️ Redigera' : '👁️ Förhandsvisning'}
          </button>
        </div>
        <div className="editor-templates">
          {templates.map((template) => (
            <button
              key={template.name}
              type="button"
              onClick={() => insertTemplate(template.template)}
              disabled={disabled || isPreviewMode}
              className="btn btn--small btn--ghost"
              title={`Infoga: ${template.name}`}
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {isPreviewMode ? (
        <div className="instructions-preview">
          <div className="preview-content">
            {instructions ? (
              <pre className="formatted-instructions">
                {formatInstructions(instructions)}
              </pre>
            ) : (
              <div className="empty-preview">
                <span>Inga instruktioner att visa</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="instructions-input">
          <textarea
            ref={textareaRef}
            value={instructions}
            onChange={(e) => {
              onChange(e.target.value);
              adjustTextareaHeight();
            }}
            disabled={disabled}
            className="instructions-textarea"
            placeholder="Skriv detaljerade tillagningsinstruktioner här...

Exempel:
1. Förbered alla ingredienser och mät upp dem
2. Värm ugnen till 180°C
3. Blanda torra ingredienser i en skål
4. Tillsätt våta ingredienser och rör om försiktigt
5. Baka i 25-30 minuter tills gyllene

💡 Tips: Använd numrerade steg för tydlighet
⚠️ Viktigt: Kontrollera alltid temperaturen innan servering"
            rows={6}
          />
          <div className="character-count">
            {instructions.length} tecken
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Time input component with helpful presets
 */
interface TimeInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
  presets?: number[];
  unit?: string;
}

function TimeInput({ label, value, onChange, disabled, presets = [], unit = 'minuter' }: TimeInputProps) {
  const handleQuickSet = (minutes: number) => {
    onChange(minutes);
  };

  return (
    <div className="time-input">
      <label className="time-input-label">{label}</label>
      <div className="time-input-controls">
        <div className="time-input-field">
          <input
            type="number"
            min="0"
            max="600"
            step="5"
            value={value || ''}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
            disabled={disabled}
            className="time-input-number"
            placeholder="0"
          />
          <span className="time-input-unit">{unit}</span>
        </div>

        {presets.length > 0 && (
          <div className="time-presets">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleQuickSet(preset)}
                disabled={disabled}
                className={`time-preset ${value === preset ? 'active' : ''}`}
                title={`Sätt till ${preset} ${unit}`}
              >
                {preset}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PreparationStep({
  preparation,
  creationType,
  errors,
  isLoading,
  onPreparationUpdate,
}: PreparationStepProps) {
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save instructions with debouncing
  const handleInstructionsChange = useCallback((instructions: string) => {
    const newPreparation = { ...preparation, instructions };
    onPreparationUpdate(newPreparation);

    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // Set new auto-save timeout
    const timeoutId = setTimeout(() => {
      setLastSaved(new Date());
    }, 2000);

    setAutoSaveTimeout(timeoutId);
  }, [preparation, onPreparationUpdate, autoSaveTimeout]);

  // Handle time changes
  const handlePreparationTimeChange = useCallback((preparationTime: number) => {
    onPreparationUpdate({ ...preparation, preparationTime });
  }, [preparation, onPreparationUpdate]);

  const handleCookingTimeChange = useCallback((cookingTime: number) => {
    onPreparationUpdate({ ...preparation, cookingTime });
  }, [preparation, onPreparationUpdate]);

  // Calculate total time
  const totalTime = preparation.preparationTime + preparation.cookingTime;

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [autoSaveTimeout]);

  // Common time presets based on creation type
  const preparationPresets = creationType === 'recipe'
    ? [5, 10, 15, 30, 45, 60]
    : [5, 10, 15, 20, 30];

  const cookingPresets = creationType === 'recipe'
    ? [10, 15, 20, 30, 45, 60, 90, 120]
    : [5, 10, 15, 20, 25, 30, 45];

  return (
    <div className="preparation-step">
      <div className="wizard-step-content">
        {/* Step Description */}
        <div className="step-description">
          <p>
            Ange tillagningsinstruktioner och tidsberäkningar för ditt {' '}
            {creationType === 'recipe' ? 'grundrecept' : 'maträtt'}.
            Detaljerade instruktioner hjälper att säkerställa framgång i köket.
          </p>
        </div>

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="error-banner">
            <div className="error-list">
              {errors.map((error, index) => (
                <div key={index} className="error-item">
                  ⚠️ {error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timing Section */}
        <div className="preparation-timing">
          <h3>Tidsberäkning</h3>
          <div className="timing-grid">
            <TimeInput
              label="Förberedelsetid"
              value={preparation.preparationTime}
              onChange={handlePreparationTimeChange}
              disabled={isLoading}
              presets={preparationPresets}
            />

            <TimeInput
              label="Tillagningstid"
              value={preparation.cookingTime}
              onChange={handleCookingTimeChange}
              disabled={isLoading}
              presets={cookingPresets}
            />

            <div className="total-time">
              <span className="total-time-label">Total tid:</span>
              <span className="total-time-value">
                {totalTime > 0 ? `${totalTime} minuter` : 'Ej angivet'}
              </span>
              {totalTime > 60 && (
                <span className="total-time-hours">
                  ({Math.floor(totalTime / 60)}h {totalTime % 60}min)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Instructions Section */}
        <div className="preparation-instructions">
          <div className="instructions-header">
            <h3>Tillagningsinstruktioner</h3>
            {lastSaved && (
              <div className="auto-save-indicator">
                ✅ Sparat {lastSaved.toLocaleTimeString('sv-SE', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            )}
          </div>

          <InstructionsEditor
            instructions={preparation.instructions}
            onChange={handleInstructionsChange}
            disabled={isLoading}
          />
        </div>

        {/* Helpful Tips */}
        <div className="preparation-tips">
          <h4>💡 Tips för bra instruktioner</h4>
          <ul>
            <li><strong>Var specifik:</strong> Ange temperaturer, tider och mängder tydligt</li>
            <li><strong>Använd numrerade steg:</strong> Gör det lätt att följa instruktionerna</li>
            <li><strong>Inkludera viktiga detaljer:</strong> När något är klart, hur det ska se ut</li>
            <li><strong>Lägg till tips:</strong> Hjälpfulla råd för framgång</li>
            {creationType === 'menu-item' && (
              <li><strong>Maträtter:</strong> Fokusera på presentation och servering</li>
            )}
          </ul>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <div className="loading-text">Sparar instruktioner...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}