/**
 * Margin Analysis Component
 *
 * Displays comprehensive margin analysis with VAT handling
 * Shows profit margins in both multiples and currency amounts
 * Handles Swedish VAT rules for restaurant business
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { formatCurrency, formatPercentage } from '../../utils/formatting';
import { useAuth } from '../../contexts/AuthContext';
import './MarginAnalysis.css';

export interface MarginBreakdown {
  food_cost: number;
  menu_price: number;
  profit_margin: number;
  profit_margin_percentage: number;
  markup_multiple: number;
  vat_inclusive_price: number;
  vat_amount: number;
  vat_rate: number;
  net_profit: number;
  net_profit_percentage: number;
}

export interface MarginAnalysisData {
  recipe_id?: string;
  menu_item_id?: string;
  organization_id: string;
  calculation_result: {
    margin_breakdown: MarginBreakdown;
    scenario_analysis: {
      target_margin_price: number;
      recommended_price: number;
      price_recommendations: Array<{
        margin_target: number;
        suggested_price: number;
        markup_multiple: number;
        profit_amount: number;
      }>;
    };
    vat_analysis: {
      vat_inclusive: boolean;
      applicable_rate: number;
      price_before_vat: number;
      vat_amount: number;
      final_price: number;
    };
    calculation_timestamp: string;
  };
}

interface MarginAnalysisProps {
  recipeId?: string;
  menuItemId?: string;
  targetMarginPercentage?: number;
  includeVAT?: boolean;
  itemType?: 'food' | 'takeaway' | 'beverage' | 'alcohol';
  onMarginUpdate?: (margin: number, price: number) => void;
  className?: string;
}

export const MarginAnalysis: React.FC<MarginAnalysisProps> = ({
  recipeId,
  menuItemId,
  targetMarginPercentage = 70,
  includeVAT = true,
  itemType = 'food',
  onMarginUpdate,
  className = ''
}) => {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<MarginAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const [analysisOptions, setAnalysisOptions] = useState({
    targetMarginPercentage,
    includeVAT,
    itemType
  });

  useEffect(() => {
    if (recipeId || menuItemId) {
      calculateMargins();
    }
  }, [recipeId, menuItemId, analysisOptions]);

  const calculateMargins = async () => {
    if (!user?.organization_id) return;
    if (!recipeId && !menuItemId) return;

    setLoading(true);
    setError('');

    try {
      let endpoint = '';
      const params: any = {
        target_margin_percentage: analysisOptions.targetMarginPercentage,
        include_vat: analysisOptions.includeVAT,
        item_type: analysisOptions.itemType
      };

      if (recipeId) {
        endpoint = `/api/v1/cost-control/analyze-margin/recipe/${recipeId}`;
      } else if (menuItemId) {
        endpoint = `/api/v1/cost-control/analyze-margin/menu-item/${menuItemId}`;
      }

      // Build query string from params
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');

      const response = await api.post(`${endpoint}?${queryString}`, null) as MarginAnalysisData;
      const result = response;

      setAnalysis(result);

      // Notify parent component of margin updates
      if (onMarginUpdate) {
        const margin = result.calculation_result.margin_breakdown.profit_margin_percentage;
        const price = result.calculation_result.margin_breakdown.vat_inclusive_price;
        onMarginUpdate(margin, price);
      }

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Kunde inte beräkna marginaler');
      console.error('Margin analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateTargetMargin = (newTarget: number) => {
    setAnalysisOptions(prev => ({
      ...prev,
      targetMarginPercentage: newTarget
    }));
  };

  const toggleVAT = () => {
    setAnalysisOptions(prev => ({
      ...prev,
      includeVAT: !prev.includeVAT
    }));
  };

  const updateItemType = (newType: 'food' | 'takeaway' | 'beverage' | 'alcohol') => {
    setAnalysisOptions(prev => ({
      ...prev,
      itemType: newType
    }));
  };

  if (loading) {
    return (
      <div className={`margin-analysis margin-analysis--loading ${className}`}>
        <div className="loading-spinner"></div>
        <p>Beräknar marginaler...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`margin-analysis margin-analysis--error ${className}`}>
        <div className="error-message">
          <h3>⚠️ Fel vid marginalberäkning</h3>
          <p>{error}</p>
          <button onClick={calculateMargins} className="btn btn--primary btn--small">
            Försök igen
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={`margin-analysis margin-analysis--empty ${className}`}>
        <p>Ingen marginalanalys tillgänglig</p>
      </div>
    );
  }

  const { calculation_result } = analysis;
  const { margin_breakdown, scenario_analysis, vat_analysis } = calculation_result;

  // Determine margin status for styling
  const getMarginStatus = (percentage: number) => {
    if (percentage >= 70) return 'excellent';
    if (percentage >= 60) return 'good';
    if (percentage >= 50) return 'warning';
    return 'critical';
  };

  const marginStatus = getMarginStatus(margin_breakdown.profit_margin_percentage);

  return (
    <div className={`margin-analysis ${className}`}>
      {/* Analysis Controls */}
      <div className="margin-controls">
        <div className="controls-row">
          <div className="control-group">
            <label htmlFor="target-margin">Målmarginal:</label>
            <input
              id="target-margin"
              type="number"
              min="10"
              max="90"
              step="5"
              value={analysisOptions.targetMarginPercentage}
              onChange={(e) => updateTargetMargin(parseInt(e.target.value) || 70)}
              className="margin-input"
            />
            <span>%</span>
          </div>

          <div className="control-group">
            <label htmlFor="item-type">Typ:</label>
            <select
              id="item-type"
              value={analysisOptions.itemType}
              onChange={(e) => updateItemType(e.target.value as any)}
              className="type-select"
            >
              <option value="food">Mat (dine-in)</option>
              <option value="takeaway">Takeaway</option>
              <option value="beverage">Dryck</option>
              <option value="alcohol">Alkohol</option>
            </select>
          </div>

          <div className="control-group">
            <label>
              <input
                type="checkbox"
                checked={analysisOptions.includeVAT}
                onChange={toggleVAT}
              />
              Inkludera moms
            </label>
          </div>

          <button onClick={calculateMargins} className="btn btn--secondary btn--small">
            🔄 Uppdatera
          </button>
        </div>
      </div>

      {/* Current Margin Status */}
      <div className={`margin-status margin-status--${marginStatus}`}>
        <div className="status-header">
          <h3>📊 Aktuell marginal</h3>
          <div className="margin-indicator">
            <span className="margin-value">
              {formatPercentage(margin_breakdown.profit_margin_percentage / 100)}
            </span>
            <span className="margin-multiple">
              {margin_breakdown.markup_multiple.toFixed(1)}x
            </span>
          </div>
        </div>

        <div className="margin-details">
          <div className="detail-item">
            <span className="label">Råvarukostnad:</span>
            <span className="value">{formatCurrency(margin_breakdown.food_cost)}</span>
          </div>
          <div className="detail-item">
            <span className="label">Försäljningspris:</span>
            <span className="value">{formatCurrency(margin_breakdown.menu_price)}</span>
          </div>
          <div className="detail-item">
            <span className="label">Bruttovinst:</span>
            <span className="value">{formatCurrency(margin_breakdown.profit_margin)}</span>
          </div>
        </div>
      </div>

      {/* VAT Analysis */}
      {analysisOptions.includeVAT && (
        <div className="vat-analysis">
          <h4>🧾 Momsanalys ({vat_analysis.applicable_rate}%)</h4>
          <div className="vat-breakdown">
            <div className="vat-item">
              <span className="label">Pris exkl. moms:</span>
              <span className="value">{formatCurrency(vat_analysis.price_before_vat)}</span>
            </div>
            <div className="vat-item">
              <span className="label">Moms ({vat_analysis.applicable_rate}%):</span>
              <span className="value">{formatCurrency(vat_analysis.vat_amount)}</span>
            </div>
            <div className="vat-item total">
              <span className="label">Slutpris inkl. moms:</span>
              <span className="value">{formatCurrency(vat_analysis.final_price)}</span>
            </div>
            <div className="vat-item">
              <span className="label">Nettovinst efter moms:</span>
              <span className="value profit">{formatCurrency(margin_breakdown.net_profit)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Price Recommendations */}
      <div className="price-recommendations">
        <h4>💡 Prisrekommendationer</h4>
        <div className="recommendations-grid">
          {scenario_analysis.price_recommendations.map((rec, index) => (
            <div key={index} className="recommendation-card">
              <div className="rec-target">{rec.margin_target}% marginal</div>
              <div className="rec-price">{formatCurrency(rec.suggested_price)}</div>
              <div className="rec-multiple">{rec.markup_multiple.toFixed(1)}x markup</div>
              <div className="rec-profit">+{formatCurrency(rec.profit_amount)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Target Analysis */}
      <div className="target-analysis">
        <h4>🎯 Målanalys ({analysisOptions.targetMarginPercentage}% marginal)</h4>
        <div className="target-results">
          <div className="target-item highlight">
            <span className="label">Rekommenderat pris:</span>
            <span className="value">{formatCurrency(scenario_analysis.recommended_price)}</span>
          </div>
          <div className="target-item">
            <span className="label">För målmarginal:</span>
            <span className="value">{formatCurrency(scenario_analysis.target_margin_price)}</span>
          </div>

          {scenario_analysis.recommended_price !== margin_breakdown.menu_price && (
            <div className="price-adjustment">
              <span className="adjustment-label">
                {scenario_analysis.recommended_price > margin_breakdown.menu_price ? '⬆️' : '⬇️'}
                Prisjustering behövs:
              </span>
              <span className="adjustment-value">
                {formatCurrency(Math.abs(scenario_analysis.recommended_price - margin_breakdown.menu_price))}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Margin Insights */}
      <div className="margin-insights">
        <h4>📈 Marginalinsikter</h4>
        <ul>
          <li>
            <strong>Nuvarande prestanda:</strong> {formatPercentage(margin_breakdown.profit_margin_percentage / 100)} marginal
            ({margin_breakdown.markup_multiple.toFixed(1)}x markup)
          </li>
          <li>
            <strong>Måluppfyllelse:</strong> {margin_breakdown.profit_margin_percentage >= analysisOptions.targetMarginPercentage ?
              `✅ Når målet (+${(margin_breakdown.profit_margin_percentage - analysisOptions.targetMarginPercentage).toFixed(1)}%)` :
              `❌ Under målet (-${(analysisOptions.targetMarginPercentage - margin_breakdown.profit_margin_percentage).toFixed(1)}%)`}
          </li>
          {analysisOptions.includeVAT && (
            <li>
              <strong>Moms påverkan:</strong> {vat_analysis.applicable_rate}% moms =
              {formatCurrency(vat_analysis.vat_amount)} av slutpriset
            </li>
          )}
          <li>
            <strong>Konkurrenskraft:</strong> {margin_breakdown.markup_multiple < 3 ?
              '🟢 Låg markup - konkurrenskraftigt' :
              margin_breakdown.markup_multiple < 4 ?
              '🟡 Medel markup - balanserat' :
              '🔴 Hög markup - kontrollera marknadspris'}
          </li>
        </ul>
      </div>

      {/* Calculation metadata */}
      <div className="calculation-metadata">
        <small>
          Beräknad: {new Date(calculation_result.calculation_timestamp).toLocaleString('sv-SE')}
          • Typ: {analysisOptions.itemType} • Moms: {vat_analysis.applicable_rate}%
        </small>
      </div>
    </div>
  );
};

export default MarginAnalysis;