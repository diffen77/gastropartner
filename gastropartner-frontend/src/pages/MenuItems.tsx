import React, { useEffect, useState } from 'react';
import { MenuItemForm } from '../components/MenuItems/MenuItemForm';
import { MetricsCard } from '../components/MetricsCard';
import { SearchableTable, TableColumn } from '../components/SearchableTable';
import { EmptyState } from '../components/EmptyState';
import { OrganizationSelector } from '../components/Organizations/OrganizationSelector';
import { apiClient, MenuItem, MenuItemCreate } from '../utils/api';
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

export function MenuItems() {
  const { getUsagePercentage, isAtLimit } = useFreemium();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  // Note: Recipes could be loaded here for future recipe-linking functionality
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const loadMenuItems = async () => {
    try {
      const items = await apiClient.getMenuItems();
      setMenuItems(items);
      setError('');
    } catch (err) {
      console.error('Failed to load menu items:', err);
      setError('Kunde inte ladda maträtter');
    }
  };

  // Future: Load recipes for recipe-linking functionality

  useEffect(() => {
    loadMenuItems();
  }, []);

  const handleCreateMenuItem = async (data: MenuItemCreate) => {
    setIsLoading(true);
    try {
      await apiClient.createMenuItem(data);
      await loadMenuItems(); // Reload the list
      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod';
      setError(errorMessage);
      throw err; // Re-throw to let the form handle it
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount?: number): string => {
    if (!amount) return '0 kr';
    return `${amount.toFixed(2)} kr`;
  };

  const formatPercentage = (percentage?: number): string => {
    if (!percentage) return '0%';
    return `${percentage.toFixed(1)}%`;
  };

  const columns: TableColumn[] = [
    { key: 'name', label: 'Maträtt', sortable: true },
    { key: 'category', label: 'Kategori', sortable: true },
    { key: 'selling_price', label: 'Pris', sortable: true },
    { key: 'food_cost_percentage', label: 'Råvarukostnad %', sortable: true },
    { key: 'margin', label: 'Marginal', sortable: true },
    { key: 'margin_percentage', label: 'Marginal %', sortable: true },
  ];

  // Transform menu items for the table
  const tableData = menuItems.map(item => ({
    name: item.name,
    category: item.category,
    selling_price: formatCurrency(item.selling_price),
    food_cost_percentage: item.food_cost_percentage ? `${item.food_cost_percentage.toFixed(1)}%` : '-',
    margin: item.margin ? formatCurrency(item.margin) : '-',
    margin_percentage: item.margin_percentage ? `${item.margin_percentage.toFixed(1)}%` : '-',
    description: item.description,
  }));

  // Calculate metrics
  const activeItems = menuItems.filter(item => item.is_active);
  const avgMarginPercentage = activeItems.length > 0 
    ? activeItems.reduce((sum, item) => sum + (item.margin_percentage || 0), 0) / activeItems.length 
    : 0;
  
  const bestItem = activeItems.reduce((best, item) => 
    (item.margin_percentage || 0) > (best?.margin_percentage || 0) ? item : best, null as MenuItem | null);
  
  const worstItem = activeItems.reduce((worst, item) => 
    (item.margin_percentage || 0) < (worst?.margin_percentage || 0) ? item : worst, null as MenuItem | null);
  
  const profitableCount = activeItems.filter(item => (item.margin_percentage || 0) > 30).length;
  const avgSellingPrice = activeItems.length > 0 
    ? activeItems.reduce((sum, item) => sum + item.selling_price, 0) / activeItems.length 
    : 0;

  const menuItemUsagePercentage = getUsagePercentage('menu_items');
  const atMenuItemLimit = isAtLimit('menu_items');

  return (
    <div className="main-content">
      <PageHeader 
        title="Maträtter" 
        subtitle="Skapa maträtter från dina recept och optimera prissättning"
      >
        <button 
          className="btn btn--primary"
          onClick={() => setIsFormOpen(true)}
          disabled={atMenuItemLimit}
        >
          <span>+</span> Ny Maträtt
        </button>
      </PageHeader>

      <div className="dashboard-content">
        <OrganizationSelector />
        
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        {atMenuItemLimit && (
          <div className="warning-banner">
            <span>⚠️ Du har nått gränsen för maträtter (2/2). Uppgradera för att skapa fler maträtter.</span>
          </div>
        )}
        
        <div className="metrics-grid">
          <MetricsCard
            icon="📊"
            title="GENOMSNITTLIG MARGINAL"
            value={`${avgMarginPercentage.toFixed(1)}%`}
            subtitle={`${formatCurrency(activeItems.reduce((sum, item) => sum + (item.margin || 0), 0) / Math.max(activeItems.length, 1))} per portion`}
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

        {/* Menu Statistics */}
        {activeItems.length > 0 && (
          <div className="stats-section">
            <h3>Maträtterstatistik</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Totalt antal maträtter:</span>
                <span className="stat-value">{activeItems.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Genomsnittligt försäljningspris:</span>
                <span className="stat-value">{formatCurrency(avgSellingPrice)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Lönsamma maträtter (&gt;30% marginal):</span>
                <span className="stat-value">{profitableCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Marginalspann:</span>
                <span className="stat-value">
                  {bestItem && worstItem && bestItem.margin_percentage !== undefined && worstItem.margin_percentage !== undefined
                    ? `${worstItem.margin_percentage.toFixed(1)}% - ${bestItem.margin_percentage.toFixed(1)}%`
                    : '-'
                  }
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <MenuItemForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateMenuItem}
        isLoading={isLoading}
      />
    </div>
  );
}