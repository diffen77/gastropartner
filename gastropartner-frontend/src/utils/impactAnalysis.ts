/**
 * ImpactAnalysis Service - Dependency mapping för batch recipe editing
 *
 * Analyserar hur ändringar i grundrecept påverkar alla maträtter som använder dem.
 * Kritisk för att motivera recept/maträtt-separationen.
 */

import { apiClient, Recipe, MenuItem, RecipeCreate } from './api';

export interface RecipeImpactAnalysis {
  recipe_id: string;
  recipe_name: string;
  affected_menu_items: AffectedMenuItem[];
  total_affected_items: number;
  estimated_cost_before: number;
  estimated_cost_after: number;
  cost_difference: number;
  cost_difference_percentage: number;
  high_risk_items: AffectedMenuItem[];
  negative_margin_items: AffectedMenuItem[];
  price_suggestions: PriceSuggestion[];
}

export interface AffectedMenuItem {
  menu_item_id: string;
  name: string;
  category: string;
  current_selling_price: number;
  current_food_cost: number;
  current_margin: number;
  current_margin_percentage: number;
  estimated_new_food_cost: number;
  estimated_new_margin: number;
  estimated_new_margin_percentage: number;
  cost_increase: number;
  cost_increase_percentage: number;
  margin_impact: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  needs_price_adjustment: boolean;
}

export interface PriceSuggestion {
  menu_item_id: string;
  current_price: number;
  suggested_price: number;
  price_increase: number;
  price_increase_percentage: number;
  reason: string;
  target_margin_percentage: number;
  confidence_score: number;
}

export interface RecipeChange {
  recipe_id: string;
  changes: RecipeCreate;
  reason?: string;
  timestamp: string;
  previous_version?: Partial<Recipe>;
  applied_price_adjustments?: number;
}

export interface BatchUpdateResult {
  success: boolean;
  updated_recipe: Recipe;
  impact_analysis: RecipeImpactAnalysis;
  auto_applied_price_adjustments: PriceSuggestion[];
  warnings: string[];
  errors: string[];
}

export class ImpactAnalysisService {

  /**
   * Analyserar påverkan av receptändringar på alla relaterade maträtter
   */
  async analyzeRecipeImpact(
    recipe_id: string,
    proposedChanges: RecipeCreate
  ): Promise<RecipeImpactAnalysis> {
    try {
      // 1. Hämta ursprungligt recept
      const originalRecipe = await apiClient.getRecipe(recipe_id);

      // 2. Hitta alla maträtter som använder detta recept
      const allMenuItems = await apiClient.getMenuItems();
      const affectedMenuItems = allMenuItems.filter(item =>
        item.recipe_id === recipe_id && item.is_active
      );

      if (affectedMenuItems.length === 0) {
        return this.createEmptyImpactAnalysis(recipe_id, originalRecipe.name);
      }

      // 3. Beräkna kostnad före och efter för receptet
      const costBefore = await this.calculateRecipeCost(originalRecipe);
      const costAfter = await this.calculateRecipeCostFromChanges(recipe_id, proposedChanges);

      // 4. Analysera påverkan på varje maträtt
      const affectedItemsAnalysis = await Promise.all(
        affectedMenuItems.map(item =>
          this.analyzeMenuItemImpact(item, costBefore, costAfter)
        )
      );

      // 5. Identifiera högrisk-maträtter
      const highRiskItems = affectedItemsAnalysis.filter(
        item => item.risk_level === 'high' || item.risk_level === 'critical'
      );

      const negativeMarginItems = affectedItemsAnalysis.filter(
        item => item.estimated_new_margin <= 0
      );

      // 6. Generera prisförslag
      const priceSuggestions = this.generatePriceSuggestions(affectedItemsAnalysis);

      // 7. Beräkna totala kostnadsförändringar (commented out - currently unused)
      // const totalCostBefore = affectedItemsAnalysis.reduce(
      //   (sum, item) => sum + item.current_food_cost, 0
      // );
      // const totalCostAfter = affectedItemsAnalysis.reduce(
      //   (sum, item) => sum + item.estimated_new_food_cost, 0
      // );

      return {
        recipe_id,
        recipe_name: originalRecipe.name,
        affected_menu_items: affectedItemsAnalysis,
        total_affected_items: affectedItemsAnalysis.length,
        estimated_cost_before: costBefore,
        estimated_cost_after: costAfter,
        cost_difference: costAfter - costBefore,
        cost_difference_percentage: costBefore > 0 ? ((costAfter - costBefore) / costBefore) * 100 : 0,
        high_risk_items: highRiskItems,
        negative_margin_items: negativeMarginItems,
        price_suggestions: priceSuggestions
      };

    } catch (error) {
      console.error('Failed to analyze recipe impact:', error);
      throw new Error(`Impact analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Utför batch-uppdatering av recept med påverkananalys
   */
  async performBatchRecipeUpdate(
    recipe_id: string,
    changes: RecipeCreate,
    applyPriceSuggestions: boolean = false,
    selectedSuggestions: PriceSuggestion[] = []
  ): Promise<BatchUpdateResult> {
    try {
      // 1. Hämta ursprungligt recept för versionshantering
      const originalRecipe = await apiClient.getRecipe(recipe_id);

      // 2. Utför först impact analysis
      const impactAnalysis = await this.analyzeRecipeImpact(recipe_id, changes);

      // 3. Validera att ändringar är säkra att applicera
      const warnings = this.validateChanges(impactAnalysis);

      // 4. Uppdatera receptet
      const updatedRecipe = await apiClient.updateRecipe(recipe_id, changes);

      // 5. Applicera prisförslag om begärt
      const appliedAdjustments: PriceSuggestion[] = [];

      if (applyPriceSuggestions && selectedSuggestions.length > 0) {
        for (const suggestion of selectedSuggestions) {
          try {
            await apiClient.updateMenuItem(suggestion.menu_item_id, {
              selling_price: suggestion.suggested_price
            });
            appliedAdjustments.push(suggestion);
          } catch (error) {
            console.error(`Failed to update price for menu item ${suggestion.menu_item_id}:`, error);
          }
        }
      }

      // 6. Spara version i historik
      await this.saveRecipeVersion(recipe_id, {
        changes,
        reason: `Batch-uppdatering: ${changes.name || originalRecipe.name}`,
        previous_version: {
          name: originalRecipe.name,
          description: originalRecipe.description,
          servings: originalRecipe.servings,
          cost_per_serving: originalRecipe.cost_per_serving,
          ingredients: originalRecipe.ingredients
        },
        applied_price_adjustments: appliedAdjustments.length
      });

      return {
        success: true,
        updated_recipe: updatedRecipe,
        impact_analysis: impactAnalysis,
        auto_applied_price_adjustments: appliedAdjustments,
        warnings,
        errors: []
      };

    } catch (error) {
      return {
        success: false,
        updated_recipe: {} as Recipe,
        impact_analysis: {} as RecipeImpactAnalysis,
        auto_applied_price_adjustments: [],
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Beräknar kostnad för ett recept baserat på dess ingredienser
   */
  private async calculateRecipeCost(recipe: Recipe): Promise<number> {
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      return 0;
    }

    let totalCost = 0;

    for (const recipeIngredient of recipe.ingredients) {
      if (recipeIngredient.ingredient) {
        // Använd befintlig kalkylering från RecipeForm
        const ingredientCost = (recipeIngredient.quantity * recipeIngredient.ingredient.cost_per_unit);
        totalCost += ingredientCost;
      }
    }

    return totalCost / (recipe.servings || 1); // Kostnad per portion
  }

  /**
   * Beräknar kostnad för ett recept baserat på föreslagna ändringar
   */
  private async calculateRecipeCostFromChanges(
    recipe_id: string,
    changes: RecipeCreate
  ): Promise<number> {
    if (!changes.ingredients || changes.ingredients.length === 0) {
      return 0;
    }

    // Hämta ingrediensinformation för att beräkna kostnader
    const ingredients = await apiClient.getIngredients();
    let totalCost = 0;

    for (const recipeIngredient of changes.ingredients) {
      const ingredient = ingredients.find(ing =>
        ing.ingredient_id === recipeIngredient.ingredient_id
      );

      if (ingredient) {
        const ingredientCost = (recipeIngredient.quantity * ingredient.cost_per_unit);
        totalCost += ingredientCost;
      }
    }

    return totalCost / (changes.servings || 1); // Kostnad per portion
  }

  /**
   * Analyserar påverkan på en specifik maträtt
   */
  private async analyzeMenuItemImpact(
    menuItem: MenuItem,
    recipeCostBefore: number,
    recipeCostAfter: number
  ): Promise<AffectedMenuItem> {
    const costIncrease = recipeCostAfter - recipeCostBefore;
    const costIncreasePercentage = recipeCostBefore > 0 ?
      (costIncrease / recipeCostBefore) * 100 : 0;

    const newFoodCost = (menuItem.food_cost || 0) + costIncrease;
    const newMargin = menuItem.selling_price - newFoodCost;
    const newMarginPercentage = menuItem.selling_price > 0 ?
      (newMargin / menuItem.selling_price) * 100 : 0;

    const marginImpact = (menuItem.margin_percentage || 0) - newMarginPercentage;

    // Bestäm risknivå
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (newMargin <= 0) {
      riskLevel = 'critical';
    } else if (newMarginPercentage < 10) {
      riskLevel = 'high';
    } else if (marginImpact > 5) {
      riskLevel = 'medium';
    }

    return {
      menu_item_id: menuItem.menu_item_id,
      name: menuItem.name,
      category: menuItem.category,
      current_selling_price: menuItem.selling_price,
      current_food_cost: menuItem.food_cost || 0,
      current_margin: menuItem.margin || 0,
      current_margin_percentage: menuItem.margin_percentage || 0,
      estimated_new_food_cost: newFoodCost,
      estimated_new_margin: newMargin,
      estimated_new_margin_percentage: newMarginPercentage,
      cost_increase: costIncrease,
      cost_increase_percentage: costIncreasePercentage,
      margin_impact: marginImpact,
      risk_level: riskLevel,
      needs_price_adjustment: riskLevel === 'high' || riskLevel === 'critical'
    };
  }

  /**
   * Genererar intelligenta prisförslag baserat på impact analysis
   */
  private generatePriceSuggestions(affectedItems: AffectedMenuItem[]): PriceSuggestion[] {
    const suggestions: PriceSuggestion[] = [];

    for (const item of affectedItems) {
      if (!item.needs_price_adjustment) continue;

      // Målmarginal: 30% för säkerhet
      const targetMarginPercentage = 30;
      const targetMargin = item.estimated_new_food_cost / (1 - targetMarginPercentage / 100);
      const suggestedPrice = Math.ceil(targetMargin * 10) / 10; // Avrunda uppåt till närmaste tiondel

      const priceIncrease = suggestedPrice - item.current_selling_price;
      const priceIncreasePercentage = item.current_selling_price > 0 ?
        (priceIncrease / item.current_selling_price) * 100 : 0;

      // Beräkna confidence score baserat på flera faktorer
      let confidenceScore = 0.8; // Grundnivå

      if (item.risk_level === 'critical') confidenceScore = 0.95;
      else if (item.risk_level === 'high') confidenceScore = 0.9;
      else if (priceIncreasePercentage > 20) confidenceScore *= 0.7; // Minska förtroendet för stora prisökningar

      let reason = `Måttlig prisjustering för att behålla ${targetMarginPercentage}% marginal`;

      if (item.estimated_new_margin <= 0) {
        reason = 'Kritisk prisjustering krävs - negativ marginal förhindras';
      } else if (priceIncreasePercentage > 15) {
        reason = 'Stor prisjustering för att kompensera ökade råvarukostnader';
      }

      suggestions.push({
        menu_item_id: item.menu_item_id,
        current_price: item.current_selling_price,
        suggested_price: suggestedPrice,
        price_increase: priceIncrease,
        price_increase_percentage: priceIncreasePercentage,
        reason,
        target_margin_percentage: targetMarginPercentage,
        confidence_score: confidenceScore
      });
    }

    // Sortera efter risk och konfidenspoäng
    return suggestions.sort((a, b) => b.confidence_score - a.confidence_score);
  }

  /**
   * Validerar att förändringar är säkra att genomföra
   */
  private validateChanges(impact: RecipeImpactAnalysis): string[] {
    const warnings: string[] = [];

    if (impact.negative_margin_items.length > 0) {
      warnings.push(
        `⚠️ ${impact.negative_margin_items.length} maträtter får negativ marginal. Prisjusteringar rekommenderas starkt.`
      );
    }

    if (impact.high_risk_items.length > 0) {
      warnings.push(
        `⚠️ ${impact.high_risk_items.length} maträtter har hög risk för lönsamhetsproblem.`
      );
    }

    if (impact.cost_difference_percentage > 20) {
      warnings.push(
        `⚠️ Receptkostnaden ökar med ${impact.cost_difference_percentage.toFixed(1)}% - betydande påverkan på alla maträtter.`
      );
    }

    if (impact.total_affected_items > 10) {
      warnings.push(
        `ℹ️ ${impact.total_affected_items} maträtter påverkas av denna ändring.`
      );
    }

    return warnings;
  }

  /**
   * Skapar tom impact analysis när inga maträtter påverkas
   */
  private createEmptyImpactAnalysis(recipe_id: string, recipe_name: string): RecipeImpactAnalysis {
    return {
      recipe_id,
      recipe_name,
      affected_menu_items: [],
      total_affected_items: 0,
      estimated_cost_before: 0,
      estimated_cost_after: 0,
      cost_difference: 0,
      cost_difference_percentage: 0,
      high_risk_items: [],
      negative_margin_items: [],
      price_suggestions: []
    };
  }

  /**
   * Hämtar historik av receptändringar (för basic versioning)
   */
  async getRecipeChangeHistory(recipe_id: string): Promise<RecipeChange[]> {
    // Försök först med nya nycklarna, fallback till gamla
    const newHistoryKey = `recipe_versions_${recipe_id}`;
    const oldHistoryKey = `recipe_history_${recipe_id}`;

    let history = localStorage.getItem(newHistoryKey);
    if (!history) {
      history = localStorage.getItem(oldHistoryKey);
      // Migrera gammal data till ny nyckel om den finns
      if (history) {
        localStorage.setItem(newHistoryKey, history);
        localStorage.removeItem(oldHistoryKey);
      }
    }

    return history ? JSON.parse(history) : [];
  }

  /**
   * Sparar receptändring i historik
   */
  async saveRecipeChange(recipe_id: string, changes: RecipeCreate, reason?: string): Promise<void> {
    return this.saveRecipeVersion(recipe_id, { changes, reason });
  }

  /**
   * Sparar receptversion i historik med fullständig metadata
   */
  async saveRecipeVersion(
    recipe_id: string,
    versionData: {
      changes: RecipeCreate;
      reason?: string;
      previous_version?: Partial<Recipe>;
      applied_price_adjustments?: number;
    }
  ): Promise<void> {
    const historyKey = `recipe_versions_${recipe_id}`;
    const history = await this.getRecipeChangeHistory(recipe_id);

    const change: RecipeChange = {
      recipe_id,
      changes: versionData.changes,
      reason: versionData.reason,
      timestamp: new Date().toISOString(),
      previous_version: versionData.previous_version,
      applied_price_adjustments: versionData.applied_price_adjustments
    };

    history.unshift(change); // Lägg till i början

    // Behåll bara de senaste 10 ändringarna
    if (history.length > 10) {
      history.splice(10);
    }

    localStorage.setItem(historyKey, JSON.stringify(history));
  }
}

// Singleton instance
export const impactAnalysisService = new ImpactAnalysisService();