import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../utils/api';

interface CostAnalysis {
  period: {
    start_date: string;
    end_date: string;
  };
  ingredient_analysis: {
    total_ingredients: number;
    total_cost: number;
    average_cost_per_ingredient: number;
  };
  recipe_analysis: {
    total_recipes: number;
    total_cost: number;
    average_cost_per_recipe: number;
  };
  menu_analysis: {
    total_menu_items: number;
    total_potential_revenue: number;
    total_food_cost: number;
    average_margin: number;
  };
  cost_efficiency: {
    food_cost_percentage: number;
    margin_percentage: number;
  };
}

interface CostForecast {
  period: string;
  predicted_total_cost: number;
  confidence_level: number;
  factors: string[];
  recommendations: string[];
}

interface CostAlert {
  alert_id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendation: string;
  triggered_at: string;
}

interface CostOptimization {
  total_potential_savings: number;
  optimizations: Array<{
    type: string;
    target: string;
    suggestion: string;
    potential_saving: number;
  }>;
  priority_actions: Array<{
    type: string;
    target: string;
    suggestion: string;
    potential_saving: number;
  }>;
  analysis_date: string;
}

interface CostDashboard {
  summary: {
    total_ingredients: number;
    total_recipes: number;
    total_menu_items: number;
    food_cost_percentage: number;
    margin_percentage: number;
  };
  costs: {
    ingredient_cost: number;
    recipe_cost: number;
    food_cost: number;
    potential_revenue: number;
  };
  forecast: {
    next_month_prediction: number;
    confidence: number;
    factors: string[];
  };
  alerts: {
    active_alerts: number;
    high_priority_alerts: number;
    recent_alerts: CostAlert[];
  };
  optimization: {
    total_potential_savings: number;
    optimization_count: number;
    priority_actions: Array<{
      type: string;
      target: string;
      suggestion: string;
      potential_saving: number;
    }>;
  };
  trends: {
    period: string;
    avg_ingredient_cost: number;
    avg_recipe_cost: number;
    avg_margin: number;
  };
  recommendations: string[];
  last_updated: string;
}

interface CostMetrics {
  period_days: number;
  metrics: {
    food_cost_percentage: {
      current: number;
      target: number;
      status: 'good' | 'warning';
      trend: {
        change: number;
        percentage: number;
        direction: 'up' | 'down' | 'stable';
      };
    };
    margin_percentage: {
      current: number;
      target: number;
      status: 'good' | 'warning';
      trend: {
        change: number;
        percentage: number;
        direction: 'up' | 'down' | 'stable';
      };
    };
    avg_ingredient_cost: {
      current: number;
      target: number;
      status: 'good' | 'warning';
      trend: {
        change: number;
        percentage: number;
        direction: 'up' | 'down' | 'stable';
      };
    };
    total_food_cost: {
      current: number;
      trend: {
        change: number;
        percentage: number;
        direction: 'up' | 'down' | 'stable';
      };
    };
    potential_revenue: {
      current: number;
      trend: {
        change: number;
        percentage: number;
        direction: 'up' | 'down' | 'stable';
      };
    };
  };
  overall_health: 'excellent' | 'good' | 'needs_attention';
  last_updated: string;
}

export const useCostControl = () => {
  const [dashboard, setDashboard] = useState<CostDashboard | null>(null);
  const [analysis, setAnalysis] = useState<CostAnalysis | null>(null);
  const [forecast, setForecast] = useState<CostForecast | null>(null);
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [optimization, setOptimization] = useState<CostOptimization | null>(null);
  const [metrics, setMetrics] = useState<CostMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get<CostDashboard>('/api/v1/cost-control/dashboard');
      setDashboard(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cost control dashboard');
      console.error('Error fetching cost control dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnalysis = useCallback(async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const url = `/api/v1/cost-control/analysis${params.toString() ? `?${params}` : ''}`;
      const response = await apiClient.get<CostAnalysis>(url);
      setAnalysis(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cost analysis');
      console.error('Error fetching cost analysis:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchForecast = useCallback(async (period: 'next_week' | 'next_month' | 'next_quarter' = 'next_month') => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get<CostForecast>(`/api/v1/cost-control/forecast?period=${period}`);
      setForecast(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cost forecast');
      console.error('Error fetching cost forecast:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      setError(null);
      
      const response = await apiClient.get<CostAlert[]>('/api/v1/cost-control/alerts');
      setAlerts(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cost alerts');
      console.error('Error fetching cost alerts:', err);
    }
  }, []);

  const fetchOptimization = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get<CostOptimization>('/api/v1/cost-control/optimization');
      setOptimization(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cost optimization');
      console.error('Error fetching cost optimization:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMetrics = useCallback(async (periodDays: number = 30) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get<CostMetrics>(`/api/v1/cost-control/metrics?period_days=${periodDays}`);
      setMetrics(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cost metrics');
      console.error('Error fetching cost metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createBudget = useCallback(async (budgetData: {
    name: string;
    category: string;
    budget_amount: number;
    period: string;
    start_date: string;
    end_date: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.post('/api/v1/cost-control/budget', budgetData);
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to create budget');
      console.error('Error creating budget:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Utility functions
  const getHealthStatus = (): 'excellent' | 'good' | 'warning' | 'critical' => {
    if (!dashboard) return 'warning';
    
    const foodCostPct = dashboard.summary.food_cost_percentage;
    const marginPct = dashboard.summary.margin_percentage;
    const alertsCount = dashboard.alerts.high_priority_alerts;
    
    if (alertsCount > 2 || foodCostPct > 40) return 'critical';
    if (alertsCount > 0 || foodCostPct > 35 || marginPct < 60) return 'warning';
    if (foodCostPct <= 30 && marginPct >= 70) return 'excellent';
    return 'good';
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'stable'): string => {
    switch (direction) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      default: return '→';
    }
  };

  const refresh = useCallback(async () => {
    await Promise.all([
      fetchDashboard(),
      fetchAlerts(),
      fetchMetrics()
    ]);
  }, [fetchDashboard, fetchAlerts, fetchMetrics]);

  // Auto-fetch dashboard on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    // Data
    dashboard,
    analysis,
    forecast,
    alerts,
    optimization,
    metrics,
    loading,
    error,
    
    // Actions
    fetchDashboard,
    fetchAnalysis,
    fetchForecast,
    fetchAlerts,
    fetchOptimization,
    fetchMetrics,
    createBudget,
    refresh,
    
    // Utilities
    getHealthStatus,
    formatCurrency,
    formatPercentage,
    getTrendIcon,
  };
};

export type { 
  CostDashboard, 
  CostAnalysis, 
  CostForecast, 
  CostAlert, 
  CostOptimization, 
  CostMetrics 
};