/**
 * IngredientsStep - Wizard step for ingredient selection and configuration
 *
 * This component allows users to:
 * - Select ingredients from existing inventory
 * - Specify quantities and units for each ingredient
 * - Add new ingredients if needed (opens ingredient form)
 * - Remove ingredients from the current recipe/menu item
 * - View real-time cost calculations per ingredient
 */

import React, { useState, useCallback } from 'react';
import { useRecipeManagement } from '../../../contexts/RecipeManagementContext';
import { IngredientForm } from '../../Ingredients/IngredientForm';
import { apiClient, Ingredient, IngredientCreate } from '../../../utils/api';
import { UNITS, renderUnitOptions } from '../../../utils/units';
import { formatCurrency } from '../../../utils/formatting';
import { Ingredients } from '../../../hooks/useRecipeMenuWizardState';

export interface IngredientsStepProps {
  /** Current selected ingredients with quantities */
  ingredients: Ingredients;
  /** Current creation type affecting ingredient behavior */
  creationType: 'recipe' | 'menu-item' | null;
  /** Validation errors for this step */
  errors: string[];
  /** Loading state from parent */
  isLoading: boolean;
  /** Callback when ingredients list changes */
  onIngredientsUpdate: (ingredients: Ingredients) => void;
}

/**
 * Individual ingredient selection row with quantity/unit inputs
 */
interface IngredientRowProps {
  ingredient: Ingredients[0];
  availableIngredients: Ingredient[];
  onUpdate: (ingredientId: string, updates: Partial<Ingredients[0]>) => void;
  onRemove: (ingredientId: string) => void;
  isLoading: boolean;
}

function IngredientRow({
  ingredient,
  availableIngredients,
  onUpdate,
  onRemove,
  isLoading
}: IngredientRowProps) {
  const selectedIngredient = availableIngredients.find(
    ing => ing.ingredient_id === ingredient.ingredientId
  );

  const handleIngredientChange = (ingredientId: string) => {
    const newIngredient = availableIngredients.find(ing => ing.ingredient_id === ingredientId);
    if (newIngredient) {
      onUpdate(ingredient.ingredientId, {
        ingredientId: newIngredient.ingredient_id,
        name: newIngredient.name,
        unit: newIngredient.unit,
        costPerUnit: Number(newIngredient.cost_per_unit),
      });
    }
  };

  const handleQuantityChange = (quantity: number) => {
    onUpdate(ingredient.ingredientId, { quantity });
  };

  const handleUnitChange = (unit: string) => {
    onUpdate(ingredient.ingredientId, { unit });
  };

  // Calculate cost for this ingredient
  const totalCost = ingredient.quantity * (ingredient.costPerUnit || 0);

  return (
    <div className="ingredient-row">
      <div className="ingredient-row__ingredient">
        <label>Ingrediens</label>
        <select
          value={ingredient.ingredientId}
          onChange={(e) => handleIngredientChange(e.target.value)}
          disabled={isLoading}
          className="form-control"
        >
          <option value="">Välj ingrediens</option>
          {availableIngredients.map(ing => (
            <option key={ing.ingredient_id} value={ing.ingredient_id}>
              {ing.name} ({ing.category})
            </option>
          ))}
        </select>
      </div>

      <div className="ingredient-row__quantity">
        <label>Mängd</label>
        <input
          type="number"
          min="0"
          step="0.1"
          value={ingredient.quantity}
          onChange={(e) => handleQuantityChange(Number(e.target.value))}
          disabled={isLoading}
          className="form-control"
          placeholder="0"
        />
      </div>

      <div className="ingredient-row__unit">
        <label>Enhet</label>
        <select
          value={ingredient.unit}
          onChange={(e) => handleUnitChange(e.target.value)}
          disabled={isLoading}
          className="form-control"
        >
          <option value="">Välj enhet</option>
          {renderUnitOptions(UNITS)}
        </select>
      </div>

      <div className="ingredient-row__cost">
        <label>Kostnad</label>
        <div className="cost-display">
          {totalCost > 0 ? formatCurrency(totalCost) : '0 kr'}
        </div>
        {selectedIngredient && (
          <div className="cost-per-unit">
            {formatCurrency(selectedIngredient.cost_per_unit)}/{selectedIngredient.unit}
          </div>
        )}
      </div>

      <div className="ingredient-row__actions">
        <button
          type="button"
          onClick={() => onRemove(ingredient.ingredientId)}
          disabled={isLoading}
          className="btn btn--icon btn--danger"
          title="Ta bort ingrediens"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function IngredientsStep({
  ingredients,
  creationType,
  errors,
  isLoading,
  onIngredientsUpdate,
}: IngredientsStepProps) {
  const {
    ingredients: availableIngredients,
    onIngredientChange,
    isLoading: { ingredients: ingredientsLoading },
  } = useRecipeManagement();

  const [isAddingIngredient, setIsAddingIngredient] = useState(false);
  const [isIngredientFormOpen, setIsIngredientFormOpen] = useState(false);

  // Add new ingredient row
  const handleAddIngredient = useCallback(() => {
    const newIngredient: Ingredients[0] = {
      ingredientId: '',
      name: '',
      quantity: 0,
      unit: '',
      costPerUnit: 0,
    };

    onIngredientsUpdate([...ingredients, newIngredient]);
  }, [ingredients, onIngredientsUpdate]);

  // Update specific ingredient
  const handleUpdateIngredient = useCallback((ingredientId: string, updates: Partial<Ingredients[0]>) => {
    const updatedIngredients = ingredients.map(ing => {
      if (ing.ingredientId === ingredientId) {
        return { ...ing, ...updates };
      }
      return ing;
    });
    onIngredientsUpdate(updatedIngredients);
  }, [ingredients, onIngredientsUpdate]);

  // Remove ingredient
  const handleRemoveIngredient = useCallback((ingredientId: string) => {
    const filteredIngredients = ingredients.filter(ing => ing.ingredientId !== ingredientId);
    onIngredientsUpdate(filteredIngredients);
  }, [ingredients, onIngredientsUpdate]);

  // Handle new ingredient creation
  const handleCreateIngredient = async (data: IngredientCreate) => {
    try {
      const newIngredient = await apiClient.createIngredient(data);
      await onIngredientChange(); // Refresh ingredients list

      // Auto-select the newly created ingredient in an empty row
      const emptyRowIndex = ingredients.findIndex(ing => !ing.ingredientId);
      if (emptyRowIndex >= 0) {
        handleUpdateIngredient(ingredients[emptyRowIndex].ingredientId || `temp-${Date.now()}`, {
          ingredientId: newIngredient.ingredient_id,
          name: newIngredient.name,
          unit: newIngredient.unit,
          costPerUnit: Number(newIngredient.cost_per_unit),
        });
      }

      setIsIngredientFormOpen(false);
    } catch (error) {
      console.error('Failed to create ingredient:', error);
      throw error;
    }
  };

  // Calculate total cost for all ingredients
  const totalCost = ingredients.reduce((sum, ing) => {
    return sum + (ing.quantity * (ing.costPerUnit || 0));
  }, 0);

  // Filter out ingredients that are already selected
  const selectedIngredientIds = ingredients
    .map(ing => ing.ingredientId)
    .filter(id => id !== '');

  const availableForSelection = availableIngredients.filter(
    ing => !selectedIngredientIds.includes(ing.ingredient_id)
  );

  return (
    <div className="ingredients-step">
      <div className="wizard-step-content">
        {/* Step Description */}
        <div className="step-description">
          <p>
            Välj och konfigurera ingredienser för ditt {' '}
            {creationType === 'recipe' ? 'grundrecept' : 'maträtt'}.
            Ange mängd och enhet för varje ingrediens.
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

        {/* Ingredients List */}
        <div className="ingredients-list">
          <div className="ingredients-header">
            <h3>Ingredienser</h3>
            <div className="ingredients-actions">
              <button
                type="button"
                onClick={() => setIsIngredientFormOpen(true)}
                disabled={isLoading || ingredientsLoading}
                className="btn btn--secondary btn--small"
              >
                + Ny Ingrediens
              </button>
              <button
                type="button"
                onClick={handleAddIngredient}
                disabled={isLoading || ingredientsLoading}
                className="btn btn--primary"
              >
                + Lägg till Ingrediens
              </button>
            </div>
          </div>

          {ingredients.length === 0 ? (
            <div className="empty-ingredients">
              <div className="empty-state">
                <div className="empty-state__icon">🥬</div>
                <div className="empty-state__title">Inga ingredienser än</div>
                <div className="empty-state__description">
                  Lägg till ingredienser för att börja bygga ditt {' '}
                  {creationType === 'recipe' ? 'grundrecept' : 'maträtt'}
                </div>
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  disabled={isLoading || ingredientsLoading}
                  className="btn btn--primary"
                >
                  Lägg till första ingrediensen
                </button>
              </div>
            </div>
          ) : (
            <div className="ingredients-grid">
              <div className="ingredients-grid-header">
                <div>Ingrediens</div>
                <div>Mängd</div>
                <div>Enhet</div>
                <div>Kostnad</div>
                <div>Åtgärder</div>
              </div>

              {ingredients.map((ingredient, index) => (
                <IngredientRow
                  key={ingredient.ingredientId || `ingredient-${index}`}
                  ingredient={ingredient}
                  availableIngredients={[...availableForSelection, ...availableIngredients.filter(
                    ing => ing.ingredient_id === ingredient.ingredientId
                  )]}
                  onUpdate={handleUpdateIngredient}
                  onRemove={handleRemoveIngredient}
                  isLoading={isLoading || ingredientsLoading}
                />
              ))}
            </div>
          )}

          {/* Total Cost Summary */}
          {ingredients.length > 0 && (
            <div className="ingredients-summary">
              <div className="summary-row">
                <span className="summary-label">Total kostnad för ingredienser:</span>
                <span className="summary-value">{formatCurrency(totalCost)}</span>
              </div>
              {creationType === 'recipe' && (
                <div className="summary-note">
                  Kostnaden beräknas automatiskt baserat på valda ingredienser och mängder.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {(isLoading || ingredientsLoading) && (
          <div className="loading-overlay">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <div className="loading-text">Laddar ingredienser...</div>
            </div>
          </div>
        )}
      </div>

      {/* Ingredient Creation Form */}
      <IngredientForm
        isOpen={isIngredientFormOpen}
        onClose={() => setIsIngredientFormOpen(false)}
        onSubmit={handleCreateIngredient}
        isLoading={isLoading}
        editingIngredient={null}
      />
    </div>
  );
}