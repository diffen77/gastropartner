"""Menu Items API endpoints för kostnadskontroll."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from gastropartner.core.auth import get_current_active_user, get_user_organization
from gastropartner.core.database import get_supabase_client
from gastropartner.core.models import (
    CostAnalysis,
    MenuItem,
    MenuItemCreate,
    MenuItemUpdate,
    MessageResponse,
    Recipe,
    User,
)

router = APIRouter(prefix="/menu-items", tags=["menu-items"])


async def calculate_menu_item_margins(
    menu_item: MenuItem,
    recipe_cost: float = 0.0
) -> MenuItem:
    """Calculate margins and profitability for a menu item."""

    if menu_item.selling_price > 0:
        # Food cost is either from recipe or manually set
        food_cost = recipe_cost if recipe_cost > 0 else menu_item.food_cost

        # Calculate food cost percentage
        food_cost_percentage = (food_cost / menu_item.selling_price) * 100

        # Calculate margin (profit)
        margin = menu_item.selling_price - food_cost
        margin_percentage = (margin / menu_item.selling_price) * 100 if menu_item.selling_price > 0 else 0

        menu_item.food_cost = food_cost
        menu_item.food_cost_percentage = food_cost_percentage
        menu_item.margin = margin
        menu_item.margin_percentage = margin_percentage

    return menu_item


async def get_recipe_cost(
    recipe_id: UUID,
    organization_id: UUID,
    supabase: Client
) -> float:
    """Get the cost per serving for a recipe."""

    if not recipe_id:
        return 0.0

    try:
        # Get recipe details
        recipe_response = supabase.table("recipes").select(
            "servings"
        ).eq("recipe_id", str(recipe_id)).eq(
            "organization_id", str(organization_id)
        ).execute()

        if not recipe_response.data:
            return 0.0

        servings = recipe_response.data[0]["servings"]

        # Get recipe ingredients with costs
        ingredients_response = supabase.table("recipe_ingredients").select(
            "quantity, unit, ingredients(cost_per_unit)"
        ).eq("recipe_id", str(recipe_id)).execute()

        total_cost = 0.0
        for ri in ingredients_response.data:
            if ri["ingredients"] and ri["ingredients"]["cost_per_unit"]:
                ingredient_cost = float(ri["quantity"]) * float(ri["ingredients"]["cost_per_unit"])
                total_cost += ingredient_cost

        return total_cost / servings if servings > 0 else 0.0

    except Exception:
        return 0.0


async def check_menu_item_limits(
    organization_id: UUID,
    supabase: Client
) -> bool:
    """Check if organization can add more menu items."""

    # Get organization limits
    org_response = supabase.table("organizations").select(
        "max_menu_items"
    ).eq("organization_id", str(organization_id)).execute()

    if not org_response.data:
        return False

    max_items = org_response.data[0]["max_menu_items"]

    # Count current menu items
    count_response = supabase.table("menu_items").select(
        "menu_item_id", count="exact"
    ).eq("organization_id", str(organization_id)).eq("is_active", True).execute()

    current_count = count_response.count or 0
    return current_count < max_items


@router.post(
    "/",
    response_model=MenuItem,
    status_code=status.HTTP_201_CREATED,
    summary="Create menu item",
    description="Create a new menu item (freemium: max 2 menu items)"
)
async def create_menu_item(
    menu_item_data: MenuItemCreate,
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
) -> MenuItem:
    """
    Create new menu item.
    
    Freemium limits:
    - Maximum 2 menu items per organization
    - Upgrade to premium for unlimited menu items
    """

    # Check freemium limits
    can_add = await check_menu_item_limits(organization_id, supabase)
    if not can_add:
        # Get current count for error message
        count_response = supabase.table("menu_items").select(
            "menu_item_id", count="exact"
        ).eq("organization_id", str(organization_id)).eq("is_active", True).execute()

        current_count = count_response.count or 0
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Freemium limit reached: {current_count}/2 menu items used. Upgrade to premium for unlimited menu items."
        )

    # Verify recipe exists if provided
    if menu_item_data.recipe_id:
        recipe_response = supabase.table("recipes").select(
            "recipe_id"
        ).eq("recipe_id", str(menu_item_data.recipe_id)).eq(
            "organization_id", str(organization_id)
        ).eq("is_active", True).execute()

        if not recipe_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recipe not found or not active"
            )

    try:
        # Create menu item
        response = supabase.table("menu_items").insert({
            "organization_id": str(organization_id),
            "recipe_id": str(menu_item_data.recipe_id) if menu_item_data.recipe_id else None,
            "name": menu_item_data.name,
            "description": menu_item_data.description,
            "category": menu_item_data.category,
            "selling_price": float(menu_item_data.selling_price),
            "target_food_cost_percentage": float(menu_item_data.target_food_cost_percentage),
        }).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create menu item"
            )

        menu_item = MenuItem(**response.data[0])

        # Calculate margins if recipe is linked
        if menu_item.recipe_id:
            recipe_cost = await get_recipe_cost(menu_item.recipe_id, organization_id, supabase)
            menu_item = await calculate_menu_item_margins(menu_item, recipe_cost)

        return menu_item

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {e!s}"
        ) from e


@router.get(
    "/",
    response_model=list[MenuItem],
    summary="List menu items",
    description="Get all menu items for the organization"
)
async def list_menu_items(
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
    category: str | None = Query(None, description="Filter by category"),
    active_only: bool = Query(True, description="Show only active menu items"),
    include_margins: bool = Query(True, description="Include margin calculations"),
    limit: int = Query(100, ge=1, le=500, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
) -> list[MenuItem]:
    """List menu items for the organization with margin calculations."""

    try:
        query = supabase.table("menu_items").select("*").eq(
            "organization_id", str(organization_id)
        )

        if category:
            query = query.eq("category", category)

        if active_only:
            query = query.eq("is_active", True)

        query = query.order("name").range(offset, offset + limit - 1)
        response = query.execute()

        menu_items = []
        for item_data in response.data:
            menu_item = MenuItem(**item_data)

            if include_margins:
                # Calculate margins for each menu item
                recipe_cost = 0.0
                if menu_item.recipe_id:
                    recipe_cost = await get_recipe_cost(
                        menu_item.recipe_id, organization_id, supabase
                    )

                menu_item = await calculate_menu_item_margins(menu_item, recipe_cost)

            menu_items.append(menu_item)

        return menu_items

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {e!s}"
        ) from e


@router.get(
    "/{menu_item_id}",
    response_model=MenuItem,
    summary="Get menu item",
    description="Get menu item details with recipe and margin analysis"
)
async def get_menu_item(
    menu_item_id: UUID,
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
) -> MenuItem:
    """Get menu item by ID with complete recipe details and margin analysis."""

    # Get menu item
    response = supabase.table("menu_items").select("*").eq(
        "menu_item_id", str(menu_item_id)
    ).eq("organization_id", str(organization_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found"
        )

    menu_item = MenuItem(**response.data[0])

    # Get recipe details if linked
    if menu_item.recipe_id:
        try:
            recipe_response = supabase.table("recipes").select("*").eq(
                "recipe_id", str(menu_item.recipe_id)
            ).execute()

            if recipe_response.data:
                menu_item.recipe = Recipe(**recipe_response.data[0])

                # Calculate margins based on recipe cost
                recipe_cost = await get_recipe_cost(
                    menu_item.recipe_id, organization_id, supabase
                )
                menu_item = await calculate_menu_item_margins(menu_item, recipe_cost)
        except Exception:
            # If recipe fetch fails, continue without recipe details
            pass

    return menu_item


@router.put(
    "/{menu_item_id}",
    response_model=MenuItem,
    summary="Update menu item",
    description="Update menu item details"
)
async def update_menu_item(
    menu_item_id: UUID,
    menu_item_update: MenuItemUpdate,
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
) -> MenuItem:
    """Update menu item details."""

    # Check if menu item exists
    existing = await get_menu_item(menu_item_id, organization_id, supabase)

    # Verify recipe exists if provided
    if menu_item_update.recipe_id:
        recipe_response = supabase.table("recipes").select(
            "recipe_id"
        ).eq("recipe_id", str(menu_item_update.recipe_id)).eq(
            "organization_id", str(organization_id)
        ).eq("is_active", True).execute()

        if not recipe_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recipe not found or not active"
            )

    # Build update data
    update_data = {}
    if menu_item_update.name is not None:
        update_data["name"] = menu_item_update.name
    if menu_item_update.description is not None:
        update_data["description"] = menu_item_update.description
    if menu_item_update.category is not None:
        update_data["category"] = menu_item_update.category
    if menu_item_update.selling_price is not None:
        update_data["selling_price"] = float(menu_item_update.selling_price)
    if menu_item_update.target_food_cost_percentage is not None:
        update_data["target_food_cost_percentage"] = float(menu_item_update.target_food_cost_percentage)
    if menu_item_update.recipe_id is not None:
        update_data["recipe_id"] = str(menu_item_update.recipe_id) if menu_item_update.recipe_id else None
    if menu_item_update.is_active is not None:
        update_data["is_active"] = menu_item_update.is_active

    if not update_data:
        return existing

    update_data["updated_at"] = "now()"

    response = supabase.table("menu_items").update(update_data).eq(
        "menu_item_id", str(menu_item_id)
    ).eq("organization_id", str(organization_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update menu item"
        )

    # Return updated menu item with recalculated margins
    return await get_menu_item(menu_item_id, organization_id, supabase)


@router.delete(
    "/{menu_item_id}",
    response_model=MessageResponse,
    summary="Delete menu item",
    description="Delete menu item (soft delete - marks as inactive)"
)
async def delete_menu_item(
    menu_item_id: UUID,
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
) -> MessageResponse:
    """Delete menu item (soft delete)."""

    # Check if menu item exists
    await get_menu_item(menu_item_id, organization_id, supabase)

    # Soft delete by setting is_active = false
    response = supabase.table("menu_items").update({
        "is_active": False,
        "updated_at": "now()"
    }).eq("menu_item_id", str(menu_item_id)).eq(
        "organization_id", str(organization_id)
    ).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete menu item"
        )

    return MessageResponse(
        message="Menu item deleted successfully",
        success=True
    )


@router.get(
    "/{menu_item_id}/profitability",
    response_model=CostAnalysis,
    summary="Get menu item profitability analysis",
    description="Get detailed profitability analysis for a menu item"
)
async def get_menu_item_profitability(
    menu_item_id: UUID,
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
) -> CostAnalysis:
    """Get detailed profitability analysis for a menu item."""

    # Get menu item
    menu_item = await get_menu_item(menu_item_id, organization_id, supabase)

    # Calculate recipe cost if linked
    recipe_cost = 0.0
    if menu_item.recipe_id:
        recipe_cost = await get_recipe_cost(menu_item.recipe_id, organization_id, supabase)

    # Calculate margins
    food_cost = recipe_cost if recipe_cost > 0 else menu_item.food_cost

    food_cost_percentage = None
    margin = None
    margin_percentage = None
    recommended_selling_price = None

    if menu_item.selling_price > 0:
        food_cost_percentage = (food_cost / menu_item.selling_price) * 100
        margin = menu_item.selling_price - food_cost
        margin_percentage = (margin / menu_item.selling_price) * 100

    # Calculate recommended selling price based on target food cost percentage
    if menu_item.target_food_cost_percentage > 0 and food_cost > 0:
        recommended_selling_price = food_cost / (menu_item.target_food_cost_percentage / 100)

    return CostAnalysis(
        total_ingredient_cost=food_cost,
        cost_per_serving=food_cost,
        selling_price=menu_item.selling_price,
        food_cost_percentage=food_cost_percentage,
        margin=margin,
        margin_percentage=margin_percentage,
        target_food_cost_percentage=menu_item.target_food_cost_percentage,
        recommended_selling_price=recommended_selling_price,
    )


@router.get(
    "/categories",
    response_model=list[str],
    summary="List menu item categories",
    description="Get all menu item categories used in the organization"
)
async def list_menu_item_categories(
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_supabase_client),
) -> list[str]:
    """List all menu item categories used in the organization."""

    response = supabase.table("menu_items").select("category").eq(
        "organization_id", str(organization_id)
    ).eq("is_active", True).execute()

    # Extract unique categories, filter out nulls
    categories = list(set(
        item["category"] for item in response.data
        if item["category"] is not None
    ))

    return sorted(categories)
