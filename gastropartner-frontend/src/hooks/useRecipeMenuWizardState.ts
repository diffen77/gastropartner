/**
 * useRecipeMenuWizardState - Specialized wizard state management for Recipe-MenuItem Creation
 *
 * This hook provides simplified state management specifically for the RecipeMenuWizard,
 * with URL synchronization, localStorage persistence, and form validation.
 *
 * Features:
 * - URL-based deep linking with step synchronization
 * - LocalStorage persistence with session recovery
 * - Undo/redo functionality for better UX
 * - Step-specific validation with error management
 * - Automatic save/load on data changes
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Wizard step definitions matching RecipeMenuWizard
export type WizardStep =
  | 'creation-type'
  | 'basic-info'
  | 'ingredients'
  | 'preparation'
  | 'cost-calculation'
  | 'sales-settings'
  | 'preview';

// Basic info data structure
export interface BasicInfo {
  name: string;
  description: string;
  category: string;
  servings: number;
  organizationId?: string;
}

// Ingredients data structure
export interface Ingredients extends Array<{
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  costPerUnit?: number;
}> {}

// Preparation data structure
export interface Preparation {
  instructions: string;
  preparationTime: number; // minutes
  cookingTime: number; // minutes
}

// Cost calculation data structure
export interface CostCalculation {
  totalCost?: number;
  costPerServing?: number;
  suggestedPrice?: number;
  currentMargin?: number;
  targetMargin?: number;
}

// Sales settings data structure
export interface SalesSettings {
  price: number;
  margin: number;
  isAvailable: boolean;
}

// Complete wizard data
export interface WizardData {
  creationType: 'recipe' | 'menu-item' | null;
  basicInfo: BasicInfo;
  ingredients: Ingredients;
  preparation: Preparation;
  costCalculation: CostCalculation;
  salesSettings: SalesSettings;
  id?: string; // For editing existing items
}

// Default wizard data
const getDefaultWizardData = (): WizardData => ({
  creationType: null,
  basicInfo: {
    name: '',
    description: '',
    category: '',
    servings: 1,
  },
  ingredients: [],
  preparation: {
    instructions: '',
    preparationTime: 0,
    cookingTime: 0,
  },
  costCalculation: {
    targetMargin: 30,
  },
  salesSettings: {
    price: 0,
    margin: 0,
    isAvailable: true,
  },
});

// Storage key for persistence
const STORAGE_KEY = 'gastropartner-recipe-menu-wizard-state';

// URL base path for wizard
const WIZARD_BASE_PATH = '/recepthantering/wizard';

/**
 * Specialized wizard state management hook for RecipeMenuWizard
 */
export function useRecipeMenuWizardState() {
  const location = useLocation();
  const navigate = useNavigate();

  // Core state
  const [currentStep, setCurrentStep] = useState<WizardStep>('creation-type');
  const [data, setData] = useState<WizardData>(getDefaultWizardData);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // History for undo/redo
  const [history, setHistory] = useState<WizardData[]>([getDefaultWizardData()]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Initialize from URL on mount
  useEffect(() => {
    const urlStep = getStepFromUrl(location.pathname);
    if (urlStep && urlStep !== currentStep) {
      setCurrentStep(urlStep);
    }

    // Try to load from storage
    loadFromStorage();
  }, [location.pathname]);

  // Sync URL when step changes
  useEffect(() => {
    const targetPath = getUrlForStep(currentStep);
    if (location.pathname !== targetPath) {
      navigate(targetPath, { replace: true });
    }
  }, [currentStep, navigate, location.pathname]);

  // Auto-save to storage when data changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToStorage();
    }, 1000); // Debounce saves

    return () => clearTimeout(timeoutId);
  }, [data]);

  // Computed properties
  const canGoNext = useMemo(() => {
    // Basic validation based on current step
    switch (currentStep) {
      case 'creation-type':
        return data.creationType !== null;
      case 'basic-info':
        return data.basicInfo.name.trim() !== '' && data.basicInfo.category !== '';
      case 'ingredients':
        return data.ingredients.length > 0;
      case 'preparation':
        return true; // Optional step
      case 'cost-calculation':
        return true; // Auto-calculated
      case 'sales-settings':
        return data.creationType === 'recipe' || data.salesSettings.price > 0;
      case 'preview':
        return false; // Final step
      default:
        return false;
    }
  }, [currentStep, data]);

  const canGoPrevious = useMemo(() => {
    return currentStep !== 'creation-type';
  }, [currentStep]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Navigation functions
  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step);
  }, []);

  const goNext = useCallback(() => {
    const steps: WizardStep[] = [
      'creation-type',
      'basic-info',
      'ingredients',
      'preparation',
      'cost-calculation',
      'sales-settings',
      'preview'
    ];

    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1 && canGoNext) {
      // Save current state to history before moving
      saveToHistory();

      let nextIndex = currentIndex + 1;
      const nextStep = steps[nextIndex];

      // Skip sales-settings for recipes
      if (nextStep === 'sales-settings' && data.creationType === 'recipe') {
        nextIndex += 1;
        if (nextIndex < steps.length) {
          setCurrentStep(steps[nextIndex]);
        }
      } else {
        setCurrentStep(nextStep);
      }
    }
  }, [currentStep, canGoNext, data.creationType]);

  const goPrevious = useCallback(() => {
    const steps: WizardStep[] = [
      'creation-type',
      'basic-info',
      'ingredients',
      'preparation',
      'cost-calculation',
      'sales-settings',
      'preview'
    ];

    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      let prevIndex = currentIndex - 1;
      const prevStep = steps[prevIndex];

      // Skip sales-settings for recipes when going backwards
      if (prevStep === 'sales-settings' && data.creationType === 'recipe') {
        prevIndex -= 1;
        if (prevIndex >= 0) {
          setCurrentStep(steps[prevIndex]);
        }
      } else {
        setCurrentStep(prevStep);
      }
    }
  }, [currentStep, data.creationType]);

  // Data management functions
  const updateData = useCallback((newData: Partial<WizardData>) => {
    setData(prev => ({
      ...prev,
      ...newData,
    }));

    // Clear errors when data changes
    setErrors([]);
  }, []);

  // Validation functions
  const validateStep = useCallback((step: WizardStep): string[] => {
    const stepErrors: string[] = [];

    switch (step) {
      case 'creation-type':
        if (!data.creationType) {
          stepErrors.push('Du måste välja vad du vill skapa');
        }
        break;

      case 'basic-info':
        if (!data.basicInfo.name.trim()) {
          stepErrors.push('Namnet är obligatoriskt');
        }
        if (!data.basicInfo.category) {
          stepErrors.push('Du måste välja en kategori');
        }
        if (data.basicInfo.servings <= 0) {
          stepErrors.push('Antal portioner måste vara större än 0');
        }
        break;

      case 'ingredients':
        if (data.ingredients.length === 0) {
          stepErrors.push('Du måste lägga till minst en ingrediens');
        }
        data.ingredients.forEach((ingredient, index) => {
          if (ingredient.quantity <= 0) {
            stepErrors.push(`Ingrediens ${ingredient.name}: Mängden måste vara större än 0`);
          }
        });
        break;

      case 'sales-settings':
        if (data.creationType === 'menu-item') {
          if (data.salesSettings.price <= 0) {
            stepErrors.push('Priset måste vara större än 0');
          }
          if (data.salesSettings.margin < 0) {
            stepErrors.push('Marginalen kan inte vara negativ');
          }
        }
        break;

      default:
        // No validation needed for other steps
        break;
    }

    return stepErrors;
  }, [data]);

  const setErrors = useCallback((newErrors: string[]) => {
    setErrors(newErrors);
  }, []);

  // History management
  const saveToHistory = useCallback(() => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ ...data });

      // Limit history size to prevent memory issues
      if (newHistory.length > 50) {
        newHistory.shift();
      } else {
        setHistoryIndex(prev => prev + 1);
      }

      return newHistory;
    });
  }, [data, historyIndex]);

  const undo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(prev => prev - 1);
      setData(history[historyIndex - 1]);
    }
  }, [canUndo, history, historyIndex]);

  const redo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(prev => prev + 1);
      setData(history[historyIndex + 1]);
    }
  }, [canRedo, history, historyIndex]);

  // Persistence functions
  const saveToStorage = useCallback(() => {
    try {
      const stateToSave = {
        currentStep,
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save wizard state to localStorage:', error);
    }
  }, [currentStep, data]);

  const loadFromStorage = useCallback((): boolean => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return false;

      const parsed = JSON.parse(saved);
      const age = Date.now() - parsed.timestamp;

      // Don't load if older than 2 hours
      if (age > 2 * 60 * 60 * 1000) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }

      // Merge saved data with defaults to handle schema changes
      const mergedData = {
        ...getDefaultWizardData(),
        ...parsed.data,
      };

      setCurrentStep(parsed.currentStep);
      setData(mergedData);

      return true;
    } catch (error) {
      console.warn('Failed to load wizard state from localStorage:', error);
      return false;
    }
  }, []);

  const clearStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Reset function
  const reset = useCallback(() => {
    setCurrentStep('creation-type');
    setData(getDefaultWizardData());
    setErrors([]);
    setHistory([getDefaultWizardData()]);
    setHistoryIndex(0);
    clearStorage();
  }, [clearStorage]);

  return {
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
    updateData,
    validateStep,
    setErrors,
    undo,
    redo,
    reset,
    saveToStorage,
    loadFromStorage,
    clearStorage,
  };
}

// Helper functions for URL management
function getStepFromUrl(pathname: string): WizardStep | null {
  const match = pathname.match(/\/recepthantering\/wizard\/(.+)/);
  if (match && match[1]) {
    const stepId = match[1] as WizardStep;
    const validSteps: WizardStep[] = [
      'creation-type',
      'basic-info',
      'ingredients',
      'preparation',
      'cost-calculation',
      'sales-settings',
      'preview'
    ];
    return validSteps.includes(stepId) ? stepId : null;
  }
  return null;
}

function getUrlForStep(step: WizardStep): string {
  return `${WIZARD_BASE_PATH}/${step}`;
}