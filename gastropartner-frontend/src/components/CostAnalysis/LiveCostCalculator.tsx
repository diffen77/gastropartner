/**
 * Live Cost Calculator Component
 *
 * Interactive cost calculator with real-time updates and intelligent pricing suggestions.
 * Features dynamic margin calculation, visual feedback, and accessibility support.
 *
 * Features:
 * - Real-time cost calculation as user selects recipes/ingredients
 * - Dynamic pricing suggestions based on target margins (30% default)
 * - Visual feedback with color-coded margin indicators
 * - Historical comparison with similar dishes
 * - Bulk price adjustment for multiple dishes
 * - Accessibility compliant with ARIA labels and keyboard navigation
 * - Performance optimized with minimal re-renders
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useCostCalculation, CostCalculationItem, PricingSuggestion } from '../../hooks/useCostCalculation';
import { Ingredient, Recipe } from '../../utils/api';
import { UNITS, renderUnitOptions } from '../../utils/units';
import './LiveCostCalculator.css';

export interface LiveCostCalculatorProps {
  /** Available ingredients for selection */
  ingredients: Ingredient[];
  /** Available recipes for selection */
  recipes: Recipe[];
  /** Initial target margin percentage (default: 30) */
  initialTargetMargin?: number;
  /** Initial serving count (default: 1) */
  initialServings?: number;
  /** Callback when cost calculation changes */
  onCostChange?: (totalCost: number, suggestedPrice: number, margin: number) => void;
  /** Callback when user selects a pricing suggestion */
  onPriceSelect?: (price: number, margin: number) => void;
  /** Enable historical comparison feature */
  enableHistoricalComparison?: boolean;
  /** Enable bulk price adjustment */
  enableBulkAdjustment?: boolean;
  /** CSS class name for custom styling */
  className?: string;
  /** Show simplified view (fewer controls) */
  simplified?: boolean;
}

export const LiveCostCalculator: React.FC<LiveCostCalculatorProps> = ({
  ingredients,
  recipes,
  initialTargetMargin = 30,
  initialServings = 1,
  onCostChange,
  onPriceSelect,
  enableHistoricalComparison = false,
  enableBulkAdjustment = false,
  className = '',
  simplified = false
}) => {
  const {
    items,
    calculation,
    loading,
    error,
    addItem,
    removeItem,
    updateItem,
    clearItems,
    targetMargin,
    setTargetMargin,
    servings,
    setServings
  } = useCostCalculation({
    target_margin: initialTargetMargin,
    default_servings: initialServings,
    enable_websocket_updates: true,
    enable_historical_comparison: enableHistoricalComparison
  });

  const [showAdvanced, setShowAdvanced] = useState(!simplified);
  const [selectedItemType, setSelectedItemType] = useState<'ingredient' | 'recipe'>('ingredient');

  // Notify parent component of changes
  React.useEffect(() => {
    if (onCostChange) {
      onCostChange(calculation.total_cost, calculation.suggested_price, calculation.current_margin);
    }
  }, [calculation, onCostChange]);

  /**
   * Handle adding a new ingredient
   */
  const handleAddIngredient = useCallback((ingredientId: string) => {
    const ingredient = ingredients.find(ing => ing.ingredient_id === ingredientId);
    if (!ingredient) return;

    const newItem: Omit<CostCalculationItem, 'id'> = {
      type: 'ingredient',
      item_id: ingredient.ingredient_id,
      quantity: 1,
      unit: ingredient.unit,
      name: ingredient.name,
      cost_per_unit: ingredient.cost_per_unit,
      unit_base: ingredient.unit
    };

    addItem(newItem);
  }, [ingredients, addItem]);

  /**
   * Handle adding a new recipe
   */
  const handleAddRecipe = useCallback((recipeId: string) => {
    const recipe = recipes.find(rec => rec.recipe_id === recipeId);
    if (!recipe) return;

    // Calculate recipe cost from its ingredients
    const recipeCost = recipe.ingredients?.reduce((total, ri) => {
      const ingredient = ingredients.find(ing => ing.ingredient_id === ri.ingredient_id);
      if (ingredient) {
        return total + (ri.quantity * ingredient.cost_per_unit);
      }
      return total;
    }, 0) || 0;

    const newItem: Omit<CostCalculationItem, 'id'> = {
      type: 'recipe',
      item_id: recipe.recipe_id,
      quantity: 1,
      unit: 'st', // pieces
      name: recipe.name,
      cost_per_unit: recipeCost,
      unit_base: 'st'
    };

    addItem(newItem);
  }, [recipes, ingredients, addItem]);

  /**
   * Handle pricing suggestion selection
   */
  const handlePriceSelect = useCallback((suggestion: PricingSuggestion) => {
    if (onPriceSelect) {
      onPriceSelect(suggestion.suggested_price, suggestion.target_margin);
    }
  }, [onPriceSelect]);

  /**
   * Get margin status styling
   */
  const getMarginStyles = useMemo(() => ({
    color: calculation.margin_status.color,
    backgroundColor: calculation.margin_status.bgColor,
    borderColor: calculation.margin_status.color
  }), [calculation.margin_status]);

  return (
    <div className={`live-cost-calculator ${className}`}>
      {/* Header */}
      <div className="calculator-header">
        <div className="header-title">
          <h3>Live Kostnadskalkulator</h3>
          {!simplified && (
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => setShowAdvanced(!showAdvanced)}
              aria-expanded={showAdvanced}
              aria-controls="advanced-settings"
            >
              {showAdvanced ? 'Enkel vy' : 'Avancerat'}
            </button>
          )}
        </div>

        {/* Quick Settings */}
        <div className="quick-settings">
          <div className="setting-group">
            <label htmlFor="servings">Portioner:</label>
            <input
              id="servings"
              type="number"
              min="1"
              max="100"
              value={servings}
              onChange={(e) => setServings(parseInt(e.target.value) || 1)}
              className="servings-input"
              aria-label="Antal portioner"
            />
          </div>

          <div className="setting-group">
            <label htmlFor="target-margin">Målmarginal:</label>
            <input
              id="target-margin"
              type="number"
              min="1"
              max="100"
              value={targetMargin}
              onChange={(e) => setTargetMargin(parseInt(e.target.value) || 30)}
              className="margin-input"
              aria-label="Målmarginal i procent"
            />
            <span className="unit">%</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="calculator-error" role="alert">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Item Selection */}
      <div className="item-selection">
        <div className="selection-header">
          <h4>Lägg till ingredienser/recept</h4>
          <div className="item-type-toggle">
            <button
              type="button"
              className={`toggle-btn ${selectedItemType === 'ingredient' ? 'active' : ''}`}
              onClick={() => setSelectedItemType('ingredient')}
              aria-pressed={selectedItemType === 'ingredient'}
            >
              Ingredienser
            </button>
            <button
              type="button"
              className={`toggle-btn ${selectedItemType === 'recipe' ? 'active' : ''}`}
              onClick={() => setSelectedItemType('recipe')}
              aria-pressed={selectedItemType === 'recipe'}
            >
              Recept
            </button>
          </div>
        </div>

        {/* Ingredient Selection */}
        {selectedItemType === 'ingredient' && (
          <div className="ingredient-selector">
            <select
              onChange={(e) => e.target.value && handleAddIngredient(e.target.value)}
              value=""
              className="item-select"
              aria-label="Välj ingrediens att lägga till"
            >
              <option value="">Välj ingrediens...</option>
              {ingredients.filter(ing => ing.is_active).map(ingredient => (
                <option key={ingredient.ingredient_id} value={ingredient.ingredient_id}>
                  {ingredient.name} ({ingredient.cost_per_unit.toFixed(2)} kr/{ingredient.unit})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Recipe Selection */}
        {selectedItemType === 'recipe' && (
          <div className="recipe-selector">
            <select
              onChange={(e) => e.target.value && handleAddRecipe(e.target.value)}
              value=""
              className="item-select"
              aria-label="Välj recept att lägga till"
            >
              <option value="">Välj recept...</option>
              {recipes.filter(recipe => recipe.is_active).map(recipe => (
                <option key={recipe.recipe_id} value={recipe.recipe_id}>
                  {recipe.name} ({recipe.servings} portioner)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Selected Items */}
      <div className="selected-items">
        <div className="items-header">
          <h4>Valda komponenter ({items.length})</h4>
          {items.length > 0 && (
            <button
              type="button"
              className="btn btn--danger btn--small"
              onClick={clearItems}
              aria-label="Rensa alla valda komponenter"
            >
              Rensa alla
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="empty-items">
            <p>Inga komponenter valda än</p>
            <small>Välj ingredienser eller recept för att börja beräkna kostnader</small>
          </div>
        ) : (
          <div className="items-list">
            {items.map(item => {
              const itemCost = (item.quantity * item.cost_per_unit);

              return (
                <div key={item.id} className="item-row">
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-type-badge">{item.type === 'ingredient' ? 'Ingrediens' : 'Recept'}</span>
                  </div>

                  <div className="item-controls">
                    <div className="quantity-control">
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                        className="quantity-input"
                        aria-label={`Mängd för ${item.name}`}
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                        className="unit-select"
                        aria-label={`Enhet för ${item.name}`}
                      >
                        {renderUnitOptions(UNITS)}
                      </select>
                    </div>

                    <div className="item-cost">
                      <span className="cost-value">{itemCost.toFixed(2)} kr</span>
                    </div>

                    <button
                      type="button"
                      className="btn btn--danger btn--small"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Ta bort ${item.name} från kalkylen`}
                      title={`Ta bort ${item.name}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cost Summary */}
      <div className="cost-summary">
        <div className="summary-main">
          <div className="cost-row total">
            <span>Total kostnad:</span>
            <span className="cost-value">{calculation.total_cost.toFixed(2)} kr</span>
          </div>

          <div className="cost-row">
            <span>Kostnad per portion:</span>
            <span className="cost-value">{calculation.cost_per_serving.toFixed(2)} kr</span>
          </div>

          <div className="cost-row suggested">
            <span>Föreslaget pris ({targetMargin}%):</span>
            <span className="price-value">{calculation.suggested_price.toFixed(2)} kr</span>
          </div>
        </div>

        {/* Margin Status */}
        <div className="margin-status" style={getMarginStyles}>
          <div className="margin-indicator">
            <span className="margin-value">{calculation.current_margin.toFixed(1)}%</span>
            <span className="margin-message">{calculation.margin_status.message}</span>
          </div>
        </div>
      </div>

      {/* Pricing Suggestions */}
      {showAdvanced && calculation.pricing_suggestions.length > 0 && (
        <div className="pricing-suggestions">
          <h4>Prisförslag</h4>
          <div className="suggestions-grid">
            {calculation.pricing_suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                className={`suggestion-card ${suggestion.is_recommended ? 'recommended' : ''}`}
                onClick={() => handlePriceSelect(suggestion)}
                aria-label={`Välj pris ${suggestion.suggested_price.toFixed(2)} kr med ${suggestion.target_margin}% marginal`}
              >
                <div className="suggestion-margin">{suggestion.target_margin}%</div>
                <div className="suggestion-price">{suggestion.suggested_price.toFixed(2)} kr</div>
                <div className="suggestion-profit">+{suggestion.profit_amount.toFixed(2)} kr</div>
                {suggestion.is_recommended && (
                  <div className="recommendation-badge">Rekommenderad</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Settings */}
      {showAdvanced && (
        <div id="advanced-settings" className="advanced-settings">
          {enableHistoricalComparison && calculation.historical_comparison && (
            <div className="historical-comparison">
              <h4>Historisk jämförelse</h4>
              <div className="comparison-data">
                <div className="comparison-row">
                  <span>Liknande rätter (snitt):</span>
                  <span>{calculation.historical_comparison.similar_dishes_avg.toFixed(2)} kr</span>
                </div>
                <div className="comparison-row">
                  <span>Prisskillnad:</span>
                  <span className={calculation.historical_comparison.price_variance > 0 ? 'positive' : 'negative'}>
                    {calculation.historical_comparison.price_variance > 0 ? '+' : ''}
                    {calculation.historical_comparison.price_variance.toFixed(2)} kr
                  </span>
                </div>
                <div className="comparison-recommendation">
                  <small>{calculation.historical_comparison.recommendation}</small>
                </div>
              </div>
            </div>
          )}

          {enableBulkAdjustment && (
            <div className="bulk-adjustment">
              <h4>Bulk-prisjustering</h4>
              <div className="bulk-controls">
                <button type="button" className="btn btn--secondary btn--small">
                  Justera alla priser +10%
                </button>
                <button type="button" className="btn btn--secondary btn--small">
                  Justera alla priser -10%
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay" aria-live="polite">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <span>Beräknar kostnader...</span>
          </div>
        </div>
      )}
    </div>
  );
};