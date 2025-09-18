/**
 * Portion Cost Analysis Component
 *
 * Displays detailed cost breakdown per serving for recipes and menu items
 * Handles recipe quantities (e.g., 75g sausage, 60g mashed potatoes)
 * and calculates accurate per-portion costs
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { formatCurrency, formatPercentage } from '../../utils/formatting';
import { useAuth } from '../../contexts/AuthContext';
import './PortionCostAnalysis.css';

export interface IngredientCostBreakdown {
  ingredient_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  cost_unit: string;
  total_cost: number;
  cost_per_serving: number;
  notes?: string;
  unit_conversion_applied?: boolean;
  converted_from_unit?: string;
}

export interface PortionAnalysisData {
  portion_size: number;
  ingredient_costs: IngredientCostBreakdown[];
  total_ingredient_cost: number;
  cost_per_portion: number;
  labor_cost_per_portion?: number;
  overhead_cost_per_portion?: number;
  total_cost_per_portion: number;
}

export interface CostCalculationResult {
  recipe_id?: string;
  menu_item_id?: string;
  organization_id: string;
  calculation_result: {
    total_cost: number;
    cost_per_serving?: number;
    portion_analysis: PortionAnalysisData;
    labor_overhead_cost?: number;
    vat_amount?: number;
    calculation_timestamp: string;
    ingredients_used: number;
    conversion_warnings?: string[];
  };
}

interface PortionCostAnalysisProps {
  recipeId?: string;
  menuItemId?: string;
  servings?: number;
  includeLaborOverhead?: boolean;
  showDetailedBreakdown?: boolean;
  onCostUpdate?: (cost: number, costPerServing: number) => void;
  className?: string;
}

export const PortionCostAnalysis: React.FC<PortionCostAnalysisProps> = ({
  recipeId,
  menuItemId,
  servings,
  includeLaborOverhead = false,
  showDetailedBreakdown = true,
  onCostUpdate,
  className = ''
}) => {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<CostCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<{
    ingredients: boolean;
    breakdown: boolean;
    costs: boolean;
  }>({
    ingredients: true,
    breakdown: true,
    costs: true
  });

  const [analysisOptions, setAnalysisOptions] = useState({
    includeLaborOverhead,
    servings: servings || undefined
  });

  useEffect(() => {
    if (recipeId || menuItemId) {
      calculateCosts();
    }
  }, [recipeId, menuItemId, analysisOptions.servings, analysisOptions.includeLaborOverhead]);

  const calculateCosts = async () => {
    if (!user?.organization_id) return;
    if (!recipeId && !menuItemId) return;

    setLoading(true);
    setError('');

    try {
      let endpoint = '';
      const params: any = {
        include_labor_overhead: analysisOptions.includeLaborOverhead
      };

      if (recipeId) {
        endpoint = `/api/v1/cost-control/calculate-recipe/${recipeId}`;
        if (analysisOptions.servings) {
          params.servings = analysisOptions.servings;
        }
      } else if (menuItemId) {
        endpoint = `/api/v1/cost-control/calculate-menu-item/${menuItemId}`;
      }

      // Build query string from params
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');

      const response = await api.get(`${endpoint}?${queryString}`) as CostCalculationResult;
      const result = response;

      setAnalysis(result);

      // Notify parent component of cost updates
      if (onCostUpdate) {
        const totalCost = result.calculation_result.total_cost;
        const costPerServing = result.calculation_result.cost_per_serving || 0;
        onCostUpdate(totalCost, costPerServing);
      }

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Kunde inte beräkna portionskostnader');
      console.error('Portion cost calculation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateServings = (newServings: number) => {
    setAnalysisOptions(prev => ({
      ...prev,
      servings: newServings
    }));
  };

  const toggleLaborOverhead = () => {
    setAnalysisOptions(prev => ({
      ...prev,
      includeLaborOverhead: !prev.includeLaborOverhead
    }));
  };

  if (loading) {
    return (
      <div className={`portion-cost-analysis portion-cost-analysis--loading ${className}`}>
        <div className="loading-spinner"></div>
        <p>Beräknar portionskostnader...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`portion-cost-analysis portion-cost-analysis--error ${className}`}>
        <div className="error-message">
          <h3>⚠️ Fel vid beräkning</h3>
          <p>{error}</p>
          <button onClick={calculateCosts} className="btn btn--primary btn--small">
            Försök igen
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={`portion-cost-analysis portion-cost-analysis--empty ${className}`}>
        <p>Ingen kostanalys tillgänglig</p>
      </div>
    );
  }

  const { calculation_result } = analysis;
  const { portion_analysis } = calculation_result;

  // Sort ingredients by cost (highest first)
  const sortedIngredients = [...portion_analysis.ingredient_costs].sort(
    (a, b) => b.total_cost - a.total_cost
  );

  // Calculate ingredient percentages
  const ingredientsWithPercentage = sortedIngredients.map(ingredient => ({
    ...ingredient,
    percentage: (ingredient.total_cost / portion_analysis.total_ingredient_cost) * 100
  }));

  // Find most expensive ingredient
  const mostExpensiveIngredient = ingredientsWithPercentage[0];

  return (
    <div className={`portion-cost-analysis ${className}`}>
      {/* Analysis Controls */}
      <div className="analysis-controls">
        <div className="controls-row">
          {recipeId && (
            <div className="control-group">
              <label htmlFor="servings-input">Antal portioner:</label>
              <input
                id="servings-input"
                type="number"
                min="1"
                max="100"
                value={analysisOptions.servings || portion_analysis.portion_size}
                onChange={(e) => updateServings(parseInt(e.target.value) || 1)}
                className="servings-input"
              />
            </div>
          )}

          <div className="control-group">
            <label>
              <input
                type="checkbox"
                checked={analysisOptions.includeLaborOverhead}
                onChange={toggleLaborOverhead}
              />
              Inkludera arbetskostnad & overhead
            </label>
          </div>

          <button onClick={calculateCosts} className="btn btn--secondary btn--small">
            🔄 Uppdatera
          </button>
        </div>
      </div>

      {/* Cost Summary */}
      <div
        className={`cost-summary-section ${expandedSections.costs ? 'expanded' : 'collapsed'}`}
      >
        <button
          className="section-header"
          onClick={() => toggleSection('costs')}
        >
          <h3>💰 Kostsammanfattning</h3>
          <span className="toggle-icon">
            {expandedSections.costs ? '▼' : '▶'}
          </span>
        </button>

        {expandedSections.costs && (
          <div className="cost-summary-grid">
            <div className="cost-card primary">
              <div className="cost-label">Total kostnad per portion</div>
              <div className="cost-value">
                {formatCurrency(portion_analysis.cost_per_portion)}
              </div>
              <div className="cost-detail">
                Ingredienser: {formatCurrency(portion_analysis.cost_per_portion)}
              </div>
            </div>

            <div className="cost-card">
              <div className="cost-label">Total kostnad ({portion_analysis.portion_size} portioner)</div>
              <div className="cost-value">
                {formatCurrency(portion_analysis.total_ingredient_cost)}
              </div>
            </div>

            {analysisOptions.includeLaborOverhead && (
              <>
                {portion_analysis.labor_cost_per_portion && portion_analysis.labor_cost_per_portion > 0 && (
                  <div className="cost-card">
                    <div className="cost-label">Arbetskostnad per portion</div>
                    <div className="cost-value">
                      {formatCurrency(portion_analysis.labor_cost_per_portion)}
                    </div>
                  </div>
                )}

                {portion_analysis.overhead_cost_per_portion && portion_analysis.overhead_cost_per_portion > 0 && (
                  <div className="cost-card">
                    <div className="cost-label">Overhead per portion</div>
                    <div className="cost-value">
                      {formatCurrency(portion_analysis.overhead_cost_per_portion)}
                    </div>
                  </div>
                )}

                <div className="cost-card highlight">
                  <div className="cost-label">Total kostnad per portion (inkl. allt)</div>
                  <div className="cost-value">
                    {formatCurrency(portion_analysis.total_cost_per_portion)}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Detailed Ingredient Breakdown */}
      {showDetailedBreakdown && (
        <div
          className={`ingredients-section ${expandedSections.ingredients ? 'expanded' : 'collapsed'}`}
        >
          <button
            className="section-header"
            onClick={() => toggleSection('ingredients')}
          >
            <h3>🥘 Ingredienskostnad per portion ({portion_analysis.ingredient_costs.length} ingredienser)</h3>
            <span className="toggle-icon">
              {expandedSections.ingredients ? '▼' : '▶'}
            </span>
          </button>

          {expandedSections.ingredients && (
            <div className="ingredients-breakdown">
              <div className="ingredients-list">
                {ingredientsWithPercentage.map((ingredient, index) => (
                  <div key={ingredient.ingredient_id} className="ingredient-item">
                    <div className="ingredient-header">
                      <div className="ingredient-name">
                        <span className="ingredient-rank">#{index + 1}</span>
                        <strong>{ingredient.ingredient_name}</strong>
                        {ingredient === mostExpensiveIngredient && (
                          <span className="most-expensive-badge">💸 Dyrast</span>
                        )}
                      </div>
                      <div className="ingredient-cost">
                        {formatCurrency(ingredient.cost_per_serving)}
                        <span className="cost-percentage">
                          ({formatPercentage(ingredient.percentage / 100)})
                        </span>
                      </div>
                    </div>

                    <div className="ingredient-details">
                      <div className="quantity-info">
                        <span>{ingredient.quantity} {ingredient.unit} per portion</span>
                        {ingredient.unit_conversion_applied && ingredient.converted_from_unit && (
                          <span className="conversion-note">
                            (konverterat från {ingredient.converted_from_unit})
                          </span>
                        )}
                      </div>

                      <div className="cost-info">
                        <span>
                          {formatCurrency(ingredient.cost_per_unit)}/{ingredient.cost_unit}
                        </span>
                        {portion_analysis.portion_size > 1 && (
                          <span className="total-cost">
                            → Total: {formatCurrency(ingredient.total_cost)}
                          </span>
                        )}
                      </div>

                      {ingredient.notes && (
                        <div className="ingredient-notes">
                          📝 {ingredient.notes}
                        </div>
                      )}
                    </div>

                    {/* Cost percentage bar */}
                    <div className="cost-percentage-bar">
                      <div
                        className="percentage-fill"
                        style={{
                          width: `${Math.min(ingredient.percentage, 100)}%`,
                          backgroundColor: ingredient === mostExpensiveIngredient ? '#ef4444' : '#3b82f6'
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cost insights */}
              <div className="cost-insights">
                <h4>📊 Kostnadsinsikter</h4>
                <ul>
                  <li>
                    <strong>Dyraste ingrediens:</strong> {mostExpensiveIngredient.ingredient_name}
                    ({formatPercentage(mostExpensiveIngredient.percentage / 100)} av totalen)
                  </li>
                  <li>
                    <strong>Genomsnittskostnad per ingrediens:</strong> {formatCurrency(portion_analysis.cost_per_portion / portion_analysis.ingredient_costs.length)}
                  </li>
                  {portion_analysis.ingredient_costs.length > 3 && (
                    <li>
                      <strong>Top 3 ingredienser:</strong> {formatPercentage(
                        ingredientsWithPercentage.slice(0, 3).reduce((sum, ing) => sum + ing.percentage, 0) / 100
                      )} av totalkostnaden
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cost Optimization Suggestions */}
      {mostExpensiveIngredient.percentage > 40 && (
        <div className="optimization-suggestions">
          <h4>💡 Optimeringsförslag</h4>
          <div className="suggestion-item">
            <span className="suggestion-icon">🎯</span>
            <div className="suggestion-text">
              <strong>{mostExpensiveIngredient.ingredient_name}</strong> utgör {formatPercentage(mostExpensiveIngredient.percentage / 100)}
              av kostnaden. Överväg att:
              <ul>
                <li>Minska portionsstorleken något</li>
                <li>Hitta en prisvärd leverantör</li>
                <li>Använda en alternativ ingrediens</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Conversion Warnings */}
      {calculation_result.conversion_warnings && calculation_result.conversion_warnings.length > 0 && (
        <div className="conversion-warnings">
          <h4>⚠️ Enhetskonverteringsvarningar</h4>
          <ul>
            {calculation_result.conversion_warnings.map((warning, index) => (
              <li key={index} className="warning-item">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Calculation metadata */}
      <div className="calculation-metadata">
        <small>
          Beräknad: {new Date(calculation_result.calculation_timestamp).toLocaleString('sv-SE')}
          {calculation_result.ingredients_used > 0 && (
            <span> • {calculation_result.ingredients_used} ingredienser analyserade</span>
          )}
        </small>
      </div>
    </div>
  );
};

export default PortionCostAnalysis;