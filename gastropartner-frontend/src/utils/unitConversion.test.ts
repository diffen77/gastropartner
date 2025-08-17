import { convertUnit, calculateIngredientCost, areUnitsCompatible, getCompatibleUnits } from './unitConversion';

describe('Unit Conversion', () => {
  describe('convertUnit', () => {
    test('converts kg to g correctly', () => {
      expect(convertUnit(1, 'kg', 'g')).toBe(1000);
      expect(convertUnit(0.1, 'kg', 'g')).toBe(100);
      expect(convertUnit(2.5, 'kg', 'g')).toBe(2500);
    });

    test('converts g to kg correctly', () => {
      expect(convertUnit(1000, 'g', 'kg')).toBe(1);
      expect(convertUnit(100, 'g', 'kg')).toBe(0.1);
      expect(convertUnit(2500, 'g', 'kg')).toBe(2.5);
    });

    test('converts liter to ml correctly', () => {
      expect(convertUnit(1, 'liter', 'ml')).toBe(1000);
      expect(convertUnit(0.5, 'liter', 'ml')).toBe(500);
    });

    test('returns same value for same unit', () => {
      expect(convertUnit(100, 'g', 'g')).toBe(100);
      expect(convertUnit(1.5, 'kg', 'kg')).toBe(1.5);
    });

    test('returns original value for incompatible units', () => {
      expect(convertUnit(100, 'g', 'st')).toBe(100);
      expect(convertUnit(1, 'kg', 'burk')).toBe(1);
    });
  });

  describe('calculateIngredientCost', () => {
    test('calculates cost with unit conversion - BBQ Rub example', () => {
      // BBQ Rub: 850.10 kr/kg, recipe uses 100g
      const cost = calculateIngredientCost(100, 'g', 850.10, 'kg');
      expect(cost).toBeCloseTo(85.01, 2);
    });

    test('calculates cost with unit conversion - 1kg example', () => {
      // BBQ Rub: 850.10 kr/kg, recipe uses 1kg
      const cost = calculateIngredientCost(1, 'kg', 850.10, 'kg');
      expect(cost).toBeCloseTo(850.10, 2);
    });

    test('calculates cost with same units', () => {
      // Ingredient priced per gram, recipe uses grams
      const cost = calculateIngredientCost(50, 'g', 2.50, 'g');
      expect(cost).toBe(125);
    });

    test('calculates cost with volume conversion', () => {
      // Milk: 15 kr/liter, recipe uses 250ml
      const cost = calculateIngredientCost(250, 'ml', 15, 'liter');
      expect(cost).toBeCloseTo(3.75, 2);
    });
  });

  describe('areUnitsCompatible', () => {
    test('identifies compatible weight units', () => {
      expect(areUnitsCompatible('kg', 'g')).toBe(true);
      expect(areUnitsCompatible('g', 'kg')).toBe(true);
    });

    test('identifies compatible volume units', () => {
      expect(areUnitsCompatible('liter', 'ml')).toBe(true);
      expect(areUnitsCompatible('dl', 'ml')).toBe(true);
    });

    test('identifies same units as compatible', () => {
      expect(areUnitsCompatible('kg', 'kg')).toBe(true);
      expect(areUnitsCompatible('st', 'st')).toBe(true);
    });

    test('identifies incompatible units', () => {
      expect(areUnitsCompatible('kg', 'st')).toBe(false);
      expect(areUnitsCompatible('liter', 'burk')).toBe(false);
    });
  });

  describe('getCompatibleUnits', () => {
    test('returns compatible weight units for kg', () => {
      const compatible = getCompatibleUnits('kg');
      expect(compatible).toContain('kg');
      expect(compatible).toContain('g');
      expect(compatible.length).toBe(2);
    });

    test('returns compatible volume units for liter', () => {
      const compatible = getCompatibleUnits('liter');
      expect(compatible).toContain('liter');
      expect(compatible).toContain('dl');
      expect(compatible).toContain('ml');
      expect(compatible.length).toBe(3);
    });

    test('returns only self for incompatible units', () => {
      const compatible = getCompatibleUnits('st');
      expect(compatible).toEqual(['st']);
    });
  });
});