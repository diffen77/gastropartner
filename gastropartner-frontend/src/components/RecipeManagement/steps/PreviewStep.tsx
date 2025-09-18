/**
 * PreviewStep - Final wizard step for reviewing and confirming recipe/menu-item
 *
 * This component allows users to:
 * - Review all entered data before saving
 * - See a formatted preview of their recipe/menu-item
 * - Edit specific sections by jumping to relevant steps
 * - Validate completeness before final submission
 * - Preview how the item will appear to customers
 */

import React, { useState, useCallback } from 'react';
import { formatCurrency } from '../../../utils/formatting';

export interface PreviewStepProps {
  /** Complete wizard data */
  data: any;
  /** Current creation type */
  creationType: 'recipe' | 'menu-item' | null;
  /** Validation errors for this step */
  errors: string[];
  /** Loading state from parent */
  isLoading: boolean;
  /** Callback to navigate to specific step for editing */
  onGoToStep: (step: string) => void;
}

/**
 * Editable section component with quick navigation
 */
interface EditableSectionProps {
  title: string;
  stepId: string;
  children: React.ReactNode;
  onEdit: (stepId: string) => void;
  isEmpty?: boolean;
}

function EditableSection({ title, stepId, children, onEdit, isEmpty = false }: EditableSectionProps) {
  return (
    <div className={`preview-section ${isEmpty ? 'preview-section--empty' : ''}`}>
      <div className="preview-section-header">
        <h3 className="preview-section-title">{title}</h3>
        <button
          type="button"
          onClick={() => onEdit(stepId)}
          className="btn btn--small btn--secondary preview-edit-btn"
          title={`Redigera ${title.toLowerCase()}`}
        >
          ✏️ Redigera
        </button>
      </div>
      <div className="preview-section-content">
        {isEmpty ? (
          <div className="preview-empty-state">
            <span className="preview-empty-icon">📝</span>
            <span className="preview-empty-text">Ingen information angiven</span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/**
 * Formatted ingredient list display
 */
interface IngredientListProps {
  ingredients: any[];
}

function IngredientList({ ingredients }: IngredientListProps) {
  const totalCost = ingredients.reduce((sum, ing) => sum + (ing.quantity * (ing.costPerUnit || 0)), 0);

  if (!ingredients || ingredients.length === 0) {
    return null;
  }

  return (
    <div className="preview-ingredients">
      <div className="ingredients-list">
        {ingredients.map((ingredient, index) => (
          <div key={index} className="ingredient-item">
            <div className="ingredient-info">
              <span className="ingredient-name">{ingredient.name || 'Okänd ingrediens'}</span>
              <div className="ingredient-details">
                <span className="ingredient-quantity">
                  {ingredient.quantity} {ingredient.unit}
                </span>
                {ingredient.costPerUnit > 0 && (
                  <span className="ingredient-cost">
                    {formatCurrency(ingredient.quantity * ingredient.costPerUnit)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {totalCost > 0 && (
        <div className="ingredients-total">
          <span className="total-label">Total kostnad för ingredienser:</span>
          <span className="total-value">{formatCurrency(totalCost)}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Formatted instructions display
 */
interface InstructionsDisplayProps {
  instructions: string;
  preparationTime: number;
  cookingTime: number;
}

function InstructionsDisplay({ instructions, preparationTime, cookingTime }: InstructionsDisplayProps) {
  const totalTime = preparationTime + cookingTime;

  // Format instructions with numbered steps
  const formatInstructions = (text: string) => {
    if (!text) return '';

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

  return (
    <div className="preview-instructions">
      {totalTime > 0 && (
        <div className="time-summary">
          <div className="time-item">
            <span className="time-label">Förberedelsetid:</span>
            <span className="time-value">{preparationTime || 0} min</span>
          </div>
          <div className="time-item">
            <span className="time-label">Tillagningstid:</span>
            <span className="time-value">{cookingTime || 0} min</span>
          </div>
          <div className="time-item time-item--total">
            <span className="time-label">Total tid:</span>
            <span className="time-value">
              {totalTime} min
              {totalTime > 60 && (
                <span className="time-hours">
                  ({Math.floor(totalTime / 60)}h {totalTime % 60}min)
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {instructions && (
        <div className="instructions-content">
          <h4>Instruktioner:</h4>
          <pre className="formatted-instructions">
            {formatInstructions(instructions)}
          </pre>
        </div>
      )}
    </div>
  );
}

/**
 * Sales information display for menu items
 */
interface SalesInfoDisplayProps {
  salesSettings: any;
  totalCost: number;
}

function SalesInfoDisplay({ salesSettings, totalCost }: SalesInfoDisplayProps) {
  const categories = {
    'appetizers': 'Förrätter',
    'main-courses': 'Huvudrätter',
    'desserts': 'Efterrätter',
    'beverages': 'Drycker',
    'sides': 'Tillbehör',
    'salads': 'Sallader',
    'soups': 'Soppor',
    'specials': 'Specialiteter',
    'vegetarian': 'Vegetariskt',
    'seafood': 'Fisk & Skaldjur',
  };

  const profit = Math.max(0, salesSettings.price - totalCost);
  const marginPercentage = salesSettings.price > 0 ? ((profit / salesSettings.price) * 100) : 0;

  return (
    <div className="preview-sales">
      <div className="sales-grid">
        <div className="sales-item">
          <span className="sales-label">Försäljningspris:</span>
          <span className="sales-value sales-value--primary">{formatCurrency(salesSettings.price || 0)}</span>
        </div>
        <div className="sales-item">
          <span className="sales-label">Kostnad:</span>
          <span className="sales-value">{formatCurrency(totalCost)}</span>
        </div>
        <div className="sales-item">
          <span className="sales-label">Vinst:</span>
          <span className="sales-value sales-value--profit">{formatCurrency(profit)}</span>
        </div>
        <div className="sales-item">
          <span className="sales-label">Marginal:</span>
          <span className="sales-value">{marginPercentage.toFixed(1)}%</span>
        </div>
        <div className="sales-item">
          <span className="sales-label">Kategori:</span>
          <span className="sales-value">{categories[salesSettings.category] || salesSettings.category || 'Ej vald'}</span>
        </div>
        <div className="sales-item">
          <span className="sales-label">Status:</span>
          <span className={`sales-value ${salesSettings.isAvailable ? 'sales-value--available' : 'sales-value--unavailable'}`}>
            {salesSettings.isAvailable ? '✅ Tillgänglig' : '❌ Ej tillgänglig'}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Data completeness validator
 */
function useDataValidation(data: any, creationType: 'recipe' | 'menu-item' | null) {
  const validation = React.useMemo(() => {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Basic info validation
    if (!data.basicInfo?.name) {
      issues.push('Namn saknas');
    }
    if (!data.basicInfo?.servings || data.basicInfo.servings < 1) {
      warnings.push('Antal portioner bör anges');
    }

    // Ingredients validation
    if (!data.ingredients || data.ingredients.length === 0) {
      issues.push('Inga ingredienser har lagts till');
    } else {
      const invalidIngredients = data.ingredients.filter(ing => !ing.ingredientId || !ing.quantity);
      if (invalidIngredients.length > 0) {
        issues.push(`${invalidIngredients.length} ingrediens(er) är ofullständiga`);
      }
    }

    // Menu item specific validation
    if (creationType === 'menu-item') {
      if (!data.salesSettings?.price || data.salesSettings.price <= 0) {
        issues.push('Försäljningspris måste anges för maträtter');
      }
      if (!data.salesSettings?.category) {
        warnings.push('Kategori bör väljas för bättre organisation');
      }
    }

    // Recipe specific validation
    if (creationType === 'recipe') {
      if (!data.preparation?.instructions) {
        warnings.push('Tillagningsinstruktioner rekommenderas för recept');
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      completeness: Math.round(((
        (data.basicInfo?.name ? 1 : 0) +
        (data.ingredients?.length > 0 ? 1 : 0) +
        (data.preparation?.instructions ? 1 : 0) +
        (creationType === 'menu-item' && data.salesSettings?.price > 0 ? 1 : 0) +
        (data.basicInfo?.servings > 0 ? 1 : 0)
      ) / (creationType === 'menu-item' ? 5 : 4)) * 100)
    };
  }, [data, creationType]);

  return validation;
}

export function PreviewStep({
  data,
  creationType,
  errors,
  isLoading,
  onGoToStep,
}: PreviewStepProps) {
  const [activePreview, setActivePreview] = useState<'internal' | 'customer'>('internal');

  const validation = useDataValidation(data, creationType);
  const totalCost = data.costCalculation?.totalCost || 0;

  const handleEditSection = useCallback((stepId: string) => {
    onGoToStep(stepId);
  }, [onGoToStep]);

  return (
    <div className="preview-step">
      <div className="wizard-step-content">
        {/* Step Description */}
        <div className="step-description">
          <p>
            Granska ditt {creationType === 'recipe' ? 'grundrecept' : 'maträtt'} innan du sparar.
            Du kan redigera vilken sektion som helst genom att klicka på "Redigera"-knappen.
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

        {/* Validation Summary */}
        <div className="validation-summary">
          <div className="validation-header">
            <div className="validation-status">
              <span className={`status-indicator ${validation.isValid ? 'status-indicator--valid' : 'status-indicator--invalid'}`}>
                {validation.isValid ? '✅' : '⚠️'}
              </span>
              <span className="status-text">
                {validation.isValid ? 'Redo att spara' : 'Kräver uppmärksamhet'}
              </span>
            </div>
            <div className="completeness-meter">
              <span className="completeness-label">Fullständighet:</span>
              <div className="completeness-bar">
                <div
                  className="completeness-fill"
                  style={{ width: `${validation.completeness}%` }}
                />
              </div>
              <span className="completeness-value">{validation.completeness}%</span>
            </div>
          </div>

          {validation.issues.length > 0 && (
            <div className="validation-issues">
              <h4>Måste fixas:</h4>
              <ul>
                {validation.issues.map((issue, index) => (
                  <li key={index} className="issue-item issue-item--error">
                    ❌ {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="validation-warnings">
              <h4>Rekommendationer:</h4>
              <ul>
                {validation.warnings.map((warning, index) => (
                  <li key={index} className="issue-item issue-item--warning">
                    ⚠️ {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Preview Mode Toggle */}
        <div className="preview-mode-toggle">
          <button
            type="button"
            onClick={() => setActivePreview('internal')}
            className={`preview-mode-btn ${activePreview === 'internal' ? 'active' : ''}`}
            disabled={isLoading}
          >
            📋 Intern vy
          </button>
          <button
            type="button"
            onClick={() => setActivePreview('customer')}
            className={`preview-mode-btn ${activePreview === 'customer' ? 'active' : ''}`}
            disabled={isLoading}
          >
            👥 Kundvy
          </button>
        </div>

        {/* Preview Content */}
        <div className="preview-content">
          {activePreview === 'internal' ? (
            <div className="internal-preview">
              {/* Basic Information */}
              <EditableSection
                title="Grundinformation"
                stepId="basic-info"
                onEdit={handleEditSection}
                isEmpty={!data.basicInfo?.name}
              >
                <div className="basic-info-display">
                  <h2 className="item-name">{data.basicInfo?.name || 'Namnlöst'}</h2>
                  {data.basicInfo?.description && (
                    <p className="item-description">{data.basicInfo.description}</p>
                  )}
                  <div className="basic-details">
                    <span className="detail-item">
                      <strong>Typ:</strong> {creationType === 'recipe' ? 'Grundrecept' : 'Maträtt'}
                    </span>
                    {data.basicInfo?.servings && (
                      <span className="detail-item">
                        <strong>Portioner:</strong> {data.basicInfo.servings}
                      </span>
                    )}
                    {data.basicInfo?.category && (
                      <span className="detail-item">
                        <strong>Kategori:</strong> {data.basicInfo.category}
                      </span>
                    )}
                  </div>
                </div>
              </EditableSection>

              {/* Ingredients */}
              <EditableSection
                title="Ingredienser"
                stepId="ingredients"
                onEdit={handleEditSection}
                isEmpty={!data.ingredients || data.ingredients.length === 0}
              >
                <IngredientList ingredients={data.ingredients || []} />
              </EditableSection>

              {/* Preparation */}
              <EditableSection
                title="Tillagning"
                stepId="preparation"
                onEdit={handleEditSection}
                isEmpty={!data.preparation?.instructions && !data.preparation?.preparationTime && !data.preparation?.cookingTime}
              >
                <InstructionsDisplay
                  instructions={data.preparation?.instructions || ''}
                  preparationTime={data.preparation?.preparationTime || 0}
                  cookingTime={data.preparation?.cookingTime || 0}
                />
              </EditableSection>

              {/* Sales Settings (only for menu items) */}
              {creationType === 'menu-item' && (
                <EditableSection
                  title="Försäljningsinställningar"
                  stepId="sales-settings"
                  onEdit={handleEditSection}
                  isEmpty={!data.salesSettings?.price}
                >
                  <SalesInfoDisplay
                    salesSettings={data.salesSettings || {}}
                    totalCost={totalCost}
                  />
                </EditableSection>
              )}
            </div>
          ) : (
            <div className="customer-preview">
              <div className="customer-card">
                <div className="customer-card-header">
                  <h2 className="customer-item-name">{data.basicInfo?.name || 'Namnlöst'}</h2>
                  {creationType === 'menu-item' && data.salesSettings?.price && (
                    <span className="customer-price">{formatCurrency(data.salesSettings.price)}</span>
                  )}
                </div>

                {data.basicInfo?.description && (
                  <p className="customer-description">{data.basicInfo.description}</p>
                )}

                {data.ingredients && data.ingredients.length > 0 && (
                  <div className="customer-ingredients">
                    <h4>Ingredienser:</h4>
                    <span className="ingredients-text">
                      {data.ingredients
                        .filter(ing => ing.name)
                        .map(ing => ing.name)
                        .join(', ')}
                    </span>
                  </div>
                )}

                {(data.preparation?.preparationTime > 0 || data.preparation?.cookingTime > 0) && (
                  <div className="customer-timing">
                    <span className="timing-info">
                      🕒 Ca {(data.preparation?.preparationTime || 0) + (data.preparation?.cookingTime || 0)} minuter
                    </span>
                  </div>
                )}

                {creationType === 'menu-item' && !data.salesSettings?.isAvailable && (
                  <div className="customer-unavailable">
                    <span className="unavailable-badge">Ej tillgänglig</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <div className="loading-text">Förbereder förhandsvisning...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}