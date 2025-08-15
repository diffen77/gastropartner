import React, { useState, useEffect } from 'react';
import { RecipeCreate, Ingredient, RecipeIngredientCreate, apiClient } from '../../utils/api';
import { useFreemium } from '../../hooks/useFreemium';
import './RecipeForm.css';

interface RecipeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RecipeCreate) => Promise<void>;
  isLoading?: boolean;
}

interface RecipeIngredientFormData extends RecipeIngredientCreate {
  id: string; // temporary ID for form management
}

export function RecipeForm({ isOpen, onClose, onSubmit, isLoading = false }: RecipeFormProps) {
  const { canAddRecipe, isAtLimit } = useFreemium();
  const [formData, setFormData] = useState<RecipeCreate>({
    name: '',
    description: '',
    servings: 4,
    prep_time_minutes: undefined,
    cook_time_minutes: undefined,
    instructions: '',
    notes: '',
    ingredients: [],
  });

  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredientFormData[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [error, setError] = useState<string>('');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Load available ingredients when form opens
  useEffect(() => {
    if (isOpen) {
      loadIngredients();
      resetForm();
    }
  }, [isOpen]);

  const loadIngredients = async () => {
    try {
      const ingredients = await apiClient.getIngredients();
      setAvailableIngredients(ingredients.filter(ing => ing.is_active));
    } catch (err) {
      console.error('Failed to load ingredients:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      servings: 4,
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

    if (formData.servings <= 0) {
      setError('Antal portioner måste vara större än 0');
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
      setError('Inga ingredienser tillgängliga. Skapa ingredienser först.');
      return;
    }

    const newIngredient: RecipeIngredientFormData = {
      id: `temp-${Date.now()}`,
      ingredient_id: availableIngredients[0].ingredient_id,
      quantity: 1,
      unit: availableIngredients[0].unit,
      notes: '',
    };

    setRecipeIngredients([...recipeIngredients, newIngredient]);
  };

  const removeIngredient = (id: string) => {
    setRecipeIngredients(recipeIngredients.filter(ri => ri.id !== id));
  };

  const updateIngredient = (id: string, field: keyof RecipeIngredientFormData, value: any) => {
    setRecipeIngredients(recipeIngredients.map(ri => 
      ri.id === id ? { ...ri, [field]: value } : ri
    ));
  };

  const calculateEstimatedCost = (): number => {
    return recipeIngredients.reduce((total, ri) => {
      const ingredient = availableIngredients.find(ing => ing.ingredient_id === ri.ingredient_id);
      if (ingredient) {
        return total + (ri.quantity * ingredient.cost_per_unit);
      }
      return total;
    }, 0);
  };

  const estimatedCost = calculateEstimatedCost();
  const costPerServing = formData.servings > 0 ? estimatedCost / formData.servings : 0;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content recipe-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nytt Recept</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {showUpgradePrompt ? (
          <div className="upgrade-modal">
            <div className="upgrade-content">
              <h3>Uppgradera till Premium</h3>
              <p>Du har nått gränsen för gratis recept (5/5).</p>
              <p>Uppgradera till premium för:</p>
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

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="servings">Portioner *</label>
                  <input
                    type="number"
                    id="servings"
                    min="1"
                    max="100"
                    value={formData.servings}
                    onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>

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
              </div>
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
                    const lineCost = ingredient ? ri.quantity * ingredient.cost_per_unit : 0;
                    
                    return (
                      <div key={ri.id} className="ingredient-row">
                        <div className="ingredient-row__select">
                          <select
                            value={ri.ingredient_id}
                            onChange={(e) => {
                              const selectedIngredient = availableIngredients.find(ing => ing.ingredient_id === e.target.value);
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
                          <input
                            type="text"
                            value={ri.unit}
                            onChange={(e) => updateIngredient(ri.id, 'unit', e.target.value)}
                            placeholder="Enhet"
                            autoComplete="off"
                          />
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

            {/* Instructions */}
            <div className="form-section">
              <h3>Instruktioner</h3>
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
            </div>

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
                {isLoading ? 'Sparar...' : 'Spara Recept'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}