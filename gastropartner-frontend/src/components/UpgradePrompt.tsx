import React from 'react';
import { AlertTriangle, Zap, ArrowRight } from 'lucide-react';

interface UsageData {
  current: number;
  limit: number;
  percentage: number;
  at_limit: boolean;
}

interface FreemiumUsage {
  organization_id: string;
  plan: string;
  usage: {
    ingredients: UsageData;
    recipes: UsageData;
    menu_items: UsageData;
  };
  upgrade_needed: boolean;
  upgrade_prompts: Record<string, string>;
}

interface UpgradePromptProps {
  usage: FreemiumUsage;
  onUpgrade?: () => void;
  compact?: boolean;
}

const ProgressBar: React.FC<{ percentage: number; atLimit: boolean }> = ({ percentage, atLimit }) => {
  const color = atLimit ? 'bg-red-500' : percentage >= 80 ? 'bg-yellow-500' : 'bg-green-500';
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className={`h-2 rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
};

const UsageCard: React.FC<{
  title: string;
  data: UsageData;
  icon: React.ReactNode;
}> = ({ title, data, icon }) => {
  return (
    <div className={`p-4 rounded-lg border-2 ${data.at_limit ? 'border-red-200 bg-red-50' : data.percentage >= 80 ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {icon}
          <h3 className="font-medium text-gray-900">{title}</h3>
        </div>
        <span className={`text-sm font-medium ${data.at_limit ? 'text-red-600' : 'text-gray-600'}`}>
          {data.current}/{data.limit}
        </span>
      </div>
      
      <ProgressBar percentage={data.percentage} atLimit={data.at_limit} />
      
      {data.at_limit && (
        <p className="text-sm text-red-600 mt-2 font-medium">
          Limit reached!
        </p>
      )}
      {!data.at_limit && data.percentage >= 80 && (
        <p className="text-sm text-yellow-600 mt-2">
          Approaching limit ({Math.round(data.percentage)}%)
        </p>
      )}
    </div>
  );
};

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ usage, onUpgrade, compact = false }) => {
  // Always show when usage data is available to display plan info
  const showComponent = usage && (usage.upgrade_needed || Object.keys(usage.upgrade_prompts).length > 0 || usage.plan === 'free');
  
  if (!showComponent) {
    return null;
  }

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span className="font-medium">Upgrade to Premium</span>
          </div>
          <button
            onClick={onUpgrade}
            className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors"
          >
            Upgrade Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Recepthantering - FREE Plan
        </h2>
        <p className="text-gray-600">
          Du använder för närvarande den kostnadsfria planen för recepthantering. Spåra din användning och uppgradera när du behöver mer kapacitet.
        </p>
        <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          Nuvarande plan: FREE
        </div>
      </div>

      {/* Usage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UsageCard
          title="Ingredients"
          data={usage.usage.ingredients}
          icon={<div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600 text-xs font-bold">I</span>
          </div>}
        />
        <UsageCard
          title="Recipes"
          data={usage.usage.recipes}
          icon={<div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 text-xs font-bold">R</span>
          </div>}
        />
        <UsageCard
          title="Menu Items"
          data={usage.usage.menu_items}
          icon={<div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-purple-600 text-xs font-bold">M</span>
          </div>}
        />
      </div>

      {/* Upgrade Prompts */}
      {Object.keys(usage.upgrade_prompts).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
            Upgrade Recommendations
          </h3>
          
          {Object.entries(usage.upgrade_prompts).map(([feature, prompt]) => (
            <div key={feature} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800">{prompt}</p>
            </div>
          ))}
        </div>
      )}

      {/* Upgrade CTA */}
      {usage.upgrade_needed && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Ready to unlock your full potential?</h3>
              <p className="text-blue-100">
                Get unlimited ingredients, recipes, menu items plus advanced analytics
              </p>
              <ul className="mt-3 space-y-1 text-sm text-blue-100">
                <li>• Unlimited ingredients, recipes & menu items</li>
                <li>• Advanced cost forecasting & analytics</li>
                <li>• Supplier price comparison</li>
                <li>• Priority support & data exports</li>
              </ul>
            </div>
            <button
              onClick={onUpgrade}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center space-x-2"
            >
              <span>Upgrade Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Current Plan Info */}
      <div className="text-center border-t pt-4">
        <div className="inline-flex items-center justify-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-sm font-medium text-blue-900">
            Nuvarande plan: <span className="font-bold">FREE (Kostnadsfri)</span>
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Vill du lära dig mer om premium-funktioner? <button className="text-blue-600 hover:underline font-medium">Se planjämförelse</button>
        </p>
      </div>
    </div>
  );
};

export default UpgradePrompt;