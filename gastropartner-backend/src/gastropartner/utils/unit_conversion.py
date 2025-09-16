"""Unit conversion utilities for ingredient calculations.

Supports conversion between metric units commonly used in cooking:
- Weight: kg, g
- Volume: liter, dl, ml
"""

from decimal import Decimal
from typing import Dict, List, Tuple


class UnitConversionError(ValueError):
    """Raised when unit conversion is not possible."""

    pass


# Define conversion factors to base units
WEIGHT_CONVERSIONS = {
    "kg": Decimal("1"),  # Base unit for weight
    "g": Decimal("0.001"),  # 1g = 0.001kg
}

VOLUME_CONVERSIONS = {
    "liter": Decimal("1"),  # Base unit for volume
    "l": Decimal("1"),  # Alternative notation
    "dl": Decimal("0.1"),  # 1dl = 0.1 liter
    "ml": Decimal("0.001"),  # 1ml = 0.001 liter
}

# All supported units grouped by type
WEIGHT_UNITS = set(WEIGHT_CONVERSIONS.keys())
VOLUME_UNITS = set(VOLUME_CONVERSIONS.keys())
ALL_UNITS = WEIGHT_UNITS | VOLUME_UNITS


def get_unit_type(unit: str) -> str:
    """Get the type of unit (weight/volume).

    Args:
        unit: Unit to check

    Returns:
        'weight', 'volume', or 'unknown'
    """
    unit = unit.lower().strip()
    if unit in WEIGHT_UNITS:
        return "weight"
    elif unit in VOLUME_UNITS:
        return "volume"
    else:
        return "unknown"


def are_units_compatible(from_unit: str, to_unit: str) -> bool:
    """Check if two units can be converted between each other.

    Args:
        from_unit: Source unit
        to_unit: Target unit

    Returns:
        True if units are compatible for conversion
    """
    return (
        get_unit_type(from_unit) == get_unit_type(to_unit) and get_unit_type(from_unit) != "unknown"
    )


def convert_unit(quantity: Decimal, from_unit: str, to_unit: str) -> Decimal:
    """Convert quantity from one unit to another.

    Args:
        quantity: Amount to convert
        from_unit: Source unit
        to_unit: Target unit

    Returns:
        Converted quantity

    Raises:
        UnitConversionError: If units are incompatible or unknown
    """
    from_unit = from_unit.lower().strip()
    to_unit = to_unit.lower().strip()

    # Same unit, no conversion needed
    if from_unit == to_unit:
        return quantity

    # Check compatibility
    if not are_units_compatible(from_unit, to_unit):
        raise UnitConversionError(
            f"Cannot convert from {from_unit} to {to_unit}: incompatible unit types"
        )

    unit_type = get_unit_type(from_unit)

    if unit_type == "weight":
        # Convert to base unit (kg), then to target unit
        base_quantity = quantity * WEIGHT_CONVERSIONS[from_unit]
        return base_quantity / WEIGHT_CONVERSIONS[to_unit]
    elif unit_type == "volume":
        # Convert to base unit (liter), then to target unit
        base_quantity = quantity * VOLUME_CONVERSIONS[from_unit]
        return base_quantity / VOLUME_CONVERSIONS[to_unit]
    else:
        raise UnitConversionError(f"Unknown unit type for {from_unit}")


def get_compatible_units(unit: str) -> List[str]:
    """Get all units compatible with the given unit.

    Args:
        unit: Unit to find compatible units for

    Returns:
        List of compatible unit names
    """
    unit_type = get_unit_type(unit)

    if unit_type == "weight":
        return list(WEIGHT_UNITS)
    elif unit_type == "volume":
        return list(VOLUME_UNITS)
    else:
        return []


def normalize_unit(unit: str) -> str:
    """Normalize unit string to standard form.

    Args:
        unit: Unit string to normalize

    Returns:
        Normalized unit string
    """
    unit = unit.lower().strip()

    # Handle common alternatives
    if unit in ["l", "liter"]:
        return "liter"

    return unit


def calculate_ingredient_cost(
    recipe_quantity: Decimal, recipe_unit: str, cost_per_unit: Decimal, cost_unit: str
) -> Decimal:
    """Calculate ingredient cost with unit conversion.

    Args:
        recipe_quantity: Amount needed in recipe
        recipe_unit: Unit used in recipe
        cost_per_unit: Cost per unit of ingredient
        cost_unit: Unit for the cost

    Returns:
        Total cost for the ingredient quantity

    Raises:
        UnitConversionError: If units are incompatible
    """
    try:
        # Convert recipe quantity to cost unit
        converted_quantity = convert_unit(recipe_quantity, recipe_unit, cost_unit)
        return converted_quantity * cost_per_unit
    except UnitConversionError:
        # If units are incompatible, assume no conversion and calculate directly
        # This handles cases like "st" (pieces), "burk" (cans), etc.
        return recipe_quantity * cost_per_unit


def get_unit_display_name(unit: str) -> str:
    """Get display name for unit.

    Args:
        unit: Unit code

    Returns:
        Human-readable unit name in Swedish
    """
    unit = normalize_unit(unit)

    display_names = {
        "kg": "kg",
        "g": "g",
        "liter": "liter",
        "l": "liter",
        "dl": "dl",
        "ml": "ml",
        "st": "st",
        "burk": "burk",
        "påse": "påse",
        "förpackning": "förpackning",
    }

    return display_names.get(unit, unit)
