import React, { useState, useEffect } from 'react';
import './MenuItemForm.css';
import { apiClient, Recipe, MenuItem, SwedishVATRate, VATCalculationType } from '../../utils/api';
import { 
  calculateVATAmount, 
  calculatePriceExcludingVAT, 
  calculatePriceIncludingVAT,
  getVATRateDisplayName,
  getVATCalculationTypeDisplayName
} from '../../utils/vatUtils';

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

interface MenuItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MenuItemFormData) => Promise<void>;
  isLoading?: boolean;
  editingMenuItem?: MenuItem | null;
}

export function MenuItemForm({ isOpen, onClose, onSubmit, isLoading = false, editingMenuItem }: MenuItemFormProps) {
  const [formData, setFormData] = useState<MenuItemFormData>({
    name: '',
    description: '',
    category: '',
    selling_price: 0,
    target_food_cost_percentage: 30,
    vat_rate: SwedishVATRate.FOOD_REDUCED, // Default 12% for food
    vat_calculation_type: VATCalculationType.INCLUSIVE, // Swedish default
  });

  const [errors, setErrors] = useState<MenuItemFormErrors>({});
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  // Load recipes when form opens
  useEffect(() => {
    if (isOpen) {
      loadRecipes();
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
        vat_rate: SwedishVATRate.FOOD_REDUCED, // Default 12% for food
        vat_calculation_type: VATCalculationType.INCLUSIVE, // Swedish default
      });
    }
    setErrors({});
  }, [editingMenuItem]);

  const loadRecipes = async () => {
    setLoadingRecipes(true);
    try {
      const recipesData = await apiClient.getRecipes();
      setRecipes(recipesData.filter(recipe => recipe.is_active)); // Only show active recipes
    } catch (error) {
      console.error('Failed to load recipes:', error);
      setRecipes([]);
    } finally {
      setLoadingRecipes(false);
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
      // Reset form after successful submission only when creating
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

  return (
    <div className="modal-overlay modal-open" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingMenuItem ? 'Redigera matträtt' : 'Skapa ny matträtt'}</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="menu-item-form">
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
            {recipes.length === 0 && !loadingRecipes && (
              <div className="help-text">
                <small>Inga aktiva recept hittades. Skapa ett recept först för att kunna koppla det till maträtten.</small>
              </div>
            )}
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
              <label htmlFor="target_food_cost_percentage">Målkostnad (%) *</label>
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
  );
}