/**
 * Enhanced Menu Item Form with Live Cost Calculator Integration
 *
 * This is an enhanced version of MenuItemForm that integrates the LiveCostCalculator
 * component for real-time cost calculation and pricing suggestions.
 *
 * Features:
 * - Real-time cost calculation as user selects recipes/ingredients
 * - Dynamic pricing suggestions with visual feedback
 * - Automatic price updates when calculator suggestions are selected
 * - Integration with existing VAT calculations
 * - Historical comparison and margin optimization
 */

import React, { useState, useEffect, useCallback } from 'react';
import './MenuItemForm.css';
import { apiClient, Recipe, MenuItem, SwedishVATRate, VATCalculationType, Ingredient } from '../../utils/api';
import {
  calculateVATAmount,
  calculatePriceExcludingVAT,
  calculatePriceIncludingVAT,
  getVATRateDisplayName,
  getVATCalculationTypeDisplayName
} from '../../utils/vatUtils';
import { LiveCostCalculator } from '../CostAnalysis/LiveCostCalculator';

interface MenuItemFormData {
  name: string;
  description: string;
  category: string;
  selling_price: number;
  target_food_cost_percentage: number;
  recipe_id?: string;
  vat_rate: SwedishVATRate;
  vat_calculation_type: VATCalculationType;
}

interface MenuItemFormErrors {
  name?: string;
  description?: string;
  category?: string;
  selling_price?: string;
  target_food_cost_percentage?: string;
  recipe_id?: string;
}

interface MenuItemFormWithCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MenuItemFormData) => Promise<void>;
  isLoading?: boolean;
  editingMenuItem?: MenuItem | null;
}

export function MenuItemFormWithCalculator({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  editingMenuItem
}: MenuItemFormWithCalculatorProps) {
  const [formData, setFormData] = useState<MenuItemFormData>({
    name: '',
    description: '',
    category: '',
    selling_price: 0,
    target_food_cost_percentage: 30,
    vat_rate: SwedishVATRate.FOOD_REDUCED,
    vat_calculation_type: VATCalculationType.INCLUSIVE,
  });

  const [errors, setErrors] = useState<MenuItemFormErrors>({});
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [showCalculator, setShowCalculator] = useState(true);
  const [calculatedCost, setCalculatedCost] = useState(0);

  // Load recipes and ingredients when form opens
  useEffect(() => {
    if (isOpen) {
      loadRecipes();
      loadIngredients();
    }
  }, [isOpen]);

  // Populate form data when editing
  useEffect(() => {
    if (editingMenuItem) {
      setFormData({
        name: editingMenuItem.name,
        description: editingMenuItem.description || '',
        category: editingMenuItem.category,
        selling_price: editingMenuItem.selling_price,
        target_food_cost_percentage: editingMenuItem.target_food_cost_percentage,
        recipe_id: editingMenuItem.recipe_id,
        vat_rate: editingMenuItem.vat_rate || SwedishVATRate.FOOD_REDUCED,
        vat_calculation_type: editingMenuItem.vat_calculation_type || VATCalculationType.INCLUSIVE,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: '',
        selling_price: 0,
        target_food_cost_percentage: 30,
        recipe_id: undefined,
        vat_rate: SwedishVATRate.FOOD_REDUCED,
        vat_calculation_type: VATCalculationType.INCLUSIVE,
      });
    }
    setErrors({});
  }, [editingMenuItem]);

  const loadRecipes = async () => {
    setLoadingRecipes(true);
    try {
      const recipesData = await apiClient.getRecipes();
      setRecipes(recipesData.filter(recipe => recipe.is_active));
    } catch (error) {
      console.error('Failed to load recipes:', error);
      setRecipes([]);
    } finally {
      setLoadingRecipes(false);
    }
  };

  const loadIngredients = async () => {
    setLoadingIngredients(true);
    try {
      const ingredientsData = await apiClient.getIngredients();
      setIngredients(ingredientsData.filter(ingredient => ingredient.is_active));
    } catch (error) {
      console.error('Failed to load ingredients:', error);
      setIngredients([]);
    } finally {
      setLoadingIngredients(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'selling_price' || name === 'target_food_cost_percentage' ? parseFloat(value) || 0 : value
    }));

    // Clear error when user starts typing
    if (errors[name as keyof MenuItemFormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  /**
   * Handle cost changes from the live calculator
   */
  const handleCostChange = useCallback((totalCost: number, suggestedPrice: number, margin: number) => {
    setCalculatedCost(totalCost);

    // Update target margin if it's significantly different
    if (Math.abs(margin - formData.target_food_cost_percentage) > 5) {
      // Don't auto-update margin as it might confuse users
      // Just store the calculated cost
    }
  }, [formData.target_food_cost_percentage]);

  /**
   * Handle price selection from calculator suggestions
   */
  const handlePriceSelect = useCallback((price: number, margin: number) => {
    setFormData(prev => ({
      ...prev,
      selling_price: Math.round(price * 100) / 100, // Round to 2 decimal places
      target_food_cost_percentage: Math.round(margin)
    }));

    // Clear any price-related errors
    setErrors(prev => ({ ...prev, selling_price: undefined, target_food_cost_percentage: undefined }));
  }, []);

  /**
   * Calculate current margin based on selling price and calculated cost
   */
  const getCurrentMargin = useCallback(() => {
    if (calculatedCost > 0 && formData.selling_price > 0) {
      return ((formData.selling_price - calculatedCost) / formData.selling_price) * 100;
    }
    return 0;
  }, [calculatedCost, formData.selling_price]);

  /**
   * Get margin status styling
   */
  const getMarginStatusColor = useCallback(() => {
    const currentMargin = getCurrentMargin();
    const targetMargin = formData.target_food_cost_percentage;

    if (currentMargin >= targetMargin * 1.2) return '#10b981'; // Excellent
    if (currentMargin >= targetMargin) return '#059669'; // Good
    if (currentMargin >= targetMargin * 0.7) return '#d97706'; // Warning
    return '#dc2626'; // Danger
  }, [getCurrentMargin, formData.target_food_cost_percentage]);

  const validateForm = (): boolean => {
    const newErrors: MenuItemFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Namnet är obligatoriskt';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Kategori är obligatorisk';
    }

    if (formData.selling_price <= 0) {
      newErrors.selling_price = 'Försäljningspriset måste vara större än 0';
    }

    if (formData.target_food_cost_percentage <= 0 || formData.target_food_cost_percentage > 100) {
      newErrors.target_food_cost_percentage = 'Målkostnad måste vara mellan 1-100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      if (!editingMenuItem) {
        setFormData({
          name: '',
          description: '',
          category: '',
          selling_price: 0,
          target_food_cost_percentage: 30,
          recipe_id: undefined,
          vat_rate: SwedishVATRate.FOOD_REDUCED,
          vat_calculation_type: VATCalculationType.INCLUSIVE,
        });
      }
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      selling_price: 0,
      target_food_cost_percentage: 30,
      recipe_id: undefined,
      vat_rate: SwedishVATRate.FOOD_REDUCED,
      vat_calculation_type: VATCalculationType.INCLUSIVE,
    });
    setErrors({});
    setRecipes([]);
    setIngredients([]);
    onClose();
  };

  if (!isOpen) return null;

  const categories = [
    'Förrätt',
    'Huvudrätt',
    'Efterrätt',
    'Dryck',
    'Tillbehör',
    'Sallad',
    'Soppa',
    'Övrigt'
  ];

  const currentMargin = getCurrentMargin();

  return (
    <div className="modal-overlay modal-open" onClick={handleClose}>
      <div className="modal-content menu-item-form-with-calculator" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingMenuItem ? 'Redigera matträtt' : 'Skapa ny matträtt'}</h2>
          <div className="header-controls">
            <button
              type="button"
              className={`btn btn--ghost btn--small ${showCalculator ? 'active' : ''}`}
              onClick={() => setShowCalculator(!showCalculator)}
              aria-pressed={showCalculator}
            >
              {showCalculator ? 'Dölj kalkylator' : 'Visa kalkylator'}
            </button>
            <button className="modal-close" onClick={handleClose}>×</button>
          </div>
        </div>

        <div className="form-layout">
          {/* Live Cost Calculator Section */}
          {showCalculator && (
            <div className="calculator-section">
              <LiveCostCalculator
                ingredients={ingredients}
                recipes={recipes}
                initialTargetMargin={formData.target_food_cost_percentage}
                onCostChange={handleCostChange}
                onPriceSelect={handlePriceSelect}
                enableHistoricalComparison={true}
                className="embedded-calculator"
                simplified={false}
              />
            </div>
          )}

          {/* Main Form Section */}
          <div className="form-section">
            <form onSubmit={handleSubmit} className="menu-item-form">
              {/* Cost Summary Widget */}
              {showCalculator && calculatedCost > 0 && (
                <div className="cost-summary-widget">
                  <h4>Kostnad & Marginal</h4>
                  <div className="cost-row">
                    <span>Beräknad kostnad:</span>
                    <span className="cost-value">{calculatedCost.toFixed(2)} kr</span>
                  </div>
                  <div className="cost-row">
                    <span>Nuvarande marginal:</span>
                    <span className="margin-value" style={{ color: getMarginStatusColor() }}>
                      {currentMargin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="cost-row">
                    <span>Målmarginal:</span>
                    <span className="target-margin">{formData.target_food_cost_percentage}%</span>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="name">Namn *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={errors.name ? 'error' : ''}
                  placeholder="Ange maträttens namn"
                  autoComplete="off"
                  disabled={isLoading}
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="description">Beskrivning</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Beskriv maträtten (valfritt)"
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Kategori *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={errors.category ? 'error' : ''}
                  disabled={isLoading}
                >
                  <option value="">Välj kategori</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.category && <span className="error-message">{errors.category}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="recipe_id">Recept (valfritt)</label>
                <select
                  id="recipe_id"
                  name="recipe_id"
                  value={formData.recipe_id || ''}
                  onChange={handleInputChange}
                  disabled={isLoading || loadingRecipes}
                >
                  <option value="">Inget recept - ingredienser läggs till manuellt</option>
                  {loadingRecipes ? (
                    <option disabled>Laddar recept...</option>
                  ) : (
                    recipes.map(recipe => (
                      <option key={recipe.recipe_id} value={recipe.recipe_id}>
                        {recipe.name} ({recipe.servings} portioner)
                      </option>
                    ))
                  )}
                </select>
                {errors.recipe_id && <span className="error-message">{errors.recipe_id}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="selling_price">Försäljningspris (kr) *</label>
                  <input
                    type="number"
                    id="selling_price"
                    name="selling_price"
                    value={formData.selling_price || ''}
                    onChange={handleInputChange}
                    className={errors.selling_price ? 'error' : ''}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    disabled={isLoading}
                  />
                  {errors.selling_price && <span className="error-message">{errors.selling_price}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="target_food_cost_percentage">Målmarginal (%) *</label>
                  <input
                    type="number"
                    id="target_food_cost_percentage"
                    name="target_food_cost_percentage"
                    value={formData.target_food_cost_percentage || ''}
                    onChange={handleInputChange}
                    className={errors.target_food_cost_percentage ? 'error' : ''}
                    placeholder="30"
                    min="1"
                    max="100"
                    step="1"
                    disabled={isLoading}
                  />
                  {errors.target_food_cost_percentage && <span className="error-message">{errors.target_food_cost_percentage}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="vat_rate">Momssats</label>
                  <select
                    id="vat_rate"
                    name="vat_rate"
                    value={formData.vat_rate}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  >
                    <option value={SwedishVATRate.FOOD_REDUCED}>{getVATRateDisplayName(SwedishVATRate.FOOD_REDUCED)}</option>
                    <option value={SwedishVATRate.STANDARD}>{getVATRateDisplayName(SwedishVATRate.STANDARD)}</option>
                    <option value={SwedishVATRate.CULTURAL}>{getVATRateDisplayName(SwedishVATRate.CULTURAL)}</option>
                    <option value={SwedishVATRate.ZERO}>{getVATRateDisplayName(SwedishVATRate.ZERO)}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="vat_calculation_type">Momsberäkning</label>
                  <select
                    id="vat_calculation_type"
                    name="vat_calculation_type"
                    value={formData.vat_calculation_type}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  >
                    <option value={VATCalculationType.INCLUSIVE}>{getVATCalculationTypeDisplayName(VATCalculationType.INCLUSIVE)}</option>
                    <option value={VATCalculationType.EXCLUSIVE}>{getVATCalculationTypeDisplayName(VATCalculationType.EXCLUSIVE)}</option>
                  </select>
                </div>
              </div>

              {formData.selling_price > 0 && (
                <div className="vat-summary">
                  <h4>Momsberäkning</h4>
                  <div className="vat-calculation-display">
                    <div className="vat-row">
                      <span>Pris exklusive moms:</span>
                      <span>{calculatePriceExcludingVAT(formData.selling_price, formData.vat_rate, formData.vat_calculation_type).toFixed(2)} kr</span>
                    </div>
                    <div className="vat-row">
                      <span>Momsbelopp ({formData.vat_rate}%):</span>
                      <span>{calculateVATAmount(formData.selling_price, formData.vat_rate, formData.vat_calculation_type).toFixed(2)} kr</span>
                    </div>
                    <div className="vat-row total">
                      <span>Pris inklusive moms:</span>
                      <span>{calculatePriceIncludingVAT(formData.selling_price, formData.vat_rate, formData.vat_calculation_type).toFixed(2)} kr</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={isLoading}
                >
                  {isLoading ? (editingMenuItem ? 'Uppdaterar...' : 'Skapar...') : (editingMenuItem ? 'Uppdatera matträtt' : 'Skapa matträtt')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}