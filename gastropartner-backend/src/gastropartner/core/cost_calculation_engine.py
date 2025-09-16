"""Automated Raw Material Cost Calculation Engine.

Core business logic for GastroPartner MVP that automatically calculates:
- Raw material costs from recipes based on ingredient prices
- Unit conversions between kg, g, l, ml
- Portion-based cost analysis
- Margin calculations with VAT handling
- Real-time price updates
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple, Any
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, Field
from supabase import Client

from gastropartner.core.models import (
    Recipe,
    RecipeIngredient,
    Ingredient,
    MenuItem,
    SwedishVATRate,
    VATCalculationType,
    TenantMixin,
)
from gastropartner.core.vat_utils import (
    calculate_vat_amount,
    calculate_price_excluding_vat,
    calculate_price_including_vat,
)
from gastropartner.utils.unit_conversion import (
    calculate_ingredient_cost,
    convert_unit,
    UnitConversionError,
)


class PortionCostAnalysis(BaseModel):
    """Detailed cost analysis per portion/serving."""

    portion_size: int = Field(description="Number of servings")
    ingredient_costs: List[Dict[str, Any]] = Field(
        default_factory=list, description="Cost breakdown per ingredient"
    )
    total_ingredient_cost: Decimal = Field(description="Total cost of all ingredients")
    cost_per_portion: Decimal = Field(description="Cost per single portion")

    # Additional cost factors
    labor_cost_per_portion: Decimal = Field(
        default=Decimal("0"), description="Estimated labor cost per portion"
    )
    overhead_cost_per_portion: Decimal = Field(
        default=Decimal("0"), description="Overhead cost allocation per portion"
    )
    total_cost_per_portion: Decimal = Field(description="Total comprehensive cost per portion")


class MarginAnalysis(BaseModel):
    """Comprehensive margin analysis with VAT handling."""

    # Pricing
    selling_price: Decimal = Field(description="Menu item selling price")
    vat_rate: SwedishVATRate = Field(description="Applied VAT rate")
    vat_calculation_type: VATCalculationType = Field(description="VAT calculation method")

    # VAT breakdown
    vat_amount: Decimal = Field(description="VAT amount in currency")
    price_excluding_vat: Decimal = Field(description="Price without VAT")
    price_including_vat: Decimal = Field(description="Price with VAT")

    # Cost analysis
    total_cost_per_portion: Decimal = Field(description="Total cost per portion")
    food_cost: Decimal = Field(description="Raw material cost only")

    # Margin calculations
    margin_amount: Decimal = Field(description="Margin in currency (price - cost)")
    margin_percentage: Decimal = Field(description="Margin as percentage")
    food_cost_percentage: Decimal = Field(description="Food cost as percentage of price")

    # Target vs actual
    target_food_cost_percentage: Optional[Decimal] = Field(
        default=None, description="Target food cost percentage"
    )
    variance_percentage: Optional[Decimal] = Field(default=None, description="Variance from target")

    # Margin multiples
    margin_multiple: Decimal = Field(description="Price multiple over cost (e.g., 3.5x)")


class CostCalculationResult(BaseModel):
    """Complete cost calculation result."""

    recipe_id: Optional[UUID] = None
    menu_item_id: Optional[UUID] = None
    calculation_date: datetime = Field(default_factory=datetime.now)

    # Core analysis
    portion_analysis: PortionCostAnalysis
    margin_analysis: Optional[MarginAnalysis] = None

    # Recommendations
    recommendations: List[str] = Field(default_factory=list)
    optimization_opportunities: List[Dict[str, Any]] = Field(default_factory=list)

    # Calculation metadata
    ingredients_used: int = Field(description="Number of ingredients in calculation")
    conversion_warnings: List[str] = Field(
        default_factory=list, description="Unit conversion issues"
    )


class CostCalculationEngine:
    """Advanced cost calculation engine with comprehensive analysis capabilities."""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    async def calculate_recipe_cost(
        self,
        recipe_id: UUID,
        organization_id: UUID,
        servings: Optional[int] = None,
        include_labor_overhead: bool = False,
    ) -> CostCalculationResult:
        """Calculate comprehensive cost analysis for a recipe.

        Args:
            recipe_id: Recipe to analyze
            organization_id: Organization ID for multi-tenant security
            servings: Number of servings to calculate for (defaults to recipe servings)
            include_labor_overhead: Whether to include labor and overhead costs

        Returns:
            Complete cost analysis

        Raises:
            ValueError: If recipe not found or access denied
        """
        # 🛡️ SECURITY: Multi-tenant data isolation
        recipe = await self._get_recipe_secure(recipe_id, organization_id)
        if not recipe:
            raise ValueError(f"Recipe {recipe_id} not found or access denied")

        # Use provided servings or recipe default
        target_servings = servings or recipe.get("servings", 1)

        # Get recipe ingredients with ingredient details
        ingredients_data = await self._get_recipe_ingredients_secure(recipe_id, organization_id)

        ingredient_costs = []
        total_ingredient_cost = Decimal("0")
        conversion_warnings = []

        for ingredient_data in ingredients_data:
            try:
                cost_analysis = await self._calculate_ingredient_cost(
                    ingredient_data, target_servings, recipe.get("servings", 1)
                )
                ingredient_costs.append(cost_analysis)
                total_ingredient_cost += cost_analysis["total_cost"]

            except UnitConversionError as e:
                conversion_warnings.append(
                    f"Unit conversion issue for {ingredient_data.get('ingredient_name', 'unknown')}: {str(e)}"
                )
                # Fall back to direct calculation without conversion
                fallback_cost = self._calculate_fallback_cost(
                    ingredient_data, target_servings, recipe.get("servings", 1)
                )
                ingredient_costs.append(fallback_cost)
                total_ingredient_cost += fallback_cost["total_cost"]

        # Calculate per-portion costs
        cost_per_portion = (
            total_ingredient_cost / target_servings if target_servings > 0 else Decimal("0")
        )

        # Add labor and overhead if requested
        labor_cost_per_portion = Decimal("0")
        overhead_cost_per_portion = Decimal("0")

        if include_labor_overhead:
            # Simple estimation - in production this would come from business settings
            labor_cost_per_portion = cost_per_portion * Decimal("0.3")  # 30% of ingredient cost
            overhead_cost_per_portion = cost_per_portion * Decimal("0.15")  # 15% of ingredient cost

        total_cost_per_portion = (
            cost_per_portion + labor_cost_per_portion + overhead_cost_per_portion
        )

        # Create portion analysis
        portion_analysis = PortionCostAnalysis(
            portion_size=target_servings,
            ingredient_costs=ingredient_costs,
            total_ingredient_cost=total_ingredient_cost,
            cost_per_portion=cost_per_portion,
            labor_cost_per_portion=labor_cost_per_portion,
            overhead_cost_per_portion=overhead_cost_per_portion,
            total_cost_per_portion=total_cost_per_portion,
        )

        # Generate recommendations
        recommendations = self._generate_cost_recommendations(
            total_ingredient_cost, target_servings, ingredient_costs
        )

        return CostCalculationResult(
            recipe_id=recipe_id,
            portion_analysis=portion_analysis,
            recommendations=recommendations,
            ingredients_used=len(ingredients_data),
            conversion_warnings=conversion_warnings,
        )

    async def calculate_menu_item_analysis(
        self, menu_item_id: UUID, organization_id: UUID, include_labor_overhead: bool = True
    ) -> CostCalculationResult:
        """Calculate comprehensive cost and margin analysis for a menu item.

        Args:
            menu_item_id: Menu item to analyze
            organization_id: Organization ID for multi-tenant security
            include_labor_overhead: Whether to include labor and overhead costs

        Returns:
            Complete cost and margin analysis
        """
        # 🛡️ SECURITY: Multi-tenant data isolation
        menu_item = await self._get_menu_item_secure(menu_item_id, organization_id)
        if not menu_item:
            raise ValueError(f"Menu item {menu_item_id} not found or access denied")

        # Calculate recipe cost if linked
        portion_analysis = None
        if menu_item.get("recipe_id"):
            recipe_cost = await self.calculate_recipe_cost(
                UUID(menu_item["recipe_id"]),
                organization_id,
                servings=1,  # Menu items are typically per single serving
                include_labor_overhead=include_labor_overhead,
            )
            portion_analysis = recipe_cost.portion_analysis
        else:
            # No recipe linked - create basic analysis
            portion_analysis = PortionCostAnalysis(
                portion_size=1,
                ingredient_costs=[],
                total_ingredient_cost=Decimal("0"),
                cost_per_portion=Decimal("0"),
                total_cost_per_portion=Decimal("0"),
            )

        # Create margin analysis
        margin_analysis = await self._calculate_margin_analysis(menu_item, portion_analysis)

        # Generate recommendations
        recommendations = self._generate_margin_recommendations(margin_analysis)

        return CostCalculationResult(
            menu_item_id=menu_item_id,
            recipe_id=UUID(menu_item["recipe_id"]) if menu_item.get("recipe_id") else None,
            portion_analysis=portion_analysis,
            margin_analysis=margin_analysis,
            recommendations=recommendations,
            ingredients_used=len(portion_analysis.ingredient_costs),
        )

    async def update_recipe_costs_realtime(
        self, organization_id: UUID, ingredient_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """Update recipe costs in real-time when ingredient prices change.

        Args:
            organization_id: Organization ID for multi-tenant security
            ingredient_id: Specific ingredient that changed (None for all)

        Returns:
            Summary of updates performed
        """
        # 🛡️ SECURITY: Multi-tenant data isolation
        affected_recipes = []

        if ingredient_id:
            # Find recipes using this specific ingredient
            recipes_response = (
                self.supabase.table("recipe_ingredients")
                .select("recipe_id")
                .eq("ingredient_id", str(ingredient_id))
                .eq("organization_id", str(organization_id))
                .execute()
            )
            recipe_ids = [UUID(r["recipe_id"]) for r in (recipes_response.data or [])]
        else:
            # Get all active recipes for organization
            recipes_response = (
                self.supabase.table("recipes")
                .select("recipe_id")
                .eq("organization_id", str(organization_id))
                .eq("is_active", True)
                .execute()
            )
            recipe_ids = [UUID(r["recipe_id"]) for r in (recipes_response.data or [])]

        # Update each recipe
        for recipe_id in recipe_ids:
            try:
                cost_result = await self.calculate_recipe_cost(recipe_id, organization_id)

                # Update recipe total_cost and cost_per_serving
                self.supabase.table("recipes").update(
                    {
                        "total_cost": float(cost_result.portion_analysis.total_ingredient_cost),
                        "cost_per_serving": float(cost_result.portion_analysis.cost_per_portion),
                        "updated_at": datetime.now().isoformat(),
                    }
                ).eq("recipe_id", str(recipe_id)).eq(
                    "organization_id", str(organization_id)
                ).execute()

                affected_recipes.append(
                    {
                        "recipe_id": str(recipe_id),
                        "new_cost": float(cost_result.portion_analysis.total_ingredient_cost),
                        "cost_per_serving": float(cost_result.portion_analysis.cost_per_portion),
                    }
                )

            except Exception as e:
                print(f"Error updating recipe {recipe_id}: {e}")

        return {
            "updated_recipes": len(affected_recipes),
            "affected_recipes": affected_recipes,
            "update_timestamp": datetime.now().isoformat(),
        }

    # Private helper methods

    async def _get_recipe_secure(
        self, recipe_id: UUID, organization_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Get recipe with multi-tenant security."""
        response = (
            self.supabase.table("recipes")
            .select("*")
            .eq("recipe_id", str(recipe_id))
            .eq("organization_id", str(organization_id))
            .eq("is_active", True)
            .execute()
        )
        return response.data[0] if response.data else None

    async def _get_menu_item_secure(
        self, menu_item_id: UUID, organization_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Get menu item with multi-tenant security."""
        response = (
            self.supabase.table("menu_items")
            .select("*")
            .eq("menu_item_id", str(menu_item_id))
            .eq("organization_id", str(organization_id))
            .eq("is_active", True)
            .execute()
        )
        return response.data[0] if response.data else None

    async def _get_recipe_ingredients_secure(
        self, recipe_id: UUID, organization_id: UUID
    ) -> List[Dict[str, Any]]:
        """Get recipe ingredients with ingredient details and multi-tenant security."""
        response = (
            self.supabase.table("recipe_ingredients")
            .select("*, ingredients(*)")
            .eq("recipe_id", str(recipe_id))
            .eq("organization_id", str(organization_id))
            .execute()
        )

        # Filter out inactive ingredients and flatten data
        result = []
        for ri in response.data or []:
            ingredient = ri.get("ingredients")
            if ingredient and ingredient.get("is_active"):
                result.append(
                    {
                        "quantity": Decimal(str(ri.get("quantity", 0))),
                        "unit": ri.get("unit", ""),
                        "ingredient_id": ri.get("ingredient_id"),
                        "ingredient_name": ingredient.get("name"),
                        "ingredient_cost_per_unit": Decimal(
                            str(ingredient.get("cost_per_unit", 0))
                        ),
                        "ingredient_unit": ingredient.get("unit"),
                        "notes": ri.get("notes", ""),
                    }
                )

        return result

    async def _calculate_ingredient_cost(
        self, ingredient_data: Dict[str, Any], target_servings: int, original_servings: int
    ) -> Dict[str, Any]:
        """Calculate cost for a single ingredient with unit conversion and scaling."""

        # Scale quantity for target servings
        base_quantity = ingredient_data["quantity"]
        scaled_quantity = base_quantity * Decimal(target_servings) / Decimal(original_servings)

        # Calculate cost with unit conversion
        total_cost = calculate_ingredient_cost(
            recipe_quantity=scaled_quantity,
            recipe_unit=ingredient_data["unit"],
            cost_per_unit=ingredient_data["ingredient_cost_per_unit"],
            cost_unit=ingredient_data["ingredient_unit"],
        )

        return {
            "ingredient_id": ingredient_data["ingredient_id"],
            "ingredient_name": ingredient_data["ingredient_name"],
            "quantity": float(scaled_quantity),
            "unit": ingredient_data["unit"],
            "cost_per_unit": float(ingredient_data["ingredient_cost_per_unit"]),
            "cost_unit": ingredient_data["ingredient_unit"],
            "total_cost": total_cost,
            "cost_per_serving": total_cost / Decimal(target_servings)
            if target_servings > 0
            else Decimal("0"),
            "notes": ingredient_data.get("notes", ""),
        }

    def _calculate_fallback_cost(
        self, ingredient_data: Dict[str, Any], target_servings: int, original_servings: int
    ) -> Dict[str, Any]:
        """Fallback cost calculation when unit conversion fails."""
        base_quantity = ingredient_data["quantity"]
        scaled_quantity = base_quantity * Decimal(target_servings) / Decimal(original_servings)
        total_cost = scaled_quantity * ingredient_data["ingredient_cost_per_unit"]

        return {
            "ingredient_id": ingredient_data["ingredient_id"],
            "ingredient_name": ingredient_data["ingredient_name"],
            "quantity": float(scaled_quantity),
            "unit": ingredient_data["unit"],
            "cost_per_unit": float(ingredient_data["ingredient_cost_per_unit"]),
            "cost_unit": ingredient_data["ingredient_unit"],
            "total_cost": total_cost,
            "cost_per_serving": total_cost / Decimal(target_servings)
            if target_servings > 0
            else Decimal("0"),
            "notes": ingredient_data.get("notes", "") + " (unit conversion fallback used)",
        }

    async def _calculate_margin_analysis(
        self, menu_item: Dict[str, Any], portion_analysis: PortionCostAnalysis
    ) -> MarginAnalysis:
        """Calculate comprehensive margin analysis with VAT handling."""

        selling_price = Decimal(str(menu_item.get("selling_price", 0)))
        vat_rate = SwedishVATRate(menu_item.get("vat_rate", "12"))
        vat_calculation_type = VATCalculationType(
            menu_item.get("vat_calculation_type", "inclusive")
        )
        target_food_cost_pct = Decimal(str(menu_item.get("target_food_cost_percentage", 30)))

        # Calculate VAT amounts
        vat_amount = calculate_vat_amount(selling_price, vat_rate, vat_calculation_type)
        price_excluding_vat = calculate_price_excluding_vat(
            selling_price, vat_rate, vat_calculation_type
        )
        price_including_vat = calculate_price_including_vat(
            selling_price, vat_rate, vat_calculation_type
        )

        # Cost analysis
        total_cost = portion_analysis.total_cost_per_portion
        food_cost = portion_analysis.cost_per_portion

        # Margin calculations - use price excluding VAT for margin calculations
        working_price = price_excluding_vat
        margin_amount = working_price - total_cost
        margin_percentage = (
            (margin_amount / working_price * 100) if working_price > 0 else Decimal("0")
        )
        food_cost_percentage = (
            (food_cost / working_price * 100) if working_price > 0 else Decimal("0")
        )
        margin_multiple = working_price / total_cost if total_cost > 0 else Decimal("0")

        # Variance from target
        variance_percentage = food_cost_percentage - target_food_cost_pct

        return MarginAnalysis(
            selling_price=selling_price,
            vat_rate=vat_rate,
            vat_calculation_type=vat_calculation_type,
            vat_amount=vat_amount,
            price_excluding_vat=price_excluding_vat,
            price_including_vat=price_including_vat,
            total_cost_per_portion=total_cost,
            food_cost=food_cost,
            margin_amount=margin_amount,
            margin_percentage=margin_percentage,
            food_cost_percentage=food_cost_percentage,
            target_food_cost_percentage=target_food_cost_pct,
            variance_percentage=variance_percentage,
            margin_multiple=margin_multiple,
        )

    def _generate_cost_recommendations(
        self, total_cost: Decimal, servings: int, ingredient_costs: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate cost optimization recommendations."""
        recommendations = []

        if not ingredient_costs:
            return ["Inga ingredienser hittades för kostanalys"]

        # Check for expensive ingredients
        avg_cost = total_cost / len(ingredient_costs) if ingredient_costs else Decimal("0")
        expensive_ingredients = [
            ing for ing in ingredient_costs if ing["total_cost"] > avg_cost * Decimal("1.5")
        ]

        if expensive_ingredients:
            recommendations.append(
                f"Överväg att optimera {len(expensive_ingredients)} dyrare ingredienser som påverkar kostnaden mest"
            )

        # Check cost per serving
        cost_per_serving = total_cost / servings if servings > 0 else Decimal("0")
        if cost_per_serving > Decimal("25"):
            recommendations.append(
                "Ingredienskostnaden per portion är relativt hög - överväg ingrediensalternativ"
            )

        return recommendations

    def _generate_margin_recommendations(self, margin_analysis: MarginAnalysis) -> List[str]:
        """Generate margin optimization recommendations."""
        recommendations = []

        # Food cost percentage analysis
        if margin_analysis.food_cost_percentage > 35:
            recommendations.append(
                f"Matkostnadsprocenten ({margin_analysis.food_cost_percentage:.1f}%) överstiger rekommenderade 35% - "
                "överväg att justera recept eller pris"
            )
        elif margin_analysis.food_cost_percentage > 30:
            recommendations.append(
                f"Matkostnadsprocenten ({margin_analysis.food_cost_percentage:.1f}%) är i övre delen av optimalt intervall"
            )

        # Margin multiple analysis
        if margin_analysis.margin_multiple < Decimal("2.5"):
            recommendations.append(
                f"Marginalmultipeln ({margin_analysis.margin_multiple:.1f}x) är låg - "
                "överväg prisjustering för bättre lönsamhet"
            )

        # Variance from target
        if margin_analysis.variance_percentage and abs(margin_analysis.variance_percentage) > 5:
            if margin_analysis.variance_percentage > 0:
                recommendations.append(
                    f"Matkostnaden ligger {margin_analysis.variance_percentage:.1f}% över målet - "
                    "optimering behövs"
                )
            else:
                recommendations.append(
                    f"Matkostnaden ligger {abs(margin_analysis.variance_percentage):.1f}% under målet - "
                    "möjlighet för premiumprissättning"
                )

        return recommendations


async def get_cost_calculation_engine(supabase: Client) -> CostCalculationEngine:
    """Get cost calculation engine instance."""
    return CostCalculationEngine(supabase)
