import React from 'react';

/**
 * Shared unit definitions for ingredient and recipe forms
 */

export interface UnitOption {
  value: string;
  label: string;
  group: string;
}

export const UNITS: UnitOption[] = [
  // Weight
  { value: 'kg', label: 'kg (kilogram)', group: 'Vikt' },
  { value: 'g', label: 'g (gram)', group: 'Vikt' },
  
  // Volume
  { value: 'liter', label: 'liter', group: 'Volym' },
  { value: 'dl', label: 'dl (deciliter)', group: 'Volym' },
  { value: 'ml', label: 'ml (milliliter)', group: 'Volym' },
  
  // Count/Package
  { value: 'st', label: 'st (styck)', group: 'Antal' },
  { value: 'paket', label: 'paket', group: 'Förpackning' },
  { value: 'burk', label: 'burk', group: 'Förpackning' },
  { value: 'påse', label: 'påse', group: 'Förpackning' },
  { value: 'flaska', label: 'flaska', group: 'Förpackning' }
];

/**
 * React component for rendering a grouped unit dropdown
 */
export function renderUnitOptions(units: UnitOption[]): React.ReactElement[] {
  return Object.entries(
    units.reduce((groups, unit) => {
      const group = unit.group;
      if (!groups[group]) groups[group] = [];
      groups[group].push(unit);
      return groups;
    }, {} as Record<string, UnitOption[]>)
  ).map(([groupName, groupUnits]) => (
    <optgroup key={groupName} label={groupName}>
      {groupUnits.map(unit => (
        <option key={unit.value} value={unit.value}>
          {unit.label}
        </option>
      ))}
    </optgroup>
  ));
}