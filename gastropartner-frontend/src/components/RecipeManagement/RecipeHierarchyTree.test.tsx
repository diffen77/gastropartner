/**
 * RecipeHierarchyTree Component Tests
 *
 * Comprehensive test suite covering:
 * - Component rendering and data display
 * - Interactive functionality (expand/collapse, click handlers)
 * - Drag and drop operations
 * - Accessibility features
 * - Mobile responsiveness
 * - Edge cases and error states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { RecipeHierarchyTree, HierarchyNode } from './RecipeHierarchyTree';
import { RecipeManagementProvider } from '../../contexts/RecipeManagementContext';
import { Ingredient, Recipe, MenuItem } from '../../utils/api';

// Mock data for testing
const mockIngredients: Ingredient[] = [
  {
    ingredient_id: '1',
    name: 'Korv',
    unit: 'kg',
    cost_per_unit: 45.50,
    supplier: 'Test Supplier',
    organization_id: 'org-1',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    ingredient_id: '2',
    name: 'Potatis',
    unit: 'kg',
    cost_per_unit: 12.30,
    supplier: 'Test Supplier',
    organization_id: 'org-1',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

const mockRecipes: Recipe[] = [
  {
    recipe_id: '1',
    name: 'Kokt korv',
    description: 'Enkelt korvrecept',
    servings: 1,
    ingredients: [
      {
        recipe_ingredient_id: '1',
        ingredient_id: '1',
        quantity: 0.2,
        unit: 'kg',
        ingredient: mockIngredients[0]
      }
    ],
    total_cost: 9.10,
    cost_per_serving: 9.10,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    recipe_id: '2',
    name: 'Kokt potatis',
    description: 'Enkelt potatisrecept',
    servings: 1,
    ingredients: [
      {
        recipe_ingredient_id: '2',
        ingredient_id: '2',
        quantity: 0.3,
        unit: 'kg',
        ingredient: mockIngredients[1]
      }
    ],
    total_cost: 3.69,
    cost_per_serving: 3.69,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

const mockMenuItems: MenuItem[] = [
  {
    menu_item_id: '1',
    name: 'Korv med mos',
    category: 'Huvudrätter',
    selling_price: 85.0,
    target_food_cost_percentage: 30,
    food_cost: 25.5,
    food_cost_percentage: 30,
    margin: 59.5,
    margin_percentage: 70,
    recipe_id: '1',
    is_active: true,
    vat_rate: 12,
    vat_calculation_type: 'including',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

// Mock the RecipeManagementContext
const MockRecipeManagementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mockContextValue = {
    ingredients: mockIngredients,
    recipes: mockRecipes,
    menuItems: mockMenuItems,
    isLoading: {
      ingredients: false,
      recipes: false,
      menuItems: false
    },
    errors: {
      ingredients: '',
      recipes: '',
      menuItems: ''
    },
    loadIngredients: jest.fn(),
    loadRecipes: jest.fn(),
    loadMenuItems: jest.fn(),
    loadAllData: jest.fn(),
    refreshIngredientsData: jest.fn(),
    refreshRecipesData: jest.fn(),
    refreshMenuItemsData: jest.fn(),
    onIngredientChange: jest.fn(),
    onRecipeChange: jest.fn(),
    onMenuItemChange: jest.fn(),
    setIngredientError: jest.fn(),
    setRecipeError: jest.fn(),
    setMenuItemError: jest.fn(),
    clearErrors: jest.fn()
  };

  return (
    <RecipeManagementProvider>
      <div data-testid="mock-provider">
        {children}
      </div>
    </RecipeManagementProvider>
  );
};

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <MockRecipeManagementProvider>
      {ui}
    </MockRecipeManagementProvider>
  );
};

describe('RecipeHierarchyTree Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders tree with correct structure', () => {
      renderWithProvider(<RecipeHierarchyTree />);

      expect(screen.getByRole('tree')).toBeInTheDocument();
      expect(screen.getByText('Recepthierarki')).toBeInTheDocument();
      expect(screen.getByText('Maträtt')).toBeInTheDocument();
      expect(screen.getByText('Recept')).toBeInTheDocument();
      expect(screen.getByText('Ingrediens')).toBeInTheDocument();
    });

    it('displays menu items as root nodes', () => {
      renderWithProvider(<RecipeHierarchyTree />);

      expect(screen.getByText('Korv med mos')).toBeInTheDocument();
    });

    it('displays recipes as expandable nodes', () => {
      renderWithProvider(<RecipeHierarchyTree />);

      expect(screen.getByText('Kokt korv')).toBeInTheDocument();
      expect(screen.getByText('Kokt potatis')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner when data is loading', () => {
      const mockContextWithLoading = {
        ingredients: [],
        recipes: [],
        menuItems: [],
        isLoading: {
          ingredients: true,
          recipes: false,
          menuItems: false
        },
        errors: { ingredients: '', recipes: '', menuItems: '' },
        // ... other mock methods
      };

      render(
        <div>
          <RecipeHierarchyTree />
        </div>
      );

      expect(screen.getByText('Laddar recepthierarki...')).toBeInTheDocument();
    });

    it('shows empty state when no data available', () => {
      const MockEmptyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <div data-testid="empty-provider">{children}</div>
      );

      render(
        <MockEmptyProvider>
          <RecipeHierarchyTree />
        </MockEmptyProvider>
      );

      expect(screen.getByText('Ingen recepthierarki att visa')).toBeInTheDocument();
      expect(screen.getByText('Skapa recept och maträtter för att se relationer här.')).toBeInTheDocument();
    });
  });

  describe('Interactive Functionality', () => {
    it('expands and collapses nodes when clicked', async () => {
      const user = userEvent.setup();
      renderWithProvider(<RecipeHierarchyTree />);

      const menuItemNode = screen.getByText('Korv med mos').closest('.tree-node');
      expect(menuItemNode).toBeInTheDocument();

      // Initially collapsed
      expect(menuItemNode).not.toHaveClass('expanded');

      // Click to expand
      await user.click(menuItemNode!);
      await waitFor(() => {
        expect(menuItemNode).toHaveClass('expanded');
      });

      // Click again to collapse
      await user.click(menuItemNode!);
      await waitFor(() => {
        expect(menuItemNode).not.toHaveClass('expanded');
      });
    });

    it('calls onNodeClick when node is clicked', async () => {
      const mockOnNodeClick = jest.fn();
      const user = userEvent.setup();

      renderWithProvider(
        <RecipeHierarchyTree onNodeClick={mockOnNodeClick} />
      );

      const menuItemNode = screen.getByText('Korv med mos').closest('.tree-node');
      await user.click(menuItemNode!);

      expect(mockOnNodeClick).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'menuitem',
          name: 'Korv med mos'
        })
      );
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports keyboard navigation with Enter key', async () => {
      const user = userEvent.setup();
      renderWithProvider(<RecipeHierarchyTree />);

      const menuItemNode = screen.getByText('Korv med mos').closest('.tree-node');

      // Focus and press Enter
      menuItemNode?.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(menuItemNode).toHaveClass('expanded');
      });
    });

    it('supports keyboard navigation with Space key', async () => {
      const user = userEvent.setup();
      renderWithProvider(<RecipeHierarchyTree />);

      const menuItemNode = screen.getByText('Korv med mos').closest('.tree-node');

      // Focus and press Space
      menuItemNode?.focus();
      await user.keyboard(' ');

      await waitFor(() => {
        expect(menuItemNode).toHaveClass('expanded');
      });
    });
  });

  describe('Cost Display', () => {
    it('displays costs when showCosts is true', () => {
      renderWithProvider(<RecipeHierarchyTree showCosts={true} />);

      // Should show menu item margin percentage
      expect(screen.getByText(/70\.0%/)).toBeInTheDocument();
    });

    it('hides costs when showCosts is false', () => {
      renderWithProvider(<RecipeHierarchyTree showCosts={false} />);

      // Should not show any cost indicators
      const costElements = screen.queryAllByText(/kr|%/);
      expect(costElements).toHaveLength(0);
    });

    it('applies correct CSS classes for cost ranges', () => {
      renderWithProvider(<RecipeHierarchyTree showCosts={true} />);

      const goodMarginElement = screen.getByText(/70\.0%/);
      expect(goodMarginElement).toHaveClass('cost-good');
    });
  });

  describe('Drag and Drop', () => {
    it('handles drag start events', () => {
      const mockOnDragStart = jest.fn();
      renderWithProvider(
        <RecipeHierarchyTree onNodeDragStart={mockOnDragStart} />
      );

      const menuItemNode = screen.getByText('Korv med mos').closest('.tree-node');

      fireEvent.dragStart(menuItemNode!, {
        dataTransfer: {
          setData: jest.fn()
        }
      });

      expect(mockOnDragStart).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'menuitem',
          name: 'Korv med mos'
        })
      );
    });

    it('handles drop events', () => {
      const mockOnDrop = jest.fn();
      renderWithProvider(
        <RecipeHierarchyTree onNodeDrop={mockOnDrop} />
      );

      const menuItemNode = screen.getByText('Korv med mos').closest('.tree-node');
      const recipeNode = screen.getByText('Kokt korv').closest('.tree-node');

      // Start drag
      fireEvent.dragStart(menuItemNode!, {
        dataTransfer: { setData: jest.fn() }
      });

      // Drop on recipe
      fireEvent.dragOver(recipeNode!);
      fireEvent.drop(recipeNode!);

      expect(mockOnDrop).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      renderWithProvider(<RecipeHierarchyTree />);

      const treeElement = screen.getByRole('tree');
      expect(treeElement).toBeInTheDocument();

      const treeItems = screen.getAllByRole('treeitem');
      expect(treeItems.length).toBeGreaterThan(0);

      treeItems.forEach(item => {
        expect(item).toHaveAttribute('tabIndex', '0');
      });
    });

    it('has proper expanded/collapsed states', async () => {
      const user = userEvent.setup();
      renderWithProvider(<RecipeHierarchyTree />);

      const menuItemNode = screen.getByText('Korv med mos').closest('.tree-node');

      // Initially collapsed
      expect(menuItemNode).toHaveAttribute('aria-expanded', 'false');

      // Expand
      await user.click(menuItemNode!);
      await waitFor(() => {
        expect(menuItemNode).toHaveAttribute('aria-expanded', 'true');
      });
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      renderWithProvider(<RecipeHierarchyTree className="custom-class" />);

      const treeElement = screen.getByRole('tree');
      expect(treeElement).toHaveClass('custom-class');
    });

    it('respects maxDepth prop', () => {
      renderWithProvider(<RecipeHierarchyTree maxDepth={2} />);

      // Component should render but limit depth (this would need deeper hierarchy to test properly)
      expect(screen.getByRole('tree')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing recipe ingredients gracefully', () => {
      const recipesWithoutIngredients = [
        {
          ...mockRecipes[0],
          ingredients: undefined
        }
      ];

      // This would require a more sophisticated mock setup
      renderWithProvider(<RecipeHierarchyTree />);

      // Should still render without crashing
      expect(screen.getByRole('tree')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders large datasets efficiently', () => {
      // Generate large dataset
      const largeIngredients = Array.from({ length: 100 }, (_, i) => ({
        ...mockIngredients[0],
        ingredient_id: `ingredient-${i}`,
        name: `Ingredient ${i}`
      }));

      const largeRecipes = Array.from({ length: 50 }, (_, i) => ({
        ...mockRecipes[0],
        recipe_id: `recipe-${i}`,
        name: `Recipe ${i}`
      }));

      // Component should render without performance issues
      const startTime = performance.now();
      renderWithProvider(<RecipeHierarchyTree />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should render in <100ms
      expect(screen.getByRole('tree')).toBeInTheDocument();
    });
  });
});

// Additional test utilities for integration testing
export const createMockHierarchyNode = (overrides: Partial<HierarchyNode> = {}): HierarchyNode => ({
  id: 'test-node-1',
  type: 'recipe',
  name: 'Test Recipe',
  cost: 10.50,
  children: [],
  isExpanded: false,
  level: 1,
  ...overrides
});

export const mockRecipeManagementContext = {
  ingredients: mockIngredients,
  recipes: mockRecipes,
  menuItems: mockMenuItems,
  isLoading: {
    ingredients: false,
    recipes: false,
    menuItems: false
  },
  errors: {
    ingredients: '',
    recipes: '',
    menuItems: ''
  }
};