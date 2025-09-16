import React from 'react';
import { render, screen } from '@testing-library/react';
import { UNITS, renderUnitOptions } from './units';

describe('Units Utility', () => {
  test('UNITS contains expected unit categories', () => {
    const groups = [...new Set(UNITS.map(unit => unit.group))];
    expect(groups).toContain('Vikt');
    expect(groups).toContain('Volym');
    expect(groups).toContain('Antal');
    expect(groups).toContain('Förpackning');
  });

  test('renderUnitOptions generates proper optgroups', () => {
    const view = renderUnitOptions(UNITS);
    
    // Should have 4 optgroups (Vikt, Volym, Antal, Förpackning)
    expect(view).toHaveLength(4);
    
    // Each should be an optgroup element
    view.forEach(optgroup => {
      expect(optgroup.type).toBe('optgroup');
      expect(optgroup.props.label).toBeDefined();
    });
  });

  test('each unit category has expected units', () => {
    const viktUnits = UNITS.filter(unit => unit.group === 'Vikt');
    expect(viktUnits.map(u => u.value)).toEqual(['kg', 'g']);
    
    const volymUnits = UNITS.filter(unit => unit.group === 'Volym');
    expect(volymUnits.map(u => u.value)).toEqual(['liter', 'dl', 'ml']);
    
    const antalUnits = UNITS.filter(unit => unit.group === 'Antal');
    expect(antalUnits.map(u => u.value)).toEqual(['st']);
    
    const forpackningUnits = UNITS.filter(unit => unit.group === 'Förpackning');
    expect(forpackningUnits.map(u => u.value)).toEqual(['paket', 'burk', 'påse', 'flaska']);
  });

  test('renderUnitOptions can be rendered in a select element', () => {
    const TestComponent = () => (
      <select data-testid="unit-select">
        <option value="">Välj enhet</option>
        {renderUnitOptions(UNITS)}
      </select>
    );

    render(<TestComponent />);
    const select = screen.getByTestId('unit-select');
    
    expect(select).toBeInTheDocument();
    // Note: Testing specific DOM structure through screen queries is preferred but limited
    // This test verifies the component renders without errors and the select is accessible
    expect(select).toBeInstanceOf(HTMLSelectElement);
  });
});