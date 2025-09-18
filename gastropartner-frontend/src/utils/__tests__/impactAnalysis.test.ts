import {
  ImpactAnalysisService,
  RecipeImpactAnalysis,
  AffectedMenuItem,
  PriceSuggestion
} from '../impactAnalysis';
import { apiClient, Recipe, MenuItem, RecipeCreate } from '../api';

// Mock the API client
jest.mock('../api', () => ({
  apiClient: {
    getMenuItems: jest.fn(),
    getRecipe: jest.fn(),
    getIngredients: jest.fn(),
    updateRecipe: jest.fn(),
    updateMenuItem: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('ImpactAnalysisService', () => {
  let service: ImpactAnalysisService;

  beforeEach(() => {
    service = new ImpactAnalysisService();
    jest.clearAllMocks();
  });

  // Mock data for testing
  const mockRecipe: Recipe = {
    recipe_id: 'recipe-1',
    name: 'Tomatsås',
    description: 'Grundsås för pasta',
    servings: 4,
    cost_per_serving: 15.50,
    is_active: true,
    organization_id: 'org-1',
    ingredients: [
      {
        ingredient_id: 'ing-1',
        name: 'Tomater',
        amount: 400,
        unit: 'g',
        cost: 12.00
      },
      {
        ingredient_id: 'ing-2',
        name: 'Vitlök',
        amount: 2,
        unit: 'st',
        cost: 2.00
      }
    ],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  const mockMenuItems: MenuItem[] = [
    {
      menu_item_id: 'menu-1',
      name: 'Spagetti Bolognese',
      recipe_id: 'recipe-1',
      current_price: 120.00,
      cost_per_serving: 45.00,
      margin_percentage: 62.5,
      organization_id: 'org-1',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      menu_item_id: 'menu-2',
      name: 'Pasta Arrabiata',
      recipe_id: 'recipe-1',
      current_price: 95.00,
      cost_per_serving: 38.00,
      margin_percentage: 60.0,
      organization_id: 'org-1',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      menu_item_id: 'menu-3',
      name: 'Fisk och Chips',
      recipe_id: 'recipe-2', // Different recipe - should not be affected
      current_price: 150.00,
      cost_per_serving: 65.00,
      margin_percentage: 56.7,
      organization_id: 'org-1',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ];

  const mockRecipeChanges: RecipeCreate = {
    name: 'Tomatsås (Förbättrad)',
    description: 'Förbättrad grundsås för pasta',
    servings: 4,
    ingredients: [
      {
        ingredient_id: 'ing-1',
        name: 'Tomater',
        amount: 500, // Increased from 400g
        unit: 'g',
        cost: 15.00 // Increased cost
      },
      {
        ingredient_id: 'ing-2',
        name: 'Vitlök',
        amount: 3, // Increased from 2
        unit: 'st',
        cost: 3.00 // Increased cost
      }
    ]
  };

  describe('analyzeRecipeImpact', () => {
    beforeEach(() => {
      mockApiClient.getMenuItems.mockResolvedValue(mockMenuItems);
      mockApiClient.getRecipe.mockResolvedValue(mockRecipe);
      mockApiClient.getIngredients.mockResolvedValue([]);
    });

    it('should identify affected menu items correctly', async () => {
      const result = await service.analyzeRecipeImpact('recipe-1', mockRecipeChanges);

      expect(result.recipe_id).toBe('recipe-1');
      expect(result.recipe_name).toBe('Tomatsås');
      expect(result.affected_menu_items).toHaveLength(2);
      expect(result.total_affected_items).toBe(2);

      // Only items with recipe_id 'recipe-1' should be affected
      const menuItemIds = result.affected_menu_items.map(item => item.menu_item_id);
      expect(menuItemIds).toContain('menu-1');
      expect(menuItemIds).toContain('menu-2');
      expect(menuItemIds).not.toContain('menu-3');
    });

    it('should calculate cost differences', async () => {
      const result = await service.analyzeRecipeImpact('recipe-1', mockRecipeChanges);

      expect(result.estimated_cost_before).toBeGreaterThan(0);
      expect(result.estimated_cost_after).toBeGreaterThan(result.estimated_cost_before);
      expect(result.cost_difference).toBeGreaterThan(0);
      expect(result.cost_difference_percentage).toBeGreaterThan(0);
    });

    it('should assign risk levels to affected items', async () => {
      const result = await service.analyzeRecipeImpact('recipe-1', mockRecipeChanges);

      result.affected_menu_items.forEach(item => {
        expect(['low', 'medium', 'high', 'critical']).toContain(item.risk_level);
        expect(item.menu_item_id).toBeDefined();
        expect(item.name).toBeDefined();
        expect(item.current_selling_price).toBeGreaterThan(0);
        expect(item.current_food_cost).toBeGreaterThan(0);
      });
    });

    it('should generate price suggestions', async () => {
      const result = await service.analyzeRecipeImpact('recipe-1', mockRecipeChanges);

      expect(result.price_suggestions).toBeDefined();
      expect(Array.isArray(result.price_suggestions)).toBe(true);

      result.price_suggestions.forEach(suggestion => {
        expect(suggestion.menu_item_id).toBeDefined();
        expect(suggestion.current_price).toBeGreaterThan(0);
        expect(suggestion.suggested_price).toBeGreaterThan(0);
        expect(suggestion.confidence_score).toBeGreaterThanOrEqual(0);
        expect(suggestion.confidence_score).toBeLessThanOrEqual(1);
        expect(suggestion.reason).toBeDefined();
      });
    });

    it('should handle recipes with no affected menu items', async () => {
      mockApiClient.getMenuItems.mockResolvedValue([]);

      const result = await service.analyzeRecipeImpact('recipe-1', mockRecipeChanges);

      expect(result.affected_menu_items).toHaveLength(0);
      expect(result.total_affected_items).toBe(0);
      expect(result.price_suggestions).toHaveLength(0);
      expect(result.recipe_id).toBe('recipe-1');
    });

    it('should handle API errors gracefully', async () => {
      mockApiClient.getMenuItems.mockRejectedValue(new Error('API Error'));

      await expect(service.analyzeRecipeImpact('recipe-1', mockRecipeChanges))
        .rejects.toThrow('Impact analysis failed');
    });
  });

  describe('performBatchRecipeUpdate', () => {
    const mockPriceSuggestions: PriceSuggestion[] = [
      {
        menu_item_id: 'menu-1',
        current_price: 120.00,
        suggested_price: 130.00,
        price_increase: 10.00,
        price_increase_percentage: 8.33,
        target_margin_percentage: 30,
        confidence_score: 0.8,
        reason: 'Adjusting for increased ingredient costs while maintaining 30% target margin'
      }
    ];

    beforeEach(() => {
      mockApiClient.updateRecipe.mockResolvedValue(mockRecipe);
      mockApiClient.updateMenuItem.mockResolvedValue({} as any);
    });

    it('should update recipe successfully', async () => {
      const result = await service.performBatchRecipeUpdate(
        'recipe-1',
        mockRecipeChanges,
        false,
        []
      );

      expect(result.success).toBe(true);
      expect(result.recipe_updated).toBe(true);
      expect(mockApiClient.updateRecipe).toHaveBeenCalledWith('recipe-1', mockRecipeChanges);
    });

    it('should apply price suggestions when requested', async () => {
      const result = await service.performBatchRecipeUpdate(
        'recipe-1',
        mockRecipeChanges,
        true,
        mockPriceSuggestions
      );

      expect(result.success).toBe(true);
      expect(result.recipe_updated).toBe(true);
      expect(result.price_updates_applied).toBe(1);

      expect(mockApiClient.updateMenuItem).toHaveBeenCalledWith('menu-1', {
        current_price: 130.00
      });
    });

    it('should handle recipe update failure', async () => {
      mockApiClient.updateRecipe.mockRejectedValue(new Error('Recipe update failed'));

      const result = await service.performBatchRecipeUpdate(
        'recipe-1',
        mockRecipeChanges,
        false,
        []
      );

      expect(result.success).toBe(false);
      expect(result.recipe_updated).toBe(false);
      expect(result.error).toContain('Recipe update failed');
    });

    it('should handle partial menu item update failures', async () => {
      mockApiClient.updateMenuItem.mockRejectedValue(new Error('Menu item update failed'));

      const result = await service.performBatchRecipeUpdate(
        'recipe-1',
        mockRecipeChanges,
        true,
        mockPriceSuggestions
      );

      expect(result.success).toBe(false);
      expect(result.recipe_updated).toBe(true);
      expect(result.price_updates_applied).toBe(0);
      expect(result.failed_updates).toHaveLength(1);
    });
  });

  describe('Error handling and edge cases', () => {
    beforeEach(() => {
      mockApiClient.getMenuItems.mockResolvedValue(mockMenuItems);
      mockApiClient.getRecipe.mockResolvedValue(mockRecipe);
      mockApiClient.getIngredients.mockResolvedValue([]);
    });

    it('should handle zero servings in recipe changes', async () => {
      const zeroServingsChanges: RecipeCreate = {
        ...mockRecipeChanges,
        servings: 0
      };

      await expect(service.analyzeRecipeImpact('recipe-1', zeroServingsChanges))
        .rejects.toThrow();
    });

    it('should handle empty ingredients list', async () => {
      const emptyIngredientsChanges: RecipeCreate = {
        ...mockRecipeChanges,
        ingredients: []
      };

      const result = await service.analyzeRecipeImpact('recipe-1', emptyIngredientsChanges);

      expect(result).toBeDefined();
      expect(result.recipe_id).toBe('recipe-1');
    });

    it('should handle negative cost ingredients', async () => {
      const negativeCostChanges: RecipeCreate = {
        ...mockRecipeChanges,
        ingredients: [
          {
            ingredient_id: 'ing-1',
            name: 'Credit ingredient',
            amount: 1,
            unit: 'st',
            cost: -5.00 // Negative cost
          }
        ]
      };

      const result = await service.analyzeRecipeImpact('recipe-1', negativeCostChanges);

      expect(result).toBeDefined();
      expect(result.recipe_id).toBe('recipe-1');
    });
  });

  describe('Local storage version management', () => {
    beforeEach(() => {
      // Mock localStorage
      const mockLocalStorage = {
        getItem: jest.fn().mockReturnValue('[]'),
        setItem: jest.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });

      mockApiClient.updateRecipe.mockResolvedValue(mockRecipe);
    });

    it('should save version history during batch update', async () => {
      const mockLocalStorage = window.localStorage as jest.Mocked<Storage>;

      await service.performBatchRecipeUpdate(
        'recipe-1',
        mockRecipeChanges,
        false,
        []
      );

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('recipe_versions_recipe-1');
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });
});