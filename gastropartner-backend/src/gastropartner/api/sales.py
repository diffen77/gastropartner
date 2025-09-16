"""Sales API endpoints för försäljningsspårning och rapporter."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from gastropartner.core.auth import get_current_active_user, get_user_organization
from gastropartner.core.database import get_supabase_client, get_supabase_client_with_auth
from gastropartner.core.models import (
    MessageResponse,
    Sale,
    SaleCreate,
    SaleItem,
    SaleItemCreate,
    SaleUpdate,
    User,
)

router = APIRouter(prefix="/sales", tags=["sales"])


def get_authenticated_supabase_client(
    current_user: User = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase_client),
) -> Client:
    """Get Supabase client with proper authentication context."""
    # Get authenticated client to ensure RLS policies are applied
    auth_client = get_supabase_client_with_auth(str(current_user.id))
    return auth_client


async def verify_product_exists(
    product_type: str, product_id: UUID, organization_id: UUID, supabase: Client
) -> tuple[bool, str]:
    """
    Verify that a product (recipe or menu_item) exists and belongs to the organization.
    Returns (exists, product_name).
    """
    table_name = "recipes" if product_type == "recipe" else "menu_items"
    id_field = "recipe_id" if product_type == "recipe" else "menu_item_id"

    try:
        response = (
            supabase.table(table_name)
            .select("name")
            .eq(id_field, str(product_id))
            .eq("organization_id", str(organization_id))
            .execute()
        )

        if response.data:
            return True, response.data[0]["name"]
        return False, ""

    except Exception:
        return False, ""


@router.get("/", response_model=list[Sale])
async def get_sales(
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_authenticated_supabase_client),
    limit: int = Query(default=50, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    start_date: datetime | None = Query(default=None),
    end_date: datetime | None = Query(default=None),
):
    """
    Get sales for the organization with optional date filtering.

    🛡️ SECURITY: Automatically filters by organization_id through RLS policies.
    """
    try:
        # Build query with organization filter for security
        query = (
            supabase.table("sales")
            .select("*")
            .eq("organization_id", str(organization_id))
            .order("sale_date", desc=True)
            .limit(limit)
            .offset(offset)
        )

        # Add date filters if provided
        if start_date:
            query = query.gte("sale_date", start_date.isoformat())
        if end_date:
            query = query.lte("sale_date", end_date.isoformat())

        response = query.execute()

        return response.data or []

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch sales: {e!s}",
        ) from e


@router.get("/{sale_id}", response_model=Sale)
async def get_sale(
    sale_id: UUID,
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_authenticated_supabase_client),
):
    """
    Get a specific sale by ID.

    🛡️ SECURITY: Automatically filters by organization_id through RLS policies.
    """
    try:
        response = (
            supabase.table("sales")
            .select("*")
            .eq("sale_id", str(sale_id))
            .eq("organization_id", str(organization_id))
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch sale: {e!s}"
        ) from e


@router.post("/", response_model=Sale, status_code=status.HTTP_201_CREATED)
async def create_sale(
    sale_data: SaleCreate,
    sale_items: list[SaleItemCreate],
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_authenticated_supabase_client),
):
    """
    Create a new sale with sale items.

    🛡️ SECURITY: CRITICAL - Sets organization_id and creator_id for multi-tenant security.
    """
    try:
        # Verify all products exist and belong to the organization
        for item in sale_items:
            exists, product_name = await verify_product_exists(
                item.product_type, item.product_id, organization_id, supabase
            )
            if not exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product {item.product_id} of type {item.product_type} not found",
                )

        # Create the sale
        sale_response = (
            supabase.table("sales")
            .insert(
                {
                    "organization_id": str(organization_id),
                    "creator_id": str(current_user.id),
                    "sale_date": sale_data.sale_date.isoformat(),
                    "total_amount": float(sale_data.total_amount),
                    "notes": sale_data.notes,
                }
            )
            .execute()
        )

        if not sale_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create sale"
            )

        created_sale = sale_response.data[0]
        sale_id = created_sale["sale_id"]

        # Create sale items
        for item in sale_items:
            # Get product name for denormalization
            _, product_name = await verify_product_exists(
                item.product_type, item.product_id, organization_id, supabase
            )

            supabase.table("sale_items").insert(
                {
                    "sale_id": sale_id,
                    "product_type": item.product_type,
                    "product_id": str(item.product_id),
                    "product_name": product_name,
                    "quantity_sold": float(item.quantity_sold),
                    "unit_price": float(item.unit_price),
                    "total_price": float(item.total_price),
                }
            ).execute()

        return created_sale

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create sale: {e!s}",
        ) from e


@router.put("/{sale_id}", response_model=Sale)
async def update_sale(
    sale_id: UUID,
    sale_data: SaleUpdate,
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_authenticated_supabase_client),
):
    """
    Update a sale.

    🛡️ SECURITY: Automatically filters by organization_id through RLS policies.
    """
    try:
        # Verify sale exists and belongs to organization
        existing_response = (
            supabase.table("sales")
            .select("sale_id")
            .eq("sale_id", str(sale_id))
            .eq("organization_id", str(organization_id))
            .execute()
        )

        if not existing_response.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")

        # Prepare update data (exclude None values)
        update_data = {}
        if sale_data.sale_date is not None:
            update_data["sale_date"] = sale_data.sale_date.isoformat()
        if sale_data.total_amount is not None:
            update_data["total_amount"] = float(sale_data.total_amount)
        if sale_data.notes is not None:
            update_data["notes"] = sale_data.notes

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="No valid fields to update"
            )

        # Update the sale
        response = (
            supabase.table("sales")
            .update(update_data)
            .eq("sale_id", str(sale_id))
            .eq("organization_id", str(organization_id))
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update sale"
            )

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update sale: {e!s}",
        ) from e


@router.delete("/{sale_id}", response_model=MessageResponse)
async def delete_sale(
    sale_id: UUID,
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_authenticated_supabase_client),
):
    """
    Delete a sale and its associated sale items.

    🛡️ SECURITY: Automatically filters by organization_id through RLS policies.
    """
    try:
        # Verify sale exists and belongs to organization
        existing_response = (
            supabase.table("sales")
            .select("sale_id")
            .eq("sale_id", str(sale_id))
            .eq("organization_id", str(organization_id))
            .execute()
        )

        if not existing_response.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")

        # Delete the sale (sale items will be cascade deleted)
        delete_response = (
            supabase.table("sales")
            .delete()
            .eq("sale_id", str(sale_id))
            .eq("organization_id", str(organization_id))
            .execute()
        )

        if not delete_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete sale"
            )

        return MessageResponse(message="Sale deleted successfully")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete sale: {e!s}",
        ) from e


@router.get("/{sale_id}/items", response_model=list[SaleItem])
async def get_sale_items(
    sale_id: UUID,
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_authenticated_supabase_client),
):
    """
    Get all sale items for a specific sale.

    🛡️ SECURITY: Sale items are secured through parent sale's organization_id.
    """
    try:
        # Verify sale exists and belongs to organization
        sale_response = (
            supabase.table("sales")
            .select("sale_id")
            .eq("sale_id", str(sale_id))
            .eq("organization_id", str(organization_id))
            .execute()
        )

        if not sale_response.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")

        # Get sale items
        items_response = (
            supabase.table("sale_items")
            .select("*")
            .eq("sale_id", str(sale_id))
            .order("created_at")
            .execute()
        )

        return items_response.data or []

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch sale items: {e!s}",
        ) from e
