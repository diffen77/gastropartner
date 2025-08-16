import React, { useEffect, useState } from 'react';
import { OrganizationSelector } from '../components/Organizations/OrganizationSelector';
import { MetricsCard } from '../components/MetricsCard';
import { SearchableTable, TableColumn } from '../components/SearchableTable';
import { EmptyState } from '../components/EmptyState';
import { IngredientForm } from '../components/Ingredients/IngredientForm';
import { apiClient, Ingredient, IngredientCreate, IngredientUpdate } from '../utils/api';

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

export function Ingredients() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);

  const loadIngredients = async () => {
    try {
      const items = await apiClient.getIngredients();
      setIngredients(items);
      setError('');
    } catch (err) {
      console.error('Failed to load ingredients:', err);
      setError('Kunde inte ladda ingredienser');
    }
  };

  useEffect(() => {
    loadIngredients();
  }, []);

  const handleSubmitIngredient = async (data: IngredientCreate) => {
    setIsLoading(true);
    try {
      if (editingIngredient) {
        // Update existing ingredient
        await apiClient.updateIngredient(editingIngredient.ingredient_id, data);
      } else {
        // Create new ingredient
        await apiClient.createIngredient(data);
      }
      await loadIngredients(); // Reload the list
      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod';
      setError(errorMessage);
      throw err; // Re-throw to let the form handle it
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditIngredient = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setIsFormOpen(true);
  };

  const handleDeleteIngredient = async (ingredient: Ingredient) => {
    if (!window.confirm(`Är du säker på att du vill ta bort "${ingredient.name}"?`)) {
      return;
    }

    try {
      await apiClient.deleteIngredient(ingredient.ingredient_id);
      await loadIngredients(); // Reload the list
      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod';
      setError(errorMessage);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingIngredient(null);
  };

  const columns: TableColumn[] = [
    { key: 'name', label: 'Namn', sortable: true },
    { key: 'category', label: 'Kategori', sortable: true },
    { key: 'cost_per_unit', label: 'Kostnad', sortable: true },
    { key: 'unit', label: 'Enhet', sortable: true },
    { key: 'supplier', label: 'Leverantör', sortable: true },
    { 
      key: 'actions', 
      label: 'Åtgärder', 
      sortable: false,
      render: (_, row) => {
        // Find the original ingredient from the row data
        const ingredient = ingredients.find(ing => ing.name === row.name && ing.category === row.category);
        if (!ingredient) return null;

        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn--small btn--secondary"
              onClick={(e) => {
                e.stopPropagation();
                handleEditIngredient(ingredient);
              }}
              title="Redigera ingrediens"
            >
              ✏️
            </button>
            <button
              className="btn btn--small btn--danger"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteIngredient(ingredient);
              }}
              title="Ta bort ingrediens"
            >
              🗑️
            </button>
          </div>
        );
      }
    },
  ];

  // Transform ingredients for the table
  const tableData = ingredients.map(ingredient => ({
    name: ingredient.name,
    category: ingredient.category,
    cost_per_unit: `${Number(ingredient.cost_per_unit).toFixed(2)} kr/${ingredient.unit}`,
    unit: ingredient.unit,
    supplier: ingredient.supplier || '-',
  }));

  // Calculate metrics
  const activeIngredients = ingredients.filter(item => item.is_active);
  const categories = Array.from(new Set(activeIngredients.map(item => item.category)));
  
  const avgCost = activeIngredients.length > 0 
    ? activeIngredients.reduce((sum, item) => sum + Number(item.cost_per_unit), 0) / activeIngredients.length 
    : 0;
  
  const mostExpensive = activeIngredients.reduce((max, item) => 
    Number(item.cost_per_unit) > Number(max?.cost_per_unit || 0) ? item : max, null as Ingredient | null);
  
  const cheapest = activeIngredients.reduce((min, item) => 
    Number(item.cost_per_unit) < Number(min?.cost_per_unit || Infinity) ? item : min, null as Ingredient | null);

  return (
    <div className="main-content">
      <PageHeader 
        title="Ingredienser" 
        subtitle="Hantera dina råvaror och kostnad per enhet"
      >
        <button 
          className="btn btn--primary"
          onClick={() => setIsFormOpen(true)}
        >
          <span>+</span> Ny Ingrediens
        </button>
      </PageHeader>

      <div className="dashboard-content">
        <OrganizationSelector />
        
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}
        
        <div className="metrics-grid">
          <MetricsCard
            icon="📦"
            title="TOTALT ANTAL"
            value={activeIngredients.length.toString()}
            subtitle={`${categories.length} kategorier`}
            color="primary"
          />
          <MetricsCard
            icon="💰"
            title="GENOMSNITTLIG KOSTNAD"
            value={avgCost > 0 ? `${avgCost.toFixed(2)} kr` : "0 kr"}
            subtitle="Per enhet"
            color={avgCost > 50 ? "warning" : "success"}
          />
          <MetricsCard
            icon="📈"
            title="DYRASTE INGREDIENS"
            value={mostExpensive ? mostExpensive.name : "Ingen data"}
            subtitle={mostExpensive ? `${Number(mostExpensive.cost_per_unit).toFixed(2)} kr/${mostExpensive.unit}` : undefined}
            color="danger"
          />
          <MetricsCard
            icon="💸"
            title="BILLIGASTE INGREDIENS"
            value={cheapest ? cheapest.name : "Ingen data"}
            subtitle={cheapest ? `${Number(cheapest.cost_per_unit).toFixed(2)} kr/${cheapest.unit}` : undefined}
            color="success"
          />
        </div>

        <div className="table-section">
          {tableData.length === 0 ? (
            <EmptyState
              icon="🥬"
              title="Inga ingredienser än"
              description="Lägg till dina första ingredienser för att börja bygga recept och beräkna kostnader"
              actionLabel="Lägg till Ingrediens"
              onAction={() => setIsFormOpen(true)}
            />
          ) : (
            <SearchableTable
              columns={columns}
              data={tableData}
              searchPlaceholder="Sök ingredienser..."
              emptyMessage="Inga ingredienser hittades"
            />
          )}
        </div>
      </div>

      <IngredientForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmitIngredient}
        isLoading={isLoading}
        editingIngredient={editingIngredient}
      />
    </div>
  );
}