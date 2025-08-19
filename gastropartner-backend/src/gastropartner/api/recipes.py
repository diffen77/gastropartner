"""Recipes API endpoints för kostnadskontroll."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from gastropartner.core.auth import get_current_active_user
from gastropartner.core.multitenant import get_user_organization
from gastropartner.core.database import get_supabase_client, get_supabase_client_with_auth
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


def get_authenticated_supabase_client(
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase_client),
) -> Client:
    """Get Supabase client with proper authentication context."""
    # For development user, use admin client to bypass RLS
    auth_client = get_supabase_client_with_auth(str(current_user.id))
    return auth_client


@router.post(
    "/dev/setup",
    summary="Setup development data",
    description="Development only: Setup required data for testing"
)
async def setup_development_data(
    supabase: Client = Depends(get_authenticated_supabase_client),
) -> dict[str, str]:
    """Setup development data (development mode only)."""

    dev_org_id = "87654321-4321-4321-4321-210987654321"

    try:
        # Try to insert development organization (ignore if exists)
        try:
            supabase.rpc("create_development_org", {
                "org_id": dev_org_id,
                "org_name": "Development Organization",
                "org_slug": "dev-org"
            }).execute()
        except Exception as e:
            print(f"DEBUG: Organization creation attempt: {e}")

        return {"message": "Development data setup attempted", "organization_id": dev_org_id}
    except Exception as e:
        return {"message": f"Setup failed: {e}", "organization_id": dev_org_id}


async def calculate_recipe_cost(
    recipe_id: UUID,
    organization_id: UUID,
    supabase: Client,
    servings: int = 1
) -> CostAnalysis:
    """Calculate total cost for a recipe."""

    # Get recipe ingredients with ingredient details (SÄKERHET: filtrera på organisation)
    response = supabase.table("recipe_ingredients").select(
        "*, ingredients(*)"
    ).eq("recipe_id", str(recipe_id)).eq("organization_id", str(organization_id)).execute()

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


async def ensure_development_organization(
    organization_id: UUID,
    supabase: Client
) -> bool:
    """Ensure development organization exists."""
    if str(organization_id) != "87654321-4321-4321-4321-210987654321":
        return True  # Not development org, nothing to do

    # Check if development organization exists
    org_response = supabase.table("organizations").select(
        "organization_id"
    ).eq("organization_id", str(organization_id)).execute()

    if org_response.data:
        return True  # Already exists

    # Create development organization
    try:
        supabase.table("organizations").insert({
            "organization_id": str(organization_id),
            "name": "Development Organization",
            "slug": "dev-org",
            "plan": "free",
            "max_recipes": 5,
            "max_ingredients": 50,
            "max_menu_items": 2
        }).execute()
        print("DEBUG: Development organization created successfully")
        return True
    except Exception as e:
        print(f"DEBUG: Failed to create development organization: {e}")
        return False


async def check_recipe_limits(
    organization_id: UUID,
    supabase: Client
) -> bool:
    """Check if organization can add more recipes."""

    # Ensure development organization exists
    await ensure_development_organization(organization_id, supabase)

    # Get organization limits
    org_response = supabase.table("organizations").select(
        "max_recipes"
    ).eq("organization_id", str(organization_id)).execute()

    if not org_response.data:
        print(f"DEBUG: No organization found for ID: {organization_id}")
        # Development mode: use default limits if organization doesn't exist
        if str(organization_id) == "87654321-4321-4321-4321-210987654321":
            print("DEBUG: Using development organization defaults (max_recipes=5)")
            max_recipes = 5  # Use default development value
        else:
            return False
    else:
        max_recipes = org_response.data[0]["max_recipes"]

    print(f"DEBUG: Organization {organization_id} has max_recipes: {max_recipes}")

    # Count current recipes
    count_response = supabase.table("recipes").select(
        "recipe_id", count="exact"
    ).eq("organization_id", str(organization_id)).eq("is_active", True).execute()

    current_count = count_response.count or 0
    print(f"DEBUG: Current recipe count: {current_count}, Max: {max_recipes}, Can add: {current_count < max_recipes}")

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
    supabase: Client = Depends(get_authenticated_supabase_client),
) -> Recipe:
    """
    Create new recipe with ingredients.
    
    Freemium limits:
    - Maximum 5 recipes per organization
    - Upgrade to premium for unlimited recipes
    """

    # For development mode, we'll use a simpler approach since RLS policies need to be set up
    db_client = supabase

    # Check freemium limits
    can_add = await check_recipe_limits(organization_id, db_client)
    if not can_add:
        # Get current count for error message
        count_response = db_client.table("recipes").select(
            "recipe_id", count="exact"
        ).eq("organization_id", str(organization_id)).eq("is_active", True).execute()

        current_count = count_response.count or 0
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Freemium limit reached: {current_count}/5 recipes used. Upgrade to premium for unlimited recipes."
        )

    try:
        # Create recipe
        recipe_response = db_client.table("recipes").insert({
            "organization_id": str(organization_id),
            "creator_id": str(current_user.id),
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
                ingredient_response = db_client.table("ingredients").select(
                    "ingredient_id"
                ).eq("ingredient_id", str(ingredient_data.ingredient_id)).eq(
                    "organization_id", str(organization_id)
                ).eq("is_active", True).execute()

                if not ingredient_response.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Ingredient {ingredient_data.ingredient_id} not found or not active"
                    )

                # Add recipe ingredient (SÄKERHET: inkludera organisation)
                ri_response = db_client.table("recipe_ingredients").insert({
                    "recipe_id": recipe_id,
                    "ingredient_id": str(ingredient_data.ingredient_id),
                    "organization_id": str(organization_id),
                    "quantity": float(ingredient_data.quantity),
                    "unit": ingredient_data.unit,
                    "notes": ingredient_data.notes,
                }).execute()

                if ri_response.data:
                    recipe_ingredients.append(RecipeIngredient(**ri_response.data[0]))

        # Calculate costs
        cost_analysis = await calculate_recipe_cost(
            UUID(recipe_id), organization_id, db_client, recipe_data.servings
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
    supabase: Client = Depends(get_authenticated_supabase_client),
    current_user: User = Depends(get_current_active_user),
    active_only: bool = Query(True, description="Show only active recipes"),
    include_costs: bool = Query(True, description="Include cost calculations"),
    limit: int = Query(100, ge=1, le=500, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
) -> list[Recipe]:
    """List recipes for the organization with cost calculations."""

    # For development mode, we'll use a simpler approach since RLS policies need to be set up
    db_client = supabase

    try:
        query = db_client.table("recipes").select("*").eq(
            "organization_id", str(organization_id)
        )

        if active_only:
            query = query.eq("is_active", True)

        query = query.order("name").range(offset, offset + limit - 1)
        response = query.execute()

        recipes = []
        for recipe_data in response.data:
            recipe = Recipe(**recipe_data)

            # Load ingredients for each recipe (SÄKERHET: filtrera på organisation)
            ingredients_response = db_client.table("recipe_ingredients").select(
                "*, ingredients(*)"
            ).eq("recipe_id", str(recipe.recipe_id)).eq("organization_id", str(organization_id)).execute()

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

            recipe.ingredients = recipe_ingredients

            if include_costs:
                # Calculate costs for each recipe
                cost_analysis = await calculate_recipe_cost(
                    recipe.recipe_id, organization_id, db_client, recipe.servings
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
    supabase: Client = Depends(get_authenticated_supabase_client),
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

    # Get recipe ingredients with ingredient details (SÄKERHET: filtrera på organisation)
    ingredients_response = supabase.table("recipe_ingredients").select(
        "*, ingredients(*)"
    ).eq("recipe_id", str(recipe_id)).eq("organization_id", str(organization_id)).execute()

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
    supabase: Client = Depends(get_authenticated_supabase_client),
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

    # Update recipe basic fields if any changes
    if update_data:
        update_data["updated_at"] = "now()"
        response = supabase.table("recipes").update(update_data).eq(
            "recipe_id", str(recipe_id)
        ).eq("organization_id", str(organization_id)).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update recipe"
            )

    # Handle ingredients update if provided
    if recipe_update.ingredients is not None:
        # Delete existing recipe ingredients (SÄKERHET: filtrera på organisation)
        supabase.table("recipe_ingredients").delete().eq(
            "recipe_id", str(recipe_id)
        ).eq("organization_id", str(organization_id)).execute()

        # Add new ingredients
        if recipe_update.ingredients:
            for ingredient_data in recipe_update.ingredients:
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

                # Add recipe ingredient (SÄKERHET: inkludera organisation)
                supabase.table("recipe_ingredients").insert({
                    "recipe_id": str(recipe_id),
                    "ingredient_id": str(ingredient_data.ingredient_id),
                    "organization_id": str(organization_id),
                    "quantity": float(ingredient_data.quantity),
                    "unit": ingredient_data.unit,
                    "notes": ingredient_data.notes,
                }).execute()

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
    supabase: Client = Depends(get_authenticated_supabase_client),
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
    supabase: Client = Depends(get_authenticated_supabase_client),
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
