import React, { useEffect, useState } from 'react';
import { RecipeForm } from '../Recipes/RecipeForm';
import { RecipeView } from '../Recipes/RecipeView';
import { MetricsCard } from '../MetricsCard';
import { SearchableTable, TableColumn } from '../SearchableTable';
import { EmptyState } from '../EmptyState';
import { useTranslation } from '../../localization/sv';
import { formatCurrency, formatPercentage } from '../../utils/formatting';
import { apiClient, Recipe, RecipeCreate } from '../../utils/api';
import { useFreemium } from '../../hooks/useFreemium';
import { TabContentProps } from '../../pages/RecipeManagement';
import { useRecipeManagement } from '../../contexts/RecipeManagementContext';

function RecipesTab({ isActive }: TabContentProps) {
  const { translateError } = useTranslation();
  const { getUsagePercentage, isAtLimit } = useFreemium();
  const {
    recipes,
    isLoading: { recipes: isLoading },
    errors: { recipes: contextError },
    loadRecipes,
    onRecipeChange,
  } = useRecipeManagement();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<string>('');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    recipe: Recipe | null;
  }>({ isOpen: false, recipe: null });
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);

  // Load recipes when tab becomes active
  useEffect(() => {
    if (isActive) {
      loadRecipes();
    }
  }, [isActive, loadRecipes]);

  // Use context error or local error
  const displayError = contextError || error;

  const handleCreateRecipe = async (data: RecipeCreate) => {
    try {
      await apiClient.createRecipe(data);
      // Use context's recipe change handler to update all related data
      await onRecipeChange();
      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod';
      const translatedError = translateError(errorMessage);
      setError(translatedError);
      throw err; // Re-throw to let the form handle it
    }
  };

  const handleUpdateRecipe = async (data: RecipeCreate) => {
    if (!editingRecipe) return;

    try {
      await apiClient.updateRecipe(editingRecipe.recipe_id, data);
      // Use context's recipe change handler to update all related data
      await onRecipeChange();
      setError('');
      setEditingRecipe(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod';
      const translatedError = translateError(errorMessage);
      setError(translatedError);
      throw err; // Re-throw to let the form handle it
    }
  };

  const confirmDeleteRecipe = async () => {
    if (!deleteConfirmation.recipe) return;

    try {
      await apiClient.deleteRecipe(deleteConfirmation.recipe.recipe_id);
      // Use context's recipe change handler to update all related data
      await onRecipeChange();
      setError('');
      setDeleteConfirmation({ isOpen: false, recipe: null });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod';
      const translatedError = translateError(errorMessage);
      setError(translatedError);
    }
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingRecipe(null);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsFormOpen(true);
    setViewingRecipe(null); // Close recipe view if open
  };

  const handleViewRecipe = (recipe: Recipe) => {
    setViewingRecipe(recipe);
  };

  const handleCloseRecipeView = () => {
    setViewingRecipe(null);
  };

  const handleDeleteRecipe = (recipe: Recipe) => {
    setDeleteConfirmation({ isOpen: true, recipe });
  };

  const columns: TableColumn[] = [
    { key: 'name', label: 'Recept', sortable: true },
    { key: 'servings', label: 'Portioner', sortable: true },
    { key: 'ingredients_count', label: 'Ingredienser', sortable: true },
    { key: 'cost_per_serving', label: 'Kostnad/portion', sortable: true },
    {
      key: 'actions',
      label: 'Åtgärder',
      sortable: false,
      render: (_, row) => (
        <div className="tab-actions">
          <button
            className="btn btn--small btn--secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleEditRecipe(row.originalRecipe);
            }}
            title="Redigera recept"
          >
            Redigera
          </button>
          <button
            className="btn btn--small btn--danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteRecipe(row.originalRecipe);
            }}
            title="Ta bort recept"
          >
            Ta bort
          </button>
        </div>
      )
    },
  ];

  // Transform recipes for the table
  const tableData = recipes.map(recipe => {
    const costPerServing = recipe.cost_per_serving ? parseFloat(recipe.cost_per_serving.toString()) : null;
    const ingredientsCount = recipe.ingredients?.length || 0;

    return {
      name: recipe.name,
      servings: recipe.servings.toString(),
      ingredients_count: ingredientsCount.toString(),
      cost_per_serving: costPerServing && !isNaN(costPerServing)
        ? formatCurrency(costPerServing)
        : '-',
      description: recipe.description,
      originalRecipe: recipe, // Include original recipe for edit/delete operations
    };
  });

  // Calculate metrics
  const activeRecipes = recipes.filter(recipe => recipe.is_active);
  const avgCostPerServing = activeRecipes.length > 0
    ? activeRecipes.reduce((sum, recipe) => {
        const cost = recipe.cost_per_serving ? parseFloat(recipe.cost_per_serving.toString()) : 0;
        return sum + (isNaN(cost) ? 0 : cost);
      }, 0) / activeRecipes.length
    : 0;

  const mostExpensive = activeRecipes.reduce((most, recipe) => {
    const recipeCost = recipe.cost_per_serving ? parseFloat(recipe.cost_per_serving.toString()) : 0;
    const mostCost = most && most.cost_per_serving ? parseFloat(most.cost_per_serving.toString()) : 0;
    const recipeValidCost = !isNaN(recipeCost) ? recipeCost : 0;
    const mostValidCost = !isNaN(mostCost) ? mostCost : 0;
    return recipeValidCost > mostValidCost ? recipe : most;
  }, null as Recipe | null);

  const cheapest = activeRecipes.reduce((least, recipe) => {
    const recipeCost = recipe.cost_per_serving ? parseFloat(recipe.cost_per_serving.toString()) : Infinity;
    const leastCost = least && least.cost_per_serving ? parseFloat(least.cost_per_serving.toString()) : Infinity;
    const recipeValidCost = !isNaN(recipeCost) ? recipeCost : Infinity;
    const leastValidCost = !isNaN(leastCost) ? leastCost : Infinity;
    return recipeValidCost < leastValidCost ? recipe : least;
  }, null as Recipe | null);

  const totalIngredients = activeRecipes.reduce((sum, recipe) =>
    sum + (recipe.ingredients?.length || 0), 0);

  const avgIngredients = activeRecipes.length > 0 ? Math.round(totalIngredients / activeRecipes.length) : 0;

  const recipeUsagePercentage = getUsagePercentage('recipes');
  const atRecipeLimit = isAtLimit('recipes');

  if (!isActive) return null;

  return (
    <div className="recipes-tab">
      <div className="tab-header">
        <div className="tab-header-actions">
          <button
            className="btn btn--primary"
            onClick={() => setIsFormOpen(true)}
            disabled={atRecipeLimit}
            title={atRecipeLimit ? "Du har nått receptgränsen. Uppgradera för fler recept." : "Skapa nytt recept"}
          >
            + Nytt Recept
          </button>
        </div>
      </div>

      {displayError && (
        <div className="error-banner">
          <span>⚠️ {displayError}</span>
        </div>
      )}

      {atRecipeLimit && (
        <div className="error-banner">
          <span>⚠️ Du har nått receptgränsen (5/5). Uppgradera till Premium för obegränsade recept.</span>
        </div>
      )}

      {/* Plan Status Information */}
      {!atRecipeLimit && recipeUsagePercentage > 60 && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1e40af',
          padding: 'var(--spacing-md)',
          borderRadius: 'var(--border-radius)',
          marginBottom: 'var(--spacing-lg)',
          fontWeight: '500'
        }}>
          <span>ℹ️ Du har använt {activeRecipes.length} av 5 tillgängliga recept ({formatPercentage(recipeUsagePercentage, 0)}). Uppgradera till Premium för obegränsade recept.</span>
        </div>
      )}

      {/* Status Overview */}
      <div className="modules-status">
        <div className="modules-status__item">
          <span className="modules-status__count">{activeRecipes.length}</span>
          <span className="modules-status__label">Aktiva recept</span>
        </div>
        <div className="modules-status__item">
          <span className="modules-status__count">{formatCurrency(avgCostPerServing)}</span>
          <span className="modules-status__label">Genomsnittskostnad</span>
        </div>
        <div className="modules-status__item">
          <span className="modules-status__count">{avgIngredients}</span>
          <span className="modules-status__label">Ø ingredienser/recept</span>
        </div>
      </div>

      {/* Enhanced Metrics Grid */}
      <div className="modules-section">
        <h2>Översikt</h2>
        <div className="modules-grid">
          <MetricsCard
            icon="💰"
            title="GENOMSNITTSKOSTNAD"
            value={formatCurrency(avgCostPerServing)}
            subtitle="per portion"
            color={avgCostPerServing < 30 ? "success" : avgCostPerServing < 60 ? "warning" : "danger"}
          />
          <MetricsCard
            icon="🏆"
            title="BILLIGASTE RECEPT"
            value={cheapest ? cheapest.name : "Inget recept"}
            subtitle={cheapest && cheapest.cost_per_serving
              ? formatCurrency(parseFloat(cheapest.cost_per_serving.toString())) + '/portion'
              : undefined}
            color="success"
          />
          <MetricsCard
            icon="💸"
            title="DYRASTE RECEPT"
            value={mostExpensive ? mostExpensive.name : "Inget recept"}
            subtitle={mostExpensive && mostExpensive.cost_per_serving
              ? formatCurrency(parseFloat(mostExpensive.cost_per_serving.toString())) + '/portion'
              : undefined}
            color="danger"
          />
          <MetricsCard
            icon="📋"
            title="RECEPTANVÄNDNING"
            value={`${activeRecipes.length}/5`}
            subtitle={`${formatPercentage(recipeUsagePercentage, 0)} av limit`}
            color={recipeUsagePercentage < 60 ? "success" : recipeUsagePercentage < 90 ? "warning" : "danger"}
            trend={recipeUsagePercentage > 80 ? "up" : "neutral"}
          />
        </div>
      </div>

      {/* Recipes Table */}
      <div className="modules-section">
        <h2>Alla Recept</h2>
        <div className="table-section">
          {tableData.length === 0 ? (
            <EmptyState
              icon="📝"
              title="Inga recept än"
              description="Skapa ditt första recept för att beräkna ingredienskostnader och portionskalkyler"
              actionLabel="Skapa Recept"
              onAction={() => setIsFormOpen(true)}
            />
          ) : (
            <SearchableTable
              columns={columns}
              data={tableData}
              searchPlaceholder="Sök recept..."
              emptyMessage="Inga recept hittades"
              onRowClick={(row) => handleViewRecipe(row.originalRecipe)}
            />
          )}
        </div>
      </div>

      {/* Recipe Statistics */}
      {activeRecipes.length > 0 && (
        <div className="modules-section">
          <h2>Detaljerad Statistik</h2>
          <div className="modules-status">
            <div className="modules-status__item">
              <span className="modules-status__count">{activeRecipes.length}</span>
              <span className="modules-status__label">Totalt antal recept</span>
            </div>
            <div className="modules-status__item">
              <span className="modules-status__count">{avgIngredients}</span>
              <span className="modules-status__label">Ø antal ingredienser</span>
            </div>
            <div className="modules-status__item">
              <span className="modules-status__count">{totalIngredients}</span>
              <span className="modules-status__label">Totala ingredienser</span>
            </div>
            <div className="modules-status__item">
              <span className="modules-status__count">
                {cheapest && mostExpensive &&
                 cheapest.cost_per_serving &&
                 mostExpensive.cost_per_serving
                  ? `${formatCurrency(parseFloat(cheapest.cost_per_serving.toString()))} - ${formatCurrency(parseFloat(mostExpensive.cost_per_serving.toString()))}`
                  : '-'
                }
              </span>
              <span className="modules-status__label">Kostnadsspann</span>
            </div>
          </div>
        </div>
      )}

      <RecipeForm
        isOpen={isFormOpen}
        onClose={closeForm}
        onSubmit={editingRecipe ? handleUpdateRecipe : handleCreateRecipe}
        isLoading={isLoading}
        editingRecipe={editingRecipe}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Bekräfta borttagning</h3>
            </div>
            <div className="modal-body">
              <p>Är du säker på att du vill ta bort receptet <strong>"{deleteConfirmation.recipe?.name}"</strong>?</p>
              <p>Denna åtgärd kan inte ångras.</p>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn--secondary"
                onClick={() => setDeleteConfirmation({ isOpen: false, recipe: null })}
                disabled={isLoading}
              >
                Avbryt
              </button>
              <button
                className="btn btn--danger"
                onClick={confirmDeleteRecipe}
                disabled={isLoading}
              >
                {isLoading ? 'Tar bort...' : 'Ta bort'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe View Modal */}
      {viewingRecipe && (
        <RecipeView
          recipe={viewingRecipe}
          onEdit={() => handleEditRecipe(viewingRecipe)}
          onClose={handleCloseRecipeView}
        />
      )}
    </div>
  );
}

export default RecipesTab;