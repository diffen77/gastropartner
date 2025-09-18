import React, { useState, useEffect } from 'react';
import { Recipe, RecipeCreate } from '../../utils/api';
import { impactAnalysisService, RecipeImpactAnalysis, PriceSuggestion } from '../../utils/impactAnalysis';
import { useTranslation } from '../../localization/sv';
import { RecipeVersionHistory } from './RecipeVersionHistory';
import { PriceAdjustmentModal } from './PriceAdjustmentModal';
import './BatchRecipeEditor.css';

interface BatchRecipeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe;
  onUpdate: (updatedRecipe: Recipe) => void;
}

export function BatchRecipeEditor({ isOpen, onClose, recipe, onUpdate }: BatchRecipeEditorProps) {
  const { translateError } = useTranslation();

  // Component state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [editedRecipe, setEditedRecipe] = useState<RecipeCreate>({
    name: recipe.name,
    description: recipe.description || '',
    instructions: recipe.instructions || '',
    servings: recipe.servings || 1,
    ingredients: recipe.ingredients?.map(ri => ({
      ingredient_id: ri.ingredient_id,
      quantity: ri.quantity,
      unit: ri.unit || '',
      notes: ri.notes || ''
    })) || []
  });

  // Impact analysis state
  const [impactAnalysis, setImpactAnalysis] = useState<RecipeImpactAnalysis | null>(null);
  const [showImpactAnalysis, setShowImpactAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Version history state
  const [versionHistory, setVersionHistory] = useState<any[]>([]);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);

  // Price adjustment modal state
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);

  // Reset state when recipe changes
  useEffect(() => {
    if (recipe) {
      setEditedRecipe({
        name: recipe.name,
        description: recipe.description || '',
        instructions: recipe.instructions || '',
        servings: recipe.servings || 1,
        ingredients: recipe.ingredients?.map(ri => ({
          ingredient_id: ri.ingredient_id,
          quantity: ri.quantity,
          unit: ri.unit || '',
          notes: ri.notes || ''
        })) || []
      });
      setImpactAnalysis(null);
      setShowImpactAnalysis(false);
    }
  }, [recipe]);

  // Load version history
  useEffect(() => {
    const loadVersionHistory = async () => {
      try {
        const history = await impactAnalysisService.getRecipeChangeHistory(recipe.recipe_id);
        setVersionHistory(history);
      } catch (err) {
        console.error('Failed to load version history:', err);
      }
    };

    if (isOpen && recipe) {
      loadVersionHistory();
    }
  }, [isOpen, recipe]);

  const handleInputChange = (field: keyof RecipeCreate, value: any) => {
    setEditedRecipe(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleIngredientChange = (index: number, field: string, value: any) => {
    setEditedRecipe(prev => ({
      ...prev,
      ingredients: (prev.ingredients || []).map((ingredient, i) =>
        i === index ? { ...ingredient, [field]: value } : ingredient
      )
    }));
  };

  const removeIngredient = (index: number) => {
    setEditedRecipe(prev => ({
      ...prev,
      ingredients: (prev.ingredients || []).filter((_, i) => i !== index)
    }));
  };

  const addIngredient = () => {
    setEditedRecipe(prev => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), {
        ingredient_id: '',
        quantity: 0,
        unit: '',
        notes: ''
      }]
    }));
  };

  const performImpactAnalysis = async () => {
    if (!hasChanges()) {
      setError('Inga ändringar att analysera');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const analysis = await impactAnalysisService.analyzeRecipeImpact(
        recipe.recipe_id,
        editedRecipe
      );

      setImpactAnalysis(analysis);
      setShowImpactAnalysis(true);
    } catch (err) {
      console.error('Impact analysis failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Påverkananalys misslyckades';
      setError(translateError(errorMessage));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const hasChanges = (): boolean => {
    return JSON.stringify(editedRecipe) !== JSON.stringify({
      name: recipe.name,
      description: recipe.description || '',
      instructions: recipe.instructions || '',
      servings: recipe.servings || 1,
      ingredients: recipe.ingredients?.map(ri => ({
        ingredient_id: ri.ingredient_id,
        quantity: ri.quantity,
        unit: ri.unit || '',
        notes: ri.notes || ''
      })) || []
    });
  };

  // Handle price suggestions from modal
  const handleApplyPriceSuggestions = async (selectedSuggestions: PriceSuggestion[]) => {
    if (!impactAnalysis) return;

    setIsLoading(true);
    setError('');

    try {
      // Save recipe change to history
      await impactAnalysisService.saveRecipeChange(
        recipe.recipe_id,
        editedRecipe,
        'Batch-redigering med prisförslag'
      );

      // Perform batch update with selected price suggestions
      const result = await impactAnalysisService.performBatchRecipeUpdate(
        recipe.recipe_id,
        editedRecipe,
        true,
        selectedSuggestions
      );

      if (result.success) {
        onUpdate(result.updated_recipe);
        setIsPriceModalOpen(false);
        onClose();
      } else {
        setError(result.errors.join(', '));
      }
    } catch (err) {
      console.error('Failed to apply price suggestions:', err);
      const errorMessage = err instanceof Error ? err.message : 'Kunde inte tillämpa prisförslag';
      setError(translateError(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChangesOnly = async () => {
    if (!impactAnalysis) {
      setError('Kör påverkananalys innan du sparar');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Save recipe change to history
      await impactAnalysisService.saveRecipeChange(
        recipe.recipe_id,
        editedRecipe,
        'Batch-redigering utan prisändringar'
      );

      // Perform batch update without price suggestions
      const result = await impactAnalysisService.performBatchRecipeUpdate(
        recipe.recipe_id,
        editedRecipe,
        false,
        []
      );

      if (result.success) {
        onUpdate(result.updated_recipe);
        onClose();
      } else {
        setError(result.errors.join(', '));
      }
    } catch (err) {
      console.error('Failed to save changes:', err);
      const errorMessage = err instanceof Error ? err.message : 'Kunde inte spara ändringar';
      setError(translateError(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return `${amount.toFixed(2)} kr`;
  };

  const formatPercentage = (percentage: number): string => {
    return `${percentage.toFixed(1)}%`;
  };

  const getRiskColor = (riskLevel: string): string => {
    switch (riskLevel) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="batch-recipe-editor">
        <div className="modal-header">
          <h2>Batch-redigering: {recipe.name}</h2>
          <div className="header-actions">
            <button
              className="btn btn--small btn--secondary"
              onClick={() => setIsVersionHistoryOpen(true)}
              title="Visa versionshistorik"
            >
              📜 Versioner
            </button>
            <button
              className="btn btn--small btn--secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-banner">
              <span>⚠️ {error}</span>
            </div>
          )}

          {/* Version History */}
          {false && (
            <div className="version-history">
              <h3>Ändringshistorik</h3>
              {versionHistory.length === 0 ? (
                <p>Ingen tidigare historik</p>
              ) : (
                <div className="history-list">
                  {versionHistory.slice(0, 5).map((change, index) => (
                    <div key={index} className="history-item">
                      <div className="history-meta">
                        <span className="history-index">#{index + 1}</span>
                        <span className="history-reason">{change.reason || 'Ändringar'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="editor-layout">
            {/* Recipe Editor Section */}
            <div className="recipe-editor-section">
              <h3>Receptändringar</h3>

              <div className="form-group">
                <label htmlFor="recipeName">Receptnamn</label>
                <input
                  id="recipeName"
                  type="text"
                  value={editedRecipe.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="recipeDescription">Beskrivning</label>
                <textarea
                  id="recipeDescription"
                  value={editedRecipe.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="form-control"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="recipeServings">Antal portioner</label>
                <input
                  id="recipeServings"
                  type="number"
                  min="1"
                  value={editedRecipe.servings}
                  onChange={(e) => handleInputChange('servings', parseInt(e.target.value) || 1)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Ingredienser</label>
                <div className="ingredients-list">
                  {(editedRecipe.ingredients || []).map((ingredient, index) => (
                    <div key={index} className="ingredient-item">
                      <input
                        type="text"
                        placeholder="Ingrediens ID"
                        value={ingredient.ingredient_id}
                        onChange={(e) => handleIngredientChange(index, 'ingredient_id', e.target.value)}
                        className="form-control ingredient-id"
                      />
                      <input
                        type="number"
                        placeholder="Mängd"
                        value={ingredient.quantity}
                        onChange={(e) => handleIngredientChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="form-control ingredient-quantity"
                        step="0.1"
                      />
                      <input
                        type="text"
                        placeholder="Enhet"
                        value={ingredient.unit}
                        onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                        className="form-control ingredient-unit"
                      />
                      <button
                        className="btn btn--small btn--danger"
                        onClick={() => removeIngredient(index)}
                        title="Ta bort ingrediens"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn btn--secondary"
                    onClick={addIngredient}
                  >
                    + Lägg till ingrediens
                  </button>
                </div>
              </div>

              <div className="editor-actions">
                <button
                  className="btn btn--primary"
                  onClick={performImpactAnalysis}
                  disabled={isAnalyzing || !hasChanges()}
                >
                  {isAnalyzing ? '🔄 Analyserar...' : '🔍 Analysera påverkan'}
                </button>
              </div>
            </div>

            {/* Impact Analysis Section */}
            {showImpactAnalysis && impactAnalysis && (
              <div className="impact-analysis-section">
                <h3>Påverkananalys</h3>

                <div className="impact-summary">
                  <div className="summary-stats">
                    <div className="stat">
                      <span className="stat-label">Påverkade maträtter</span>
                      <span className="stat-value">{impactAnalysis.total_affected_items}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Kostnadsförändring</span>
                      <span className="stat-value" style={{
                        color: impactAnalysis.cost_difference >= 0 ? '#dc3545' : '#28a745'
                      }}>
                        {impactAnalysis.cost_difference >= 0 ? '+' : ''}{formatCurrency(impactAnalysis.cost_difference)}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Högrisk-maträtter</span>
                      <span className="stat-value" style={{ color: getRiskColor('high') }}>
                        {impactAnalysis.high_risk_items.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Affected Menu Items */}
                {impactAnalysis.affected_menu_items.length > 0 && (
                  <div className="affected-items">
                    <h4>Påverkade maträtter</h4>
                    <div className="items-list">
                      {impactAnalysis.affected_menu_items.map((item) => (
                        <div key={item.menu_item_id} className="affected-item">
                          <div className="item-header">
                            <span className="item-name">{item.name}</span>
                            <span
                              className="risk-badge"
                              style={{ backgroundColor: getRiskColor(item.risk_level) }}
                            >
                              {item.risk_level.toUpperCase()}
                            </span>
                          </div>
                          <div className="item-details">
                            <div className="detail">
                              <span>Nuvarande marginal:</span>
                              <span>{formatPercentage(item.current_margin_percentage)}</span>
                            </div>
                            <div className="detail">
                              <span>Ny marginal:</span>
                              <span style={{
                                color: item.estimated_new_margin_percentage < item.current_margin_percentage ? '#dc3545' : '#28a745'
                              }}>
                                {formatPercentage(item.estimated_new_margin_percentage)}
                              </span>
                            </div>
                            <div className="detail">
                              <span>Kostnadsökning:</span>
                              <span>{formatCurrency(item.cost_increase)} ({formatPercentage(item.cost_increase_percentage)})</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price Suggestions */}
                {impactAnalysis.price_suggestions.length > 0 && (
                  <div className="price-suggestions">
                    <div className="suggestions-header">
                      <h4>Prisförslag ({impactAnalysis.price_suggestions.length})</h4>
                      <button
                        className="btn btn--primary"
                        onClick={() => setIsPriceModalOpen(true)}
                        title="Öppna bulk prisjusteringar"
                      >
                        💰 Hantera prisförslag
                      </button>
                    </div>

                    <div className="suggestions-preview">
                      <p>
                        {impactAnalysis.price_suggestions.length} prisförslag tillgängliga för att
                        bibehålla lönsamma marginaler. Klicka på "Hantera prisförslag" för att granska och välja vilka som ska tillämpas.
                      </p>

                      <div className="suggestions-stats">
                        <div className="stat-item">
                          <span className="stat-label">Genomsnittligt förtroende:</span>
                          <span className="stat-value">
                            {(impactAnalysis.price_suggestions.reduce((sum, s) => sum + s.confidence_score, 0) / impactAnalysis.price_suggestions.length * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Total prisökning:</span>
                          <span className="stat-value">
                            +{formatCurrency(impactAnalysis.price_suggestions.reduce((sum, s) => sum + s.price_increase, 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
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

          {impactAnalysis && (
            <>
              <button
                className="btn btn--primary"
                onClick={handleSaveChangesOnly}
                disabled={isLoading}
              >
                {isLoading ? 'Sparar...' : 'Spara receptändringar'}
              </button>

              {impactAnalysis.price_suggestions.length > 0 && (
                <button
                  className="btn btn--warning"
                  onClick={() => setIsPriceModalOpen(true)}
                  disabled={isLoading}
                  title="Öppna prisförslagsmodal för batch-uppdatering"
                >
                  💰 Spara med prisförslag
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Recipe Version History Modal */}
      <RecipeVersionHistory
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        recipeId={recipe.recipe_id}
        recipeName={recipe.name}
      />

      {/* Price Adjustment Modal */}
      {impactAnalysis && (
        <PriceAdjustmentModal
          isOpen={isPriceModalOpen}
          onClose={() => setIsPriceModalOpen(false)}
          suggestions={impactAnalysis.price_suggestions}
          affectedItems={impactAnalysis.affected_menu_items}
          onApply={handleApplyPriceSuggestions}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}