/**
 * SalesSettingsStep - Wizard step for sales configuration and pricing
 *
 * This component allows users to:
 * - Set pricing for menu items
 * - Configure profit margins
 * - Set availability status
 * - Choose sales categories
 * - Preview final pricing calculations
 * - Configure VAT settings
 */

import React, { useState, useCallback, useEffect } from 'react';
import { SalesSettings } from '../../../hooks/useRecipeMenuWizardState';
import { formatCurrency } from '../../../utils/formatting';

export interface SalesSettingsStepProps {
  /** Current sales settings data */
  salesSettings: SalesSettings;
  /** Total cost from cost calculation step */
  totalCost: number;
  /** Current creation type affecting sales behavior */
  creationType: 'recipe' | 'menu-item' | null;
  /** Validation errors for this step */
  errors: string[];
  /** Loading state from parent */
  isLoading: boolean;
  /** Callback when sales settings change */
  onSalesSettingsUpdate: (salesSettings: SalesSettings) => void;
}

/**
 * Pricing calculator with margin analysis
 */
interface PricingCalculatorProps {
  totalCost: number;
  targetPrice: number;
  targetMargin: number;
  onPriceChange: (price: number) => void;
  onMarginChange: (margin: number) => void;
  disabled: boolean;
}

function PricingCalculator({
  totalCost,
  targetPrice,
  targetMargin,
  onPriceChange,
  onMarginChange,
  disabled
}: PricingCalculatorProps) {
  const [calculationMode, setCalculationMode] = useState<'price' | 'margin'>('margin');

  // Calculate price from margin
  const calculatePriceFromMargin = useCallback((margin: number) => {
    if (totalCost <= 0) return 0;
    return totalCost / (1 - margin / 100);
  }, [totalCost]);

  // Calculate margin from price
  const calculateMarginFromPrice = useCallback((price: number) => {
    if (price <= 0 || totalCost <= 0) return 0;
    return ((price - totalCost) / price) * 100;
  }, [totalCost]);

  // Handle margin input
  const handleMarginChange = (margin: number) => {
    onMarginChange(margin);
    if (calculationMode === 'margin') {
      const newPrice = calculatePriceFromMargin(margin);
      onPriceChange(newPrice);
    }
  };

  // Handle price input
  const handlePriceChange = (price: number) => {
    onPriceChange(price);
    if (calculationMode === 'price') {
      const newMargin = calculateMarginFromPrice(price);
      onMarginChange(newMargin);
    }
  };

  // Quick margin presets
  const marginPresets = [15, 25, 35, 50, 65, 75];

  // Quick price calculation suggestions
  const priceBreakdown = {
    cost: totalCost,
    markup: targetPrice - totalCost,
    profit: Math.max(0, targetPrice - totalCost),
    marginPercentage: calculateMarginFromPrice(targetPrice),
    recommended: calculatePriceFromMargin(40), // 40% margin recommendation
  };

  return (
    <div className="pricing-calculator">
      <div className="calculation-mode">
        <label className="calculation-mode-label">Beräkningsmetod:</label>
        <div className="mode-toggle">
          <button
            type="button"
            onClick={() => setCalculationMode('margin')}
            disabled={disabled}
            className={`mode-button ${calculationMode === 'margin' ? 'active' : ''}`}
          >
            Från Marginal
          </button>
          <button
            type="button"
            onClick={() => setCalculationMode('price')}
            disabled={disabled}
            className={`mode-button ${calculationMode === 'price' ? 'active' : ''}`}
          >
            Från Pris
          </button>
        </div>
      </div>

      <div className="pricing-inputs">
        <div className="pricing-input-group">
          <label className="pricing-label">Marginal (%)</label>
          <div className="input-with-presets">
            <input
              type="number"
              min="0"
              max="90"
              step="1"
              value={Math.round(targetMargin) || ''}
              onChange={(e) => handleMarginChange(Number(e.target.value) || 0)}
              disabled={disabled}
              className="pricing-input"
              placeholder="0"
            />
            <div className="margin-presets">
              {marginPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleMarginChange(preset)}
                  disabled={disabled}
                  className={`preset-button ${Math.round(targetMargin) === preset ? 'active' : ''}`}
                  title={`Sätt marginal till ${preset}%`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pricing-input-group">
          <label className="pricing-label">Försäljningspris (kr)</label>
          <input
            type="number"
            min="0"
            step="0.50"
            value={targetPrice || ''}
            onChange={(e) => handlePriceChange(Number(e.target.value) || 0)}
            disabled={disabled}
            className="pricing-input"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="price-breakdown">
        <h4>Prisanalys</h4>
        <div className="breakdown-grid">
          <div className="breakdown-item">
            <span className="breakdown-label">Kostnad:</span>
            <span className="breakdown-value cost">{formatCurrency(priceBreakdown.cost)}</span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-label">Påslag:</span>
            <span className="breakdown-value markup">{formatCurrency(priceBreakdown.markup)}</span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-label">Vinst:</span>
            <span className="breakdown-value profit">{formatCurrency(priceBreakdown.profit)}</span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-label">Marginal:</span>
            <span className="breakdown-value margin">{priceBreakdown.marginPercentage.toFixed(1)}%</span>
          </div>
        </div>

        {priceBreakdown.marginPercentage < 20 && (
          <div className="pricing-warning">
            ⚠️ Låg marginal - överväg högre pris för hållbar lönsamhet
          </div>
        )}

        {priceBreakdown.recommended !== targetPrice && (
          <div className="pricing-suggestion">
            💡 Rekommenderat pris (40% marginal): {formatCurrency(priceBreakdown.recommended)}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Category selector with common restaurant categories
 */
interface CategorySelectorProps {
  selectedCategory: string;
  onChange: (category: string) => void;
  disabled: boolean;
}

function CategorySelector({ selectedCategory, onChange, disabled }: CategorySelectorProps) {
  const categories = [
    { id: 'appetizers', name: 'Förrätter', icon: '🥗' },
    { id: 'main-courses', name: 'Huvudrätter', icon: '🍽️' },
    { id: 'desserts', name: 'Efterrätter', icon: '🍰' },
    { id: 'beverages', name: 'Drycker', icon: '🥤' },
    { id: 'sides', name: 'Tillbehör', icon: '🍟' },
    { id: 'salads', name: 'Sallader', icon: '🥙' },
    { id: 'soups', name: 'Soppor', icon: '🍲' },
    { id: 'specials', name: 'Specialiteter', icon: '⭐' },
    { id: 'vegetarian', name: 'Vegetariskt', icon: '🌱' },
    { id: 'seafood', name: 'Fisk & Skaldjur', icon: '🐟' },
  ];

  return (
    <div className="category-selector">
      <label className="category-label">Matkategori</label>
      <div className="category-grid">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            disabled={disabled}
            className={`category-button ${selectedCategory === category.id ? 'selected' : ''}`}
            title={category.name}
          >
            <span className="category-icon">{category.icon}</span>
            <span className="category-name">{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SalesSettingsStep({
  salesSettings,
  totalCost,
  creationType,
  errors,
  isLoading,
  onSalesSettingsUpdate,
}: SalesSettingsStepProps) {
  const [vatRate, setVatRate] = useState(25); // Swedish standard VAT rate

  // Handle sales settings updates
  const handleSettingsUpdate = useCallback((updates: Partial<SalesSettings>) => {
    onSalesSettingsUpdate({ ...salesSettings, ...updates });
  }, [salesSettings, onSalesSettingsUpdate]);

  // Calculate VAT amounts
  const priceExcludingVat = salesSettings.price / (1 + vatRate / 100);
  const vatAmount = salesSettings.price - priceExcludingVat;

  // Validate pricing
  useEffect(() => {
    if (salesSettings.price > 0 && totalCost > 0) {
      const calculatedMargin = ((salesSettings.price - totalCost) / salesSettings.price) * 100;
      if (Math.abs(calculatedMargin - salesSettings.margin) > 1) {
        // Auto-sync margin if significantly different
        handleSettingsUpdate({ margin: calculatedMargin });
      }
    }
  }, [salesSettings.price, totalCost, salesSettings.margin, handleSettingsUpdate]);

  return (
    <div className="sales-settings-step">
      <div className="wizard-step-content">
        {/* Step Description */}
        <div className="step-description">
          <p>
            Konfigurera prissättning och försäljningsinställningar för din maträtt.
            Ange marginaler och välj kategori för optimal försäljning.
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

        {/* Cost Summary */}
        <div className="cost-summary">
          <h3>Kostnadsoversikt</h3>
          <div className="cost-summary-grid">
            <div className="cost-item">
              <span className="cost-label">Total kostnad:</span>
              <span className="cost-value">{formatCurrency(totalCost)}</span>
            </div>
            <div className="cost-item">
              <span className="cost-label">Portioner:</span>
              <span className="cost-value">1 portion</span>
            </div>
            <div className="cost-item">
              <span className="cost-label">Kostnad per portion:</span>
              <span className="cost-value">{formatCurrency(totalCost)}</span>
            </div>
          </div>
        </div>

        {/* Pricing Calculator */}
        <div className="pricing-section">
          <h3>Prissättning</h3>
          <PricingCalculator
            totalCost={totalCost}
            targetPrice={salesSettings.price}
            targetMargin={salesSettings.margin}
            onPriceChange={(price) => handleSettingsUpdate({ price })}
            onMarginChange={(margin) => handleSettingsUpdate({ margin })}
            disabled={isLoading}
          />
        </div>

        {/* VAT Settings */}
        <div className="vat-section">
          <h3>Moms</h3>
          <div className="vat-controls">
            <div className="vat-rate-selector">
              <label>Momssats:</label>
              <select
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value))}
                disabled={isLoading}
                className="vat-select"
              >
                <option value={25}>25% (Standard)</option>
                <option value={12}>12% (Livsmedel)</option>
                <option value={6}>6% (Böcker, tidningar)</option>
                <option value={0}>0% (Momsbefriad)</option>
              </select>
            </div>
            <div className="vat-breakdown">
              <div className="vat-item">
                <span>Pris exkl. moms:</span>
                <span>{formatCurrency(priceExcludingVat)}</span>
              </div>
              <div className="vat-item">
                <span>Moms ({vatRate}%):</span>
                <span>{formatCurrency(vatAmount)}</span>
              </div>
              <div className="vat-item total">
                <span>Totalt inkl. moms:</span>
                <span>{formatCurrency(salesSettings.price)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div className="category-section">
          <h3>Kategori</h3>
          <CategorySelector
            selectedCategory={salesSettings.category || ''}
            onChange={(category) => handleSettingsUpdate({ category })}
            disabled={isLoading}
          />
        </div>

        {/* Availability Settings */}
        <div className="availability-section">
          <h3>Tillgänglighet</h3>
          <div className="availability-controls">
            <label className="availability-toggle">
              <input
                type="checkbox"
                checked={salesSettings.isAvailable}
                onChange={(e) => handleSettingsUpdate({ isAvailable: e.target.checked })}
                disabled={isLoading}
              />
              <span className="toggle-switch"></span>
              <span className="toggle-label">
                {salesSettings.isAvailable ? 'Tillgänglig för försäljning' : 'Inte tillgänglig'}
              </span>
            </label>

            {!salesSettings.isAvailable && (
              <div className="availability-note">
                <span>📝 Notering: Maträtten kommer inte visas för kunder</span>
              </div>
            )}
          </div>
        </div>

        {/* Sales Summary */}
        <div className="sales-summary">
          <h3>Försäljningssammanfattning</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Försäljningspris:</span>
              <span className="summary-value primary">{formatCurrency(salesSettings.price)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Vinstmarginal:</span>
              <span className="summary-value">{salesSettings.margin.toFixed(1)}%</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Kategori:</span>
              <span className="summary-value">{salesSettings.category || 'Ej vald'}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Status:</span>
              <span className={`summary-value ${salesSettings.isAvailable ? 'available' : 'unavailable'}`}>
                {salesSettings.isAvailable ? 'Tillgänglig' : 'Ej tillgänglig'}
              </span>
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <div className="loading-text">Sparar försäljningsinställningar...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}