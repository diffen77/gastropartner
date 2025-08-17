import React, { useState, useEffect } from 'react';
import { RecipeCreate, Recipe, Ingredient, RecipeIngredientCreate, FeatureFlags, apiClient } from '../../utils/api';
import { useFreemium } from '../../hooks/useFreemium';
import { calculateIngredientCost, getCompatibleUnits } from '../../utils/unitConversion';
import { UNITS, renderUnitOptions } from '../../utils/units';
import './RecipeForm.css';

interface RecipeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RecipeCreate) => Promise<void>;
  isLoading?: boolean;
  editingRecipe?: Recipe | null;
}

interface RecipeIngredientFormData extends RecipeIngredientCreate {
  id: string; // temporary ID for form management
}

export function RecipeForm({ isOpen, onClose, onSubmit, isLoading = false, editingRecipe = null }: RecipeFormProps) {
  const { canAddRecipe, isAtLimit } = useFreemium();
  const [formData, setFormData] = useState<RecipeCreate>({
    name: '',
    description: '',
    servings: 1, // Default to 1 portion
    prep_time_minutes: undefined,
    cook_time_minutes: undefined,
    instructions: '',
    notes: '',
    ingredients: [],
  });

  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredientFormData[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);
  const [error, setError] = useState<string>('');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Load available ingredients and feature flags when form opens
  useEffect(() => {
    if (isOpen) {
      loadIngredients();
      loadFeatureFlags();
      if (editingRecipe) {
        populateFormForEdit(editingRecipe);
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingRecipe]);

  const loadIngredients = async () => {
    try {
      const ingredients = await apiClient.getIngredients();
      const activeIngredients = ingredients.filter(ing => ing.is_active);
      setAvailableIngredients(activeIngredients);
    } catch (err) {
      console.error('Failed to load ingredients:', err);
      setError('Failed to load ingredients. Please try refreshing the page.');
    }
  };

  const loadFeatureFlags = async () => {
    try {
      const flags = await apiClient.getFeatureFlags();
      setFeatureFlags(flags);
    } catch (err) {
      console.error('Failed to load feature flags:', err);
      // Set default flags if loading fails
      setFeatureFlags({
        flags_id: '',
        agency_id: '',
        show_recipe_prep_time: false,
        show_recipe_cook_time: false,
        show_recipe_instructions: false,
        show_recipe_notes: false,
        created_at: '',
        updated_at: '',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      servings: 1, // Always default to 1 portion
      prep_time_minutes: undefined,
      cook_time_minutes: undefined,
      instructions: '',
      notes: '',
      ingredients: [],
    });
    setRecipeIngredients([]);
    setError('');
    setShowUpgradePrompt(false);
  };

  const populateFormForEdit = (recipe: Recipe) => {
    setFormData({
      name: recipe.name,
      description: recipe.description || '',
      servings: recipe.servings,
      prep_time_minutes: recipe.prep_time_minutes,
      cook_time_minutes: recipe.cook_time_minutes,
      instructions: recipe.instructions || '',
      notes: recipe.notes || '',
      ingredients: [],
    });

    // Convert recipe ingredients to form format
    const formIngredients: RecipeIngredientFormData[] = recipe.ingredients?.map((ri, index) => ({
      id: `edit-${index}`,
      ingredient_id: ri.ingredient_id,
      quantity: ri.quantity,
      unit: ri.unit,
      notes: ri.notes || '',
    })) || [];
    
    setRecipeIngredients(formIngredients);
    setError('');
    setShowUpgradePrompt(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check freemium limits
    if (!canAddRecipe()) {
      setShowUpgradePrompt(true);
      return;
    }

    if (formData.name.trim() === '') {
      setError('Receptnamn krävs');
      return;
    }


    try {
      // Convert form ingredients to API format
      const ingredients = recipeIngredients.map(ri => ({
        ingredient_id: ri.ingredient_id,
        quantity: ri.quantity,
        unit: ri.unit,
        notes: ri.notes,
      }));

      await onSubmit({
        ...formData,
        ingredients,
      });

      resetForm();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod';
      
      // Check if it's a freemium limit error
      if (errorMessage.includes('Freemium limit') || errorMessage.includes('limit reached')) {
        setShowUpgradePrompt(true);
      } else {
        setError(errorMessage);
      }
    }
  };

  const addIngredient = () => {
    if (availableIngredients.length === 0) {
      setError('Inga ingredienser tillgängliga. Gå till ingredienser-sidan och skapa ingredienser först.');
      return;
    }

    console.log('🆕 Adding new ingredient. Available ingredients:', availableIngredients);
    console.log('First available ingredient:', availableIngredients[0]);

    const newIngredient: RecipeIngredientFormData = {
      id: `temp-${Date.now()}`,
      ingredient_id: availableIngredients[0].ingredient_id,
      quantity: 1,
      unit: availableIngredients[0].unit,
      notes: '',
    };

    console.log('New ingredient created:', newIngredient);
    
    setRecipeIngredients(prevIngredients => {
      console.log('Previous ingredients before adding:', prevIngredients);
      const updatedIngredients = [...prevIngredients, newIngredient];
      console.log('Updated ingredients after adding:', updatedIngredients);
      return updatedIngredients;
    });
  };

  const removeIngredient = (id: string) => {
    setRecipeIngredients(prevIngredients => 
      prevIngredients.filter(ri => ri.id !== id)
    );
  };

  const updateIngredient = (id: string, field: keyof RecipeIngredientFormData, value: any) => {
    console.log(`🔄 updateIngredient called: id=${id}, field=${field}, value=${value}`);
    
    setRecipeIngredients(prevIngredients => {
      console.log('Previous ingredients in functional update:', prevIngredients);
      const updatedIngredients = prevIngredients.map(ri => 
        ri.id === id ? { ...ri, [field]: value } : ri
      );
      console.log('Updated ingredients in functional update:', updatedIngredients);
      return updatedIngredients;
    });
  };

  const calculateEstimatedCost = (): number => {
    return recipeIngredients.reduce((total, ri) => {
      const ingredient = availableIngredients.find(ing => ing.ingredient_id === ri.ingredient_id);
      if (ingredient) {
        // Use unit conversion for accurate cost calculation
        const cost = calculateIngredientCost(
          ri.quantity,
          ri.unit,
          ingredient.cost_per_unit,
          ingredient.unit
        );
        return total + cost;
      }
      return total;
    }, 0);
  };;

  const estimatedCost = calculateEstimatedCost();
  const costPerServing = estimatedCost; // Since we always use 1 serving

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content recipe-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingRecipe ? 'Redigera Recept' : 'Nytt Recept'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {showUpgradePrompt ? (
          <div className="upgrade-modal">
            <div className="upgrade-content">
              <h3>Uppgradera till Enterprise</h3>
              <p>Du har nått gränsen för receptmodulen (5/5).</p>
              <p>Uppgradera till enterprise för:</p>
              <ul>
                <li>• Obegränsade recept</li>
                <li>• Avancerade kostkalkyleringar</li>
                <li>• Näringsvärdesanalys</li>
                <li>• Prioriterad support</li>
              </ul>
              <div className="upgrade-actions">
                <button 
                  className="btn btn--secondary" 
                  onClick={() => setShowUpgradePrompt(false)}
                >
                  Stäng
                </button>
                <button className="btn btn--primary">Uppgradera Nu</button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="recipe-form__form">
            {error && (
              <div className="error-message">
                <span>⚠️ {error}</span>
              </div>
            )}

            {isAtLimit('recipes') && (
              <div className="warning-message">
                <span>⚠️ Du har nått gränsen för recept (5/5). Uppgradera för fler recept.</span>
              </div>
            )}

            {/* Basic Recipe Information */}
            <div className="form-section">
              <h3>Grundinformation</h3>
              
              <div className="form-group">
                <label htmlFor="name">Receptnamn *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="T.ex. Pasta Carbonara"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Beskrivning</label>
                <textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kort beskrivning av receptet..."
                  rows={2}
                />
              </div>

              {/* Time fields - conditionally shown based on feature flags */}
              {(featureFlags?.show_recipe_prep_time || featureFlags?.show_recipe_cook_time) && (
                <div className="form-row">
                  {featureFlags?.show_recipe_prep_time && (
                    <div className="form-group">
                      <label htmlFor="prep_time">Förberedelse (min)</label>
                      <input
                        type="number"
                        id="prep_time"
                        min="0"
                        max="1440"
                        value={formData.prep_time_minutes || ''}
                        onChange={(e) => setFormData({ ...formData, prep_time_minutes: e.target.value ? parseInt(e.target.value) : undefined })}
                      />
                    </div>
                  )}

                  {featureFlags?.show_recipe_cook_time && (
                    <div className="form-group">
                      <label htmlFor="cook_time">Tillagningstid (min)</label>
                      <input
                        type="number"
                        id="cook_time"
                        min="0"
                        max="1440"
                        value={formData.cook_time_minutes || ''}
                        onChange={(e) => setFormData({ ...formData, cook_time_minutes: e.target.value ? parseInt(e.target.value) : undefined })}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Ingredients Section */}
            <div className="form-section">
              <div className="section-header">
                <h3>Ingredienser</h3>
                <button
                  type="button"
                  className="btn btn--secondary btn--small"
                  onClick={addIngredient}
                >
                  + Lägg till ingrediens
                </button>
              </div>

              {recipeIngredients.length === 0 ? (
                <div className="empty-state">
                  <p>Inga ingredienser tillagda än</p>
                  <small>Klicka på "Lägg till ingrediens" för att börja</small>
                </div>
              ) : (
                <div className="ingredients-list">
                  {recipeIngredients.map((ri) => {
                    const ingredient = availableIngredients.find(ing => ing.ingredient_id === ri.ingredient_id);
                    const lineCost = ingredient ? calculateIngredientCost(
                      ri.quantity,
                      ri.unit,
                      ingredient.cost_per_unit,
                      ingredient.unit
                    ) : 0;
                    
                    return (
                      <div key={ri.id} className="ingredient-row">
                        <div className="ingredient-row__select">
                          <select
                            value={ri.ingredient_id}
                            onChange={(e) => {
                              console.log(`🎯 Dropdown onChange: Selected ${e.target.value} for ingredient row ${ri.id}`);
                              console.log('Current ri.ingredient_id:', ri.ingredient_id);
                              const selectedIngredient = availableIngredients.find(ing => ing.ingredient_id === e.target.value);
                              console.log('Found ingredient:', selectedIngredient?.name);
                              
                              updateIngredient(ri.id, 'ingredient_id', e.target.value);
                              if (selectedIngredient) {
                                updateIngredient(ri.id, 'unit', selectedIngredient.unit);
                              }
                            }}
                            required
                          >
                            {availableIngredients.map(ing => (
                              <option key={ing.ingredient_id} value={ing.ingredient_id}>
                                {ing.name} ({Number(ing.cost_per_unit).toFixed(2)} kr/{ing.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="ingredient-row__quantity">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={ri.quantity}
                            onChange={(e) => updateIngredient(ri.id, 'quantity', parseFloat(e.target.value) || 0)}
                            placeholder="Mängd"
                            required
                          />
                        </div>

                        <div className="ingredient-row__unit">
                          <select
                            value={ri.unit}
                            onChange={(e) => updateIngredient(ri.id, 'unit', e.target.value)}
                            title={ingredient ? `Kompatibla enheter: ${getCompatibleUnits(ingredient.unit).join(', ')}` : 'Välj enhet för denna ingrediens'}
                            required
                          >
                            <option value="">Välj enhet</option>
                            {renderUnitOptions(UNITS)}
                          </select>
                        </div>

                        <div className="ingredient-row__cost">
                          <span className="cost-display">{lineCost.toFixed(2)} kr</span>
                        </div>

                        <button
                          type="button"
                          className="btn btn--danger btn--small"
                          onClick={() => removeIngredient(ri.id)}
                          title="Ta bort ingrediens"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Cost Summary */}
              {recipeIngredients.length > 0 && (
                <div className="cost-summary">
                  <div className="cost-row">
                    <span>Total ingredienskostnad:</span>
                    <strong>{estimatedCost.toFixed(2)} kr</strong>
                  </div>
                  <div className="cost-row">
                    <span>Kostnad per portion:</span>
                    <strong>{costPerServing.toFixed(2)} kr</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions and Notes - conditionally shown based on feature flags */}
            {(featureFlags?.show_recipe_instructions || featureFlags?.show_recipe_notes) && (
              <div className="form-section">
                <h3>Instruktioner & Anteckningar</h3>
                {featureFlags?.show_recipe_instructions && (
                  <div className="form-group">
                    <label htmlFor="instructions">Tillagningssteg</label>
                    <textarea
                      id="instructions"
                      value={formData.instructions || ''}
                      onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                      placeholder="1. Värm ugnen till 180°C&#10;2. Blanda ingredienserna...&#10;3. Grädda i 25 minuter"
                      rows={6}
                    />
                  </div>
                )}

                {featureFlags?.show_recipe_notes && (
                  <div className="form-group">
                    <label htmlFor="notes">Anteckningar</label>
                    <textarea
                      id="notes"
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Allmänna tips, variationer, allergener..."
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={onClose}
                disabled={isLoading}
              >
                Avbryt
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={isLoading || formData.name.trim() === ''}
              >
                {isLoading 
                  ? (editingRecipe ? 'Uppdaterar...' : 'Sparar...') 
                  : (editingRecipe ? 'Uppdatera Recept' : 'Spara Recept')
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}