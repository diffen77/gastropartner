"""Freemium limits and usage tracking service."""

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from supabase import Client

from gastropartner.core.models import UsageLimitsCheck


class FreemiumService:
    """Central service for freemium limits and usage tracking."""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    async def get_organization_limits(self, organization_id: UUID) -> dict[str, int]:
        """Get organization's freemium limits."""
        response = self.supabase.table("organizations").select(
            "max_ingredients, max_recipes, max_menu_items"
        ).eq("organization_id", str(organization_id)).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )

        return response.data[0]

    async def get_current_usage(self, organization_id: UUID) -> dict[str, int]:
        """Get organization's current usage counts."""
        # Count active ingredients
        ingredients_count = self.supabase.table("ingredients").select(
            "ingredient_id", count="exact"
        ).eq("organization_id", str(organization_id)).eq("is_active", True).execute()

        # Count active recipes
        recipes_count = self.supabase.table("recipes").select(
            "recipe_id", count="exact"
        ).eq("organization_id", str(organization_id)).eq("is_active", True).execute()

        # Count active menu items
        menu_items_count = self.supabase.table("menu_items").select(
            "menu_item_id", count="exact"
        ).eq("organization_id", str(organization_id)).eq("is_active", True).execute()

        return {
            "current_ingredients": ingredients_count.count or 0,
            "current_recipes": recipes_count.count or 0,
            "current_menu_items": menu_items_count.count or 0,
        }

    async def check_all_limits(
        self,
        organization_id: UUID,
        check_ingredient_add: bool = False,
        check_recipe_add: bool = False,
        check_menu_item_add: bool = False,
    ) -> UsageLimitsCheck:
        """
        Check all freemium limits for organization.
        
        Args:
            organization_id: Organization to check limits for
            check_ingredient_add: Check if adding 1 more ingredient is allowed
            check_recipe_add: Check if adding 1 more recipe is allowed
            check_menu_item_add: Check if adding 1 more menu item is allowed
        """
        limits = await self.get_organization_limits(organization_id)
        usage = await self.get_current_usage(organization_id)

        # Calculate what user can add
        can_add_ingredient = (
            usage["current_ingredients"] + (1 if check_ingredient_add else 0)
        ) <= limits["max_ingredients"]

        can_add_recipe = (
            usage["current_recipes"] + (1 if check_recipe_add else 0)
        ) <= limits["max_recipes"]

        can_add_menu_item = (
            usage["current_menu_items"] + (1 if check_menu_item_add else 0)
        ) <= limits["max_menu_items"]

        # Check if upgrade is needed
        upgrade_needed = not (can_add_ingredient and can_add_recipe and can_add_menu_item)

        return UsageLimitsCheck(
            current_ingredients=usage["current_ingredients"],
            max_ingredients=limits["max_ingredients"],
            current_recipes=usage["current_recipes"],
            max_recipes=limits["max_recipes"],
            current_menu_items=usage["current_menu_items"],
            max_menu_items=limits["max_menu_items"],
            can_add_ingredient=can_add_ingredient,
            can_add_recipe=can_add_recipe,
            can_add_menu_item=can_add_menu_item,
            upgrade_needed=upgrade_needed,
        )

    async def enforce_ingredient_limit(self, organization_id: UUID) -> None:
        """Enforce ingredient limit and raise exception if exceeded."""
        limits_check = await self.check_all_limits(organization_id, check_ingredient_add=True)

        if not limits_check.can_add_ingredient:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Freemium limit reached: {limits_check.current_ingredients}/{limits_check.max_ingredients} ingredients used. Upgrade to premium for unlimited ingredients.",
                headers={"X-Upgrade-Required": "true", "X-Feature": "ingredients"}
            )

    async def enforce_recipe_limit(self, organization_id: UUID) -> None:
        """Enforce recipe limit and raise exception if exceeded."""
        limits_check = await self.check_all_limits(organization_id, check_recipe_add=True)

        if not limits_check.can_add_recipe:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Freemium limit reached: {limits_check.current_recipes}/{limits_check.max_recipes} recipes used. Upgrade to premium for unlimited recipes.",
                headers={"X-Upgrade-Required": "true", "X-Feature": "recipes"}
            )

    async def enforce_menu_item_limit(self, organization_id: UUID) -> None:
        """Enforce menu item limit and raise exception if exceeded."""
        limits_check = await self.check_all_limits(organization_id, check_menu_item_add=True)

        if not limits_check.can_add_menu_item:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Freemium limit reached: {limits_check.current_menu_items}/{limits_check.max_menu_items} menu items used. Upgrade to premium for unlimited menu items.",
                headers={"X-Upgrade-Required": "true", "X-Feature": "menu_items"}
            )

    async def get_usage_summary(self, organization_id: UUID) -> dict[str, Any]:
        """Get formatted usage summary for frontend display."""
        limits_check = await self.check_all_limits(organization_id)

        return {
            "organization_id": str(organization_id),
            "plan": "free",  # For now, all organizations are on free plan
            "usage": {
                "ingredients": {
                    "current": limits_check.current_ingredients,
                    "limit": limits_check.max_ingredients,
                    "percentage": (
                        limits_check.current_ingredients / limits_check.max_ingredients * 100
                    ) if limits_check.max_ingredients > 0 else 0,
                    "at_limit": limits_check.current_ingredients >= limits_check.max_ingredients,
                },
                "recipes": {
                    "current": limits_check.current_recipes,
                    "limit": limits_check.max_recipes,
                    "percentage": (
                        limits_check.current_recipes / limits_check.max_recipes * 100
                    ) if limits_check.max_recipes > 0 else 0,
                    "at_limit": limits_check.current_recipes >= limits_check.max_recipes,
                },
                "menu_items": {
                    "current": limits_check.current_menu_items,
                    "limit": limits_check.max_menu_items,
                    "percentage": (
                        limits_check.current_menu_items / limits_check.max_menu_items * 100
                    ) if limits_check.max_menu_items > 0 else 0,
                    "at_limit": limits_check.current_menu_items >= limits_check.max_menu_items,
                },
            },
            "upgrade_needed": limits_check.upgrade_needed,
            "upgrade_prompts": self._generate_upgrade_prompts(limits_check),
        }

    def _generate_upgrade_prompts(self, limits_check: UsageLimitsCheck) -> dict[str, str]:
        """Generate context-specific upgrade prompts."""
        prompts = {}

        if limits_check.current_ingredients >= limits_check.max_ingredients:
            prompts["ingredients"] = (
                "You've reached your ingredient limit! Upgrade to premium to add unlimited ingredients "
                "and unlock advanced cost tracking features."
            )

        if limits_check.current_recipes >= limits_check.max_recipes:
            prompts["recipes"] = (
                "Recipe limit reached! Upgrade to premium for unlimited recipes, "
                "batch cost calculations, and nutritional analysis."
            )

        if limits_check.current_menu_items >= limits_check.max_menu_items:
            prompts["menu_items"] = (
                "Menu item limit reached! Upgrade to premium for unlimited menu items, "
                "advanced pricing strategies, and profit optimization tools."
            )

        return prompts


async def get_freemium_service(supabase: Client) -> FreemiumService:
    """Get freemium service instance."""
    return FreemiumService(supabase)
