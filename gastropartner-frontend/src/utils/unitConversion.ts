/**
 * Unit conversion utilities for ingredient calculations
 */

export interface UnitConversion {
  fromUnit: string;
  toUnit: string;
  factor: number;
}

// Define conversion factors between units
const UNIT_CONVERSIONS: UnitConversion[] = [
  // Weight conversions
  { fromUnit: 'kg', toUnit: 'g', factor: 1000 },
  { fromUnit: 'g', toUnit: 'kg', factor: 0.001 },
  
  // Volume conversions
  { fromUnit: 'liter', toUnit: 'dl', factor: 10 },
  { fromUnit: 'liter', toUnit: 'ml', factor: 1000 },
  { fromUnit: 'dl', toUnit: 'liter', factor: 0.1 },
  { fromUnit: 'dl', toUnit: 'ml', factor: 100 },
  { fromUnit: 'ml', toUnit: 'liter', factor: 0.001 },
  { fromUnit: 'ml', toUnit: 'dl', factor: 0.01 },
];

/**
 * Convert quantity from one unit to another
 * @param quantity - The amount to convert
 * @param fromUnit - The source unit
 * @param toUnit - The target unit
 * @returns The converted quantity, or the original quantity if no conversion is possible
 */
export function convertUnit(quantity: number, fromUnit: string, toUnit: string): number {
  // If units are the same, no conversion needed
  if (fromUnit === toUnit) {
    return quantity;
  }
  
  // Find direct conversion
  const directConversion = UNIT_CONVERSIONS.find(
    conversion => conversion.fromUnit === fromUnit && conversion.toUnit === toUnit
  );
  
  if (directConversion) {
    return quantity * directConversion.factor;
  }
  
  // Find reverse conversion
  const reverseConversion = UNIT_CONVERSIONS.find(
    conversion => conversion.fromUnit === toUnit && conversion.toUnit === fromUnit
  );
  
  if (reverseConversion) {
    return quantity / reverseConversion.factor;
  }
  
  // No conversion found - return original quantity
  console.warn(`No conversion found from ${fromUnit} to ${toUnit}`);
  return quantity;
}

/**
 * Calculate the cost of an ingredient considering unit conversion
 * @param quantity - Amount needed in recipe
 * @param recipeUnit - Unit used in recipe (e.g., 'g')
 * @param costPerUnit - Cost per unit from ingredient
 * @param ingredientUnit - Unit for cost (e.g., 'kg')
 * @returns The calculated cost
 */
export function calculateIngredientCost(
  quantity: number,
  recipeUnit: string,
  costPerUnit: number,
  ingredientUnit: string
): number {
  // Convert recipe quantity to ingredient unit for cost calculation
  const convertedQuantity = convertUnit(quantity, recipeUnit, ingredientUnit);
  return convertedQuantity * costPerUnit;
}

/**
 * Check if two units are compatible for conversion
 * @param unit1 - First unit
 * @param unit2 - Second unit
 * @returns True if units can be converted between each other
 */
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  if (unit1 === unit2) return true;
  
  return UNIT_CONVERSIONS.some(
    conversion => 
      (conversion.fromUnit === unit1 && conversion.toUnit === unit2) ||
      (conversion.fromUnit === unit2 && conversion.toUnit === unit1)
  );
}

/**
 * Get all units that are compatible with the given unit
 * @param unit - The reference unit
 * @returns Array of compatible units including the reference unit
 */
export function getCompatibleUnits(unit: string): string[] {
  const compatibleUnits = new Set([unit]);
  
  UNIT_CONVERSIONS.forEach(conversion => {
    if (conversion.fromUnit === unit) {
      compatibleUnits.add(conversion.toUnit);
    }
    if (conversion.toUnit === unit) {
      compatibleUnits.add(conversion.fromUnit);
    }
  });
  
  return Array.from(compatibleUnits);
}