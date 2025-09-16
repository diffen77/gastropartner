import React, { useEffect, useState } from 'react';
import { MetricsCard } from '../MetricsCard';
import { SearchableTable, TableColumn } from '../SearchableTable';
import { EmptyState } from '../EmptyState';
import { IngredientForm } from '../Ingredients/IngredientForm';
import { useTranslation } from '../../localization/sv';
import { formatCostPerUnit, formatCurrency } from '../../utils/formatting';
import { apiClient, Ingredient, IngredientCreate } from '../../utils/api';
import { TabContentProps } from '../../pages/RecipeManagement';
import { useRecipeManagement } from '../../contexts/RecipeManagementContext';

export function IngredientsTab({ isActive }: TabContentProps) {
  const { translateError } = useTranslation();
  const {
    ingredients,
    isLoading: { ingredients: isLoading },
    errors: { ingredients: contextError },
    loadIngredients,
    onIngredientChange,
  } = useRecipeManagement();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<string>('');
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    ingredient: Ingredient | null;
  }>({ isOpen: false, ingredient: null });

  // Load ingredients when tab becomes active
  useEffect(() => {
    if (isActive) {
      loadIngredients();
    }
  }, [isActive, loadIngredients]);

  // Use context error or local error
  const displayError = contextError || error;

  const handleSubmitIngredient = async (data: IngredientCreate) => {
    try {
      if (editingIngredient) {
        // Update existing ingredient
        await apiClient.updateIngredient(editingIngredient.ingredient_id, data);
      } else {
        // Create new ingredient
        await apiClient.createIngredient(data);
      }
      // Use context's ingredient change handler to update all related data
      await onIngredientChange();
      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod';
      const translatedError = translateError(errorMessage);
      setError(translatedError);
      throw err; // Re-throw to let the form handle it
    }
  };

  const handleEditIngredient = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setIsFormOpen(true);
  };

  const handleDeleteIngredient = (ingredient: Ingredient) => {
    setDeleteConfirmation({ isOpen: true, ingredient });
  };

  const confirmDeleteIngredient = async () => {
    if (!deleteConfirmation.ingredient) return;

    try {
      await apiClient.deleteIngredient(deleteConfirmation.ingredient.ingredient_id);
      // Use context's ingredient change handler to update all related data
      await onIngredientChange();
      setError('');
      setDeleteConfirmation({ isOpen: false, ingredient: null });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod';
      const translatedError = translateError(errorMessage);
      setError(translatedError);
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
          <div className="recipe-actions">
            <button
              className="btn btn--small btn--secondary"
              onClick={(e) => {
                e.stopPropagation();
                handleEditIngredient(ingredient);
              }}
              title="Redigera ingrediens"
            >
              Redigera
            </button>
            <button
              className="btn btn--small btn--danger"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteIngredient(ingredient);
              }}
              title="Ta bort ingrediens"
            >
              Ta bort
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
    cost_per_unit: formatCostPerUnit(ingredient.cost_per_unit, ingredient.unit),
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

  if (!isActive) return null;

  return (
    <div className="ingredients-tab">
      {displayError && (
        <div className="error-banner">
          <span>⚠️ {displayError}</span>
        </div>
      )}

      {/* Action Header */}
      <div className="tab-actions">
        <button
          className="btn btn--primary"
          onClick={() => setIsFormOpen(true)}
        >
          <span>+</span> Ny Ingrediens
        </button>
      </div>

      {/* Status Overview */}
      <div className="modules-status">
        <div className="modules-status__item">
          <span className="modules-status__count">{activeIngredients.length}</span>
          <span className="modules-status__label">Aktiva ingredienser</span>
        </div>
        <div className="modules-status__item">
          <span className="modules-status__count">{categories.length}</span>
          <span className="modules-status__label">Kategorier</span>
        </div>
        <div className="modules-status__item">
          <span className="modules-status__count">{avgCost > 0 ? formatCurrency(avgCost) : "0 kr"}</span>
          <span className="modules-status__label">Genomsnittskostnad</span>
        </div>
      </div>

      {/* Enhanced Metrics Grid */}
      <div className="modules-section">
        <h2>Översikt</h2>
        <div className="modules-grid">
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
            value={avgCost > 0 ? formatCurrency(avgCost) : formatCurrency(0)}
            subtitle="Per enhet"
            color={avgCost > 50 ? "warning" : "success"}
          />
          <MetricsCard
            icon="📈"
            title="DYRASTE INGREDIENS"
            value={mostExpensive ? mostExpensive.name : "Ingen data"}
            subtitle={mostExpensive ? formatCostPerUnit(mostExpensive.cost_per_unit, mostExpensive.unit) : undefined}
            color="danger"
          />
          <MetricsCard
            icon="💸"
            title="BILLIGASTE INGREDIENS"
            value={cheapest ? cheapest.name : "Ingen data"}
            subtitle={cheapest ? formatCostPerUnit(cheapest.cost_per_unit, cheapest.unit) : undefined}
            color="success"
          />
        </div>
      </div>

      {/* Ingredients Table */}
      <div className="modules-section">
        <h2>Alla Ingredienser</h2>
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

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Bekräfta borttagning</h3>
            </div>
            <div className="modal-body">
              <p>Är du säker på att du vill ta bort ingrediensen <strong>"{deleteConfirmation.ingredient?.name}"</strong>?</p>
              <p>Denna åtgärd kan inte ångras.</p>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn--secondary"
                onClick={() => setDeleteConfirmation({ isOpen: false, ingredient: null })}
                disabled={isLoading}
              >
                Avbryt
              </button>
              <button
                className="btn btn--danger"
                onClick={confirmDeleteIngredient}
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