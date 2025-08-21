/**
 * Svenska formateringsfunktioner för nummer, datum och valutor
 */

// Svenska lokaler för formatering
const SWEDISH_LOCALE = 'sv-SE';

/**
 * Formaterar ett nummer enligt svenska standarder
 * - Komma för decimaler
 * - Mellanslag som tusentalsavgränsare
 * @param value Nummer att formatera
 * @param decimals Antal decimaler (default: 2)
 * @returns Formaterat nummer som sträng
 * 
 * @example
 * formatNumber(1234.56) // "1 234,56"
 * formatNumber(1234.56, 0) // "1 235"
 */
export const formatNumber = (value: number | string, decimals: number = 2): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0';
  }

  return numValue.toLocaleString(SWEDISH_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Formaterar ett belopp i svenska kronor
 * @param value Belopp att formatera
 * @param decimals Antal decimaler (default: 2)
 * @returns Formaterat belopp med "kr"
 * 
 * @example
 * formatCurrency(1234.56) // "1 234,56 kr"
 * formatCurrency(99) // "99,00 kr"
 */
export const formatCurrency = (value: number | string, decimals: number = 2): string => {
  const formattedNumber = formatNumber(value, decimals);
  return `${formattedNumber} kr`;
};

/**
 * Formaterar kostnad per enhet
 * @param cost Kostnad
 * @param unit Enhet
 * @param decimals Antal decimaler (default: 2)
 * @returns Formaterad kostnad per enhet
 * 
 * @example
 * formatCostPerUnit(12.5, 'kg') // "12,50 kr/kg"
 */
export const formatCostPerUnit = (cost: number | string, unit: string, decimals: number = 2): string => {
  const formattedCost = formatNumber(cost, decimals);
  return `${formattedCost} kr/${unit}`;
};

/**
 * Formaterar procent enligt svenska standarder
 * @param value Värde att formatera som procent
 * @param decimals Antal decimaler (default: 1)
 * @returns Formaterat procenttal
 * 
 * @example
 * formatPercentage(75.5) // "75,5%"
 * formatPercentage(0.755, 1, true) // "75,5%" (från decimal)
 */
export const formatPercentage = (value: number | string, decimals: number = 1, fromDecimal: boolean = false): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0%';
  }

  const percentValue = fromDecimal ? numValue * 100 : numValue;
  const formattedNumber = formatNumber(percentValue, decimals);
  return `${formattedNumber}%`;
};

/**
 * Konverterar inmatningsvärde (som kan innehålla komma) till nummer
 * @param input Inmatningsvärde
 * @returns Nummer eller 0 om ogiltigt
 * 
 * @example
 * parseSwedishNumber("1 234,56") // 1234.56
 * parseSwedishNumber("99,5") // 99.5
 */
export const parseSwedishNumber = (input: string): number => {
  if (!input || typeof input !== 'string') {
    return 0;
  }

  // Ta bort mellanslag och ersätt komma med punkt
  const normalized = input
    .replace(/\s/g, '') // Ta bort alla mellanslag
    .replace(',', '.'); // Ersätt komma med punkt

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formaterar datum enligt svenska standarder (ÅÅÅÅ-MM-DD)
 * @param date Datum att formatera
 * @returns Formaterat datum
 * 
 * @example
 * formatDate(new Date()) // "2024-03-15"
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }

  return dateObj.toLocaleDateString(SWEDISH_LOCALE, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * Formaterar tid enligt svenska standarder (HH:mm)
 * @param date Datum/tid att formatera
 * @returns Formaterad tid
 * 
 * @example
 * formatTime(new Date()) // "14:30"
 */
export const formatTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }

  return dateObj.toLocaleTimeString(SWEDISH_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

/**
 * Formaterar datum och tid enligt svenska standarder
 * @param date Datum/tid att formatera
 * @returns Formaterat datum och tid
 * 
 * @example
 * formatDateTime(new Date()) // "2024-03-15 14:30"
 */
export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }

  return `${formatDate(dateObj)} ${formatTime(dateObj)}`;
};

/**
 * Formaterar relativt datum (idag, igår, etc.)
 * @param date Datum att formatera
 * @returns Relativt datum på svenska
 * 
 * @example
 * formatRelativeDate(new Date()) // "Idag"
 * formatRelativeDate(yesterday) // "Igår"
 */
export const formatRelativeDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const now = new Date();
  const diffTime = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Idag';
  } else if (diffDays === 1) {
    return 'Igår';
  } else if (diffDays === -1) {
    return 'Imorgon';
  } else if (diffDays > 0 && diffDays <= 7) {
    return `${diffDays} dagar sedan`;
  } else if (diffDays < 0 && diffDays >= -7) {
    return `Om ${Math.abs(diffDays)} dagar`;
  } else {
    return formatDate(dateObj);
  }
};

/**
 * Formaterar duration i minuter till läsbar text
 * @param minutes Minuter
 * @returns Formaterad duration
 * 
 * @example
 * formatDuration(90) // "1 tim 30 min"
 * formatDuration(45) // "45 min"
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (remainingMinutes === 0) {
    return `${hours} tim`;
  }

  return `${hours} tim ${remainingMinutes} min`;
};

/**
 * Helper-funktion för att formatera input-fält med svensk formatering
 * Används i onChange-handlers för att visa komma istället för punkt
 * @param event React change event
 * @param setter State setter funktion
 */
export const handleSwedishNumberInput = (
  event: React.ChangeEvent<HTMLInputElement>,
  setter: (value: number) => void
): void => {
  const value = event.target.value;
  
  // Tillåt användaren att skriva med komma
  const numericValue = parseSwedishNumber(value);
  setter(numericValue);
  
  // Uppdatera input-fältet för att visa komma
  if (value.includes('.')) {
    event.target.value = value.replace('.', ',');
  }
};

/**
 * Formaterar ett nummer för visning i input-fält
 * @param value Nummer att formatera
 * @returns Sträng med komma som decimalavgränsare
 */
export const formatNumberForInput = (value: number): string => {
  if (isNaN(value) || value === 0) {
    return '';
  }
  
  return value.toString().replace('.', ',');
};