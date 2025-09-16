/**
 * Recipe Management Context - Centralized State Management
 *
 * This context provides centralized state management for the integrated recipe management
 * module, handling ingredients, recipes, and menu items with dependency-aware data
 * synchronization.
 *
 * Key Features:
 * - Centralized data store for all recipe-related entities
 * - Dependency-aware refresh logic (ingredients → recipes → menu items)
 * - Per-entity loading and error states
 * - Performance-optimized with useCallback for stable references
 * - Cross-tab data synchronization
 *
 * Data Flow:
 * 1. Ingredient changes trigger recipe and menu item refresh (cost calculations)
 * 2. Recipe changes trigger menu item refresh (recipe-based menu items)
 * 3. Menu item changes are isolated (no downstream dependencies)
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Ingredient, Recipe, MenuItem, apiClient } from '../utils/api';

// State interface - contains all data and loading/error states
interface RecipeManagementState {
  ingredients: Ingredient[];         // All ingredients for current organization
  recipes: Recipe[];                 // All recipes for current organization
  menuItems: MenuItem[];             // All menu items for current organization
  isLoading: {                       // Loading states per entity type
    ingredients: boolean;
    recipes: boolean;
    menuItems: boolean;
  };
  errors: {                          // Error messages per entity type
    ingredients: string;
    recipes: string;
    menuItems: string;
  };
}

// Actions interface - defines all available operations
interface RecipeManagementActions {
  // Initial data loading with loading state management
  loadIngredients: () => Promise<void>;      // Load ingredients with loading state
  loadRecipes: () => Promise<void>;          // Load recipes with loading state
  loadMenuItems: () => Promise<void>;        // Load menu items with loading state
  loadAllData: () => Promise<void>;          // Load all data types in parallel

  // Silent data refresh (no loading state changes)
  refreshIngredientsData: () => Promise<void>;
  refreshRecipesData: () => Promise<void>;
  refreshMenuItemsData: () => Promise<void>;

  // Dependency-aware refresh functions for cross-tab synchronization
  onIngredientChange: () => Promise<void>;   // Refresh ingredients → recipes → menu items
  onRecipeChange: () => Promise<void>;       // Refresh recipes → menu items
  onMenuItemChange: () => Promise<void>;     // Refresh menu items only

  // Error state management
  setIngredientError: (error: string) => void;
  setRecipeError: (error: string) => void;
  setMenuItemError: (error: string) => void;
  clearErrors: () => void;                   // Clear all error states
}

type RecipeManagementContextType = RecipeManagementState & RecipeManagementActions;

const RecipeManagementContext = createContext<RecipeManagementContextType | null>(null);

// Custom hook to use the context
export function useRecipeManagement() {
  const context = useContext(RecipeManagementContext);
  if (!context) {
    throw new Error('useRecipeManagement must be used within a RecipeManagementProvider');
  }
  return context;
}

// Provider component
interface RecipeManagementProviderProps {
  children: ReactNode;
}

export function RecipeManagementProvider({ children }: RecipeManagementProviderProps) {
  const [state, setState] = useState<RecipeManagementState>({
    ingredients: [],
    recipes: [],
    menuItems: [],
    isLoading: {
      ingredients: false,
      recipes: false,
      menuItems: false,
    },
    errors: {
      ingredients: '',
      recipes: '',
      menuItems: '',
    },
  });

  // Helper function to update loading state
  const setLoading = useCallback((entity: keyof RecipeManagementState['isLoading'], loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: {
        ...prev.isLoading,
        [entity]: loading,
      },
    }));
  }, []);

  // Helper function to update error state
  const setError = useCallback((entity: keyof RecipeManagementState['errors'], error: string) => {
    setState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [entity]: error,
      },
    }));
  }, []);

  // Load ingredients
  const loadIngredients = useCallback(async () => {
    setLoading('ingredients', true);
    try {
      const ingredients = await apiClient.getIngredients();
      setState(prev => ({
        ...prev,
        ingredients,
        errors: { ...prev.errors, ingredients: '' },
      }));
    } catch (err) {
      console.error('Failed to load ingredients:', err);
      setError('ingredients', 'Kunde inte ladda ingredienser');
    } finally {
      setLoading('ingredients', false);
    }
  }, [setLoading, setError]);

  // Load recipes
  const loadRecipes = useCallback(async () => {
    setLoading('recipes', true);
    try {
      const recipes = await apiClient.getRecipes();
      setState(prev => ({
        ...prev,
        recipes,
        errors: { ...prev.errors, recipes: '' },
      }));
    } catch (err) {
      console.error('Failed to load recipes:', err);
      setError('recipes', 'Kunde inte ladda recept');
    } finally {
      setLoading('recipes', false);
    }
  }, [setLoading, setError]);

  // Load menu items
  const loadMenuItems = useCallback(async () => {
    setLoading('menuItems', true);
    try {
      const menuItems = await apiClient.getMenuItems();
      setState(prev => ({
        ...prev,
        menuItems,
        errors: { ...prev.errors, menuItems: '' },
      }));
    } catch (err) {
      console.error('Failed to load menu items:', err);
      setError('menuItems', 'Kunde inte ladda maträtter');
    } finally {
      setLoading('menuItems', false);
    }
  }, [setLoading, setError]);

  // Load all data
  const loadAllData = useCallback(async () => {
    await Promise.all([
      loadIngredients(),
      loadRecipes(),
      loadMenuItems(),
    ]);
  }, [loadIngredients, loadRecipes, loadMenuItems]);

  // Refresh functions (for manual refresh without loading state)
  const refreshIngredientsData = useCallback(async () => {
    try {
      const ingredients = await apiClient.getIngredients();
      setState(prev => ({
        ...prev,
        ingredients,
        errors: { ...prev.errors, ingredients: '' },
      }));
    } catch (err) {
      console.error('Failed to refresh ingredients:', err);
      setError('ingredients', 'Kunde inte uppdatera ingredienser');
    }
  }, [setError]);

  const refreshRecipesData = useCallback(async () => {
    try {
      const recipes = await apiClient.getRecipes();
      setState(prev => ({
        ...prev,
        recipes,
        errors: { ...prev.errors, recipes: '' },
      }));
    } catch (err) {
      console.error('Failed to refresh recipes:', err);
      setError('recipes', 'Kunde inte uppdatera recept');
    }
  }, [setError]);

  const refreshMenuItemsData = useCallback(async () => {
    try {
      const menuItems = await apiClient.getMenuItems();
      setState(prev => ({
        ...prev,
        menuItems,
        errors: { ...prev.errors, menuItems: '' },
      }));
    } catch (err) {
      console.error('Failed to refresh menu items:', err);
      setError('menuItems', 'Kunde inte uppdatera maträtter');
    }
  }, [setError]);

  // Dependency-aware change handlers - Core of the cross-tab synchronization system
  // These functions implement the cascade refresh logic based on data dependencies

  /**
   * Handle ingredient changes - triggers full cascade refresh
   *
   * When ingredients change (cost, availability, etc.), it affects:
   * 1. Recipe costs (calculated from ingredient costs)
   * 2. Menu item profitability (calculated from recipe costs)
   *
   * This is the most impactful change type as it affects everything downstream.
   */
  const onIngredientChange = useCallback(async () => {
    console.log('🧄 Ingredient changed - refreshing dependent data');
    await Promise.all([
      refreshIngredientsData(),   // Update ingredient data
      refreshRecipesData(),       // Recipes depend on ingredient costs
      refreshMenuItemsData(),     // Menu items depend on recipe costs (which depend on ingredients)
    ]);
  }, [refreshIngredientsData, refreshRecipesData, refreshMenuItemsData]);

  /**
   * Handle recipe changes - triggers partial cascade refresh
   *
   * When recipes change (ingredients, servings, etc.), it affects:
   * 1. Menu item costs and profitability (if menu items are based on recipes)
   *
   * This is a medium-impact change affecting menu items but not ingredients.
   */
  const onRecipeChange = useCallback(async () => {
    console.log('📝 Recipe changed - refreshing dependent data');
    await Promise.all([
      refreshRecipesData(),       // Update recipe data
      refreshMenuItemsData(),     // Menu items depend on recipe costs
    ]);
  }, [refreshRecipesData, refreshMenuItemsData]);

  /**
   * Handle menu item changes - isolated refresh
   *
   * When menu items change (pricing, categories, etc.), no other entities are affected.
   * This is the least impactful change type with no downstream dependencies.
   */
  const onMenuItemChange = useCallback(async () => {
    console.log('🍽️ Menu item changed - refreshing data');
    await refreshMenuItemsData(); // Only menu items need updating
  }, [refreshMenuItemsData]);

  // Error management functions
  const setIngredientError = useCallback((error: string) => {
    setError('ingredients', error);
  }, [setError]);

  const setRecipeError = useCallback((error: string) => {
    setError('recipes', error);
  }, [setError]);

  const setMenuItemError = useCallback((error: string) => {
    setError('menuItems', error);
  }, [setError]);

  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: {
        ingredients: '',
        recipes: '',
        menuItems: '',
      },
    }));
  }, []);

  const contextValue: RecipeManagementContextType = {
    // State
    ...state,

    // Actions
    loadIngredients,
    loadRecipes,
    loadMenuItems,
    loadAllData,
    refreshIngredientsData,
    refreshRecipesData,
    refreshMenuItemsData,
    onIngredientChange,
    onRecipeChange,
    onMenuItemChange,
    setIngredientError,
    setRecipeError,
    setMenuItemError,
    clearErrors,
  };

  return (
    <RecipeManagementContext.Provider value={contextValue}>
      {children}
    </RecipeManagementContext.Provider>
  );
}

// Export the context for advanced usage
export { RecipeManagementContext };