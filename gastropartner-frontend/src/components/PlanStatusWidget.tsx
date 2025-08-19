import React from 'react';
import { Crown, Zap } from 'lucide-react';

interface PlanStatusWidgetProps {
  plan?: string;
  compact?: boolean;
  showUpgradeButton?: boolean;
  onUpgrade?: () => void;
}

const PlanStatusWidget: React.FC<PlanStatusWidgetProps> = ({ 
  plan = 'free', 
  compact = false, 
  showUpgradeButton = false,
  onUpgrade 
}) => {
  const isPremium = plan?.toLowerCase() === 'premium';
  
  if (compact) {
    return (
      <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${
        isPremium 
          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 text-yellow-800' 
          : 'bg-blue-50 border-blue-200 text-blue-900'
      }`}>
        {isPremium ? (
          <Crown className="w-4 h-4 mr-1.5 text-yellow-600" />
        ) : (
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
        )}
        <span className="font-semibold">
          {isPremium ? 'PREMIUM' : 'FREE'}
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${
      isPremium 
        ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300' 
        : 'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isPremium ? (
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
          ) : (
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
          )}
          
          <div>
            <h3 className={`font-bold text-lg ${
              isPremium ? 'text-yellow-900' : 'text-blue-900'
            }`}>
              {isPremium ? 'PREMIUM PLAN' : 'FREE PLAN'}
            </h3>
            <p className={`text-sm ${
              isPremium ? 'text-yellow-700' : 'text-blue-700'
            }`}>
              {isPremium 
                ? 'Obegränsade funktioner och prioriterat stöd'
                : 'Kostnadsfri plan för recepthantering'
              }
            </p>
          </div>
        </div>
        
        {showUpgradeButton && !isPremium && (
          <button
            onClick={onUpgrade}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            Uppgradera
          </button>
        )}
      </div>
      
      {!isPremium && (
        <div className="mt-3 text-xs text-blue-600 bg-blue-100 rounded px-2 py-1 inline-block">
          Kostnadsfri plan - Begränsade funktioner
        </div>
      )}
    </div>
  );
};

export default PlanStatusWidget;