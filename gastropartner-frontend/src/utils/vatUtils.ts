import { SwedishVATRate, VATCalculationType } from './api';

/**
 * Swedish VAT calculation utilities for frontend
 */

export function calculateVATAmount(
  price: number,
  vatRate: SwedishVATRate,
  calculationType: VATCalculationType = VATCalculationType.INCLUSIVE
): number {
  const vatRateDecimal = parseFloat(vatRate) / 100;
  
  if (calculationType === VATCalculationType.INCLUSIVE) {
    // Price includes VAT: VAT = price * (rate / (100 + rate))
    return price * vatRateDecimal / (1 + vatRateDecimal);
  } else {
    // Price excludes VAT: VAT = price * rate
    return price * vatRateDecimal;
  }
}

export function calculatePriceExcludingVAT(
  price: number,
  vatRate: SwedishVATRate,
  calculationType: VATCalculationType = VATCalculationType.INCLUSIVE
): number {
  if (calculationType === VATCalculationType.INCLUSIVE) {
    // Remove VAT from inclusive price
    const vatAmount = calculateVATAmount(price, vatRate, calculationType);
    return price - vatAmount;
  } else {
    // Price already excludes VAT
    return price;
  }
}

export function calculatePriceIncludingVAT(
  price: number,
  vatRate: SwedishVATRate,
  calculationType: VATCalculationType = VATCalculationType.EXCLUSIVE
): number {
  if (calculationType === VATCalculationType.INCLUSIVE) {
    // Price already includes VAT
    return price;
  } else {
    // Add VAT to exclusive price
    const vatAmount = calculateVATAmount(price, vatRate, calculationType);
    return price + vatAmount;
  }
}

export function getStandardVATRateForRestaurantItem(itemType: string = 'food'): SwedishVATRate {
  // Swedish restaurant VAT rules:
  // - Dine-in food: 25% (standard rate)
  // - Takeaway food: 12% (reduced rate) 
  // - Alcohol: 25% (standard rate)
  // - Non-alcoholic beverages: 25% (standard rate)
  
  if (itemType === 'takeaway') {
    return SwedishVATRate.FOOD_REDUCED; // 12%
  } else {
    return SwedishVATRate.STANDARD; // 25%
  }
}

export function formatVATRate(vatRate: SwedishVATRate): string {
  return `${vatRate}%`;
}

export function formatVATSummary(vatBreakdown: Record<string, number>): string {
  if (!vatBreakdown || Object.keys(vatBreakdown).length === 0) {
    return 'Ingen moms';
  }
  
  const summaryParts = Object.entries(vatBreakdown).map(
    ([rate, amount]) => `${rate}%: ${amount.toFixed(2)} kr`
  );
  
  return 'Moms: ' + summaryParts.join(', ');
}

export function getVATRateDisplayName(vatRate: SwedishVATRate): string {
  switch (vatRate) {
    case SwedishVATRate.STANDARD:
      return '25% (Standard)';
    case SwedishVATRate.FOOD_REDUCED:
      return '12% (Mat - reducerad)';
    case SwedishVATRate.CULTURAL:
      return '6% (Kultur)';
    case SwedishVATRate.ZERO:
      return '0% (Momsfri)';
    default:
      return `${vatRate}%`;
  }
}

export function getVATCalculationTypeDisplayName(calculationType: VATCalculationType): string {
  switch (calculationType) {
    case VATCalculationType.INCLUSIVE:
      return 'Pris inklusive moms';
    case VATCalculationType.EXCLUSIVE:
      return 'Pris exklusive moms';
    default:
      return calculationType;
  }
}