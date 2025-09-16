/**
 * Enhanced unit selector component with backend integration and smart unit suggestions
 */

import React, { useState, useEffect, useMemo } from 'react';
import { unitConversionService } from '../../utils/unitConversionService';
import { UNITS, UnitOption, renderUnitOptions } from '../../utils/units';

interface UnitSelectorProps {
  value: string;
  onChange: (unit: string) => void;
  baseUnit?: string; // The unit of the ingredient for smart filtering
  showCompatibleOnly?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  title?: string;
  'aria-label'?: string;
}

interface UnitSuggestion extends UnitOption {
  isCompatible: boolean;
  isRecommended: boolean;
  conversionNote?: string;
}

export const UnitSelector: React.FC<UnitSelectorProps> = ({
  value,
  onChange,
  baseUnit,
  showCompatibleOnly = false,
  disabled = false,
  required = false,
  className = '',
  title,
  'aria-label': ariaLabel
}) => {
  const [compatibleUnits, setCompatibleUnits] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Load compatible units when baseUnit changes
  useEffect(() => {
    if (!baseUnit) {
      setCompatibleUnits([]);
      return;
    }

    const loadCompatibleUnits = async () => {
      setIsLoading(true);
      setError('');
      try {
        const compatible = await unitConversionService.getCompatibleUnits(baseUnit);
        setCompatibleUnits(compatible);
      } catch (err) {
        setError('Kunde inte ladda kompatibla enheter');
        console.warn('Failed to load compatible units:', err);
        // Fallback to all units
        setCompatibleUnits(UNITS.map(u => u.value));
      } finally {
        setIsLoading(false);
      }
    };

    loadCompatibleUnits();
  }, [baseUnit]);

  // Enhanced unit options with compatibility and suggestions
  const enhancedUnits = useMemo((): UnitSuggestion[] => {
    return UNITS.map(unit => {
      const isCompatible = !baseUnit || compatibleUnits.includes(unit.value.toLowerCase());
      const isSameType = baseUnit &&
        unitConversionService.getUnitType(unit.value) === unitConversionService.getUnitType(baseUnit);
      const isRecommended = isCompatible && (unit.value === baseUnit || isSameType);

      let conversionNote = '';
      if (baseUnit && isCompatible && unit.value !== baseUnit) {
        const unitType = unitConversionService.getUnitType(unit.value);
        if (unitType !== 'unknown') {
          conversionNote = `Konverteras automatiskt från ${baseUnit}`;
        }
      }

      return {
        value: unit.value,
        label: unit.label,
        group: unit.group,
        isCompatible,
        isRecommended: Boolean(isRecommended),
        conversionNote
      };
    });
  }, [compatibleUnits, baseUnit]);

  // Filter units based on settings
  const filteredUnits = useMemo(() => {
    if (!showCompatibleOnly || !baseUnit) {
      return enhancedUnits;
    }
    return enhancedUnits.filter(unit => unit.isCompatible);
  }, [enhancedUnits, showCompatibleOnly, baseUnit]);

  // Group units for rendering
  const groupedUnits = useMemo(() => {
    return Object.entries(
      filteredUnits.reduce((groups, unit) => {
        const group = unit.group;
        if (!groups[group]) groups[group] = [];
        groups[group].push(unit);
        return groups;
      }, {} as Record<string, UnitSuggestion[]>)
    );
  }, [filteredUnits]);

  // Generate dynamic title
  const dynamicTitle = useMemo(() => {
    if (title) return title;

    if (baseUnit && compatibleUnits.length > 0) {
      return `Kompatibla enheter för ${baseUnit}: ${compatibleUnits.join(', ')}`;
    }

    if (baseUnit) {
      return `Välj enhet (bas: ${baseUnit})`;
    }

    return 'Välj måttenhet';
  }, [title, baseUnit, compatibleUnits]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    onChange(selectedValue);
  };

  return (
    <div className={`unit-selector ${className}`}>
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled || isLoading}
        required={required}
        title={dynamicTitle}
        aria-label={ariaLabel || 'Välj måttenhet'}
        className={`
          unit-selector__select
          ${error ? 'unit-selector__select--error' : ''}
          ${isLoading ? 'unit-selector__select--loading' : ''}
        `.trim()}
      >
        <option value="">
          {isLoading ? 'Laddar enheter...' : 'Välj enhet'}
        </option>

        {groupedUnits.map(([groupName, groupUnits]) => (
          <optgroup key={groupName} label={groupName}>
            {groupUnits.map(unit => (
              <option
                key={unit.value}
                value={unit.value}
                className={`
                  ${unit.isRecommended ? 'unit-option--recommended' : ''}
                  ${!unit.isCompatible ? 'unit-option--incompatible' : ''}
                `.trim()}
                title={unit.conversionNote || unit.label}
              >
                {unit.label}
                {unit.isRecommended && ' ⭐'}
                {unit.conversionNote && ' (auto)'}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {error && (
        <div className="unit-selector__error" role="alert">
          <small>{error}</small>
        </div>
      )}

      {baseUnit && !isLoading && compatibleUnits.length === 0 && (
        <div className="unit-selector__warning">
          <small>Inga kompatibla enheter hittades för {baseUnit}</small>
        </div>
      )}

      {showCompatibleOnly && baseUnit && (
        <div className="unit-selector__info">
          <small>
            Visar endast enheter kompatibla med {baseUnit}
            {compatibleUnits.length > 0 && ` (${compatibleUnits.length} st)`}
          </small>
        </div>
      )}
    </div>
  );
};

/**
 * Hook for unit conversion calculations with real-time updates
 */
export const useUnitConversion = (
  quantity: number,
  fromUnit: string,
  toUnit: string
) => {
  const [result, setResult] = useState<{
    convertedQuantity: number;
    isConverted: boolean;
    error?: string;
  }>({
    convertedQuantity: quantity,
    isConverted: false
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!fromUnit || !toUnit || quantity === 0) {
      setResult({
        convertedQuantity: quantity,
        isConverted: false
      });
      return;
    }

    if (fromUnit === toUnit) {
      setResult({
        convertedQuantity: quantity,
        isConverted: false
      });
      return;
    }

    const performConversion = async () => {
      setIsLoading(true);
      try {
        const conversionResult = await unitConversionService.convertUnit(
          quantity,
          fromUnit,
          toUnit
        );

        setResult({
          convertedQuantity: conversionResult.converted.quantity,
          isConverted: true,
          error: undefined
        });
      } catch (error) {
        console.warn('Unit conversion failed:', error);
        setResult({
          convertedQuantity: quantity, // Fallback to original quantity
          isConverted: false,
          error: 'Konvertering misslyckades'
        });
      } finally {
        setIsLoading(false);
      }
    };

    performConversion();
  }, [quantity, fromUnit, toUnit]);

  return {
    ...result,
    isLoading
  };
};

export default UnitSelector;