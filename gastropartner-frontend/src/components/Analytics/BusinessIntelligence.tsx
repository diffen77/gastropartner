import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../ui/card';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Percent, Clock, Target, AlertTriangle, CheckCircle } from 'lucide-react';

interface ProfitabilityData {
  id: string;
  name: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  salesCount: number;
  trend: 'up' | 'down' | 'stable';
}

interface TrendData {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  salesVolume: number;
}

interface CostEfficiencyData {
  category: string;
  actualCost: number;
  targetCost: number;
  efficiency: number;
  variance: number;
  impact: 'high' | 'medium' | 'low';
}

interface BusinessMetrics {
  totalRevenue: number;
  totalCost: number;
  averageMargin: number;
  bestSellingItem: string;
  mostProfitableItem: string;
  worstPerformingItem: string;
  costTrend: 'increasing' | 'decreasing' | 'stable';
  revenueTrend: 'increasing' | 'decreasing' | 'stable';
}

export function BusinessIntelligence() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [profitabilityData, setProfitabilityData] = useState<ProfitabilityData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [costEfficiencyData, setCostEfficiencyData] = useState<CostEfficiencyData[]>([]);
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // This would integrate with your actual analytics API
      // For now, using mock data to demonstrate the components

      // Mock profitability data
      const mockProfitability: ProfitabilityData[] = [
        {
          id: '1',
          name: 'Köttbullar med potatismos',
          revenue: 25600,
          cost: 8900,
          profit: 16700,
          margin: 65.2,
          salesCount: 320,
          trend: 'up'
        },
        {
          id: '2',
          name: 'Lax med dillsås',
          revenue: 18900,
          cost: 9200,
          profit: 9700,
          margin: 51.3,
          salesCount: 210,
          trend: 'stable'
        },
        {
          id: '3',
          name: 'Vegetarisk pasta',
          revenue: 12400,
          cost: 3800,
          profit: 8600,
          margin: 69.4,
          salesCount: 155,
          trend: 'up'
        },
        {
          id: '4',
          name: 'Grillad kyckling',
          revenue: 15800,
          cost: 8900,
          profit: 6900,
          margin: 43.7,
          salesCount: 180,
          trend: 'down'
        }
      ];

      // Mock trend data
      const mockTrend: TrendData[] = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const baseRevenue = 3200 + Math.random() * 800;
        const baseCost = baseRevenue * (0.35 + Math.random() * 0.15);

        return {
          date: date.toISOString().split('T')[0],
          revenue: Math.round(baseRevenue),
          cost: Math.round(baseCost),
          profit: Math.round(baseRevenue - baseCost),
          margin: Math.round(((baseRevenue - baseCost) / baseRevenue) * 100 * 10) / 10,
          salesVolume: Math.round(45 + Math.random() * 25)
        };
      });

      // Mock cost efficiency data
      const mockCostEfficiency: CostEfficiencyData[] = [
        {
          category: 'Kött & Fisk',
          actualCost: 12500,
          targetCost: 11000,
          efficiency: 88.0,
          variance: 1500,
          impact: 'high'
        },
        {
          category: 'Grönsaker',
          actualCost: 4200,
          targetCost: 4500,
          efficiency: 107.1,
          variance: -300,
          impact: 'medium'
        },
        {
          category: 'Kryddor & Såser',
          actualCost: 2100,
          targetCost: 2000,
          efficiency: 95.2,
          variance: 100,
          impact: 'low'
        },
        {
          category: 'Mejeri',
          actualCost: 3800,
          targetCost: 3500,
          efficiency: 92.1,
          variance: 300,
          impact: 'medium'
        }
      ];

      // Mock business metrics
      const mockMetrics: BusinessMetrics = {
        totalRevenue: 72700,
        totalCost: 30800,
        averageMargin: 57.6,
        bestSellingItem: 'Köttbullar med potatismos',
        mostProfitableItem: 'Vegetarisk pasta',
        worstPerformingItem: 'Grillad kyckling',
        costTrend: 'stable',
        revenueTrend: 'increasing'
      };

      setProfitabilityData(mockProfitability);
      setTrendData(mockTrend);
      setCostEfficiencyData(mockCostEfficiency);
      setBusinessMetrics(mockMetrics);

    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-400" />;
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 100) return 'text-green-600 bg-green-50';
    if (efficiency >= 90) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'medium':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with time range selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Affärsanalys</h2>
          <p className="text-gray-600">Djupanalys av lönsamhet och prestanda</p>
        </div>

        <div className="flex gap-2">
          {(['7d', '30d', '90d', '1y'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '7d' ? '7 dagar' :
               range === '30d' ? '30 dagar' :
               range === '90d' ? '90 dagar' : '1 år'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Overview */}
      {businessMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Omsättning</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(businessMetrics.totalRevenue)}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1">
                {getTrendIcon(businessMetrics.revenueTrend)}
                <span className="text-sm text-gray-600">
                  {businessMetrics.revenueTrend === 'increasing' ? 'Ökande' :
                   businessMetrics.revenueTrend === 'decreasing' ? 'Minskande' : 'Stabil'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Kostnad</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(businessMetrics.totalCost)}
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <Target className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1">
                {getTrendIcon(businessMetrics.costTrend)}
                <span className="text-sm text-gray-600">
                  {businessMetrics.costTrend === 'increasing' ? 'Ökande' :
                   businessMetrics.costTrend === 'decreasing' ? 'Minskande' : 'Stabil'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Genomsnittlig Marginal</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {businessMetrics.averageMargin}%
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <Percent className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-sm text-gray-600">
                  Bäst säljande: {businessMetrics.bestSellingItem}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Vinst</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(businessMetrics.totalRevenue - businessMetrics.totalCost)}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-sm text-gray-600">
                  Mest lönsam: {businessMetrics.mostProfitableItem}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profitability Analysis */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Lönsamhetsanalys per Produkt</h3>
          <p className="text-gray-600">Detaljerad genomgång av varje produkts prestanda</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2">Produkt</th>
                  <th className="text-right py-3 px-2">Omsättning</th>
                  <th className="text-right py-3 px-2">Kostnad</th>
                  <th className="text-right py-3 px-2">Vinst</th>
                  <th className="text-right py-3 px-2">Marginal</th>
                  <th className="text-right py-3 px-2">Försäljning</th>
                  <th className="text-center py-3 px-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                {profitabilityData.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">{item.name}</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(item.revenue)}</td>
                    <td className="py-3 px-2 text-right text-red-600">{formatCurrency(item.cost)}</td>
                    <td className="py-3 px-2 text-right font-semibold text-green-600">
                      {formatCurrency(item.profit)}
                    </td>
                    <td className="py-3 px-2 text-right font-semibold">
                      <span className={item.margin >= 50 ? 'text-green-600' :
                                     item.margin >= 30 ? 'text-yellow-600' : 'text-red-600'}>
                        {item.margin}%
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">{item.salesCount} st</td>
                    <td className="py-3 px-2 text-center">
                      {getTrendIcon(item.trend)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Trend Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Omsättning & Kostnad Trend</h3>
            <p className="text-gray-600">Utveckling över tid</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
                />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString('sv-SE')}
                  formatter={(value: any, name) => [
                    formatCurrency(value),
                    name === 'revenue' ? 'Omsättning' : name === 'cost' ? 'Kostnad' : 'Vinst'
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stackId="2"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Marginal & Försäljningsvolym</h3>
            <p className="text-gray-600">Lönsamhet och volymutveckling</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
                />
                <YAxis yAxisId="left" tickFormatter={(value) => `${value}%`} />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString('sv-SE')}
                  formatter={(value: any, name) => [
                    name === 'margin' ? `${value}%` : `${value} st`,
                    name === 'margin' ? 'Marginal' : 'Försäljningsvolym'
                  ]}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="margin"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="salesVolume"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#8B5CF6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cost Efficiency Analysis */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Kostnadseffektivitet per Kategori</h3>
          <p className="text-gray-600">Jämförelse mellan verklig kostnad och målkostnad</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {costEfficiencyData.map((category, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{category.category}</h4>
                  {getImpactIcon(category.impact)}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Verklig kostnad:</span>
                    <span className="font-medium">{formatCurrency(category.actualCost)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Målkostnad:</span>
                    <span className="font-medium">{formatCurrency(category.targetCost)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Avvikelse:</span>
                    <span className={`font-medium ${category.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {category.variance > 0 ? '+' : ''}{formatCurrency(category.variance)}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Effektivitet:</span>
                      <span className={`font-semibold ${category.efficiency >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                        {category.efficiency}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${category.efficiency >= 100 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(category.efficiency, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className={`text-xs p-2 rounded-md ${getEfficiencyColor(category.efficiency)}`}>
                    {category.efficiency >= 100 ? 'Över målnivå' :
                     category.efficiency >= 90 ? 'Nära målnivå' : 'Under målnivå'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actionable Insights */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Handlingsrekommendationer</h3>
          <p className="text-gray-600">Baserat på din data - konkreta åtgärder för förbättring</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-900">Högt prioriterad åtgärd</h4>
                <p className="text-red-800 text-sm">
                  <strong>Grillad kyckling</strong> har sjunkande trend och lägsta marginalen (43.7%).
                  Överväg att justera portionsstorlek eller leverantör för att förbättra lönsamheten.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-yellow-900">Medium prioritet</h4>
                <p className="text-yellow-800 text-sm">
                  <strong>Kött & Fisk</strong> kategorin är 13.6% över målkostnad.
                  Undersök alternativa leverantörer eller förhandla bättre priser för att spara 1,500 SEK.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-green-900">Framgång att bygga vidare på</h4>
                <p className="text-green-800 text-sm">
                  <strong>Vegetarisk pasta</strong> har högsta marginalen (69.4%) och positiv trend.
                  Överväg att utöka det vegetariska sortimentet eller öka marknadsföringen av denna rätt.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Target className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900">Möjlighet</h4>
                <p className="text-blue-800 text-sm">
                  <strong>Grönsaker</strong> kategorin presterar 7% bättre än mål.
                  Detta sparar 300 SEK och visar att era inköpsrutiner för grönsaker fungerar utmärkt.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}