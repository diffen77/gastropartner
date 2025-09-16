import React from 'react';
import { Crown } from 'lucide-react';
import { useTranslation } from '../localization/sv';

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
  const { t } = useTranslation();
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
        {isPremium && (
          <span className="font-semibold">
            {t('premiumPlan')}
          </span>
        )}
      </div>
    );
  }

  // Only show widget for premium users
  if (!isPremium) {
    return null;
  }

  return (
    <div className="rounded-lg border p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" />
          </div>
          
          <div>
            <h3 className="font-bold text-lg text-yellow-900">
              {t('premiumPlan')}
            </h3>
            <p className="text-sm text-yellow-700">
              {t('premiumPlanDescription')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanStatusWidget;