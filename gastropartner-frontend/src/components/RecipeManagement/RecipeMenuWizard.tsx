/**
 * RecipeMenuWizard - Master component for the unified recipe/menu-item creation wizard
 *
 * This component orchestrates the complete wizard flow, integrating:
 * - WizardNavigation for progress tracking and step management
 * - Individual wizard steps with conditional rendering
 * - useWizardState hook for comprehensive state management
 * - Integration with existing RecipeManagementContext
 * - Deep linking support for direct step access
 * - Form validation across all steps
 * - Save operations for both recipes and menu items
 */

import React, { useCallback, useEffect } from 'react';
import { useRecipeMenuWizardState, WizardStep as WizardStepType } from '../../hooks/useRecipeMenuWizardState';
import { useRecipeManagement } from '../../contexts/RecipeManagementContext';
import { apiClient, RecipeCreate, MenuItemCreate } from '../../utils/api';
import { WizardNavigation } from './WizardNavigation';
import { CreationTypeStep } from './steps/CreationTypeStep';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { IngredientsStep } from './steps/IngredientsStep';
import { PreparationStep } from './steps/PreparationStep';
import { CostCalculationStep } from './steps/CostCalculationStep';
import { SalesSettingsStep } from './steps/SalesSettingsStep';
import { PreviewStep } from './steps/PreviewStep';
import './RecipeMenuWizard.css';

export interface RecipeMenuWizardProps {
  /** Called when wizard is completed successfully */
  onComplete?: (result: { type: 'recipe' | 'menu-item'; id: string; data: any }) => void;
  /** Called when wizard is cancelled or closed */
  onCancel?: () => void;
  /** Initial step to start wizard from (for deep linking) */
  initialStep?: WizardStepType;
  /** Pre-populated data for wizard (for editing existing items) */
  initialData?: any;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Wizard step configuration with metadata for navigation and validation
 */
const WIZARD_STEPS: Array<{
  id: WizardStepType;
  title: string;
  description: string;
  isOptional?: boolean;
  requiredFor?: ('recipe' | 'menu-item')[];
}> = [
  {
    id: 'creation-type',
    title: 'Typ av skapande',
    description: 'Välj mellan grundrecept eller sammansatt maträtt',
  },
  {
    id: 'basic-info',
    title: 'Grundinformation',
    description: 'Namn, beskrivning och kategorisering',
  },
  {
    id: 'ingredients',
    title: 'Ingredienser',
    description: 'Välj och konfigurera ingredienser',
  },
  {
    id: 'preparation',
    title: 'Tillagning',
    description: 'Instruktioner och tidsberäkningar',
    isOptional: true,
  },
  {
    id: 'cost-calculation',
    title: 'Kostnadsberäkning',
    description: 'Automatisk kostnadskalkyl och marginaler',
  },
  {
    id: 'sales-settings',
    title: 'Försäljningsinställningar',
    description: 'Prissättning och kategorier',
    requiredFor: ['menu-item'],
  },
  {
    id: 'preview',
    title: 'Förhandsvisning',
    description: 'Granska och bekräfta innan sparande',
  },
];

export function RecipeMenuWizard({
  onComplete,
  onCancel,
  initialStep,
  initialData,
  className = '',
}: RecipeMenuWizardProps) {
  const {
    // State
    currentStep,
    data,
    errors,
    isLoading,
    canGoNext,
    canGoPrevious,
    canUndo,
    canRedo,

    // Actions
    goToStep,
    goNext,
    goPrevious,
    undo,
    redo,
    updateData,
    setErrors,
    validateStep,
    reset,
  } = useRecipeMenuWizardState();

  const {
    onRecipeChange,
    onMenuItemChange,
  } = useRecipeManagement();

  // Initialize wizard with provided data
  useEffect(() => {
    if (initialStep && initialStep !== currentStep) {
      goToStep(initialStep);
    }
    if (initialData) {
      updateData(initialData);
    }
  }, [initialStep, initialData, currentStep, goToStep, updateData]);

  // Handle wizard completion
  const handleComplete = useCallback(async () => {
    // Final validation
    const finalErrors = validateStep(currentStep);
    if (finalErrors.length > 0) {
      setErrors(finalErrors);
      return;
    }

    try {
      let result;

      if (data.creationType === 'recipe') {
        // Create or update recipe
        const recipeData: RecipeCreate = {
          name: data.basicInfo.name,
          description: data.basicInfo.description,
          servings: data.basicInfo.servings,
          prep_time_minutes: data.preparation.preparationTime,
          cook_time_minutes: data.preparation.cookingTime,
          instructions: data.preparation.instructions,
          ingredients: data.ingredients.map(ingredient => ({
            ingredient_id: ingredient.ingredientId,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
          })),
        };

        if (data.id) {
          result = await apiClient.updateRecipe(data.id, recipeData);
        } else {
          result = await apiClient.createRecipe(recipeData);
        }

        // Notify context of recipe change
        await onRecipeChange();

        onComplete?.({
          type: 'recipe',
          id: result.id,
          data: result,
        });
      } else {
        // Create or update menu item
        if (data.id) {
          result = await apiClient.updateMenuItem(data.id, {
            name: data.basicInfo.name,
            description: data.basicInfo.description,
            category: data.basicInfo.category,
            ingredients: data.ingredients,
            instructions: data.preparation.instructions,
            preparationTime: data.preparation.preparationTime,
            cookingTime: data.preparation.cookingTime,
            servings: data.basicInfo.servings,
            price: data.salesSettings.price,
            margin: data.salesSettings.margin,
            isAvailable: data.salesSettings.isAvailable,
            organizationId: data.basicInfo.organizationId,
          });
        } else {
          result = await apiClient.createMenuItem({
            name: data.basicInfo.name,
            description: data.basicInfo.description,
            category: data.basicInfo.category,
            ingredients: data.ingredients,
            instructions: data.preparation.instructions,
            preparationTime: data.preparation.preparationTime,
            cookingTime: data.preparation.cookingTime,
            servings: data.basicInfo.servings,
            price: data.salesSettings.price,
            margin: data.salesSettings.margin,
            isAvailable: data.salesSettings.isAvailable,
            organizationId: data.basicInfo.organizationId,
          });
        }

        onComplete?.({
          type: 'menu-item',
          id: result.id,
          data: result,
        });
      }
    } catch (error) {
      console.error('Failed to save:', error);
      setErrors(['Ett fel uppstod när data skulle sparas. Försök igen.']);
    }
  }, [
    currentStep,
    data,
    validateStep,
    setErrors,
    onRecipeChange,
    onComplete,
  ]);

  // Handle wizard cancellation
  const handleCancel = useCallback(() => {
    if (window.confirm('Är du säker på att du vill avbryta? Ej sparade ändringar går förlorade.')) {
      reset();
      onCancel?.();
    }
  }, [reset, onCancel]);

  // Get current step configuration
  const currentStepConfig = WIZARD_STEPS.find(step => step.id === currentStep);

  // Check if current step is required for the selected creation type
  const isStepRequired = useCallback((stepId: WizardStepType) => {
    const stepConfig = WIZARD_STEPS.find(step => step.id === stepId);
    if (!stepConfig) return true;

    if (stepConfig.isOptional) return false;

    if (stepConfig.requiredFor && data.creationType) {
      return stepConfig.requiredFor.includes(data.creationType);
    }

    return true;
  }, [data.creationType]);

  // Calculate progress for navigation
  const progress = React.useMemo(() => {
    const requiredSteps = WIZARD_STEPS.filter(step => isStepRequired(step.id));
    const currentIndex = requiredSteps.findIndex(step => step.id === currentStep);
    return Math.round(((currentIndex + 1) / requiredSteps.length) * 100);
  }, [currentStep, isStepRequired]);

  // Render current step component
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'creation-type':
        return (
          <CreationTypeStep
            selectedType={data.creationType}
            errors={errors}
            isLoading={isLoading}
            onTypeSelect={(type) => updateData({ creationType: type })}
          />
        );

      case 'basic-info':
        return (
          <BasicInfoStep
            basicInfo={data.basicInfo}
            creationType={data.creationType}
            errors={errors}
            isLoading={isLoading}
            onBasicInfoUpdate={(basicInfo) => updateData({ basicInfo: { ...data.basicInfo, ...basicInfo } })}
          />
        );

      case 'ingredients':
        return (
          <IngredientsStep
            ingredients={data.ingredients}
            creationType={data.creationType}
            errors={errors}
            isLoading={isLoading}
            onIngredientsUpdate={(ingredients) => updateData({ ingredients })}
          />
        );

      case 'preparation':
        return (
          <PreparationStep
            preparation={data.preparation}
            creationType={data.creationType}
            errors={errors}
            isLoading={isLoading}
            onPreparationUpdate={(preparation) => updateData({ preparation: { ...data.preparation, ...preparation } })}
          />
        );

      case 'cost-calculation':
        return (
          <CostCalculationStep
            costCalculation={data.costCalculation}
            ingredients={data.ingredients}
            creationType={data.creationType}
            servings={data.basicInfo.servings || 1}
            errors={errors}
            isLoading={isLoading}
            onCostCalculationUpdate={(costCalculation) =>
              updateData({ costCalculation: { ...data.costCalculation, ...costCalculation } })
            }
          />
        );

      case 'sales-settings':
        return (
          <SalesSettingsStep
            salesSettings={data.salesSettings}
            totalCost={data.costCalculation.totalCost || 0}
            creationType={data.creationType}
            errors={errors}
            isLoading={isLoading}
            onSalesSettingsUpdate={(salesSettings) => updateData({ salesSettings: { ...data.salesSettings, ...salesSettings } })}
          />
        );

      case 'preview':
        return (
          <PreviewStep
            data={data}
            creationType={data.creationType}
            errors={errors}
            isLoading={isLoading}
            onEditStep={(step) => goToStep(step)}
            onDataUpdate={updateData}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={`recipe-menu-wizard ${className}`}>
      {/* Wizard Navigation */}
      <WizardNavigation
        steps={WIZARD_STEPS.filter(step => isStepRequired(step.id))}
        currentStep={currentStep}
        progress={progress}
        canGoNext={canGoNext}
        canGoPrevious={canGoPrevious}
        canUndo={canUndo}
        canRedo={canRedo}
        isLoading={isLoading}
        onStepClick={goToStep}
        onNext={goNext}
        onPrevious={goPrevious}
        onUndo={undo}
        onRedo={redo}
        onCancel={handleCancel}
        onComplete={currentStep === 'preview' ? handleComplete : undefined}
      />

      {/* Main Content Area */}
      <main className="wizard-content" role="main">
        {currentStepConfig && (
          <div className="wizard-content-header">
            <h1 className="wizard-content-title">{currentStepConfig.title}</h1>
            <p className="wizard-content-description">{currentStepConfig.description}</p>
          </div>
        )}

        <div className="wizard-step-container">
          {renderCurrentStep()}
        </div>
      </main>
    </div>
  );
}