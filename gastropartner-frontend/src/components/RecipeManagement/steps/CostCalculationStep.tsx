/**
 * CostCalculationStep - Cost calculation step of the Recipe-MenuItem Creation Wizard
 *
 * Integrates with LiveCostCalculator for real-time cost calculation and pricing.
 * Adapts behavior based on creation type (recipe vs menu-item).
 * Provides intelligent pricing suggestions and margin calculations.
 */

import React, { useCallback, useState, useMemo } from 'react';
import { CostCalculation, Ingredients } from '../../../hooks/useWizardState';
import { LiveCostCalculator } from '../../CostAnalysis/LiveCostCalculator';
import { WizardStep, WizardStepSection, WizardStepHint } from '../WizardStep';
import { useIngredients } from '../../../hooks/useIngredients';
import { useRecipes } from '../../../hooks/useRecipes';
import './CostCalculationStep.css';

export interface CostCalculationStepProps {
  /** Current cost calculation data */
  costCalculation: CostCalculation;
  /** Selected ingredients for calculation */
  ingredients: Ingredients;
  /** Current creation type */
  creationType: 'recipe' | 'menu-item' | null;
  /** Number of servings */
  servings: number;
  /** Validation errors */
  errors: string[];
  /** Loading state */
  isLoading: boolean;
  /** Called when cost calculation is updated */
  onCostCalculationUpdate: (costCalculation: Partial<CostCalculation>) => void;
}

export function CostCalculationStep({
  costCalculation,
  ingredients,
  creationType,
  servings,
  errors,
  isLoading,
  onCostCalculationUpdate,
}: CostCalculationStepProps) {
  const { data: availableIngredients, loading: ingredientsLoading } = useIngredients();
  const { data: availableRecipes, loading: recipesLoading } = useRecipes();

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [manualPriceOverride, setManualPriceOverride] = useState(false);

  // Handle cost calculation changes from LiveCostCalculator
  const handleCostChange = useCallback((
    totalCost: number,
    suggestedPrice: number,
    margin: number
  ) => {
    onCostCalculationUpdate({
      totalCost,
      suggestedPrice: manualPriceOverride ? costCalculation.suggestedPrice : suggestedPrice,
      currentMargin: margin,
      costPerServing: totalCost / servings,
    });
  }, [onCostCalculationUpdate, manualPriceOverride, costCalculation.suggestedPrice, servings]);

  // Handle price selection from suggestions
  const handlePriceSelect = useCallback((price: number, margin: number) => {
    setManualPriceOverride(true);
    onCostCalculationUpdate({
      suggestedPrice: price,
      currentMargin: margin,
    });
  }, [onCostCalculationUpdate]);

  // Handle target margin changes
  const handleTargetMarginChange = useCallback((margin: number) => {
    onCostCalculationUpdate({
      targetMargin: margin,
    });
  }, [onCostCalculationUpdate]);

  // Convert wizard ingredients to LiveCostCalculator format
  const costCalculationItems = useMemo(() => {
    return ingredients.map(ingredient => ({
      type: 'ingredient' as const,
      item_id: ingredient.ingredientId,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      name: ingredient.name,
      cost_per_unit: ingredient.costPerUnit || 0,
    }));
  }, [ingredients]);

  // Get contextual guidance based on creation type
  const getContextualGuidance = () => {
    if (creationType === 'recipe') {
      return (
        <WizardStepHint type="info">
          <strong>Kostnadsberäkning för grundrecept:</strong> Denna kostnad kommer att
          användas när receptet inkluderas i maträtter. Se till att alla ingredienser
          är korrekt angivna för noggrann kostnadskalkyl.
        </WizardStepHint>
      );
    } else {
      return (
        <WizardStepHint type="info">
          <strong>Prissättning för maträtt:</strong> Använd målmarginalen för att
          hitta en lämplig försäljningspris. Tänk på konkurrens och kundernas
          betalningsvilja när du sätter priset.
        </WizardStepHint>
      );
    }
  };

  return (
    <WizardStep
      stepId="cost-calculation"
      title="Kostnadsberäkning"
      description={`Beräkna ${creationType === 'recipe' ? 'kostnad per portion' : 'kostnad och försäljningspris'}`}
      isActive={true}
      isLoading={isLoading || ingredientsLoading || recipesLoading}
      errors={errors}
    >
      {getContextualGuidance()}

      <WizardStepSection title="Kostnadskalkyl">
        <div className="cost-calculation-container">
          <LiveCostCalculator
            ingredients={availableIngredients || []}
            recipes={availableRecipes || []}
            initialTargetMargin={costCalculation.targetMargin || 30}
            initialServings={servings}
            onCostChange={handleCostChange}
            onPriceSelect={handlePriceSelect}
            enableHistoricalComparison={creationType === 'menu-item'}
            enableBulkAdjustment={false}
            simplified={creationType === 'recipe'}
            className="wizard-cost-calculator"
          />
        </div>
      </WizardStepSection>

      {/* Cost Summary */}
      <WizardStepSection title="Kostnadssammanfattning">
        <div className="cost-summary">
          <div className="cost-summary-grid">
            <div className="cost-summary-item">
              <span className="cost-summary-label">Totalkostnad:</span>
              <span className="cost-summary-value cost-summary-total">
                {costCalculation.totalCost?.toFixed(2) || '0.00'} kr
              </span>
            </div>

            <div className="cost-summary-item">
              <span className="cost-summary-label">Kostnad per portion:</span>
              <span className="cost-summary-value">
                {costCalculation.costPerServing?.toFixed(2) || '0.00'} kr
              </span>
            </div>

            {creationType === 'menu-item' && (
              <>
                <div className="cost-summary-item">
                  <span className="cost-summary-label">Föreslaget pris:</span>
                  <span className="cost-summary-value cost-summary-price">
                    {costCalculation.suggestedPrice?.toFixed(2) || '0.00'} kr
                  </span>
                </div>

                <div className="cost-summary-item">
                  <span className="cost-summary-label">Aktuell marginal:</span>
                  <span className={`cost-summary-value cost-summary-margin ${
                    (costCalculation.currentMargin || 0) >= (costCalculation.targetMargin || 30)
                      ? 'cost-summary-margin-good'
                      : 'cost-summary-margin-low'
                  }`}>
                    {costCalculation.currentMargin?.toFixed(1) || '0.0'}%
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Margin indicator for menu items */}
          {creationType === 'menu-item' && (
            <div className="margin-indicator">
              <div className="margin-indicator-bar">
                <div
                  className="margin-indicator-fill"
                  style={{
                    width: `${Math.min((costCalculation.currentMargin || 0) / (costCalculation.targetMargin || 30) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="margin-indicator-labels">
                <span>0%</span>
                <span className="margin-target">
                  Mål: {costCalculation.targetMargin || 30}%
                </span>
                <span>50%</span>
              </div>
            </div>
          )}
        </div>
      </WizardStepSection>

      {/* Advanced Settings for Menu Items */}
      {creationType === 'menu-item' && (
        <WizardStepSection>
          <div className="advanced-settings">
            <button
              type="button"
              className="advanced-settings-toggle"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              aria-expanded={showAdvancedSettings}
              aria-controls="advanced-settings-content"
            >
              <span>Avancerade inställningar</span>
              <svg
                className={`advanced-settings-icon ${showAdvancedSettings ? 'expanded' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {showAdvancedSettings && (
              <div id="advanced-settings-content" className="advanced-settings-content">
                {/* Target Margin */}
                <div className="form-field">
                  <label htmlFor="target-margin" className="form-label">
                    Målmarginal (%)
                  </label>
                  <input
                    id="target-margin"
                    type="number"
                    className="form-input form-input-number"
                    value={costCalculation.targetMargin || 30}
                    onChange={(e) => handleTargetMarginChange(Number(e.target.value))}
                    min="0"
                    max="100"
                    step="1"
                  />
                  <div className="form-help">
                    Önskad vinstmarginal för denna maträtt
                  </div>
                </div>

                {/* Manual Price Override */}
                <div className="form-field">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={manualPriceOverride}
                      onChange={(e) => setManualPriceOverride(e.target.checked)}
                    />
                    <span className="checkbox-text">
                      Manuell prisöverstyring
                    </span>
                  </label>
                  <div className="form-help">
                    Aktivera för att ange eget pris istället för automatiska förslag
                  </div>
                </div>

                {manualPriceOverride && (
                  <div className="form-field">
                    <label htmlFor="manual-price" className="form-label">
                      Manuellt pris (kr)
                    </label>
                    <input
                      id="manual-price"
                      type="number"
                      className="form-input form-input-number"
                      value={costCalculation.suggestedPrice || 0}
                      onChange={(e) => onCostCalculationUpdate({ suggestedPrice: Number(e.target.value) })}
                      min="0"
                      step="0.50"
                    />
                    <div className="form-help">
                      Ange önskat försäljningspris manuellt
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </WizardStepSection>
      )}

      {/* Recipe-specific guidance */}
      {creationType === 'recipe' && (
        <WizardStepSection>
          <WizardStepHint type="tip">
            <strong>Tips för grundrecept:</strong> Denna kostnadsinformation kommer att
            användas automatiskt när receptet läggs till i maträtter. Se till att alla
            ingredienser och mängder är korrekta för bästa resultat.
          </WizardStepHint>
        </WizardStepSection>
      )}

      {/* Menu item specific guidance */}
      {creationType === 'menu-item' && (
        <WizardStepSection>
          <WizardStepHint type="warning">
            <strong>Viktigt för prissättning:</strong> Tänk på konkurrenternas priser
            och vad kunderna är villiga att betala. En för hög marginal kan minska
            försäljningen, medan en för låg marginal påverkar lönsamheten.
          </WizardStepHint>
        </WizardStepSection>
      )}
    </WizardStep>
  );
}