import React from 'react';
import { render } from '@testing-library/react';
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
    const options = renderUnitOptions(UNITS);
    
    // Should have 4 optgroups (Vikt, Volym, Antal, Förpackning)
    expect(options).toHaveLength(4);
    
    // Each should be an optgroup element
    options.forEach(optgroup => {
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
      <select>
        <option value="">Välj enhet</option>
        {renderUnitOptions(UNITS)}
      </select>
    );

    const { container } = render(<TestComponent />);
    const select = container.querySelector('select');
    
    expect(select).toBeInTheDocument();
    expect(select?.querySelectorAll('optgroup')).toHaveLength(4);
    expect(select?.querySelectorAll('option')).toHaveLength(11); // 1 placeholder + 10 units
  });
});