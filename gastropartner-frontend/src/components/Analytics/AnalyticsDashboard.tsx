import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '../ui/card';
import { BusinessIntelligence } from './BusinessIntelligence';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Target,
  Calendar,
  Download,
  RefreshCw,
  Filter
} from 'lucide-react';

interface AnalyticsDashboardProps {
  className?: string;
}

export function AnalyticsDashboard({ className = '' }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState('business');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh - in real app, this would reload all data
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleExport = () => {
    // In a real implementation, this would generate and download a report
    console.log('Exporting analytics report...');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analys & Rapporter</h1>
          <p className="text-gray-600">Djupgående insikter för att optimera din verksamhet</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Uppdaterar...' : 'Uppdatera'}
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportera
          </button>
        </div>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-1 sm:grid-cols-4 w-full sm:w-auto">
          <TabsTrigger value="business" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Affärsanalys</span>
            <span className="sm:hidden">Analys</span>
          </TabsTrigger>

          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Trender</span>
            <span className="sm:hidden">Trend</span>
          </TabsTrigger>

          <TabsTrigger value="costs" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            <span className="hidden sm:inline">Kostnader</span>
            <span className="sm:hidden">Kostnad</span>
          </TabsTrigger>

          <TabsTrigger value="targets" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Mål & KPI:er</span>
            <span className="sm:hidden">Mål</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="mt-6">
          <BusinessIntelligence />
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <TrendsAnalysis />
        </TabsContent>

        <TabsContent value="costs" className="mt-6">
          <CostAnalysis />
        </TabsContent>

        <TabsContent value="targets" className="mt-6">
          <TargetsAndKPIs />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Trends Analysis Component
function TrendsAnalysis() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Trendanalys - Kommande</h3>
          <p className="text-gray-600">Djupgående trendanalys kommer att implementeras här</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <div className="text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Trendanalys utvecklas för att ge er ännu bättre insikter</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Cost Analysis Component
function CostAnalysis() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Kostnadsanalys - Kommande</h3>
          <p className="text-gray-600">Detaljerad kostnadsanalys kommer att implementeras här</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <div className="text-center">
              <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Kostnadsuppdelning och analys utvecklas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Targets and KPIs Component
function TargetsAndKPIs() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Mål & KPI:er - Kommande</h3>
          <p className="text-gray-600">Uppsättning och uppföljning av mål kommer att implementeras här</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <div className="text-center">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Måluppföljning och KPI-dashboard utvecklas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AnalyticsDashboard;