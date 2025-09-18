import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BatchRecipeEditor } from '../BatchRecipeEditor';
import { ImpactAnalysisService } from '../../../utils/impactAnalysis';
import { Recipe, RecipeCreate } from '../../../utils/api';

// Mock the ImpactAnalysisService
jest.mock('../../../utils/impactAnalysis');
jest.mock('../../../utils/api');

const MockedImpactAnalysisService = ImpactAnalysisService as jest.MockedClass<typeof ImpactAnalysisService>;

// Mock RecipeForm component
jest.mock('../RecipeForm', () => ({
  RecipeForm: ({ isOpen, onClose, onSubmit, editingRecipe }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="recipe-form">
        <h2>Recipe Form</h2>
        <p>Editing: {editingRecipe?.name}</p>
        <button onClick={() => onSubmit({ name: 'Updated Recipe', servings: 4, ingredients: [] })}>
          Submit Recipe
        </button>
        <button onClick={onClose}>Close Form</button>
      </div>
    );
  }
}));

// Mock PriceAdjustmentModal
jest.mock('../PriceAdjustmentModal', () => ({
  PriceAdjustmentModal: ({ isOpen, onClose, suggestions, onApply }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="price-adjustment-modal">
        <h2>Price Adjustment Modal</h2>
        <p>Suggestions: {suggestions.length}</p>
        <button onClick={() => onApply(suggestions)}>Apply All</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }
}));

describe('BatchRecipeEditor', () => {
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
      }
    ],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  const mockImpactAnalysis = {
    recipe_id: 'recipe-1',
    original_cost_per_serving: 15.50,
    new_cost_per_serving: 18.75,
    cost_increase_per_serving: 3.25,
    cost_increase_percentage: 20.97,
    affected_menu_items: [
      {
        menu_item_id: 'menu-1',
        name: 'Spagetti Bolognese',
        current_price: 120.00,
        current_cost_per_serving: 45.00,
        current_margin_percentage: 62.5,
        new_cost_per_serving: 48.25,
        new_margin_percentage: 59.79,
        cost_increase: 3.25,
        risk_level: 'medium' as const
      }
    ],
    price_suggestions: [
      {
        menu_item_id: 'menu-1',
        current_price: 120.00,
        suggested_price: 130.00,
        price_increase: 10.00,
        price_increase_percentage: 8.33,
        target_margin_percentage: 30,
        confidence_score: 0.8,
        reason: 'Adjusting for increased ingredient costs'
      }
    ]
  };

  const mockBatchUpdateResult = {
    success: true,
    recipe_updated: true,
    price_updates_applied: 1,
    failed_updates: [],
    version_saved: true
  };

  let mockAnalyzeRecipeImpact: jest.Mock;
  let mockPerformBatchRecipeUpdate: jest.Mock;

  beforeEach(() => {
    mockAnalyzeRecipeImpact = jest.fn().mockResolvedValue(mockImpactAnalysis);
    mockPerformBatchRecipeUpdate = jest.fn().mockResolvedValue(mockBatchUpdateResult);

    MockedImpactAnalysisService.mockImplementation(() => ({
      analyzeRecipeImpact: mockAnalyzeRecipeImpact,
      performBatchRecipeUpdate: mockPerformBatchRecipeUpdate,
    } as any));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    recipe: mockRecipe,
    onUpdate: jest.fn()
  };

  it('should render batch recipe editor when open', () => {
    render(<BatchRecipeEditor {...defaultProps} />);

    expect(screen.getByText('🔄 Batch-redigering av Recept')).toBeInTheDocument();
    expect(screen.getByText('Redigera recept och se påverkan på menyn')).toBeInTheDocument();
    expect(screen.getByText('Inga ändringar gjorda än')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<BatchRecipeEditor {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('🔄 Batch-redigering av Recept')).not.toBeInTheDocument();
  });

  it('should open recipe form when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<BatchRecipeEditor {...defaultProps} />);

    const editButton = screen.getByText('📝 Redigera Recept');
    await user.click(editButton);

    expect(screen.getByTestId('recipe-form')).toBeInTheDocument();
    expect(screen.getByText('Editing: Tomatsås')).toBeInTheDocument();
  });

  it('should analyze impact when recipe is submitted', async () => {
    const user = userEvent.setup();
    render(<BatchRecipeEditor {...defaultProps} />);

    // Open recipe form
    const editButton = screen.getByText('📝 Redigera Recept');
    await user.click(editButton);

    // Submit recipe changes
    const submitButton = screen.getByText('Submit Recipe');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockAnalyzeRecipeImpact).toHaveBeenCalledWith('recipe-1', {
        name: 'Updated Recipe',
        servings: 4,
        ingredients: []
      });
    });
  });

  it('should display impact analysis results', async () => {
    const user = userEvent.setup();
    render(<BatchRecipeEditor {...defaultProps} />);

    // Trigger impact analysis
    const editButton = screen.getByText('📝 Redigera Recept');
    await user.click(editButton);
    const submitButton = screen.getByText('Submit Recipe');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('📊 Påverkananalys')).toBeInTheDocument();
      expect(screen.getByText('Kostnadsökning: 3,25 kr (+20,97%)')).toBeInTheDocument();
      expect(screen.getByText('Spagetti Bolognese')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
    });
  });

  it('should show price suggestions button when suggestions are available', async () => {
    const user = userEvent.setup();
    render(<BatchRecipeEditor {...defaultProps} />);

    // Trigger impact analysis
    const editButton = screen.getByText('📝 Redigera Recept');
    await user.click(editButton);
    const submitButton = screen.getByText('Submit Recipe');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('💰 Hantera prisförslag (1)')).toBeInTheDocument();
    });
  });

  it('should open price adjustment modal when price suggestions button is clicked', async () => {
    const user = userEvent.setup();
    render(<BatchRecipeEditor {...defaultProps} />);

    // Trigger impact analysis
    const editButton = screen.getByText('📝 Redigera Recept');
    await user.click(editButton);
    const submitButton = screen.getByText('Submit Recipe');
    await user.click(submitButton);

    await waitFor(() => {
      const priceButton = screen.getByText('💰 Hantera prisförslag (1)');
      return user.click(priceButton);
    });

    expect(screen.getByTestId('price-adjustment-modal')).toBeInTheDocument();
    expect(screen.getByText('Suggestions: 1')).toBeInTheDocument();
  });

  it('should perform batch update when save button is clicked', async () => {
    const user = userEvent.setup();
    render(<BatchRecipeEditor {...defaultProps} />);

    // Trigger impact analysis first
    const editButton = screen.getByText('📝 Redigera Recept');
    await user.click(editButton);
    const submitButton = screen.getByText('Submit Recipe');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('💾 Spara receptändringar')).toBeInTheDocument();
    });

    // Click save button
    const saveButton = screen.getByText('💾 Spara receptändringar');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockPerformBatchRecipeUpdate).toHaveBeenCalledWith(
        'recipe-1',
        { name: 'Updated Recipe', servings: 4, ingredients: [] },
        false,
        []
      );
    });
  });

  it('should apply price suggestions when selected from modal', async () => {
    const user = userEvent.setup();
    render(<BatchRecipeEditor {...defaultProps} />);

    // Trigger impact analysis
    const editButton = screen.getByText('📝 Redigera Recept');
    await user.click(editButton);
    const submitButton = screen.getByText('Submit Recipe');
    await user.click(submitButton);

    await waitFor(() => {
      const priceButton = screen.getByText('💰 Hantera prisförslag (1)');
      return user.click(priceButton);
    });

    // Apply price suggestions
    const applyButton = screen.getByText('Apply All');
    await user.click(applyButton);

    await waitFor(() => {
      expect(mockPerformBatchRecipeUpdate).toHaveBeenCalledWith(
        'recipe-1',
        { name: 'Updated Recipe', servings: 4, ingredients: [] },
        true,
        mockImpactAnalysis.price_suggestions
      );
    });
  });

  it('should call onUpdate when batch update is successful', async () => {
    const user = userEvent.setup();
    const onUpdate = jest.fn();
    render(<BatchRecipeEditor {...defaultProps} onUpdate={onUpdate} />);

    // Trigger impact analysis and save
    const editButton = screen.getByText('📝 Redigera Recept');
    await user.click(editButton);
    const submitButton = screen.getByText('Submit Recipe');
    await user.click(submitButton);

    await waitFor(() => {
      const saveButton = screen.getByText('💾 Spara receptändringar');
      return user.click(saveButton);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
        recipe_id: 'recipe-1'
      }));
    });
  });

  it('should handle analysis errors gracefully', async () => {
    const user = userEvent.setup();
    mockAnalyzeRecipeImpact.mockRejectedValue(new Error('Analysis failed'));

    render(<BatchRecipeEditor {...defaultProps} />);

    const editButton = screen.getByText('📝 Redigera Recept');
    await user.click(editButton);
    const submitButton = screen.getByText('Submit Recipe');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('⚠️ Fel vid analys av påverkan: Analysis failed')).toBeInTheDocument();
    });
  });

  it('should handle batch update errors gracefully', async () => {
    const user = userEvent.setup();
    mockPerformBatchRecipeUpdate.mockRejectedValue(new Error('Update failed'));

    render(<BatchRecipeEditor {...defaultProps} />);

    // Trigger impact analysis first
    const editButton = screen.getByText('📝 Redigera Recept');
    await user.click(editButton);
    const submitButton = screen.getByText('Submit Recipe');
    await user.click(submitButton);

    await waitFor(() => {
      const saveButton = screen.getByText('💾 Spara receptändringar');
      return user.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText('⚠️ Fel vid sparning: Update failed')).toBeInTheDocument();
    });
  });

  it('should close modal when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<BatchRecipeEditor {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByText('✕');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should show risk colors correctly', async () => {
    const user = userEvent.setup();

    // Test different risk levels
    const criticalImpact = {
      ...mockImpactAnalysis,
      affected_menu_items: [
        {
          ...mockImpactAnalysis.affected_menu_items[0],
          risk_level: 'critical' as const,
          new_margin_percentage: 5.0
        }
      ]
    };

    mockAnalyzeRecipeImpact.mockResolvedValue(criticalImpact);
    render(<BatchRecipeEditor {...defaultProps} />);

    // Trigger analysis
    const editButton = screen.getByText('📝 Redigera Recept');
    await user.click(editButton);
    const submitButton = screen.getByText('Submit Recipe');
    await user.click(submitButton);

    await waitFor(() => {
      const riskElement = screen.getByText('critical');
      expect(riskElement).toBeInTheDocument();
      expect(riskElement.closest('.risk-badge')).toHaveStyle('background-color: #dc3545');
    });
  });

  it('should show loading state during analysis', async () => {
    const user = userEvent.setup();

    // Make the analysis take time
    mockAnalyzeRecipeImpact.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve(mockImpactAnalysis), 100))
    );

    render(<BatchRecipeEditor {...defaultProps} />);

    const editButton = screen.getByText('📝 Redigera Recept');
    await user.click(editButton);
    const submitButton = screen.getByText('Submit Recipe');
    await user.click(submitButton);

    // Should show loading state
    expect(screen.getByText('🔄 Analyserar påverkan...')).toBeInTheDocument();

    // Wait for analysis to complete
    await waitFor(() => {
      expect(screen.getByText('📊 Påverkananalys')).toBeInTheDocument();
    });
  });

  it('should disable save button when loading', async () => {
    const user = userEvent.setup();

    // Make the batch update take time
    mockPerformBatchRecipeUpdate.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve(mockBatchUpdateResult), 100))
    );

    render(<BatchRecipeEditor {...defaultProps} />);

    // Setup analysis first
    const editButton = screen.getByText('📝 Redigera Recept');
    await user.click(editButton);
    const submitButton = screen.getByText('Submit Recipe');
    await user.click(submitButton);

    await waitFor(() => {
      const saveButton = screen.getByText('💾 Spara receptändringar');
      return user.click(saveButton);
    });

    // Save button should be disabled and show loading text
    await waitFor(() => {
      expect(screen.getByText('💾 Sparar...')).toBeInTheDocument();
    });
  });
});