"""Recipes API endpoints för kostnadskontroll."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from gastropartner.core.auth import get_current_active_user, get_user_organization
from gastropartner.core.database import get_supabase_client
from gastropartner.core.models import (
    CostAnalysis,
    Ingredient,
    MessageResponse,
    Recipe,
    RecipeCreate,
    RecipeIngredient,
    RecipeUpdate,
    User,
)

router = APIRouter(prefix="/recipes", tags=["recipes"])


async def calculate_recipe_cost(
    recipe_id: UUID,
    organization_id: UUID,
    supabase: Client,
    servings: int = 1
) -> CostAnalysis:
    """Calculate total cost for a recipe."""

    # Get recipe ingredients with ingredient details
    response = supabase.table("recipe_ingredients").select(
        "*, ingredients(*)"
    ).eq("recipe_id", str(recipe_id)).execute()

    if not response.data:
        return CostAnalysis(
            total_ingredient_cost=0.0,
            cost_per_serving=0.0,
        )

    total_cost = 0.0

    for recipe_ingredient in response.data:
        ingredient = recipe_ingredient["ingredients"]
        if ingredient and ingredient["is_active"]:
            # Convert quantity to cost based on ingredient unit cost
            quantity = float(recipe_ingredient["quantity"])
            cost_per_unit = float(ingredient["cost_per_unit"])
            ingredient_cost = quantity * cost_per_unit
            total_cost += ingredient_cost

    cost_per_serving = total_cost / servings if servings > 0 else 0.0

    return CostAnalysis(
        total_ingredient_cost=total_cost,
        cost_per_serving=cost_per_serving,
    )


async def check_recipe_limits(
    organization_id: UUID,
    supabase: Client
) -> bool:
    """Check if organization can add more recipes."""

    # Get organization limits
    org_response = supabase.table("organizations").select(
        "max_recipes"
    ).eq("organization_id", str(organization_id)).execute()

    if not org_response.data:
        return False

    max_recipes = org_response.data[0]["max_recipes"]

    # Count current recipes
    count_response = supabase.table("recipes").select(
        "recipe_id", count="exact"
    ).eq("organization_id", str(organization_id)).eq("is_active", True).execute()

    current_count = count_response.count or 0
    return current_count < max_recipes


@router.post(
    "/",
    response_model=Recipe,
    status_code=status.HTTP_201_CREATED,
    summary="Create recipe",
    description="Create a new recipe with ingredients (freemium: max 5 recipes)"
)
async def create_recipe(
    recipe_data: RecipeCreate,
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
) -> Recipe:
    """
    Create new recipe with ingredients.
    
    Freemium limits:
    - Maximum 5 recipes per organization
    - Upgrade to premium for unlimited recipes
    """

    # Check freemium limits
    can_add = await check_recipe_limits(organization_id, supabase)
    if not can_add:
        # Get current count for error message
        count_response = supabase.table("recipes").select(
            "recipe_id", count="exact"
        ).eq("organization_id", str(organization_id)).eq("is_active", True).execute()

        current_count = count_response.count or 0
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Freemium limit reached: {current_count}/5 recipes used. Upgrade to premium for unlimited recipes."
        )

    try:
        # Create recipe
        recipe_response = supabase.table("recipes").insert({
            "organization_id": str(organization_id),
            "name": recipe_data.name,
            "description": recipe_data.description,
            "servings": recipe_data.servings,
            "prep_time_minutes": recipe_data.prep_time_minutes,
            "cook_time_minutes": recipe_data.cook_time_minutes,
            "instructions": recipe_data.instructions,
            "notes": recipe_data.notes,
        }).execute()

        if not recipe_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create recipe"
            )

        recipe = recipe_response.data[0]
        recipe_id = recipe["recipe_id"]

        # Add ingredients to recipe
        recipe_ingredients = []
        if recipe_data.ingredients:
            for ingredient_data in recipe_data.ingredients:
                # Verify ingredient exists and belongs to organization
                ingredient_response = supabase.table("ingredients").select(
                    "ingredient_id"
                ).eq("ingredient_id", str(ingredient_data.ingredient_id)).eq(
                    "organization_id", str(organization_id)
                ).eq("is_active", True).execute()

                if not ingredient_response.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Ingredient {ingredient_data.ingredient_id} not found or not active"
                    )

                # Add recipe ingredient
                ri_response = supabase.table("recipe_ingredients").insert({
                    "recipe_id": recipe_id,
                    "ingredient_id": str(ingredient_data.ingredient_id),
                    "quantity": float(ingredient_data.quantity),
                    "unit": ingredient_data.unit,
                    "notes": ingredient_data.notes,
                }).execute()

                if ri_response.data:
                    recipe_ingredients.append(RecipeIngredient(**ri_response.data[0]))

        # Calculate costs
        cost_analysis = await calculate_recipe_cost(
            UUID(recipe_id), organization_id, supabase, recipe_data.servings
        )

        # Return complete recipe with cost information
        recipe_result = Recipe(**recipe)
        recipe_result.ingredients = recipe_ingredients
        recipe_result.total_cost = cost_analysis.total_ingredient_cost
        recipe_result.cost_per_serving = cost_analysis.cost_per_serving

        return recipe_result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {e!s}"
        ) from e


@router.get(
    "/",
    response_model=list[Recipe],
    summary="List recipes",
    description="Get all recipes for the organization"
)
async def list_recipes(
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
    active_only: bool = Query(True, description="Show only active recipes"),
    include_costs: bool = Query(True, description="Include cost calculations"),
    limit: int = Query(100, ge=1, le=500, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
) -> list[Recipe]:
    """List recipes for the organization with cost calculations."""

    try:
        query = supabase.table("recipes").select("*").eq(
            "organization_id", str(organization_id)
        )

        if active_only:
            query = query.eq("is_active", True)

        query = query.order("name").range(offset, offset + limit - 1)
        response = query.execute()

        recipes = []
        for recipe_data in response.data:
            recipe = Recipe(**recipe_data)

            if include_costs:
                # Calculate costs for each recipe
                cost_analysis = await calculate_recipe_cost(
                    recipe.recipe_id, organization_id, supabase, recipe.servings
                )
                recipe.total_cost = cost_analysis.total_ingredient_cost
                recipe.cost_per_serving = cost_analysis.cost_per_serving

            recipes.append(recipe)

        return recipes

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {e!s}"
        ) from e


@router.get(
    "/{recipe_id}",
    response_model=Recipe,
    summary="Get recipe",
    description="Get recipe details with ingredients and cost analysis"
)
async def get_recipe(
    recipe_id: UUID,
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
) -> Recipe:
    """Get recipe by ID with complete ingredient details and cost analysis."""

    # Get recipe
    recipe_response = supabase.table("recipes").select("*").eq(
        "recipe_id", str(recipe_id)
    ).eq("organization_id", str(organization_id)).execute()

    if not recipe_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found"
        )

    recipe_data = recipe_response.data[0]

    # Get recipe ingredients with ingredient details
    ingredients_response = supabase.table("recipe_ingredients").select(
        "*, ingredients(*)"
    ).eq("recipe_id", str(recipe_id)).execute()

    # Build recipe ingredients list
    recipe_ingredients = []
    for ri_data in ingredients_response.data:
        ri = RecipeIngredient(**{
            "recipe_ingredient_id": ri_data["recipe_ingredient_id"],
            "recipe_id": ri_data["recipe_id"],
            "ingredient_id": ri_data["ingredient_id"],
            "quantity": ri_data["quantity"],
            "unit": ri_data["unit"],
            "notes": ri_data["notes"],
            "created_at": ri_data["created_at"],
        })

        if ri_data["ingredients"]:
            ri.ingredient = Ingredient(**ri_data["ingredients"])

        recipe_ingredients.append(ri)

    # Calculate costs
    cost_analysis = await calculate_recipe_cost(
        recipe_id, organization_id, supabase, recipe_data["servings"]
    )

    # Build complete recipe
    recipe = Recipe(**recipe_data)
    recipe.ingredients = recipe_ingredients
    recipe.total_cost = cost_analysis.total_ingredient_cost
    recipe.cost_per_serving = cost_analysis.cost_per_serving

    return recipe


@router.put(
    "/{recipe_id}",
    response_model=Recipe,
    summary="Update recipe",
    description="Update recipe details"
)
async def update_recipe(
    recipe_id: UUID,
    recipe_update: RecipeUpdate,
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
) -> Recipe:
    """Update recipe details."""

    # Check if recipe exists
    existing = await get_recipe(recipe_id, organization_id, supabase)

    # Build update data
    update_data = {}
    if recipe_update.name is not None:
        update_data["name"] = recipe_update.name
    if recipe_update.description is not None:
        update_data["description"] = recipe_update.description
    if recipe_update.servings is not None:
        update_data["servings"] = recipe_update.servings
    if recipe_update.prep_time_minutes is not None:
        update_data["prep_time_minutes"] = recipe_update.prep_time_minutes
    if recipe_update.cook_time_minutes is not None:
        update_data["cook_time_minutes"] = recipe_update.cook_time_minutes
    if recipe_update.instructions is not None:
        update_data["instructions"] = recipe_update.instructions
    if recipe_update.notes is not None:
        update_data["notes"] = recipe_update.notes
    if recipe_update.is_active is not None:
        update_data["is_active"] = recipe_update.is_active

    if not update_data:
        return existing

    update_data["updated_at"] = "now()"

    response = supabase.table("recipes").update(update_data).eq(
        "recipe_id", str(recipe_id)
    ).eq("organization_id", str(organization_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update recipe"
        )

    # Return updated recipe with recalculated costs
    return await get_recipe(recipe_id, organization_id, supabase)


@router.delete(
    "/{recipe_id}",
    response_model=MessageResponse,
    summary="Delete recipe",
    description="Delete recipe (soft delete - marks as inactive)"
)
async def delete_recipe(
    recipe_id: UUID,
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
) -> MessageResponse:
    """Delete recipe (soft delete)."""

    # Check if recipe exists
    await get_recipe(recipe_id, organization_id, supabase)

    # Soft delete by setting is_active = false
    response = supabase.table("recipes").update({
        "is_active": False,
        "updated_at": "now()"
    }).eq("recipe_id", str(recipe_id)).eq(
        "organization_id", str(organization_id)
    ).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete recipe"
        )

    return MessageResponse(
        message="Recipe deleted successfully",
        success=True
    )


@router.get(
    "/{recipe_id}/cost-analysis",
    response_model=CostAnalysis,
    summary="Get recipe cost analysis",
    description="Get detailed cost analysis for a recipe"
)
async def get_recipe_cost_analysis(
    recipe_id: UUID,
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
    servings: int = Query(None, ge=1, description="Override servings for calculation"),
) -> CostAnalysis:
    """Get detailed cost analysis for a recipe."""

    # Verify recipe exists
    recipe = await get_recipe(recipe_id, organization_id, supabase)

    # Use provided servings or recipe default
    calc_servings = servings or recipe.servings

    return await calculate_recipe_cost(
        recipe_id, organization_id, supabase, calc_servings
    )
