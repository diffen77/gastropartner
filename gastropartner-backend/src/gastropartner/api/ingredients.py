"""Ingredients API endpoints för kostnadskontroll."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from gastropartner.core.auth import get_current_active_user, get_user_organization
from gastropartner.core.database import get_supabase_client, get_supabase_client_with_auth
from gastropartner.core.freemium import get_freemium_service
from gastropartner.core.models import (
    Ingredient,
    IngredientCreate,
    IngredientUpdate,
    MessageResponse,
    UsageLimitsCheck,
    User,
)

router = APIRouter(prefix="/ingredients", tags=["ingredients"])


async def check_ingredient_limits(
    organization_id: UUID,
    supabase: Client,
    exclude_creating: bool = False
) -> UsageLimitsCheck:
    """Check if organization can add more ingredients."""

    # Get organization limits
    org_response = supabase.table("organizations").select(
        "max_ingredients, current_ingredients, max_recipes, current_recipes, max_menu_items, current_menu_items"
    ).eq("organization_id", str(organization_id)).execute()

    if not org_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    org = org_response.data[0]

    # Count current usage
    ingredients_count = supabase.table("ingredients").select(
        "ingredient_id", count="exact"
    ).eq("organization_id", str(organization_id)).eq("is_active", True).execute()

    recipes_count = supabase.table("recipes").select(
        "recipe_id", count="exact"
    ).eq("organization_id", str(organization_id)).eq("is_active", True).execute()

    menu_items_count = supabase.table("menu_items").select(
        "menu_item_id", count="exact"
    ).eq("organization_id", str(organization_id)).eq("is_active", True).execute()

    current_ingredients = ingredients_count.count or 0
    current_recipes = recipes_count.count or 0
    current_menu_items = menu_items_count.count or 0

    # Check if adding one more would exceed limits
    can_add_ingredient = (current_ingredients + (1 if not exclude_creating else 0)) <= org["max_ingredients"]
    can_add_recipe = current_recipes <= org["max_recipes"]
    can_add_menu_item = current_menu_items <= org["max_menu_items"]

    upgrade_needed = not (can_add_ingredient and can_add_recipe and can_add_menu_item)

    return UsageLimitsCheck(
        current_ingredients=current_ingredients,
        max_ingredients=org["max_ingredients"],
        current_recipes=current_recipes,
        max_recipes=org["max_recipes"],
        current_menu_items=current_menu_items,
        max_menu_items=org["max_menu_items"],
        can_add_ingredient=can_add_ingredient,
        can_add_recipe=can_add_recipe,
        can_add_menu_item=can_add_menu_item,
        upgrade_needed=upgrade_needed,
    )


@router.post(
    "/",
    response_model=Ingredient,
    status_code=status.HTTP_201_CREATED,
    summary="Create ingredient",
    description="Create a new ingredient (freemium: max 50 ingredients)"
)
async def create_ingredient(
    ingredient_data: IngredientCreate,
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
) -> Ingredient:
    """
    Create new ingredient.
    
    Freemium limits:
    - Maximum 50 ingredients per organization
    - Upgrade to premium for unlimited ingredients
    """

    # Check freemium limits using central service
    freemium_service = await get_freemium_service(supabase)
    await freemium_service.enforce_ingredient_limit(organization_id)

    try:
        # Get Supabase client with user authentication context
        user_supabase = get_supabase_client_with_auth(str(current_user.id))
        
        # Create ingredient
        response = user_supabase.table("ingredients").insert({
            "organization_id": str(organization_id),
            "name": ingredient_data.name,
            "category": ingredient_data.category,
            "unit": ingredient_data.unit,
            "cost_per_unit": float(ingredient_data.cost_per_unit),
            "supplier": ingredient_data.supplier,
            "notes": ingredient_data.notes,
        }).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create ingredient"
            )

        return Ingredient(**response.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {e!s}"
        ) from e


@router.get(
    "/",
    response_model=list[Ingredient],
    summary="List ingredients",
    description="Get all ingredients for the organization"
)
async def list_ingredients(
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
    category: str | None = Query(None, description="Filter by category"),
    active_only: bool = Query(True, description="Show only active ingredients"),
    limit: int = Query(100, ge=1, le=500, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
) -> list[Ingredient]:
    """
    List ingredients for the organization.
    
    Supports filtering by category and pagination.
    """

    try:
        query = supabase.table("ingredients").select("*").eq(
            "organization_id", str(organization_id)
        )

        if category:
            query = query.eq("category", category)

        if active_only:
            query = query.eq("is_active", True)

        query = query.order("name").range(offset, offset + limit - 1)

        response = query.execute()

        return [Ingredient(**ingredient) for ingredient in response.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {e!s}"
        ) from e


@router.get(
    "/{ingredient_id}",
    response_model=Ingredient,
    summary="Get ingredient",
    description="Get ingredient details by ID"
)
async def get_ingredient(
    ingredient_id: UUID,
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
) -> Ingredient:
    """Get ingredient by ID."""

    response = supabase.table("ingredients").select("*").eq(
        "ingredient_id", str(ingredient_id)
    ).eq("organization_id", str(organization_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ingredient not found"
        )

    return Ingredient(**response.data[0])


@router.put(
    "/{ingredient_id}",
    response_model=Ingredient,
    summary="Update ingredient",
    description="Update ingredient details"
)
async def update_ingredient(
    ingredient_id: UUID,
    ingredient_update: IngredientUpdate,
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
) -> Ingredient:
    """Update ingredient details."""

    # Check if ingredient exists and belongs to organization
    existing = await get_ingredient(ingredient_id, organization_id, supabase)

    # Build update data
    update_data = {}
    if ingredient_update.name is not None:
        update_data["name"] = ingredient_update.name
    if ingredient_update.category is not None:
        update_data["category"] = ingredient_update.category
    if ingredient_update.unit is not None:
        update_data["unit"] = ingredient_update.unit
    if ingredient_update.cost_per_unit is not None:
        update_data["cost_per_unit"] = float(ingredient_update.cost_per_unit)
    if ingredient_update.supplier is not None:
        update_data["supplier"] = ingredient_update.supplier
    if ingredient_update.notes is not None:
        update_data["notes"] = ingredient_update.notes
    if ingredient_update.is_active is not None:
        update_data["is_active"] = ingredient_update.is_active

    if not update_data:
        return existing

    update_data["updated_at"] = "now()"

    response = supabase.table("ingredients").update(update_data).eq(
        "ingredient_id", str(ingredient_id)
    ).eq("organization_id", str(organization_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update ingredient"
        )

    return Ingredient(**response.data[0])


@router.delete(
    "/{ingredient_id}",
    response_model=MessageResponse,
    summary="Delete ingredient",
    description="Delete ingredient (soft delete - marks as inactive)"
)
async def delete_ingredient(
    ingredient_id: UUID,
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
) -> MessageResponse:
    """
    Delete ingredient (soft delete).
    
    This marks the ingredient as inactive instead of permanently deleting it
    to preserve recipe history.
    """

    # Check if ingredient exists and belongs to organization
    await get_ingredient(ingredient_id, organization_id, supabase)

    # Soft delete by setting is_active = false
    response = supabase.table("ingredients").update({
        "is_active": False,
        "updated_at": "now()"
    }).eq("ingredient_id", str(ingredient_id)).eq(
        "organization_id", str(organization_id)
    ).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete ingredient"
        )

    return MessageResponse(
        message="Ingredient deleted successfully",
        success=True
    )


@router.get(
    "/usage/limits",
    response_model=UsageLimitsCheck,
    summary="Check usage limits",
    description="Check current usage vs freemium limits"
)
async def check_usage_limits(
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
) -> UsageLimitsCheck:
    """Check current usage against freemium limits."""

    freemium_service = await get_freemium_service(supabase)
    return await freemium_service.check_all_limits(organization_id)


@router.get(
    "/categories",
    response_model=list[str],
    summary="List ingredient categories",
    description="Get all ingredient categories used in the organization"
)
async def list_ingredient_categories(
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
) -> list[str]:
    """List all ingredient categories used in the organization."""

    response = supabase.table("ingredients").select("category").eq(
        "organization_id", str(organization_id)
    ).eq("is_active", True).execute()

    # Extract unique categories, filter out nulls
    categories = list(set(
        item["category"] for item in response.data
        if item["category"] is not None
    ))

    return sorted(categories)
