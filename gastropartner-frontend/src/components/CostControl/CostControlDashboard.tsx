import React from 'react';
import { useCostControl } from '../../hooks/useCostControl';
import { useTranslation } from '../../localization/sv';
import { formatCurrency as swedishFormatCurrency, formatPercentage as swedishFormatPercentage } from '../../utils/formatting';
import './CostControlDashboard.css';

const CostControlDashboard: React.FC = () => {
  const { t } = useTranslation();
  const {
    dashboard,
    alerts, // Now populated from dashboard API to avoid duplicate calls
    loading,
    error,
    refresh,
    getHealthStatus,
    // formatCurrency: hookFormatCurrency, // Using Swedish formatting instead
    // formatPercentage: hookFormatPercentage, // Using Swedish formatting instead
  } = useCostControl();

  // Note: Period selection temporarily disabled to improve performance
  // const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>('30');

  if (loading && !dashboard) {
    return (
      <div className="cost-control-loading">
        <div className="loading-spinner"></div>
        <p>{t('loadingCostControlDashboard')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cost-control-error">
        <h3>{t('errorLoadingCostControl')}</h3>
        <p>{error}</p>
        <button onClick={refresh} className="btn btn-primary">
          {t('tryAgain')}
        </button>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const healthStatus = getHealthStatus();
  const healthColors = {
    excellent: '#10B981',
    good: '#3B82F6', 
    warning: '#F59E0B',
    critical: '#EF4444'
  };

  const getHealthStatusText = (status: string) => {
    switch (status) {
      case 'excellent': return t('excellent');
      case 'good': return t('good');
      case 'warning': return t('warning');
      case 'critical': return t('critical');
      default: return status;
    }
  };

  const getAlertTypeText = (type: string) => {
    switch (type) {
      case 'cost_spike': return t('costSpike');
      case 'margin_warning': return t('marginWarning');
      case 'budget_exceeded': return t('budgetExceeded');
      case 'usage_limit': return t('usageLimit');
      default: return type.replace('_', ' ').toUpperCase();
    }
  };

  return (
    <div className="cost-control-dashboard">
      <div className="dashboard-header">
        <h1>{t('costControlCenter')}</h1>
        <div className="header-actions">
          <span className="period-info">
            📊 {t('last30Days')} {/* Fixed 30-day period for optimal performance */}
          </span>
          <button onClick={refresh} className="btn btn-secondary">
            🔄 {t('refresh')}
          </button>
        </div>
      </div>

      {/* Health Status Bar */}
      <div className="health-status-bar" style={{ backgroundColor: healthColors[healthStatus] }}>
        <div className="health-content">
          <span className="health-icon">
            {healthStatus === 'excellent' && '🎯'}
            {healthStatus === 'good' && '✅'}
            {healthStatus === 'warning' && '⚠️'}
            {healthStatus === 'critical' && '🚨'}
          </span>
          <span className="health-text">
            {t('costControlHealth')}: <strong>{getHealthStatusText(healthStatus).toUpperCase()}</strong>
          </span>
          {dashboard.alerts.high_priority_alerts > 0 && (
            <span className="alert-badge">
              {dashboard.alerts.high_priority_alerts} {t('highPriorityAlerts')}
            </span>
          )}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card food-cost">
          <div className="metric-header">
            <h3>{t('foodCostPercentage')}</h3>
            <span className={`status ${dashboard.summary.food_cost_percentage <= 30 ? 'good' : 'warning'}`}>
              {dashboard.summary.food_cost_percentage <= 30 ? '🎯' : '⚠️'}
            </span>
          </div>
          <div className="metric-value">
{swedishFormatPercentage(dashboard.summary.food_cost_percentage)}
          </div>
          <div className="metric-target">
            {t('target')}: ≤30%
          </div>
        </div>

        <div className="metric-card margin">
          <div className="metric-header">
            <h3>{t('marginPercentage')}</h3>
            <span className={`status ${dashboard.summary.margin_percentage >= 70 ? 'good' : 'warning'}`}>
              {dashboard.summary.margin_percentage >= 70 ? '🎯' : '⚠️'}
            </span>
          </div>
          <div className="metric-value">
            {swedishFormatPercentage(dashboard.summary.margin_percentage)}
          </div>
          <div className="metric-target">
            {t('target')}: ≥70%
          </div>
        </div>

        <div className="metric-card revenue">
          <div className="metric-header">
            <h3>{t('potentialRevenue')}</h3>
          </div>
          <div className="metric-value">
            {swedishFormatCurrency(dashboard.costs.potential_revenue)}
          </div>
        </div>

        <div className="metric-card food-cost-amount">
          <div className="metric-header">
            <h3>{t('foodCost')}</h3>
          </div>
          <div className="metric-value">
            {swedishFormatCurrency(dashboard.costs.food_cost)}
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="cost-breakdown-section">
        <h2>{t('costBreakdown')}</h2>
        <div className="breakdown-grid">
          <div className="breakdown-card">
            <h3>{t('ingredients')}</h3>
            <div className="breakdown-amount">
              {swedishFormatCurrency(dashboard.costs.ingredient_cost)}
            </div>
            <div className="breakdown-count">
              {dashboard.summary.total_ingredients} {t('items')}
            </div>
          </div>
          
          <div className="breakdown-card">
            <h3>{t('recipes')}</h3>
            <div className="breakdown-amount">
              {swedishFormatCurrency(dashboard.costs.recipe_cost)}
            </div>
            <div className="breakdown-count">
              {dashboard.summary.total_recipes} {t('recipes')}
            </div>
          </div>
          
          <div className="breakdown-card">
            <h3>{t('menuItems')}</h3>
            <div className="breakdown-amount">
              {swedishFormatCurrency(dashboard.costs.food_cost)}
            </div>
            <div className="breakdown-count">
              {dashboard.summary.total_menu_items} {t('items')}
            </div>
          </div>
        </div>
      </div>


      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          <h2>{t('activeAlerts')}</h2>
          <div className="alerts-list">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.alert_id} className={`alert-item severity-${alert.severity}`}>
                <div className="alert-header">
                  <span className="alert-type">
                    {alert.severity === 'high' && '🚨'}
                    {alert.severity === 'medium' && '⚠️'}
                    {alert.severity === 'low' && 'ℹ️'}
                    {getAlertTypeText(alert.type)}
                  </span>
                  <span className="alert-time">
                    {new Date(alert.triggered_at).toLocaleString()}
                  </span>
                </div>
                <div className="alert-message">{alert.message}</div>
                <div className="alert-recommendation">
                  <strong>{t('recommendations')}:</strong> {alert.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimization Opportunities */}
      {dashboard.optimization.priority_actions.length > 0 && (
        <div className="optimization-section">
          <h2>{t('costOptimizationOpportunities')}</h2>
          <div className="optimization-summary">
            <div className="potential-savings">
              <h3>{t('potentialSavings')}</h3>
              <div className="savings-amount">
                {swedishFormatCurrency(dashboard.optimization.total_potential_savings)}
              </div>
            </div>
          </div>
          
          <div className="optimization-actions">
            <h4>{t('priorityActions')}:</h4>
            {dashboard.optimization.priority_actions.map((action, index) => (
              <div key={index} className="optimization-item">
                <div className="optimization-header">
                  <span className="optimization-type">
                    {action.type === 'ingredient_substitution' && '🔄'}
                    {action.type === 'price_optimization' && '💰'}
                    {action.target}
                  </span>
                  <span className="potential-saving">
                    {swedishFormatCurrency(action.potential_saving)} {t('potentialSavings')}
                  </span>
                </div>
                <div className="optimization-suggestion">
                  {action.suggestion}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {dashboard.recommendations.length > 0 && (
        <div className="recommendations-section">
          <h2>{t('recommendations')}</h2>
          <ul className="recommendations-list">
            {dashboard.recommendations.map((recommendation, index) => (
              <li key={index} className="recommendation-item">
                💡 {recommendation}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="dashboard-footer">
      </div>
    </div>
  );
};

export default CostControlDashboard;