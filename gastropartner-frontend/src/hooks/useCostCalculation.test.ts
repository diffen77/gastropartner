/**
 * Unit tests for useCostCalculation hook
 * Tests the live cost calculation functionality, pricing algorithms, and state management
 */

import { renderHook, act } from '@testing-library/react';
import { useCostCalculation, CostCalculationItem } from './useCostCalculation';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock setTimeout and clearTimeout for debouncing tests
jest.useFakeTimers();

describe('useCostCalculation', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    test('initializes with default values', () => {
      const { result } = renderHook(() => useCostCalculation());

      expect(result.current.items).toEqual([]);
      expect(result.current.targetMargin).toBe(30);
      expect(result.current.servings).toBe(1);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.calculation.total_cost).toBe(0);
    });

    test('initializes with custom options', () => {
      const { result } = renderHook(() =>
        useCostCalculation({
          target_margin: 40,
          default_servings: 4,
        })
      );

      expect(result.current.targetMargin).toBe(40);
      expect(result.current.servings).toBe(4);
    });

    test('loads saved preferences from localStorage', () => {
      localStorageMock.setItem(
        'gastropartner_cost_calculator_preferences',
        JSON.stringify({ targetMargin: 35 })
      );

      const { result } = renderHook(() => useCostCalculation());

      expect(result.current.targetMargin).toBe(35);
    });

    test('uses default when localStorage is corrupted', () => {
      localStorageMock.setItem(
        'gastropartner_cost_calculator_preferences',
        'invalid-json'
      );

      const { result } = renderHook(() => useCostCalculation());

      expect(result.current.targetMargin).toBe(30);
    });
  });

  describe('Item Management', () => {
    test('adds items correctly', () => {
      const { result } = renderHook(() => useCostCalculation());

      const testItem: Omit<CostCalculationItem, 'id'> = {
        type: 'ingredient',
        item_id: 'ing-1',
        quantity: 100,
        unit: 'g',
        name: 'Flour',
        cost_per_unit: 0.02,
        unit_base: 'g',
      };

      act(() => {
        result.current.addItem(testItem);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toMatchObject(testItem);
      expect(result.current.items[0].id).toBeDefined();
    });

    test('removes items correctly', () => {
      const { result } = renderHook(() => useCostCalculation());

      const testItem: Omit<CostCalculationItem, 'id'> = {
        type: 'ingredient',
        item_id: 'ing-1',
        quantity: 100,
        unit: 'g',
        name: 'Flour',
        cost_per_unit: 0.02,
        unit_base: 'g',
      };

      act(() => {
        result.current.addItem(testItem);
      });

      const itemId = result.current.items[0].id;

      act(() => {
        result.current.removeItem(itemId);
      });

      expect(result.current.items).toHaveLength(0);
    });

    test('updates items correctly', () => {
      const { result } = renderHook(() => useCostCalculation());

      const testItem: Omit<CostCalculationItem, 'id'> = {
        type: 'ingredient',
        item_id: 'ing-1',
        quantity: 100,
        unit: 'g',
        name: 'Flour',
        cost_per_unit: 0.02,
        unit_base: 'g',
      };

      act(() => {
        result.current.addItem(testItem);
      });

      const itemId = result.current.items[0].id;

      act(() => {
        result.current.updateItem(itemId, { quantity: 200 });
      });

      expect(result.current.items[0].quantity).toBe(200);
    });

    test('clears all items correctly', () => {
      const { result } = renderHook(() => useCostCalculation());

      const testItems: Omit<CostCalculationItem, 'id'>[] = [
        {
          type: 'ingredient',
          item_id: 'ing-1',
          quantity: 100,
          unit: 'g',
          name: 'Flour',
          cost_per_unit: 0.02,
          unit_base: 'g',
        },
        {
          type: 'ingredient',
          item_id: 'ing-2',
          quantity: 50,
          unit: 'g',
          name: 'Sugar',
          cost_per_unit: 0.03,
          unit_base: 'g',
        },
      ];

      act(() => {
        testItems.forEach(item => result.current.addItem(item));
      });

      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.clearItems();
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('Cost Calculations', () => {
    test('calculates total cost correctly for single ingredient', async () => {
      const { result } = renderHook(() => useCostCalculation({ debounce_delay: 0 }));

      const testItem: Omit<CostCalculationItem, 'id'> = {
        type: 'ingredient',
        item_id: 'ing-1',
        quantity: 100,
        unit: 'g',
        name: 'Flour',
        cost_per_unit: 0.02, // 2 öre per gram
        unit_base: 'g',
      };

      act(() => {
        result.current.addItem(testItem);
      });

      // Wait for debounced calculation
      act(() => {
        jest.runAllTimers();
      });

      expect(result.current.calculation.total_cost).toBe(2.0); // 100g * 0.02 kr/g = 2 kr
      expect(result.current.calculation.cost_per_serving).toBe(2.0);
    });

    test('calculates total cost correctly for multiple ingredients', () => {
      const { result } = renderHook(() => useCostCalculation({ debounce_delay: 0 }));

      const testItems: Omit<CostCalculationItem, 'id'>[] = [
        {
          type: 'ingredient',
          item_id: 'ing-1',
          quantity: 100,
          unit: 'g',
          name: 'Flour',
          cost_per_unit: 0.02,
          unit_base: 'g',
        },
        {
          type: 'ingredient',
          item_id: 'ing-2',
          quantity: 50,
          unit: 'g',
          name: 'Sugar',
          cost_per_unit: 0.03,
          unit_base: 'g',
        },
      ];

      act(() => {
        testItems.forEach(item => result.current.addItem(item));
      });

      act(() => {
        jest.runAllTimers();
      });

      // Total: (100 * 0.02) + (50 * 0.03) = 2 + 1.5 = 3.5 kr
      expect(result.current.calculation.total_cost).toBe(3.5);
      expect(result.current.calculation.cost_per_serving).toBe(3.5);
    });

    test('handles unit conversion in cost calculation', () => {
      const { result } = renderHook(() => useCostCalculation({ debounce_delay: 0 }));

      const testItem: Omit<CostCalculationItem, 'id'> = {
        type: 'ingredient',
        item_id: 'ing-1',
        quantity: 100, // Recipe uses 100g
        unit: 'g',
        name: 'Flour',
        cost_per_unit: 20, // Priced per kg (20 kr/kg)
        unit_base: 'kg',
      };

      act(() => {
        result.current.addItem(testItem);
      });

      act(() => {
        jest.runAllTimers();
      });

      // 100g = 0.1kg, 0.1kg * 20 kr/kg = 2 kr
      expect(result.current.calculation.total_cost).toBe(2.0);
    });

    test('calculates cost per serving correctly', () => {
      const { result } = renderHook(() => useCostCalculation({
        default_servings: 4,
        debounce_delay: 0
      }));

      const testItem: Omit<CostCalculationItem, 'id'> = {
        type: 'ingredient',
        item_id: 'ing-1',
        quantity: 400,
        unit: 'g',
        name: 'Flour',
        cost_per_unit: 0.02,
        unit_base: 'g',
      };

      act(() => {
        result.current.addItem(testItem);
      });

      act(() => {
        jest.runAllTimers();
      });

      // Total cost: 400g * 0.02 kr/g = 8 kr
      // Cost per serving: 8 kr / 4 servings = 2 kr per serving
      expect(result.current.calculation.total_cost).toBe(8.0);
      expect(result.current.calculation.cost_per_serving).toBe(2.0);
    });
  });

  describe('Pricing Suggestions', () => {
    test('generates pricing suggestions correctly', () => {
      const { result } = renderHook(() => useCostCalculation({
        target_margin: 30,
        debounce_delay: 0
      }));

      const testItem: Omit<CostCalculationItem, 'id'> = {
        type: 'ingredient',
        item_id: 'ing-1',
        quantity: 100,
        unit: 'g',
        name: 'Flour',
        cost_per_unit: 0.07, // 7 öre per gram, total cost = 7 kr
        unit_base: 'g',
      };

      act(() => {
        result.current.addItem(testItem);
      });

      act(() => {
        jest.runAllTimers();
      });

      expect(result.current.calculation.pricing_suggestions).toHaveLength(5);

      // Test 30% margin suggestion (recommended)
      const recommendedSuggestion = result.current.calculation.pricing_suggestions.find(s => s.is_recommended);
      expect(recommendedSuggestion).toBeDefined();
      expect(recommendedSuggestion!.target_margin).toBe(30);
      expect(recommendedSuggestion!.suggested_price).toBeCloseTo(10, 2); // 7 / (1 - 0.3) = 10 kr
      expect(recommendedSuggestion!.profit_amount).toBeCloseTo(3, 2); // 10 - 7 = 3 kr profit
    });

    test('calculates suggested price based on target margin', () => {
      const { result } = renderHook(() => useCostCalculation({
        target_margin: 40,
        debounce_delay: 0
      }));

      const testItem: Omit<CostCalculationItem, 'id'> = {
        type: 'ingredient',
        item_id: 'ing-1',
        quantity: 100,
        unit: 'g',
        name: 'Flour',
        cost_per_unit: 0.06, // Total cost = 6 kr
        unit_base: 'g',
      };

      act(() => {
        result.current.addItem(testItem);
      });

      act(() => {
        jest.runAllTimers();
      });

      // With 40% margin: price = 6 / (1 - 0.4) = 10 kr
      expect(result.current.calculation.suggested_price).toBeCloseTo(10, 2);
    });
  });

  describe('Margin Status', () => {
    test('returns excellent status for high margins', () => {
      const { result } = renderHook(() => useCostCalculation({
        target_margin: 30,
        debounce_delay: 0
      }));

      const testItem: Omit<CostCalculationItem, 'id'> = {
        type: 'ingredient',
        item_id: 'ing-1',
        quantity: 100,
        unit: 'g',
        name: 'Flour',
        cost_per_unit: 0.05, // Low cost for high margin
        unit_base: 'g',
      };

      act(() => {
        result.current.addItem(testItem);
      });

      act(() => {
        jest.runAllTimers();
      });

      // High margin should be excellent (>= target * 1.2 = 36%)
      expect(result.current.calculation.margin_status.status).toBe('excellent');
      expect(result.current.calculation.margin_status.color).toBe('#10b981');
    });

    test('returns good status for target margins', () => {
      const { result } = renderHook(() => useCostCalculation({
        target_margin: 30,
        debounce_delay: 0
      }));

      const testItem: Omit<CostCalculationItem, 'id'> = {
        type: 'ingredient',
        item_id: 'ing-1',
        quantity: 100,
        unit: 'g',
        name: 'Flour',
        cost_per_unit: 0.07, // Cost that gives exactly 30% margin
        unit_base: 'g',
      };

      act(() => {
        result.current.addItem(testItem);
      });

      act(() => {
        jest.runAllTimers();
      });

      // Should be exactly at target (30%)
      expect(result.current.calculation.current_margin).toBeCloseTo(30, 1);
      expect(result.current.calculation.margin_status.status).toBe('good');
    });

    test('returns danger status for very low margins', () => {
      const { result } = renderHook(() => useCostCalculation({
        target_margin: 30,
        debounce_delay: 0
      }));

      const testItem: Omit<CostCalculationItem, 'id'> = {
        type: 'ingredient',
        item_id: 'ing-1',
        quantity: 100,
        unit: 'g',
        name: 'Expensive Ingredient',
        cost_per_unit: 0.15, // Very high cost for low margin
        unit_base: 'g',
      };

      act(() => {
        result.current.addItem(testItem);
      });

      act(() => {
        jest.runAllTimers();
      });

      // Very low margin should be danger (< target * 0.7 = 21%)
      expect(result.current.calculation.margin_status.status).toBe('danger');
      expect(result.current.calculation.margin_status.color).toBe('#dc2626');
    });
  });

  describe('Settings Management', () => {
    test('updates target margin and saves to localStorage', () => {
      const { result } = renderHook(() => useCostCalculation());

      act(() => {
        result.current.setTargetMargin(35);
      });

      expect(result.current.targetMargin).toBe(35);
      expect(JSON.parse(localStorageMock.getItem('gastropartner_cost_calculator_preferences')!))
        .toEqual({ targetMargin: 35 });
    });

    test('updates servings correctly', () => {
      const { result } = renderHook(() => useCostCalculation());

      act(() => {
        result.current.setServings(6);
      });

      expect(result.current.servings).toBe(6);
    });

    test('recalculates when servings change', () => {
      const { result } = renderHook(() => useCostCalculation({ debounce_delay: 0 }));

      const testItem: Omit<CostCalculationItem, 'id'> = {
        type: 'ingredient',
        item_id: 'ing-1',
        quantity: 600,
        unit: 'g',
        name: 'Flour',
        cost_per_unit: 0.01,
        unit_base: 'g',
      };

      act(() => {
        result.current.addItem(testItem);
      });

      act(() => {
        jest.runAllTimers();
      });

      // Initial: 1 serving, cost per serving = 6 kr
      expect(result.current.calculation.cost_per_serving).toBe(6.0);

      act(() => {
        result.current.setServings(3);
      });

      act(() => {
        jest.runAllTimers();
      });

      // After change: 3 servings, cost per serving = 2 kr
      expect(result.current.calculation.cost_per_serving).toBe(2.0);
    });
  });

  describe('Performance and Debouncing', () => {
    test('debounces calculations to prevent excessive updates', () => {
      const { result } = renderHook(() => useCostCalculation({ debounce_delay: 300 }));

      const testItem: Omit<CostCalculationItem, 'id'> = {
        type: 'ingredient',
        item_id: 'ing-1',
        quantity: 100,
        unit: 'g',
        name: 'Flour',
        cost_per_unit: 0.02,
        unit_base: 'g',
      };

      act(() => {
        result.current.addItem(testItem);
      });

      // Should be loading initially
      expect(result.current.loading).toBe(true);

      // Fast forward time but not enough for debounce
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Still loading
      expect(result.current.loading).toBe(true);

      // Complete debounce delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Now calculation should be complete
      expect(result.current.loading).toBe(false);
      expect(result.current.calculation.total_cost).toBe(2.0);
    });

    test('cancels previous calculations when new ones are triggered', () => {
      const { result } = renderHook(() => useCostCalculation({ debounce_delay: 300 }));

      const testItem1: Omit<CostCalculationItem, 'id'> = {
        type: 'ingredient',
        item_id: 'ing-1',
        quantity: 100,
        unit: 'g',
        name: 'Flour',
        cost_per_unit: 0.02,
        unit_base: 'g',
      };

      const testItem2: Omit<CostCalculationItem, 'id'> = {
        type: 'ingredient',
        item_id: 'ing-2',
        quantity: 50,
        unit: 'g',
        name: 'Sugar',
        cost_per_unit: 0.03,
        unit_base: 'g',
      };

      // Add first item
      act(() => {
        result.current.addItem(testItem1);
      });

      // Add second item before first calculation completes
      act(() => {
        jest.advanceTimersByTime(100);
        result.current.addItem(testItem2);
      });

      // Complete all timers
      act(() => {
        jest.runAllTimers();
      });

      // Should have calculated with both items
      expect(result.current.calculation.total_cost).toBe(3.5); // Both items
    });
  });

  describe('Error Handling', () => {
    test('handles calculation errors gracefully', () => {
      const { result } = renderHook(() => useCostCalculation({ debounce_delay: 0 }));

      const testItem: Omit<CostCalculationItem, 'id'> = {
        type: 'ingredient',
        item_id: 'ing-1',
        quantity: NaN, // Invalid quantity
        unit: 'g',
        name: 'Flour',
        cost_per_unit: 0.02,
        unit_base: 'g',
      };

      act(() => {
        result.current.addItem(testItem);
      });

      act(() => {
        jest.runAllTimers();
      });

      // Should handle NaN gracefully
      expect(result.current.calculation.total_cost).toBe(0);
    });
  });
});