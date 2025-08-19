import React, { useEffect, useState } from 'react';
import { RecipeForm } from '../components/Recipes/RecipeForm';
import { MetricsCard } from '../components/MetricsCard';
import { SearchableTable, TableColumn } from '../components/SearchableTable';
import { EmptyState } from '../components/EmptyState';
import { OrganizationSelector } from '../components/Organizations/OrganizationSelector';
import PlanStatusWidget from '../components/PlanStatusWidget';
import { apiClient, Recipe, RecipeCreate } from '../utils/api';
import { useFreemium } from '../hooks/useFreemium';

function PageHeader({ title, subtitle, children }: { 
  title: string; 
  subtitle?: string; 
  children?: React.ReactNode; 
}) {
  return (
    <div className="page-header">
      <div className="page-header__content">
        <div className="page-header__text">
          <h1 className="page-header__title">{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
        {children && (
          <div className="page-header__actions">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export function Recipes() {
  const { getUsagePercentage, isAtLimit } = useFreemium();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    recipe: Recipe | null;
  }>({ isOpen: false, recipe: null });

  const loadRecipes = async () => {
    try {
      const recipesData = await apiClient.getRecipes();
      setRecipes(recipesData);
      setError('');
    } catch (err) {
      console.error('Failed to load recipes:', err);
      setError('Kunde inte ladda recept');
    }
  };

  useEffect(() => {
    loadRecipes();
  }, []);

  const handleCreateRecipe = async (data: RecipeCreate) => {
    setIsLoading(true);
    try {
      await apiClient.createRecipe(data);
      await loadRecipes(); // Reload the list
      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod';
      setError(errorMessage);
      throw err; // Re-throw to let the form handle it
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRecipe = async (data: RecipeCreate) => {
    if (!editingRecipe) return;
    
    setIsLoading(true);
    try {
      await apiClient.updateRecipe(editingRecipe.recipe_id, data);
      await loadRecipes(); // Reload the list
      setError('');
      setEditingRecipe(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod';
      setError(errorMessage);
      throw err; // Re-throw to let the form handle it
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteRecipe = async () => {
    if (!deleteConfirmation.recipe) return;

    setIsLoading(true);
    try {
      await apiClient.deleteRecipe(deleteConfirmation.recipe.recipe_id);
      await loadRecipes(); // Reload the list
      setError('');
      setDeleteConfirmation({ isOpen: false, recipe: null });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingRecipe(null);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsFormOpen(true);
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
        <div className="recipe-actions">
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
        ? `${costPerServing.toFixed(2)} kr` 
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

  return (
    <div className="main-content">
      <PageHeader 
        title="Recept" 
        subtitle="Skapa recept och beräkna kostnader för dina rätter"
      >
        <div className="flex items-center space-x-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm">
            <span className="text-blue-900 font-medium">Plan: FREE</span>
            <span className="text-blue-700 ml-2">({activeRecipes.length}/5 recept)</span>
          </div>
          <button 
            className="btn btn--primary"
            onClick={() => setIsFormOpen(true)}
            disabled={atRecipeLimit}
            title={atRecipeLimit ? "Du har nått gränsen för FREE-planen. Uppgradera för fler recept." : "Skapa nytt recept"}
          >
            <span>+</span> Nytt Recept
          </button>
        </div>
      </PageHeader>

      <div className="dashboard-content">
        <OrganizationSelector />
        
        {/* Plan Status Widget */}
        <div className="mb-6">
          <PlanStatusWidget 
            plan="free" 
            showUpgradeButton={true}
            onUpgrade={() => alert('Upgrade funktionalitet kommer snart!')}
          />
        </div>
        
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        {atRecipeLimit && (
          <div className="warning-banner">
            <span>⚠️ Du har nått gränsen för recept på FREE-planen (5/5). Uppgradera till Premium för obegränsade recept.</span>
          </div>
        )}
        
        {/* Plan Status Information */}
        {!atRecipeLimit && recipeUsagePercentage > 60 && (
          <div className="info-banner" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
            <span>ℹ️ FREE-plan: Du har använt {activeRecipes.length} av 5 tillgängliga recept ({recipeUsagePercentage.toFixed(0)}%). Uppgradera till Premium för obegränsade recept.</span>
          </div>
        )}
        
        <div className="metrics-grid">
          <MetricsCard
            icon="💰"
            title="GENOMSNITTSKOSTNAD"
            value={`${avgCostPerServing.toFixed(2)} kr`}
            subtitle="per portion"
            color={avgCostPerServing < 30 ? "success" : avgCostPerServing < 60 ? "warning" : "danger"}
          />
          <MetricsCard
            icon="🏆"
            title="BILLIGASTE RECEPT"
            value={cheapest ? cheapest.name : "Inget recept"}
            subtitle={cheapest && cheapest.cost_per_serving 
              ? `${parseFloat(cheapest.cost_per_serving.toString()).toFixed(2)} kr/portion` 
              : undefined}
            color="success"
          />
          <MetricsCard
            icon="💸"
            title="DYRASTE RECEPT"
            value={mostExpensive ? mostExpensive.name : "Inget recept"}
            subtitle={mostExpensive && mostExpensive.cost_per_serving 
              ? `${parseFloat(mostExpensive.cost_per_serving.toString()).toFixed(2)} kr/portion` 
              : undefined}
            color="danger"
          />
          <MetricsCard
            icon="📋"
            title="RECEPTANVÄNDNING"
            value={`${activeRecipes.length}/5`}
            subtitle={`${recipeUsagePercentage.toFixed(0)}% av limit`}
            color={recipeUsagePercentage < 60 ? "success" : recipeUsagePercentage < 90 ? "warning" : "danger"}
            trend={recipeUsagePercentage > 80 ? "up" : "neutral"}
          />
        </div>

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
            />
          )}
        </div>

        {/* Recipe Statistics */}
        {activeRecipes.length > 0 && (
          <div className="stats-section">
            <h3>Receptstatistik</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Totalt antal recept:</span>
                <span className="stat-value">{activeRecipes.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Genomsnittligt antal ingredienser:</span>
                <span className="stat-value">{avgIngredients}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Totala ingredienser:</span>
                <span className="stat-value">{totalIngredients}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Kostnadsspann:</span>
                <span className="stat-value">
                  {cheapest && mostExpensive && 
                   cheapest.cost_per_serving && 
                   mostExpensive.cost_per_serving
                    ? `${parseFloat(cheapest.cost_per_serving.toString()).toFixed(2)} - ${parseFloat(mostExpensive.cost_per_serving.toString()).toFixed(2)} kr`
                    : '-'
                  }
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}