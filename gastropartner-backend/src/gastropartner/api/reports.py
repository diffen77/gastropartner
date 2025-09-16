"""Reports API endpoints för lönsamhetsanalys och rapporter."""

from datetime import datetime, timedelta
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from gastropartner.core.auth import get_current_active_user, get_user_organization
from gastropartner.core.database import get_supabase_client_with_auth
from gastropartner.core.models import (
    ProductProfitability,
    ProfitabilityReport,
    SalesReport,
    User,
)

router = APIRouter(prefix="/reports", tags=["reports"])


def get_authenticated_supabase_client(
    current_user: User = Depends(get_current_active_user),
) -> Client:
    """Get Supabase client with proper authentication context."""
    return get_supabase_client_with_auth(str(current_user.id))


@router.get("/profitability", response_model=ProfitabilityReport)
async def get_profitability_report(
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_authenticated_supabase_client),
    start_date: datetime = Query(..., description="Start date for the report"),
    end_date: datetime = Query(..., description="End date for the report"),
):
    """
    Get profitability report for the specified period.

    🛡️ SECURITY: Automatically filters by organization_id through RLS policies.
    """
    try:
        # Get sales data for the period
        sales_response = (
            supabase.table("sales")
            .select("sale_id, total_amount, created_at")
            .eq("organization_id", str(organization_id))
            .gte("sale_date", start_date.isoformat())
            .lte("sale_date", end_date.isoformat())
            .execute()
        )

        sales_data = sales_response.data or []

        # Calculate basic metrics
        total_revenue = sum(Decimal(str(sale["total_amount"])) for sale in sales_data)
        total_sales_count = len(sales_data)
        average_sale_value = (
            total_revenue / total_sales_count if total_sales_count > 0 else Decimal("0")
        )

        # For now, estimate cost as 30% of revenue (future: calculate from recipes)
        estimated_cost_percentage = Decimal("30.0")  # 30%
        total_cost = total_revenue * (estimated_cost_percentage / Decimal("100"))

        profit = total_revenue - total_cost
        profit_margin_percentage = (
            (profit / total_revenue * Decimal("100")) if total_revenue > 0 else Decimal("0")
        )

        return ProfitabilityReport(
            period_start=start_date,
            period_end=end_date,
            total_revenue=total_revenue,
            total_cost=total_cost,
            profit=profit,
            profit_margin_percentage=profit_margin_percentage,
            total_sales_count=total_sales_count,
            average_sale_value=average_sale_value,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate profitability report: {e!s}",
        ) from e


@router.get("/sales", response_model=SalesReport)
async def get_sales_report(
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_authenticated_supabase_client),
    start_date: datetime = Query(..., description="Start date for the report"),
    end_date: datetime = Query(..., description="End date for the report"),
):
    """
    Get comprehensive sales report for the specified period.

    🛡️ SECURITY: Automatically filters by organization_id through RLS policies.
    """
    try:
        # Get sales data with sale items
        sales_response = (
            supabase.table("sales")
            .select("sale_id, sale_date, total_amount, created_at")
            .eq("organization_id", str(organization_id))
            .gte("sale_date", start_date.isoformat())
            .lte("sale_date", end_date.isoformat())
            .order("sale_date")
            .execute()
        )

        sales_data = sales_response.data or []

        # Get sale items for product breakdown
        sale_ids = [sale["sale_id"] for sale in sales_data]
        if sale_ids:
            sale_items_response = (
                supabase.table("sale_items")
                .select(
                    "product_id, product_name, product_type, quantity_sold, unit_price, total_price"
                )
                .in_("sale_id", sale_ids)
                .execute()
            )
            sale_items = sale_items_response.data or []
        else:
            sale_items = []

        # Calculate daily breakdown
        daily_breakdown = {}
        for sale in sales_data:
            date_str = sale["sale_date"][:10]  # YYYY-MM-DD
            if date_str not in daily_breakdown:
                daily_breakdown[date_str] = {"date": date_str, "sales": 0, "revenue": Decimal("0")}
            daily_breakdown[date_str]["sales"] += 1
            daily_breakdown[date_str]["revenue"] += Decimal(str(sale["total_amount"]))

        # Convert to list and format for JSON
        daily_breakdown_list = [
            {
                "date": day_data["date"],
                "sales": day_data["sales"],
                "revenue": float(day_data["revenue"]),
            }
            for day_data in daily_breakdown.values()
        ]

        # Calculate product breakdown
        product_breakdown = {}
        for item in sale_items:
            product_key = f"{item['product_type']}_{item['product_id']}"
            if product_key not in product_breakdown:
                product_breakdown[product_key] = {
                    "product_id": UUID(item["product_id"]),
                    "product_name": item["product_name"] or "Unknown Product",
                    "product_type": item["product_type"],
                    "units_sold": 0,
                    "revenue": Decimal("0"),
                    "estimated_cost": Decimal("0"),
                }

            product_data = product_breakdown[product_key]
            product_data["units_sold"] += int(float(item["quantity_sold"]))
            product_data["revenue"] += Decimal(str(item["total_price"]))
            # Estimate cost as 30% of revenue for now
            product_data["estimated_cost"] = product_data["revenue"] * Decimal("0.3")

        # Convert to ProductProfitability objects
        product_profitability = []
        for product_data in product_breakdown.values():
            profit = product_data["revenue"] - product_data["estimated_cost"]
            profit_margin_percentage = (
                (profit / product_data["revenue"] * Decimal("100"))
                if product_data["revenue"] > 0
                else Decimal("0")
            )

            product_profitability.append(
                ProductProfitability(
                    product_id=product_data["product_id"],
                    product_name=product_data["product_name"],
                    product_type=product_data["product_type"],
                    units_sold=product_data["units_sold"],
                    revenue=product_data["revenue"],
                    estimated_cost=product_data["estimated_cost"],
                    profit=profit,
                    profit_margin_percentage=profit_margin_percentage,
                )
            )

        # Calculate totals
        total_sales = len(sales_data)
        total_revenue = sum(Decimal(str(sale["total_amount"])) for sale in sales_data)

        return SalesReport(
            period_start=start_date,
            period_end=end_date,
            total_sales=total_sales,
            total_revenue=total_revenue,
            daily_breakdown=daily_breakdown_list,
            product_breakdown=product_profitability,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate sales report: {e!s}",
        ) from e


@router.get("/product-profitability", response_model=list[ProductProfitability])
async def get_product_profitability(
    current_user: User = Depends(get_current_active_user),
    organization_id: UUID = Depends(get_user_organization),
    supabase: Client = Depends(get_authenticated_supabase_client),
    start_date: datetime = Query(
        default=(datetime.now() - timedelta(days=30)),
        description="Start date for the report (defaults to 30 days ago)",
    ),
    end_date: datetime = Query(
        default=None, description="End date for the report (defaults to now)"
    ),
    limit: int = Query(default=10, ge=1, le=100),
):
    """
    Get product profitability analysis.

    🛡️ SECURITY: Automatically filters by organization_id through RLS policies.
    """
    try:
        # Handle default end_date
        if end_date is None:
            end_date = datetime.now()

        # Get sales data for the period
        sales_response = (
            supabase.table("sales")
            .select("sale_id")
            .eq("organization_id", str(organization_id))
            .gte("sale_date", start_date.isoformat())
            .lte("sale_date", end_date.isoformat())
            .execute()
        )

        sale_ids = [sale["sale_id"] for sale in sales_response.data or []]

        if not sale_ids:
            return []

        # Get sale items
        sale_items_response = (
            supabase.table("sale_items")
            .select(
                "product_id, product_name, product_type, quantity_sold, unit_price, total_price"
            )
            .in_("sale_id", sale_ids)
            .execute()
        )

        sale_items = sale_items_response.data or []

        # Group by product
        product_data = {}
        for item in sale_items:
            product_key = f"{item['product_type']}_{item['product_id']}"
            if product_key not in product_data:
                product_data[product_key] = {
                    "product_id": UUID(item["product_id"]),
                    "product_name": item["product_name"] or "Unknown Product",
                    "product_type": item["product_type"],
                    "units_sold": 0,
                    "revenue": Decimal("0"),
                }

            data = product_data[product_key]
            data["units_sold"] += int(float(item["quantity_sold"]))
            data["revenue"] += Decimal(str(item["total_price"]))

        # Calculate profitability
        results = []
        for data in product_data.values():
            # Estimate cost as 30% of revenue for now
            estimated_cost = data["revenue"] * Decimal("0.3")
            profit = data["revenue"] - estimated_cost
            profit_margin_percentage = (
                (profit / data["revenue"] * Decimal("100")) if data["revenue"] > 0 else Decimal("0")
            )

            results.append(
                ProductProfitability(
                    product_id=data["product_id"],
                    product_name=data["product_name"],
                    product_type=data["product_type"],
                    units_sold=data["units_sold"],
                    revenue=data["revenue"],
                    estimated_cost=estimated_cost,
                    profit=profit,
                    profit_margin_percentage=profit_margin_percentage,
                )
            )

        # Sort by revenue (descending) and limit
        results.sort(key=lambda x: x.revenue, reverse=True)
        return results[:limit]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get product profitability: {e!s}",
        ) from e
