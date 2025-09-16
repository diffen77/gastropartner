import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { MetricsCard } from '../components/MetricsCard';
import { SearchableTable, TableColumn } from '../components/SearchableTable';
import { EmptyState } from '../components/EmptyState';
import { OrganizationSelector } from '../components/Organizations/OrganizationSelector';
import { apiClient, MenuItem, MenuItemCreate } from '../utils/api';
import { useFreemium } from '../hooks/useFreemium';
import { useTranslation } from '../localization/sv';
import { MenuItemForm } from '../components/MenuItems/MenuItemForm';

export function MenuItems() {
  const { getUsagePercentage } = useFreemium();
  const { translateError } = useTranslation();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    menuItem: MenuItem | null;
  }>({ isOpen: false, menuItem: null });

  const loadMenuItems = async () => {
    try {
      const items = await apiClient.getMenuItems();
      setMenuItems(items);
      setError('');
    } catch (err) {
      console.error('Failed to load menu items:', err);
      const errorMessage = err instanceof Error ? err.message : 'Kunde inte ladda maträtter';
      const translatedError = translateError(errorMessage);
      setError(translatedError);
    }
  };

  // Future: Load recipes for recipe-linking functionality

  useEffect(() => {
    loadMenuItems();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitMenuItem = async (data: MenuItemCreate) => {
    setIsLoading(true);
    try {
      if (editingMenuItem) {
        // Update existing menu item
        await apiClient.updateMenuItem(editingMenuItem.menu_item_id, data);
      } else {
        // Create new menu item
        await apiClient.createMenuItem(data);
      }
      await loadMenuItems(); // Reload the list
      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod';
      const translatedError = translateError(errorMessage);
      setError(translatedError);
      throw err; // Re-throw to let the form handle it
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingMenuItem(null);
  };

  const handleEditMenuItem = (menuItem: MenuItem) => {
    setEditingMenuItem(menuItem);
    setIsFormOpen(true);
  };

  const handleDeleteMenuItem = (menuItem: MenuItem) => {
    setDeleteConfirmation({ isOpen: true, menuItem });
  };

  const confirmDeleteMenuItem = async () => {
    if (!deleteConfirmation.menuItem) return;

    setIsLoading(true);
    try {
      await apiClient.deleteMenuItem(deleteConfirmation.menuItem.menu_item_id);
      await loadMenuItems(); // Reload the list
      setError('');
      setDeleteConfirmation({ isOpen: false, menuItem: null });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod';
      const translatedError = translateError(errorMessage);
      setError(translatedError);
    } finally {
      setIsLoading(false);
    }
  };


  const formatCurrency = (amount?: number | string): string => {
    if (!amount) return '0 kr';
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return '0 kr';
    return `${numericAmount.toFixed(2)} kr`;
  };

  const formatPercentage = (percentage?: number | string): string => {
    if (!percentage) return '0%';
    const numericPercentage = typeof percentage === 'string' ? parseFloat(percentage) : percentage;
    if (isNaN(numericPercentage)) return '0%';
    return `${numericPercentage.toFixed(1)}%`;
  };

  const columns: TableColumn[] = [
    { key: 'name', label: 'Maträtt', sortable: true },
    { key: 'category', label: 'Kategori', sortable: true },
    { key: 'selling_price', label: 'Pris', sortable: true },
    { key: 'food_cost_percentage', label: 'Råvarukostnad %', sortable: true },
    { key: 'margin', label: 'Marginal', sortable: true },
    { key: 'margin_percentage', label: 'Marginal %', sortable: true },
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
              handleEditMenuItem(row.originalMenuItem);
            }}
            title="Redigera maträtt"
          >
            Redigera
          </button>
          <button
            className="btn btn--small btn--danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteMenuItem(row.originalMenuItem);
            }}
            title="Ta bort maträtt"
          >
            Ta bort
          </button>
        </div>
      )
    },
  ];

  // Transform menu items for the table
  const tableData = menuItems.map(item => ({
    name: item.name,
    category: item.category,
    selling_price: formatCurrency(item.selling_price),
    food_cost_percentage: item.food_cost_percentage ? formatPercentage(item.food_cost_percentage) : '-',
    margin: item.margin ? formatCurrency(item.margin) : '-',
    margin_percentage: item.margin_percentage ? formatPercentage(item.margin_percentage) : '-',
    description: item.description,
    originalMenuItem: item, // Include original menu item for edit/delete operations
  }));

  // Calculate metrics
  const activeItems = menuItems.filter(item => item.is_active);
  const avgMarginPercentage = activeItems.length > 0 
    ? activeItems.reduce((sum, item) => {
        const marginPercentage = typeof item.margin_percentage === 'string' 
          ? parseFloat(item.margin_percentage) || 0 
          : item.margin_percentage || 0;
        return sum + marginPercentage;
      }, 0) / activeItems.length 
    : 0;
  
  const bestItem = activeItems.reduce((best, item) => {
    const itemMargin = typeof item.margin_percentage === 'string' 
      ? parseFloat(item.margin_percentage) || 0 
      : item.margin_percentage || 0;
    const bestMargin = best && typeof best.margin_percentage === 'string'
      ? parseFloat(best.margin_percentage) || 0
      : best?.margin_percentage || 0;
    return itemMargin > bestMargin ? item : best;
  }, null as MenuItem | null);
  
  const worstItem = activeItems.reduce((worst, item) => {
    const itemMargin = typeof item.margin_percentage === 'string' 
      ? parseFloat(item.margin_percentage) || 0 
      : item.margin_percentage || 0;
    const worstMargin = worst && typeof worst.margin_percentage === 'string'
      ? parseFloat(worst.margin_percentage) || 0
      : worst?.margin_percentage || 0;
    return itemMargin < worstMargin ? item : worst;
  }, null as MenuItem | null);
  
  const profitableCount = activeItems.filter(item => {
    const marginPercentage = typeof item.margin_percentage === 'string' 
      ? parseFloat(item.margin_percentage) || 0 
      : item.margin_percentage || 0;
    return marginPercentage > 30;
  }).length;
  
  const avgSellingPrice = activeItems.length > 0 
    ? activeItems.reduce((sum, item) => {
        const sellingPrice = typeof item.selling_price === 'string' 
          ? parseFloat(item.selling_price) || 0 
          : item.selling_price || 0;
        return sum + sellingPrice;
      }, 0) / activeItems.length 
    : 0;

  const menuItemUsagePercentage = getUsagePercentage('menu_items');

  return (
    <div className="main-content">
      <PageHeader 
        title="🍽️ Maträtter" 
        subtitle="Skapa maträtter från dina recept och optimera prissättning"
      >
        <button 
          className="btn btn--primary"
          onClick={() => setIsFormOpen(true)}
        >
          <span>+</span> Ny Maträtt
        </button>
      </PageHeader>

      <div className="modules-container">
        <OrganizationSelector />
        
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Status Overview */}
        <div className="modules-status">
          <div className="modules-status__item">
            <span className="modules-status__count">{activeItems.length}</span>
            <span className="modules-status__label">Aktiva maträtter</span>
          </div>
          <div className="modules-status__item">
            <span className="modules-status__count">{formatCurrency(avgSellingPrice)}</span>
            <span className="modules-status__label">Ø försäljningspris</span>
          </div>
          <div className="modules-status__item">
            <span className="modules-status__count">{avgMarginPercentage.toFixed(1)}%</span>
            <span className="modules-status__label">Genomsnittlig marginal</span>
          </div>
        </div>

        {/* Enhanced Metrics Grid */}
        <div className="modules-section">
          <h2>Översikt</h2>
          <div className="modules-grid">
            <MetricsCard
              icon="📊"
              title="GENOMSNITTLIG MARGINAL"
              value={`${avgMarginPercentage.toFixed(1)}%`}
              subtitle={`${formatCurrency(activeItems.reduce((sum, item) => {
                const margin = typeof item.margin === 'string' 
                  ? parseFloat(item.margin) || 0 
                  : item.margin || 0;
                return sum + margin;
              }, 0) / Math.max(activeItems.length, 1))} per portion`}
              color={avgMarginPercentage < 20 ? "danger" : avgMarginPercentage < 30 ? "warning" : "success"}
            />
            <MetricsCard
              icon="🏆"
              title="MEST LÖNSAM"
              value={bestItem ? bestItem.name : "Ingen data"}
              subtitle={bestItem ? `${formatPercentage(bestItem.margin_percentage)} marginal` : undefined}
              color="success"
            />
            <MetricsCard
              icon="📉"
              title="MINST LÖNSAM"
              value={worstItem ? worstItem.name : "Ingen data"}
              subtitle={worstItem ? `${formatPercentage(worstItem.margin_percentage)} marginal` : undefined}
              color="danger"
            />
            <MetricsCard
              icon="📋"
              title="MATRÄNDER ANVÄNDNING"
              value={`${activeItems.length}/2`}
              subtitle={`${menuItemUsagePercentage.toFixed(0)}% av limit`}
              color={menuItemUsagePercentage < 60 ? "success" : menuItemUsagePercentage < 90 ? "warning" : "danger"}
              trend={menuItemUsagePercentage > 80 ? "up" : "neutral"}
            />
          </div>
        </div>

        {/* Menu Items Table */}
        <div className="modules-section">
          <h2>Alla Maträtter</h2>
          <div className="table-section">
            {tableData.length === 0 ? (
              <EmptyState
                icon="🍽️"
                title="Inga maträtter än"
                description="Skapa dina första maträtter från recept för att analysera lönsamhet och optimera prissättning"
                actionLabel="Skapa Maträtt"
                onAction={() => setIsFormOpen(true)}
              />
            ) : (
              <SearchableTable
                columns={columns}
                data={tableData}
                searchPlaceholder="Sök maträtter..."
                emptyMessage="Inga maträtter hittades"
              />
            )}
          </div>
        </div>

        {/* Menu Statistics */}
        {activeItems.length > 0 && (
          <div className="modules-section">
            <h2>Detaljerad Statistik</h2>
            <div className="modules-status">
              <div className="modules-status__item">
                <span className="modules-status__count">{activeItems.length}</span>
                <span className="modules-status__label">Totalt antal maträtter</span>
              </div>
              <div className="modules-status__item">
                <span className="modules-status__count">{formatCurrency(avgSellingPrice)}</span>
                <span className="modules-status__label">Genomsnittligt pris</span>
              </div>
              <div className="modules-status__item">
                <span className="modules-status__count">{profitableCount}</span>
                <span className="modules-status__label">Lönsamma (&gt;30%)</span>
              </div>
              <div className="modules-status__item">
                <span className="modules-status__count">
                  {bestItem && worstItem && bestItem.margin_percentage !== undefined && worstItem.margin_percentage !== undefined
                    ? `${formatPercentage(worstItem.margin_percentage)} - ${formatPercentage(bestItem.margin_percentage)}`
                    : '-'
                  }
                </span>
                <span className="modules-status__label">Marginalspann</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <MenuItemForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmitMenuItem}
        isLoading={isLoading}
        editingMenuItem={editingMenuItem}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Bekräfta borttagning</h3>
            </div>
            <div className="modal-body">
              <p>Är du säker på att du vill ta bort maträtten <strong>"{deleteConfirmation.menuItem?.name}"</strong>?</p>
              <p>Denna åtgärd kan inte ångras.</p>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn--secondary"
                onClick={() => setDeleteConfirmation({ isOpen: false, menuItem: null })}
                disabled={isLoading}
              >
                Avbryt
              </button>
              <button
                className="btn btn--danger"
                onClick={confirmDeleteMenuItem}
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