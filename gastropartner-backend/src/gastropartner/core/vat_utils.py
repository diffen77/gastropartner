"""Swedish VAT calculation utilities."""

from decimal import Decimal

from gastropartner.core.models import SwedishVATRate, VATCalculationType


def calculate_vat_amount(
    price: Decimal,
    vat_rate: SwedishVATRate,
    calculation_type: VATCalculationType = VATCalculationType.INCLUSIVE,
) -> Decimal:
    """
    Calculate VAT amount based on price and Swedish VAT rate.

    Args:
        price: The price amount
        vat_rate: Swedish VAT rate (25%, 12%, 6%, or 0%)
        calculation_type: Whether price includes or excludes VAT

    Returns:
        VAT amount
    """
    vat_rate_decimal = Decimal(vat_rate) / Decimal("100")

    if calculation_type == VATCalculationType.INCLUSIVE:
        # Price includes VAT: VAT = price * (rate / (100 + rate))
        return price * vat_rate_decimal / (Decimal("1") + vat_rate_decimal)
    else:
        # Price excludes VAT: VAT = price * rate
        return price * vat_rate_decimal


def calculate_price_excluding_vat(
    price: Decimal,
    vat_rate: SwedishVATRate,
    calculation_type: VATCalculationType = VATCalculationType.INCLUSIVE,
) -> Decimal:
    """
    Calculate price excluding VAT.

    Args:
        price: The original price
        vat_rate: Swedish VAT rate (25%, 12%, 6%, or 0%)
        calculation_type: Whether original price includes or excludes VAT

    Returns:
        Price excluding VAT
    """
    if calculation_type == VATCalculationType.INCLUSIVE:
        # Remove VAT from inclusive price
        vat_amount = calculate_vat_amount(price, vat_rate, calculation_type)
        return price - vat_amount
    else:
        # Price already excludes VAT
        return price


def calculate_price_including_vat(
    price: Decimal,
    vat_rate: SwedishVATRate,
    calculation_type: VATCalculationType = VATCalculationType.EXCLUSIVE,
) -> Decimal:
    """
    Calculate price including VAT.

    Args:
        price: The original price
        vat_rate: Swedish VAT rate (25%, 12%, 6%, or 0%)
        calculation_type: Whether original price includes or excludes VAT

    Returns:
        Price including VAT
    """
    if calculation_type == VATCalculationType.INCLUSIVE:
        # Price already includes VAT
        return price
    else:
        # Add VAT to exclusive price
        vat_amount = calculate_vat_amount(price, vat_rate, calculation_type)
        return price + vat_amount


def get_standard_vat_rate_for_restaurant_item(item_type: str = "food") -> SwedishVATRate:
    """
    Get the standard Swedish VAT rate for restaurant items.

    Args:
        item_type: Type of item ('food', 'beverage', 'alcohol', 'takeaway')

    Returns:
        Appropriate Swedish VAT rate
    """
    # Swedish restaurant VAT rules:
    # - Dine-in food: 25% (standard rate)
    # - Takeaway food: 12% (reduced rate)
    # - Alcohol: 25% (standard rate)
    # - Non-alcoholic beverages: 25% (standard rate)

    if item_type == "takeaway":
        return SwedishVATRate.FOOD_REDUCED  # 12%
    else:
        return SwedishVATRate.STANDARD  # 25%


def format_vat_summary(vat_breakdown: dict[str, Decimal]) -> str:
    """
    Format VAT breakdown for display.

    Args:
        vat_breakdown: Dictionary of VAT rates and amounts

    Returns:
        Formatted string summarizing VAT breakdown
    """
    if not vat_breakdown:
        return "Ingen moms"

    summary_parts = []
    for rate, amount in vat_breakdown.items():
        summary_parts.append(f"{rate}%: {amount:.2f} kr")

    return "Moms: " + ", ".join(summary_parts)
