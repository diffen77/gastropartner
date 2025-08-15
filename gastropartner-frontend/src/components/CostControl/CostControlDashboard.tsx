import React, { useState } from 'react';
import { useCostControl } from '../../hooks/useCostControl';
import './CostControlDashboard.css';

const CostControlDashboard: React.FC = () => {
  const {
    dashboard,
    alerts,
    loading,
    error,
    refresh,
    getHealthStatus,
    formatCurrency,
    formatPercentage,
    getTrendIcon,
  } = useCostControl();

  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>('30');

  if (loading && !dashboard) {
    return (
      <div className="cost-control-loading">
        <div className="loading-spinner"></div>
        <p>Loading cost control dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cost-control-error">
        <h3>Error Loading Cost Control</h3>
        <p>{error}</p>
        <button onClick={refresh} className="btn btn-primary">
          Try Again
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

  return (
    <div className="cost-control-dashboard">
      <div className="dashboard-header">
        <h1>Cost Control Center</h1>
        <div className="header-actions">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as '7' | '30' | '90')}
            className="period-select"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button onClick={refresh} className="btn btn-secondary">
            🔄 Refresh
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
            Cost Control Health: <strong>{healthStatus.toUpperCase()}</strong>
          </span>
          {dashboard.alerts.high_priority_alerts > 0 && (
            <span className="alert-badge">
              {dashboard.alerts.high_priority_alerts} High Priority Alerts
            </span>
          )}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card food-cost">
          <div className="metric-header">
            <h3>Food Cost %</h3>
            <span className={`status ${dashboard.summary.food_cost_percentage <= 30 ? 'good' : 'warning'}`}>
              {dashboard.summary.food_cost_percentage <= 30 ? '🎯' : '⚠️'}
            </span>
          </div>
          <div className="metric-value">
            {formatPercentage(dashboard.summary.food_cost_percentage)}
          </div>
          <div className="metric-target">
            Target: ≤30%
          </div>
        </div>

        <div className="metric-card margin">
          <div className="metric-header">
            <h3>Margin %</h3>
            <span className={`status ${dashboard.summary.margin_percentage >= 70 ? 'good' : 'warning'}`}>
              {dashboard.summary.margin_percentage >= 70 ? '🎯' : '⚠️'}
            </span>
          </div>
          <div className="metric-value">
            {formatPercentage(dashboard.summary.margin_percentage)}
          </div>
          <div className="metric-target">
            Target: ≥70%
          </div>
        </div>

        <div className="metric-card revenue">
          <div className="metric-header">
            <h3>Potential Revenue</h3>
          </div>
          <div className="metric-value">
            {formatCurrency(dashboard.costs.potential_revenue)}
          </div>
        </div>

        <div className="metric-card food-cost-amount">
          <div className="metric-header">
            <h3>Food Cost</h3>
          </div>
          <div className="metric-value">
            {formatCurrency(dashboard.costs.food_cost)}
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="cost-breakdown-section">
        <h2>Cost Breakdown</h2>
        <div className="breakdown-grid">
          <div className="breakdown-card">
            <h3>Ingredients</h3>
            <div className="breakdown-amount">
              {formatCurrency(dashboard.costs.ingredient_cost)}
            </div>
            <div className="breakdown-count">
              {dashboard.summary.total_ingredients} items
            </div>
          </div>
          
          <div className="breakdown-card">
            <h3>Recipes</h3>
            <div className="breakdown-amount">
              {formatCurrency(dashboard.costs.recipe_cost)}
            </div>
            <div className="breakdown-count">
              {dashboard.summary.total_recipes} recipes
            </div>
          </div>
          
          <div className="breakdown-card">
            <h3>Menu Items</h3>
            <div className="breakdown-amount">
              {formatCurrency(dashboard.costs.food_cost)}
            </div>
            <div className="breakdown-count">
              {dashboard.summary.total_menu_items} items
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Section */}
      <div className="forecast-section">
        <h2>Cost Forecast</h2>
        <div className="forecast-card">
          <div className="forecast-prediction">
            <h3>Next Month Prediction</h3>
            <div className="prediction-amount">
              {formatCurrency(dashboard.forecast.next_month_prediction)}
            </div>
            <div className="confidence">
              Confidence: {dashboard.forecast.confidence.toFixed(0)}%
            </div>
          </div>
          
          <div className="forecast-factors">
            <h4>Key Factors:</h4>
            <ul>
              {dashboard.forecast.factors.map((factor, index) => (
                <li key={index}>{factor}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          <h2>Active Alerts</h2>
          <div className="alerts-list">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.alert_id} className={`alert-item severity-${alert.severity}`}>
                <div className="alert-header">
                  <span className="alert-type">
                    {alert.severity === 'high' && '🚨'}
                    {alert.severity === 'medium' && '⚠️'}
                    {alert.severity === 'low' && 'ℹ️'}
                    {alert.type.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="alert-time">
                    {new Date(alert.triggered_at).toLocaleString()}
                  </span>
                </div>
                <div className="alert-message">{alert.message}</div>
                <div className="alert-recommendation">
                  <strong>Recommendation:</strong> {alert.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimization Opportunities */}
      {dashboard.optimization.priority_actions.length > 0 && (
        <div className="optimization-section">
          <h2>Cost Optimization Opportunities</h2>
          <div className="optimization-summary">
            <div className="potential-savings">
              <h3>Potential Savings</h3>
              <div className="savings-amount">
                {formatCurrency(dashboard.optimization.total_potential_savings)}
              </div>
            </div>
          </div>
          
          <div className="optimization-actions">
            <h4>Priority Actions:</h4>
            {dashboard.optimization.priority_actions.map((action, index) => (
              <div key={index} className="optimization-item">
                <div className="optimization-header">
                  <span className="optimization-type">
                    {action.type === 'ingredient_substitution' && '🔄'}
                    {action.type === 'price_optimization' && '💰'}
                    {action.target}
                  </span>
                  <span className="potential-saving">
                    {formatCurrency(action.potential_saving)} potential saving
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
          <h2>Recommendations</h2>
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
        <p className="last-updated">
          Last updated: {new Date(dashboard.last_updated).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default CostControlDashboard;