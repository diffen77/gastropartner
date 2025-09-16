/**
 * Unit conversion service that integrates with backend API for accurate conversions
 * Provides both offline fallback and online precision conversions
 */

import { api } from './api';

export interface UnitConversionResult {
  original: {
    quantity: number;
    unit: string;
    unitType: string;
  };
  converted: {
    quantity: number;
    unit: string;
    unitType: string;
  };
  conversionRatio: number;
  timestamp: string;
}

export interface UnitCompatibilityInfo {
  unit: string;
  unitType: 'weight' | 'volume' | 'unknown';
  compatibleUnits: string[];
  displayName: string;
}

export class UnitConversionService {
  private compatibilityCache: Map<string, string[]> = new Map();
  private conversionCache: Map<string, UnitConversionResult> = new Map();

  /**
   * Get compatible units for a given unit (with backend validation)
   */
  async getCompatibleUnits(unit: string): Promise<string[]> {
    // Check cache first
    const cacheKey = unit.toLowerCase();
    if (this.compatibilityCache.has(cacheKey)) {
      return this.compatibilityCache.get(cacheKey)!;
    }

    try {
      const response = await api.get(`/api/v1/cost-control/unit-conversion/compatible/${unit}`) as { data: string[] };
      const compatibleUnits = response.data;

      // Cache the result
      this.compatibilityCache.set(cacheKey, compatibleUnits);

      return compatibleUnits;
    } catch (error) {
      console.warn('Backend unit compatibility check failed, using fallback:', error);

      // Fallback to local conversion logic
      return this.getCompatibleUnitsLocal(unit);
    }
  }

  /**
   * Convert units using backend precision (with offline fallback)
   */
  async convertUnit(
    quantity: number,
    fromUnit: string,
    toUnit: string
  ): Promise<UnitConversionResult> {
    // Check cache first
    const cacheKey = `${quantity}_${fromUnit}_${toUnit}`;
    if (this.conversionCache.has(cacheKey)) {
      return this.conversionCache.get(cacheKey)!;
    }

    try {
      // Build query string from params
      const params = {
        quantity,
        from_unit: fromUnit,
        to_unit: toUnit
      };
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key as keyof typeof params])}`)
        .join('&');

      const response = await api.post(`/api/v1/cost-control/unit-conversion/convert?${queryString}`, null) as { data: UnitConversionResult };

      const result = response.data;

      // Cache for 5 minutes (conversions don't change)
      this.conversionCache.set(cacheKey, result);
      setTimeout(() => this.conversionCache.delete(cacheKey), 5 * 60 * 1000);

      return result;
    } catch (error) {
      console.warn('Backend unit conversion failed, using fallback:', error);

      // Fallback to local conversion
      return this.convertUnitLocal(quantity, fromUnit, toUnit);
    }
  }

  /**
   * Calculate ingredient cost with proper unit conversion
   */
  async calculateIngredientCost(
    quantity: number,
    recipeUnit: string,
    costPerUnit: number,
    ingredientUnit: string
  ): Promise<number> {
    try {
      // First check if units are compatible
      const compatibleUnits = await this.getCompatibleUnits(recipeUnit);

      if (!compatibleUnits.includes(ingredientUnit.toLowerCase())) {
        // Units not compatible - return direct calculation
        console.warn(`Units ${recipeUnit} and ${ingredientUnit} are not compatible for conversion`);
        return quantity * costPerUnit;
      }

      // Convert recipe quantity to ingredient unit
      const conversion = await this.convertUnit(quantity, recipeUnit, ingredientUnit);

      return conversion.converted.quantity * costPerUnit;
    } catch (error) {
      console.error('Error calculating ingredient cost:', error);
      // Fallback to direct multiplication
      return quantity * costPerUnit;
    }
  }

  /**
   * Get unit type information
   */
  getUnitType(unit: string): 'weight' | 'volume' | 'count' | 'package' | 'unknown' {
    const unitLower = unit.toLowerCase();

    // Weight units
    if (['kg', 'g', 'gram', 'kilogram'].includes(unitLower)) {
      return 'weight';
    }

    // Volume units
    if (['liter', 'l', 'dl', 'ml', 'milliliter', 'deciliter'].includes(unitLower)) {
      return 'volume';
    }

    // Count/package units
    if (['st', 'styck', 'paket', 'burk', 'påse', 'flaska'].includes(unitLower)) {
      return 'count';
    }

    return 'unknown';
  }

  /**
   * Get Swedish display name for unit
   */
  getUnitDisplayName(unit: string): string {
    const displayNames: Record<string, string> = {
      'kg': 'kg',
      'g': 'g',
      'liter': 'liter',
      'l': 'liter',
      'dl': 'dl',
      'ml': 'ml',
      'st': 'st',
      'styck': 'st',
      'paket': 'paket',
      'burk': 'burk',
      'påse': 'påse',
      'flaska': 'flaska',
      'förpackning': 'förpackning'
    };

    return displayNames[unit.toLowerCase()] || unit;
  }

  /**
   * Validate if two units are compatible for conversion
   */
  async areUnitsCompatible(unit1: string, unit2: string): Promise<boolean> {
    if (unit1.toLowerCase() === unit2.toLowerCase()) return true;

    try {
      const compatibleUnits = await this.getCompatibleUnits(unit1);
      return compatibleUnits.includes(unit2.toLowerCase());
    } catch (error) {
      console.warn('Error checking unit compatibility:', error);
      return this.areUnitsCompatibleLocal(unit1, unit2);
    }
  }

  // ===== LOCAL FALLBACK METHODS =====

  private getCompatibleUnitsLocal(unit: string): string[] {
    const unitLower = unit.toLowerCase();

    // Weight units
    if (['kg', 'g'].includes(unitLower)) {
      return ['kg', 'g'];
    }

    // Volume units
    if (['liter', 'l', 'dl', 'ml'].includes(unitLower)) {
      return ['liter', 'l', 'dl', 'ml'];
    }

    // Count/package units typically don't convert to each other
    return [unitLower];
  }

  private convertUnitLocal(
    quantity: number,
    fromUnit: string,
    toUnit: string
  ): UnitConversionResult {
    const fromUnitLower = fromUnit.toLowerCase();
    const toUnitLower = toUnit.toLowerCase();

    // Same unit
    if (fromUnitLower === toUnitLower) {
      return {
        original: {
          quantity,
          unit: fromUnit,
          unitType: this.getUnitType(fromUnit)
        },
        converted: {
          quantity,
          unit: toUnit,
          unitType: this.getUnitType(toUnit)
        },
        conversionRatio: 1,
        timestamp: new Date().toISOString()
      };
    }

    let convertedQuantity = quantity;
    let ratio = 1;

    // Weight conversions
    if (fromUnitLower === 'kg' && toUnitLower === 'g') {
      convertedQuantity = quantity * 1000;
      ratio = 1000;
    } else if (fromUnitLower === 'g' && toUnitLower === 'kg') {
      convertedQuantity = quantity * 0.001;
      ratio = 0.001;
    }
    // Volume conversions
    else if (fromUnitLower === 'liter' && toUnitLower === 'dl') {
      convertedQuantity = quantity * 10;
      ratio = 10;
    } else if (fromUnitLower === 'liter' && toUnitLower === 'ml') {
      convertedQuantity = quantity * 1000;
      ratio = 1000;
    } else if (fromUnitLower === 'dl' && toUnitLower === 'liter') {
      convertedQuantity = quantity * 0.1;
      ratio = 0.1;
    } else if (fromUnitLower === 'dl' && toUnitLower === 'ml') {
      convertedQuantity = quantity * 100;
      ratio = 100;
    } else if (fromUnitLower === 'ml' && toUnitLower === 'liter') {
      convertedQuantity = quantity * 0.001;
      ratio = 0.001;
    } else if (fromUnitLower === 'ml' && toUnitLower === 'dl') {
      convertedQuantity = quantity * 0.01;
      ratio = 0.01;
    }

    return {
      original: {
        quantity,
        unit: fromUnit,
        unitType: this.getUnitType(fromUnit)
      },
      converted: {
        quantity: convertedQuantity,
        unit: toUnit,
        unitType: this.getUnitType(toUnit)
      },
      conversionRatio: ratio,
      timestamp: new Date().toISOString()
    };
  }

  private areUnitsCompatibleLocal(unit1: string, unit2: string): boolean {
    const type1 = this.getUnitType(unit1);
    const type2 = this.getUnitType(unit2);

    return type1 === type2 && type1 !== 'unknown';
  }

  /**
   * Clear all caches (useful for testing or memory management)
   */
  clearCache(): void {
    this.compatibilityCache.clear();
    this.conversionCache.clear();
  }
}

// Export singleton instance
export const unitConversionService = new UnitConversionService();
export default unitConversionService;