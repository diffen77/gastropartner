import React, { useEffect, useState } from 'react';
import UpgradePrompt from '../components/UpgradePrompt';
import { useFreemium } from '../hooks/useFreemium';

const FreemiumTest: React.FC = () => {
  const { usage, planComparison, loading, error, fetchUsage, fetchPlanComparison } = useFreemium();

  // Mock data för att testa olika scenarios
  const mockScenarios = {
    healthy: {
      organization_id: "test-org",
      plan: "free",
      usage: {
        ingredients: { current: 10, limit: 50, percentage: 20, at_limit: false },
        recipes: { current: 1, limit: 5, percentage: 20, at_limit: false },
        menu_items: { current: 0, limit: 2, percentage: 0, at_limit: false },
      },
      upgrade_needed: false,
      upgrade_prompts: {},
    },
    warning: {
      organization_id: "test-org", 
      plan: "free",
      usage: {
        ingredients: { current: 45, limit: 50, percentage: 90, at_limit: false },
        recipes: { current: 4, limit: 5, percentage: 80, at_limit: false },
        menu_items: { current: 1, limit: 2, percentage: 50, at_limit: false },
      },
      upgrade_needed: false,
      upgrade_prompts: {},
    },
    critical: {
      organization_id: "test-org",
      plan: "free", 
      usage: {
        ingredients: { current: 50, limit: 50, percentage: 100, at_limit: true },
        recipes: { current: 5, limit: 5, percentage: 100, at_limit: true },
        menu_items: { current: 2, limit: 2, percentage: 100, at_limit: true },
      },
      upgrade_needed: true,
      upgrade_prompts: {
        ingredients: "You've reached your ingredient limit in the recipe module! Upgrade to premium for unlimited ingredients and unlock advanced cost tracking features.",
        recipes: "Recipe limit reached! Upgrade to premium for unlimited recipes, batch cost calculations, and nutritional analysis.",
        menu_items: "Menu item limit reached! Upgrade to premium for unlimited menu items, advanced pricing strategies, and profit optimization tools.",
      },
    },
  };

  useEffect(() => {
    fetchPlanComparison();
  }, [fetchPlanComparison]);

  const handleUpgrade = () => {
    alert('Upgrade clicked! This would redirect to payment/subscription page.');
  };

  const [selectedScenario, setSelectedScenario] = useState<'healthy' | 'warning' | 'critical' | 'live'>('live');

  const displayUsage = selectedScenario === 'live' ? usage : mockScenarios[selectedScenario];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Freemium Limits Test Page
          </h1>
          <p className="text-gray-600">
            Test different freemium scenarios and upgrade prompts
          </p>
        </div>

        {/* Scenario Selector */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Scenarios</h2>
          <div className="flex space-x-4">
            {(['live', 'healthy', 'warning', 'critical'] as const).map((scenario) => (
              <button
                key={scenario}
                onClick={() => setSelectedScenario(scenario)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedScenario === scenario
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {scenario.charAt(0).toUpperCase() + scenario.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Live:</strong> Real data from API</p>
            <p><strong>Healthy:</strong> Low usage, no warnings</p>
            <p><strong>Warning:</strong> Approaching limits (80%+)</p>
            <p><strong>Critical:</strong> All limits reached, upgrade needed</p>
          </div>
        </div>

        {/* Live Data Status */}
        {selectedScenario === 'live' && (
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">API Status</h2>
            
            {loading && <p className="text-blue-600">Loading usage data...</p>}
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">Error: {error}</p>
                <button 
                  onClick={fetchUsage}
                  className="mt-2 text-red-600 hover:underline"
                >
                  Retry
                </button>
              </div>
            )}
            
            {!loading && !error && !usage && (
              <p className="text-gray-500">No usage data available (requires authentication)</p>
            )}
          </div>
        )}

        {/* Plan Comparison */}
        {planComparison && (
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Plan Comparison</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Free Plan */}
              <div className="border-2 border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Free Plan</h3>
                <p className="text-2xl font-bold text-gray-900 mb-4">
                  {planComparison.plans.free.price} {planComparison.plans.free.currency}
                  <span className="text-sm font-normal text-gray-600">/{planComparison.plans.free.billing_period}</span>
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• {planComparison.plans.free.features.ingredients.description}</li>
                  <li>• {planComparison.plans.free.features.recipes.description}</li>
                  <li>• {planComparison.plans.free.features.menu_items.description}</li>
                  <li>• {planComparison.plans.free.features.cost_tracking.description}</li>
                </ul>
              </div>

              {/* Premium Plan */}
              <div className="border-2 border-blue-500 bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Plan</h3>
                <p className="text-2xl font-bold text-blue-600 mb-4">
                  {planComparison.plans.premium?.price || 'Contact Sales'} {planComparison.plans.premium?.currency || ''}
                  <span className="text-sm font-normal text-gray-600">/{planComparison.plans.premium?.billing_period || 'month'}</span>
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Unlimited ingredients, recipes, and menu items</li>
                  <li>• Advanced cost tracking and analytics</li>
                  <li>• Batch cost calculations</li>
                  <li>• Priority support</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Prompt Component */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Upgrade Prompt Components</h2>
          
          {displayUsage && (
            <>
              {/* Full Component */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Full Upgrade Prompt</h3>
                <UpgradePrompt usage={displayUsage} onUpgrade={handleUpgrade} />
              </div>
              
              {/* Compact Version */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Compact Upgrade Prompt</h3>
                <UpgradePrompt usage={displayUsage} onUpgrade={handleUpgrade} compact />
              </div>
            </>
          )}
        </div>

        {/* Raw Data Debug */}
        {displayUsage && (
          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Raw Usage Data (Debug)</h3>
            <pre className="text-xs text-gray-600 overflow-x-auto">
              {JSON.stringify(displayUsage, null, 2)}
            </pre>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default FreemiumTest;