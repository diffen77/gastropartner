import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { MetricsCard } from '../components/MetricsCard';
import { SearchableTable, TableColumn } from '../components/SearchableTable';
import { EmptyState } from '../components/EmptyState';
import { OrganizationSelector } from '../components/Organizations/OrganizationSelector';
import { apiClient, MenuItem } from '../utils/api';
import { useFreemium } from '../hooks/useFreemium';
import { useTranslation } from '../localization/sv';

export function MenuItems() {
  const { getUsagePercentage } = useFreemium();
  const { translateError } = useTranslation();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  // Note: Recipes could be loaded here for future recipe-linking functionality
  const [error, setError] = useState<string>('');

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
  }, []);


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
      />

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

    </div>
  );
}