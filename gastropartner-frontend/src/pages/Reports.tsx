import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { MetricsCard } from '../components/MetricsCard';
import { SearchableTable, TableColumn } from '../components/SearchableTable';
import { EmptyState } from '../components/EmptyState';
import { useTranslation } from '../localization/sv';
import { formatCurrency } from '../utils/formatting';
import { apiClient, ProfitabilityReport, ProductProfitability, SalesReport } from '../utils/api';

export function Reports() {
  const { translateError } = useTranslation();
  const [profitabilityReport, setProfitabilityReport] = useState<ProfitabilityReport | null>(null);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [productProfitability, setProductProfitability] = useState<ProductProfitability[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of current month
    end_date: new Date().toISOString().split('T')[0], // Today
  });

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const startDateTime = `${dateRange.start_date}T00:00:00Z`;
      const endDateTime = `${dateRange.end_date}T23:59:59Z`;

      const [profitability, sales, products] = await Promise.all([
        apiClient.getProfitabilityReport(startDateTime, endDateTime),
        apiClient.getSalesReport(startDateTime, endDateTime),
        apiClient.getProductProfitability(startDateTime, endDateTime, 10),
      ]);

      setProfitabilityReport(profitability);
      setSalesReport(sales);
      setProductProfitability(products);
      setError('');
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError('Kunde inte ladda rapporter');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleDateRangeChange = (field: 'start_date' | 'end_date', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  // Product profitability table columns
  const productColumns: TableColumn[] = [
    {
      key: 'product_name',
      label: 'Produkt',
      render: (value, product) => product.product_name
    },
    {
      key: 'product_type',
      label: 'Typ',
      render: (value, product) => product.product_type === 'recipe' ? 'Recept' : 'Matträtt'
    },
    {
      key: 'units_sold',
      label: 'Sålt antal',
      render: (value, product) => product.units_sold.toString()
    },
    {
      key: 'revenue',
      label: 'Intäkter',
      render: (value, product) => formatCurrency(product.revenue)
    },
    {
      key: 'estimated_cost',
      label: 'Uppskattad kostnad',
      render: (value, product) => formatCurrency(product.estimated_cost)
    },
    {
      key: 'profit',
      label: 'Vinst',
      render: (value, product) => formatCurrency(product.profit)
    },
    {
      key: 'profit_margin_percentage',
      label: 'Marginal %',
      render: (value, product) => `${product.profit_margin_percentage.toFixed(1)}%`
    },
  ];

  // Daily breakdown table columns
  const dailyColumns: TableColumn[] = [
    {
      key: 'date',
      label: 'Datum',
      render: (value, day) => new Date(day.date).toLocaleDateString('sv-SE')
    },
    {
      key: 'sales',
      label: 'Antal försäljningar',
      render: (value, day) => day.sales.toString()
    },
    {
      key: 'revenue',
      label: 'Intäkter',
      render: (value, day) => formatCurrency(day.revenue)
    },
  ];

  return (
    <div className="main-content">
      <PageHeader 
        title="📊 Rapporter" 
        subtitle="Lönsamhetsanalys och försäljningsrapporter"
      />

      {error && (
        <div className="alert alert--error">
          {translateError(error)}
        </div>
      )}

      {/* Date Range Selection */}
      <div className="filter-section">
        <div className="filter-group">
          <label htmlFor="start_date">Från datum:</label>
          <input
            type="date"
            id="start_date"
            value={dateRange.start_date}
            onChange={(e) => handleDateRangeChange('start_date', e.target.value)}
            className="form__input"
          />
        </div>
        <div className="filter-group">
          <label htmlFor="end_date">Till datum:</label>
          <input
            type="date"
            id="end_date"
            value={dateRange.end_date}
            onChange={(e) => handleDateRangeChange('end_date', e.target.value)}
            className="form__input"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Laddar rapporter...</p>
        </div>
      ) : (
        <>
          {/* Profitability Overview */}
          {profitabilityReport && (
            <div className="metrics-grid">
              <MetricsCard
                title="Total omsättning"
                value={formatCurrency(profitabilityReport.total_revenue)}
                trend={profitabilityReport.total_revenue > 0 ? 'up' : 'neutral'}
                icon="💰"
              />
              <MetricsCard
                title="Uppskattad kostnad"
                value={formatCurrency(profitabilityReport.total_cost)}
                trend="neutral"
                icon="💸"
              />
              <MetricsCard
                title="Vinst"
                value={formatCurrency(profitabilityReport.profit)}
                trend={profitabilityReport.profit > 0 ? 'up' : 'down'}
                icon="📈"
              />
              <MetricsCard
                title="Vinstmarginal"
                value={`${profitabilityReport.profit_margin_percentage.toFixed(1)}%`}
                trend={profitabilityReport.profit_margin_percentage > 30 ? 'up' : profitabilityReport.profit_margin_percentage > 15 ? 'neutral' : 'down'}
                icon="📊"
              />
              <MetricsCard
                title="Antal försäljningar"
                value={profitabilityReport.total_sales_count.toString()}
                trend="up"
                icon="🧾"
              />
              <MetricsCard
                title="Genomsnittligt köp"
                value={formatCurrency(profitabilityReport.average_sale_value)}
                trend="neutral"
                icon="🛒"
              />
            </div>
          )}

          {/* Product Profitability */}
          <div className="reports-section">
            <h2>Produktlönsamhet</h2>
            {productProfitability.length > 0 ? (
              <SearchableTable
                data={productProfitability}
                columns={productColumns}
                searchPlaceholder="Sök produkter..."
              />
            ) : (
              <EmptyState
                icon="📊"
                title="Ingen produktdata tillgänglig"
                description="Det finns ingen försäljningsdata för den valda perioden."
              />
            )}
          </div>

          {/* Daily Sales Breakdown */}
          {salesReport && (
            <div className="reports-section">
              <h2>Daglig försäljning</h2>
              {salesReport.daily_breakdown.length > 0 ? (
                <SearchableTable
                  data={salesReport.daily_breakdown}
                  columns={dailyColumns}
                  searchPlaceholder="Sök datum..."
                />
              ) : (
                <EmptyState
                  icon="📅"
                  title="Ingen daglig data tillgänglig"
                  description="Det finns ingen försäljningsdata för den valda perioden."
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}