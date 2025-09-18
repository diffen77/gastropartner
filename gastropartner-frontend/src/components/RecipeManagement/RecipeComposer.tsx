import React, { useState, useEffect, useCallback } from 'react';
import { Recipe, MenuItem, MenuItemCreate, apiClient } from '../../utils/api';
import { formatCurrency } from '../../utils/formatting';
import { useTranslation } from '../../localization/sv';
import { DragDropZone } from './DragDropZone';
import { RecipeCard } from './RecipeCard';
import { SuggestionEngine } from '../../utils/suggestionEngine';
import './RecipeComposer.css';

interface RecipeComposition {
  recipe: Recipe;
  quantity: number;
  notes?: string;
}

interface CompositionPreview {
  totalCost: number;
  combinedName: string;
  estimatedServings: number;
  ingredients: string[];
  nutritionHints: string[];
}

interface RecipeComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (menuItem: MenuItemCreate) => Promise<void>;
  isLoading?: boolean;
}

export function RecipeComposer({ isOpen, onClose, onSave, isLoading = false }: RecipeComposerProps) {
  const { translateError } = useTranslation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [composition, setComposition] = useState<RecipeComposition[]>([]);
  const [preview, setPreview] = useState<CompositionPreview | null>(null);
  const [suggestions, setSuggestions] = useState<Recipe[]>([]);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [undoHistory, setUndoHistory] = useState<RecipeComposition[][]>([]);
  const [canUndo, setCanUndo] = useState(false);

  // Form state for menu item creation
  const [menuItemName, setMenuItemName] = useState('');
  const [category, setCategory] = useState('Huvudrätt');
  const [targetMargin, setTargetMargin] = useState(30);
  const [sellingPrice, setSellingPrice] = useState(0);

  // Load available recipes
  useEffect(() => {
    if (isOpen) {
      loadRecipes();
    }
  }, [isOpen]);

  // Update preview when composition changes
  useEffect(() => {
    if (composition.length > 0) {
      updatePreview();
      loadSuggestions();
    } else {
      setPreview(null);
      setSuggestions([]);
    }
  }, [composition]);

  // Auto-generate menu item name and price
  useEffect(() => {
    if (preview) {
      setMenuItemName(preview.combinedName);
      const suggestedPrice = calculateSuggestedPrice(preview.totalCost, targetMargin);
      setSellingPrice(suggestedPrice);
    }
  }, [preview, targetMargin]);

  const loadRecipes = async () => {
    try {
      const recipesData = await apiClient.getRecipes();
      setRecipes(recipesData.filter(recipe => recipe.is_active));
      setError('');
    } catch (err) {
      console.error('Failed to load recipes:', err);
      setError('Kunde inte ladda recept');
    }
  };

  const updatePreview = useCallback(() => {
    if (composition.length === 0) {
      setPreview(null);
      return;
    }

    const totalCost = composition.reduce((sum, comp) => {
      const recipeCost = comp.recipe.cost_per_serving ?
        parseFloat(comp.recipe.cost_per_serving.toString()) * comp.quantity : 0;
      return sum + (isNaN(recipeCost) ? 0 : recipeCost);
    }, 0);

    const combinedName = composition.length === 1 ?
      composition[0].recipe.name :
      composition.map(comp => comp.recipe.name).join(' & ');

    const estimatedServings = Math.max(
      ...composition.map(comp => comp.recipe.servings * comp.quantity)
    );

    const allIngredients = composition.flatMap(comp =>
      comp.recipe.ingredients?.map(ing => ing.ingredient?.name || 'Okänd ingrediens') || []
    );
    const uniqueIngredients = Array.from(new Set(allIngredients));

    const nutritionHints = generateNutritionHints(composition);

    setPreview({
      totalCost,
      combinedName,
      estimatedServings,
      ingredients: uniqueIngredients,
      nutritionHints
    });
  }, [composition]);

  const loadSuggestions = async () => {
    try {
      const currentRecipeIds = composition.map(comp => comp.recipe.recipe_id);
      const suggestionsData = await SuggestionEngine.getSuggestions(currentRecipeIds);
      setSuggestions(suggestionsData);
    } catch (err) {
      console.error('Failed to load suggestions:', err);
      // Non-critical error, don't show to user
    }
  };

  const generateNutritionHints = (composition: RecipeComposition[]): string[] => {
    const hints: string[] = [];

    if (composition.some(comp => comp.recipe.name.toLowerCase().includes('sallad'))) {
      hints.push('🥗 Innehåller grönsaker - bra för näring');
    }

    if (composition.some(comp => comp.recipe.name.toLowerCase().includes('kött'))) {
      hints.push('🥩 Proteinrik måltid');
    }

    if (composition.length > 2) {
      hints.push('🍽️ Komplex sammansättning - överväg portionsstorlek');
    }

    const totalCost = composition.reduce((sum, comp) => {
      const cost = comp.recipe.cost_per_serving ?
        parseFloat(comp.recipe.cost_per_serving.toString()) * comp.quantity : 0;
      return sum + cost;
    }, 0);

    if (totalCost > 50) {
      hints.push('💰 Dyr kombination - kontrollera prissättning');
    } else if (totalCost < 15) {
      hints.push('💡 Ekonomisk kombination - bra marginal möjlig');
    }

    return hints;
  };

  const calculateSuggestedPrice = (totalCost: number, marginPercentage: number): number => {
    const margin = marginPercentage / 100;
    const suggestedPrice = totalCost / (1 - margin);
    return Math.ceil(suggestedPrice / 5) * 5; // Round up to nearest 5
  };

  const handleRecipeDrop = (recipe: Recipe, quantity: number = 1) => {
    // Save current state for undo
    setUndoHistory(prev => [...prev, [...composition]]);
    setCanUndo(true);

    // Check if recipe already exists in composition
    const existingIndex = composition.findIndex(comp => comp.recipe.recipe_id === recipe.recipe_id);

    if (existingIndex >= 0) {
      // Update quantity if recipe already exists
      const newComposition = [...composition];
      newComposition[existingIndex].quantity += quantity;
      setComposition(newComposition);
    } else {
      // Add new recipe to composition
      setComposition(prev => [...prev, { recipe, quantity }]);
    }
  };

  const handleQuantityChange = (recipeId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveRecipe(recipeId);
      return;
    }

    setComposition(prev => prev.map(comp =>
      comp.recipe.recipe_id === recipeId
        ? { ...comp, quantity: newQuantity }
        : comp
    ));
  };

  const handleRemoveRecipe = (recipeId: string) => {
    // Save current state for undo
    setUndoHistory(prev => [...prev, [...composition]]);
    setCanUndo(true);

    setComposition(prev => prev.filter(comp => comp.recipe.recipe_id !== recipeId));
  };

  const handleUndo = () => {
    if (undoHistory.length > 0) {
      const previousState = undoHistory[undoHistory.length - 1];
      setComposition(previousState);
      setUndoHistory(prev => prev.slice(0, -1));
      setCanUndo(undoHistory.length > 1);
    }
  };

  const handleClearComposition = () => {
    // Save current state for undo
    setUndoHistory(prev => [...prev, [...composition]]);
    setCanUndo(true);
    setComposition([]);
  };

  const handleSaveMenuItem = async () => {
    if (!preview || composition.length === 0) {
      setError('Lägg till minst ett recept för att skapa en maträtt');
      return;
    }

    if (!menuItemName.trim()) {
      setError('Ange ett namn för maträtten');
      return;
    }

    if (sellingPrice <= 0) {
      setError('Ange ett giltigt försäljningspris');
      return;
    }

    try {
      const menuItemData: MenuItemCreate = {
        name: menuItemName.trim(),
        description: `Sammansatt från: ${composition.map(comp =>
          `${comp.recipe.name} (${comp.quantity}x)`
        ).join(', ')}`,
        category,
        selling_price: sellingPrice,
        target_food_cost_percentage: ((preview.totalCost / sellingPrice) * 100),
        // Note: In the future, we'll link this to a combined recipe
      };

      await onSave(menuItemData);

      // Reset form on success
      setComposition([]);
      setMenuItemName('');
      setSellingPrice(0);
      setUndoHistory([]);
      setCanUndo(false);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod';
      setError(translateError(errorMessage));
    }
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content recipe-composer">
        <div className="modal-header">
          <h2>🍽️ Receptkombinator</h2>
          <button className="btn btn--icon" onClick={onClose} aria-label="Stäng">
            ✕
          </button>
        </div>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        <div className="recipe-composer__content">
          {/* Left Panel - Available Recipes */}
          <div className="recipe-composer__panel recipe-composer__panel--recipes">
            <div className="panel-header">
              <h3>📝 Tillgängliga Recept</h3>
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Sök recept..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="recipe-list">
              {filteredRecipes.map(recipe => (
                <RecipeCard
                  key={recipe.recipe_id}
                  recipe={recipe}
                  onDrag={handleRecipeDrop}
                  isDraggable={true}
                />
              ))}
            </div>

            {/* Smart Suggestions */}
            {suggestions.length > 0 && (
              <div className="suggestions-section">
                <h4>💡 Förslag baserat på din kombination</h4>
                <div className="suggestions-list">
                  {suggestions.slice(0, 3).map(recipe => (
                    <RecipeCard
                      key={`suggestion-${recipe.recipe_id}`}
                      recipe={recipe}
                      onDrag={handleRecipeDrop}
                      isDraggable={true}
                      isSuggestion={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Center Panel - Composition Zone */}
          <div className="recipe-composer__panel recipe-composer__panel--composition">
            <div className="panel-header">
              <h3>🎯 Kombinations-zon</h3>
              <div className="composition-actions">
                <button
                  className="btn btn--small btn--secondary"
                  onClick={handleUndo}
                  disabled={!canUndo}
                  title="Ångra senaste ändring"
                >
                  ↶ Ångra
                </button>
                <button
                  className="btn btn--small btn--danger"
                  onClick={handleClearComposition}
                  disabled={composition.length === 0}
                  title="Rensa alla recept"
                >
                  🗑️ Rensa
                </button>
              </div>
            </div>

            <DragDropZone
              composition={composition}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemoveRecipe}
              onDrop={handleRecipeDrop}
            />

            {/* Composition Preview */}
            {preview && (
              <div className="composition-preview">
                <h4>📊 Förhandsvisning</h4>
                <div className="preview-stats">
                  <div className="stat">
                    <span className="stat-label">Totalkostnad:</span>
                    <span className="stat-value">{formatCurrency(preview.totalCost)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Portioner:</span>
                    <span className="stat-value">{preview.estimatedServings}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Ingredienser:</span>
                    <span className="stat-value">{preview.ingredients.length} st</span>
                  </div>
                </div>

                {preview.nutritionHints.length > 0 && (
                  <div className="nutrition-hints">
                    {preview.nutritionHints.map((hint, index) => (
                      <div key={index} className="nutrition-hint">
                        {hint}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Menu Item Form */}
          <div className="recipe-composer__panel recipe-composer__panel--form">
            <div className="panel-header">
              <h3>🍽️ Skapa Maträtt</h3>
            </div>

            <div className="menu-item-form">
              <div className="form-group">
                <label htmlFor="menuItemName">Namn på maträtt</label>
                <input
                  id="menuItemName"
                  type="text"
                  value={menuItemName}
                  onChange={(e) => setMenuItemName(e.target.value)}
                  className="form-input"
                  placeholder="t.ex. Korv & Potatis Special"
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Kategori</label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="form-select"
                >
                  <option value="Huvudrätt">Huvudrätt</option>
                  <option value="Förrätt">Förrätt</option>
                  <option value="Efterrätt">Efterrätt</option>
                  <option value="Tillbehör">Tillbehör</option>
                  <option value="Dryck">Dryck</option>
                  <option value="Snacks">Snacks</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="targetMargin">Målmarginal (%)</label>
                <input
                  id="targetMargin"
                  type="number"
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                  className="form-input"
                  min="0"
                  max="100"
                />
              </div>

              <div className="form-group">
                <label htmlFor="sellingPrice">Försäljningspris (kr)</label>
                <input
                  id="sellingPrice"
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="form-input"
                  min="0"
                  step="0.01"
                />
                {preview && (
                  <div className="price-suggestion">
                    💡 Förslag: {formatCurrency(calculateSuggestedPrice(preview.totalCost, targetMargin))}
                  </div>
                )}
              </div>

              {preview && (
                <div className="margin-analysis">
                  <h5>📈 Marginalanalys</h5>
                  <div className="margin-stats">
                    <div className="margin-stat">
                      <span>Råvarukostnad:</span>
                      <span>{formatCurrency(preview.totalCost)}</span>
                    </div>
                    <div className="margin-stat">
                      <span>Marginal:</span>
                      <span>{formatCurrency(sellingPrice - preview.totalCost)}</span>
                    </div>
                    <div className="margin-stat">
                      <span>Marginal %:</span>
                      <span className={
                        sellingPrice > 0
                          ? ((sellingPrice - preview.totalCost) / sellingPrice) * 100 >= targetMargin
                            ? 'margin-good'
                            : 'margin-warning'
                          : ''
                      }>
                        {sellingPrice > 0
                          ? `${(((sellingPrice - preview.totalCost) / sellingPrice) * 100).toFixed(1)}%`
                          : '0%'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="btn btn--secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Avbryt
          </button>
          <button
            className="btn btn--primary"
            onClick={handleSaveMenuItem}
            disabled={isLoading || composition.length === 0 || !menuItemName.trim()}
          >
            {isLoading ? 'Sparar...' : '💾 Spara Maträtt'}
          </button>
        </div>
      </div>
    </div>
  );
}