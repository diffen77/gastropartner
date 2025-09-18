import { Recipe, MenuItem, apiClient } from './api';

/**
 * Smart Suggestion Engine for Recipe Combinations
 *
 * Analyzes existing menu items and recipe combinations to provide intelligent
 * suggestions for complementary recipes based on:
 * - Historical combinations in menu items
 * - Nutritional balance (proteins + carbs + vegetables)
 * - Cost optimization
 * - Popular combinations
 */

interface RecipeSuggestion {
  recipe: Recipe;
  confidence: number; // 0-1 score
  reason: string;
  category: 'complement' | 'popular' | 'nutritional' | 'cost-optimized';
}

interface NutritionProfile {
  hasProtein: boolean;
  hasCarbs: boolean;
  hasVegetables: boolean;
  hasDairy: boolean;
  estimatedCalories: number;
}

interface CombinationPattern {
  recipeIds: string[];
  frequency: number;
  averageCost: number;
  category: string;
}

class SuggestionEngineClass {
  private patterns: CombinationPattern[] = [];
  private recipes: Recipe[] = [];
  private menuItems: MenuItem[] = [];
  private lastUpdate: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get intelligent suggestions based on current recipe selection
   */
  async getSuggestions(currentRecipeIds: string[]): Promise<Recipe[]> {
    await this.ensureFreshData();

    if (currentRecipeIds.length === 0) {
      return this.getPopularRecipes();
    }

    const suggestions: RecipeSuggestion[] = [];

    // Get suggestions from different strategies
    suggestions.push(...await this.getComplementarySuggestions(currentRecipeIds));
    suggestions.push(...await this.getNutritionalSuggestions(currentRecipeIds));
    suggestions.push(...await this.getPopularCombinationSuggestions(currentRecipeIds));
    suggestions.push(...await this.getCostOptimizedSuggestions(currentRecipeIds));

    // Remove duplicates and current recipes
    const uniqueSuggestions = suggestions
      .filter((suggestion, index, self) =>
        !currentRecipeIds.includes(suggestion.recipe.recipe_id) &&
        self.findIndex(s => s.recipe.recipe_id === suggestion.recipe.recipe_id) === index
      )
      // Sort by confidence score
      .sort((a, b) => b.confidence - a.confidence)
      // Take top 10
      .slice(0, 10);

    return uniqueSuggestions.map(suggestion => suggestion.recipe);
  }

  /**
   * Get popular recipes for initial suggestions
   */
  private getPopularRecipes(): Recipe[] {
    // Return recipes sorted by usage in menu items
    const recipeUsage = new Map<string, number>();

    this.menuItems.forEach(menuItem => {
      if (menuItem.recipe_id) {
        recipeUsage.set(menuItem.recipe_id, (recipeUsage.get(menuItem.recipe_id) || 0) + 1);
      }
    });

    return this.recipes
      .filter(recipe => recipe.is_active)
      .sort((a, b) => (recipeUsage.get(b.recipe_id) || 0) - (recipeUsage.get(a.recipe_id) || 0))
      .slice(0, 6);
  }

  /**
   * Find recipes that complement the current selection nutritionally
   */
  private async getComplementarySuggestions(currentRecipeIds: string[]): Promise<RecipeSuggestion[]> {
    const currentRecipes = this.recipes.filter(r => currentRecipeIds.includes(r.recipe_id));
    const currentProfile = this.analyzeNutritionProfile(currentRecipes);

    const suggestions: RecipeSuggestion[] = [];

    for (const recipe of this.recipes) {
      if (!recipe.is_active || currentRecipeIds.includes(recipe.recipe_id)) continue;

      const recipeProfile = this.analyzeNutritionProfile([recipe]);
      const complementScore = this.calculateComplementScore(currentProfile, recipeProfile);

      if (complementScore > 0.3) {
        suggestions.push({
          recipe,
          confidence: complementScore,
          reason: this.getComplementReason(currentProfile, recipeProfile),
          category: 'complement'
        });
      }
    }

    return suggestions;
  }

  /**
   * Find recipes that create nutritionally balanced meals
   */
  private async getNutritionalSuggestions(currentRecipeIds: string[]): Promise<RecipeSuggestion[]> {
    const currentRecipes = this.recipes.filter(r => currentRecipeIds.includes(r.recipe_id));
    const currentProfile = this.analyzeNutritionProfile(currentRecipes);

    const suggestions: RecipeSuggestion[] = [];

    // Suggest vegetables if missing
    if (!currentProfile.hasVegetables) {
      const vegetableRecipes = this.recipes.filter(recipe =>
        recipe.is_active &&
        !currentRecipeIds.includes(recipe.recipe_id) &&
        this.isVegetableRecipe(recipe)
      );

      vegetableRecipes.forEach(recipe => {
        suggestions.push({
          recipe,
          confidence: 0.8,
          reason: 'Lägger till grönsaker för näringsbalans',
          category: 'nutritional'
        });
      });
    }

    // Suggest carbs if missing
    if (!currentProfile.hasCarbs) {
      const carbRecipes = this.recipes.filter(recipe =>
        recipe.is_active &&
        !currentRecipeIds.includes(recipe.recipe_id) &&
        this.isCarbRecipe(recipe)
      );

      carbRecipes.forEach(recipe => {
        suggestions.push({
          recipe,
          confidence: 0.7,
          reason: 'Lägger till kolhydrater för energi',
          category: 'nutritional'
        });
      });
    }

    // Suggest protein if missing
    if (!currentProfile.hasProtein) {
      const proteinRecipes = this.recipes.filter(recipe =>
        recipe.is_active &&
        !currentRecipeIds.includes(recipe.recipe_id) &&
        this.isProteinRecipe(recipe)
      );

      proteinRecipes.forEach(recipe => {
        suggestions.push({
          recipe,
          confidence: 0.9,
          reason: 'Lägger till protein för fullständig måltid',
          category: 'nutritional'
        });
      });
    }

    return suggestions;
  }

  /**
   * Find recipes based on popular historical combinations
   */
  private async getPopularCombinationSuggestions(currentRecipeIds: string[]): Promise<RecipeSuggestion[]> {
    const suggestions: RecipeSuggestion[] = [];

    // Analyze existing menu items for patterns
    const combinations = this.extractCombinationPatterns();

    for (const pattern of combinations) {
      const overlap = pattern.recipeIds.filter(id => currentRecipeIds.includes(id));
      if (overlap.length === 0) continue;

      const missing = pattern.recipeIds.filter(id => !currentRecipeIds.includes(id));
      const confidence = (overlap.length / pattern.recipeIds.length) * (pattern.frequency / 10);

      for (const missingId of missing) {
        const recipe = this.recipes.find(r => r.recipe_id === missingId);
        if (recipe && recipe.is_active) {
          suggestions.push({
            recipe,
            confidence: Math.min(confidence, 0.9),
            reason: `Populär kombination (${pattern.frequency}x använd)`,
            category: 'popular'
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Find cost-optimized recipe suggestions
   */
  private async getCostOptimizedSuggestions(currentRecipeIds: string[]): Promise<RecipeSuggestion[]> {
    const currentRecipes = this.recipes.filter(r => currentRecipeIds.includes(r.recipe_id));
    const currentTotalCost = currentRecipes.reduce((sum, recipe) => {
      const cost = recipe.cost_per_serving ? parseFloat(recipe.cost_per_serving.toString()) : 0;
      return sum + cost;
    }, 0);

    const suggestions: RecipeSuggestion[] = [];

    // Suggest low-cost recipes to balance expensive ones
    if (currentTotalCost > 40) {
      const cheapRecipes = this.recipes
        .filter(recipe => {
          if (!recipe.is_active || currentRecipeIds.includes(recipe.recipe_id)) return false;
          const cost = recipe.cost_per_serving ? parseFloat(recipe.cost_per_serving.toString()) : 0;
          return cost < 15;
        })
        .sort((a, b) => {
          const costA = a.cost_per_serving ? parseFloat(a.cost_per_serving.toString()) : 0;
          const costB = b.cost_per_serving ? parseFloat(b.cost_per_serving.toString()) : 0;
          return costA - costB;
        });

      cheapRecipes.slice(0, 3).forEach(recipe => {
        const cost = recipe.cost_per_serving ? parseFloat(recipe.cost_per_serving.toString()) : 0;
        suggestions.push({
          recipe,
          confidence: 0.6,
          reason: `Ekonomisk balans (${cost.toFixed(0)} kr/portion)`,
          category: 'cost-optimized'
        });
      });
    }

    return suggestions;
  }

  /**
   * Analyze nutrition profile of recipes
   */
  private analyzeNutritionProfile(recipes: Recipe[]): NutritionProfile {
    let hasProtein = false;
    let hasCarbs = false;
    let hasVegetables = false;
    let hasDairy = false;

    recipes.forEach(recipe => {
      const name = recipe.name.toLowerCase();
      const description = (recipe.description || '').toLowerCase();
      const text = `${name} ${description}`;

      // Protein detection
      if (text.match(/\b(kött|fisk|kyckling|ägg|bönor|linser|tofu|korv|bacon|lax|tonfisk|kött)\b/)) {
        hasProtein = true;
      }

      // Carbs detection
      if (text.match(/\b(potatis|ris|pasta|bröd|nudlar|quinoa|bulgur|havre)\b/)) {
        hasCarbs = true;
      }

      // Vegetables detection
      if (text.match(/\b(sallad|tomat|gurka|lök|morot|paprika|spenat|broccoli|kål|grönsak)\b/)) {
        hasVegetables = true;
      }

      // Dairy detection
      if (text.match(/\b(ost|mjölk|grädde|yoghurt|smör|crème fraiche)\b/)) {
        hasDairy = true;
      }
    });

    return {
      hasProtein,
      hasCarbs,
      hasVegetables,
      hasDairy,
      estimatedCalories: recipes.length * 400 // Rough estimate
    };
  }

  /**
   * Calculate how well two nutrition profiles complement each other
   */
  private calculateComplementScore(current: NutritionProfile, candidate: NutritionProfile): number {
    let score = 0;

    // Bonus for filling nutritional gaps
    if (!current.hasProtein && candidate.hasProtein) score += 0.4;
    if (!current.hasCarbs && candidate.hasCarbs) score += 0.3;
    if (!current.hasVegetables && candidate.hasVegetables) score += 0.3;

    // Small bonus for adding variety
    if (current.hasProtein && candidate.hasVegetables) score += 0.2;
    if (current.hasCarbs && candidate.hasProtein) score += 0.2;

    return Math.min(score, 1.0);
  }

  private getComplementReason(current: NutritionProfile, candidate: NutritionProfile): string {
    if (!current.hasVegetables && candidate.hasVegetables) {
      return 'Lägger till grönsaker för balans';
    }
    if (!current.hasProtein && candidate.hasProtein) {
      return 'Kompletterar med protein';
    }
    if (!current.hasCarbs && candidate.hasCarbs) {
      return 'Lägger till kolhydrater';
    }
    return 'Kompletterar måltiden';
  }

  private isVegetableRecipe(recipe: Recipe): boolean {
    const text = `${recipe.name} ${recipe.description || ''}`.toLowerCase();
    return text.match(/\b(sallad|grönsak|tomat|gurka|spenat|broccoli|morot|paprika)\b/) !== null;
  }

  private isCarbRecipe(recipe: Recipe): boolean {
    const text = `${recipe.name} ${recipe.description || ''}`.toLowerCase();
    return text.match(/\b(potatis|ris|pasta|bröd|nudlar)\b/) !== null;
  }

  private isProteinRecipe(recipe: Recipe): boolean {
    const text = `${recipe.name} ${recipe.description || ''}`.toLowerCase();
    return text.match(/\b(kött|fisk|kyckling|ägg|korv|bönor|linser)\b/) !== null;
  }

  /**
   * Extract combination patterns from existing menu items
   */
  private extractCombinationPatterns(): CombinationPattern[] {
    // For now, return mock patterns since we don't have a recipe combination system yet
    // In the future, this would analyze actual recipe combinations in menu items

    return [
      {
        recipeIds: ['korv-recipe-id', 'potatis-recipe-id'],
        frequency: 5,
        averageCost: 35,
        category: 'Huvudrätt'
      },
      // More patterns would be extracted from real data
    ];
  }

  /**
   * Ensure we have fresh data
   */
  private async ensureFreshData(): Promise<void> {
    const now = Date.now();
    if (now - this.lastUpdate < this.CACHE_DURATION) {
      return;
    }

    try {
      const [recipes, menuItems] = await Promise.all([
        apiClient.getRecipes(),
        apiClient.getMenuItems()
      ]);

      this.recipes = recipes;
      this.menuItems = menuItems;
      this.lastUpdate = now;
    } catch (error) {
      console.error('Failed to load data for suggestion engine:', error);
      // Continue with stale data if available
    }
  }

  /**
   * Clear cache to force data refresh
   */
  clearCache(): void {
    this.lastUpdate = 0;
  }
}

// Export singleton instance
export const SuggestionEngine = new SuggestionEngineClass();