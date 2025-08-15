import React, { useEffect, useState } from 'react';
import { RecipeForm } from '../components/Recipes/RecipeForm';
import { MetricsCard } from '../components/MetricsCard';
import { SearchableTable, TableColumn } from '../components/SearchableTable';
import { EmptyState } from '../components/EmptyState';
import { OrganizationSelector } from '../components/Organizations/OrganizationSelector';
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

  const formatTime = (minutes?: number): string => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  };

  const columns: TableColumn[] = [
    { key: 'name', label: 'Recept', sortable: true },
    { key: 'servings', label: 'Portioner', sortable: true },
    { key: 'cost_per_serving', label: 'Kostnad/portion', sortable: true },
    { key: 'total_cost', label: 'Total kostnad', sortable: true },
    { key: 'prep_time', label: 'Förberedelse', sortable: true },
    { key: 'cook_time', label: 'Tillagning', sortable: true },
  ];

  // Transform recipes for the table
  const tableData = recipes.map(recipe => ({
    name: recipe.name,
    servings: recipe.servings.toString(),
    cost_per_serving: recipe.cost_per_serving ? `${recipe.cost_per_serving.toFixed(2)} kr` : '-',
    total_cost: recipe.total_cost ? `${recipe.total_cost.toFixed(2)} kr` : '-',
    prep_time: formatTime(recipe.prep_time_minutes),
    cook_time: formatTime(recipe.cook_time_minutes),
    description: recipe.description,
  }));

  // Calculate metrics
  const activeRecipes = recipes.filter(recipe => recipe.is_active);
  const avgCostPerServing = activeRecipes.length > 0 
    ? activeRecipes.reduce((sum, recipe) => sum + (recipe.cost_per_serving || 0), 0) / activeRecipes.length 
    : 0;
  
  const mostExpensive = activeRecipes.reduce((most, recipe) => 
    (recipe.cost_per_serving || 0) > (most?.cost_per_serving || 0) ? recipe : most, null as Recipe | null);
  
  const cheapest = activeRecipes.reduce((least, recipe) => 
    (recipe.cost_per_serving || 0) < (least?.cost_per_serving || 0) ? recipe : least, null as Recipe | null);
  
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
        <button 
          className="btn btn--primary"
          onClick={() => setIsFormOpen(true)}
          disabled={atRecipeLimit}
        >
          <span>+</span> Nytt Recept
        </button>
      </PageHeader>

      <div className="dashboard-content">
        <OrganizationSelector />
        
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        {atRecipeLimit && (
          <div className="warning-banner">
            <span>⚠️ Du har nått gränsen för recept (5/5). Uppgradera för att skapa fler recept.</span>
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
            subtitle={cheapest ? `${cheapest.cost_per_serving?.toFixed(2)} kr/portion` : undefined}
            color="success"
          />
          <MetricsCard
            icon="💸"
            title="DYRASTE RECEPT"
            value={mostExpensive ? mostExpensive.name : "Inget recept"}
            subtitle={mostExpensive ? `${mostExpensive.cost_per_serving?.toFixed(2)} kr/portion` : undefined}
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
                  {cheapest && mostExpensive && cheapest.cost_per_serving !== undefined && mostExpensive.cost_per_serving !== undefined
                    ? `${cheapest.cost_per_serving.toFixed(2)} - ${mostExpensive.cost_per_serving.toFixed(2)} kr`
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
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateRecipe}
        isLoading={isLoading}
      />
    </div>
  );
}