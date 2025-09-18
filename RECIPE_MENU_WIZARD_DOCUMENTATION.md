# RecipeMenuWizard - Unified Recipe and Menu Item Creation Component

## Overview

The RecipeMenuWizard is a comprehensive, step-by-step wizard component for creating both recipes and menu items in the GastroPartner application. It provides a guided workflow with intelligent validation, real-time cost calculations, and a polished user experience.

## Features

### ✨ Core Capabilities
- **Unified Creation Flow**: Single wizard for both recipes and menu items
- **Step-by-Step Guidance**: Progressive disclosure with clear navigation
- **Real-Time Validation**: Instant feedback and error checking
- **Cost Calculation**: Live pricing calculations with margin analysis
- **Preview System**: Dual preview modes (internal and customer view)
- **Responsive Design**: Mobile-first responsive layout
- **Dark Mode Support**: Automatic dark theme adaptation
- **Accessibility**: WCAG-compliant with keyboard navigation

### 🔧 Technical Features
- **TypeScript Integration**: Full type safety and IntelliSense support
- **State Management**: Robust state handling with undo/redo capability
- **Form Validation**: Per-step validation with comprehensive error handling
- **Deep Linking**: URL-based step navigation for bookmarking
- **Progressive Enhancement**: Works without JavaScript (basic functionality)

## Architecture

### Component Structure
```
RecipeMenuWizard (Master Component)
├── WizardNavigation (Progress tracking and navigation)
├── CreationTypeStep (Recipe vs Menu Item selection)
├── BasicInfoStep (Name, description, servings)
├── IngredientsStep (Ingredient selection and quantities)
├── PreparationStep (Instructions and timing)
├── CostCalculationStep (Cost analysis and margins)
├── SalesSettingsStep (Pricing and categorization)
└── PreviewStep (Final review and validation)
```

### State Management
The wizard uses the `useRecipeMenuWizardState` hook for comprehensive state management:
- **Current Step**: Active wizard step
- **Form Data**: All collected information across steps
- **Validation**: Per-step error tracking
- **Navigation**: Step progression and history
- **Loading States**: Async operation tracking

## Usage

### Basic Implementation

```tsx
import { RecipeMenuWizard } from './components/RecipeManagement/RecipeMenuWizard';

function MyComponent() {
  const handleComplete = (result) => {
    console.log(`Created ${result.type}:`, result.data);
    // Handle successful creation
  };

  const handleCancel = () => {
    console.log('User cancelled wizard');
    // Handle cancellation
  };

  return (
    <RecipeMenuWizard
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}
```

### Advanced Usage

```tsx
import { RecipeMenuWizard, WizardStep } from './components/RecipeManagement/RecipeMenuWizard';

function AdvancedUsage() {
  const [initialData, setInitialData] = useState(null);

  const handleComplete = (result) => {
    if (result.type === 'recipe') {
      // Handle recipe creation
      console.log('Recipe created:', result.data.name);
    } else {
      // Handle menu item creation
      console.log('Menu item created:', result.data.name);
    }
  };

  return (
    <RecipeMenuWizard
      onComplete={handleComplete}
      onCancel={() => router.back()}
      initialStep="basic-info" // Start from specific step
      initialData={initialData} // Pre-populate with existing data
      className="custom-wizard-styles"
    />
  );
}
```

## API Reference

### RecipeMenuWizard Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onComplete` | `(result: WizardResult) => void` | No | Called when wizard completes successfully |
| `onCancel` | `() => void` | No | Called when user cancels the wizard |
| `initialStep` | `WizardStep` | No | Step to start wizard from (for deep linking) |
| `initialData` | `any` | No | Pre-populated data for editing existing items |
| `className` | `string` | No | Additional CSS classes for styling |

### WizardResult Interface

```tsx
interface WizardResult {
  type: 'recipe' | 'menu-item';
  id: string;
  data: Recipe | MenuItem;
}
```

### Available Wizard Steps

```tsx
type WizardStep =
  | 'creation-type'      // Select recipe or menu item
  | 'basic-info'         // Name, description, servings
  | 'ingredients'        // Ingredient selection
  | 'preparation'        // Instructions and timing
  | 'cost-calculation'   // Cost analysis
  | 'sales-settings'     // Pricing (menu items only)
  | 'preview';           // Final review
```

## Step-by-Step Guide

### 1. Creation Type Selection
- **Purpose**: Choose between creating a recipe or menu item
- **Options**:
  - **Recipe**: Basic ingredient combinations and instructions
  - **Menu Item**: Complete dish with pricing and sales information
- **Validation**: Required selection to proceed

### 2. Basic Information
- **Fields**:
  - **Name**: Descriptive name for the item
  - **Description**: Detailed description of the dish
  - **Servings**: Number of portions produced
  - **Category**: Classification for organization
- **Validation**: Name and servings are required

### 3. Ingredients Selection
- **Features**:
  - Search and select from existing ingredients
  - Specify quantities and units
  - Add custom notes for ingredients
  - Real-time availability checking
- **Validation**: At least one ingredient required

### 4. Preparation Instructions
- **Fields**:
  - **Instructions**: Step-by-step cooking directions
  - **Preparation Time**: Time needed for prep work
  - **Cooking Time**: Active cooking duration
- **Features**: Rich text editor with formatting support
- **Validation**: Optional step, but instructions recommended

### 5. Cost Calculation
- **Features**:
  - Automatic cost calculation based on ingredients
  - Real-time price updates
  - Cost per serving analysis
  - Margin calculations
- **Display**: Visual breakdown of costs and margins

### 6. Sales Settings (Menu Items Only)
- **Pricing**:
  - **Calculation Modes**: Price-from-margin or margin-from-price
  - **Quick Presets**: Common margin percentages (15%, 25%, 35%, etc.)
  - **VAT Handling**: Swedish VAT rates (25%, 12%, 6%, 0%)
- **Categorization**:
  - **Visual Categories**: Icon-based selection
  - **Options**: Appetizers, Main Courses, Desserts, Beverages, etc.
- **Availability**: Toggle for customer visibility

### 7. Preview and Validation
- **Dual Preview Modes**:
  - **Internal View**: Staff perspective with editable sections
  - **Customer View**: Public-facing appearance
- **Validation Features**:
  - Completeness meter showing percentage of required fields
  - Issue detection with specific recommendations
  - Warning system for potential problems
- **Navigation**: Quick links to edit specific sections

## Validation System

### Validation Levels

#### Step-Level Validation
Each step validates its own data:
```tsx
// Example validation for basic info step
const validateBasicInfo = (data) => {
  const errors = [];
  if (!data.name?.trim()) errors.push('Namn krävs');
  if (!data.servings || data.servings < 1) errors.push('Portioner måste vara minst 1');
  return errors;
};
```

#### Cross-Step Validation
The preview step validates data consistency across all steps:
```tsx
// Example cross-step validation
const validateComplete = (data) => {
  const issues = [];
  if (data.creationType === 'menu-item' && !data.salesSettings.price) {
    issues.push('Försäljningspris krävs för maträtter');
  }
  return issues;
};
```

### Validation Categories

- **Errors**: Required fields and critical issues that prevent saving
- **Warnings**: Recommendations and best practices
- **Information**: Helpful hints and suggestions

## Styling and Theming

### CSS Custom Properties
The wizard uses CSS custom properties for theming:

```css
:root {
  --accent-primary: #407bff;
  --accent-secondary: #5a67d8;
  --bg-surface: #ffffff;
  --bg-secondary: #f8f9fa;
  --text-primary: #2c3e50;
  --text-secondary: #6c757d;
  --border-light: #f0f0f0;
  --success-color: #28a745;
  --warning-color: #ffc107;
  --danger-color: #dc3545;
}
```

### Dark Mode Support
Automatic dark mode detection:
```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-surface: #2d3748;
    --bg-secondary: #1a202c;
    --text-primary: #f7fafc;
    --border-light: #4a5568;
  }
}
```

### Responsive Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## Integration Examples

### With Recipe Management Context
```tsx
import { useRecipeManagement } from '../../contexts/RecipeManagementContext';

function IntegratedWizard() {
  const { onRecipeChange, onMenuItemChange } = useRecipeManagement();

  const handleComplete = async (result) => {
    if (result.type === 'recipe') {
      await onRecipeChange(); // Refresh recipe list
    } else {
      await onMenuItemChange(); // Refresh menu items
    }

    // Show success message
    showNotification(`${result.data.name} har skapats!`);
  };

  return <RecipeMenuWizard onComplete={handleComplete} />;
}
```

### With URL-based Navigation
```tsx
import { useRouter } from 'next/router';

function UrlBasedWizard() {
  const router = useRouter();
  const { step } = router.query;

  const handleStepChange = (newStep) => {
    router.push({
      pathname: router.pathname,
      query: { ...router.query, step: newStep }
    }, undefined, { shallow: true });
  };

  return (
    <RecipeMenuWizard
      initialStep={step as WizardStep}
      onStepChange={handleStepChange}
    />
  );
}
```

## Performance Considerations

### Code Splitting
The wizard components are designed for lazy loading:
```tsx
const RecipeMenuWizard = React.lazy(() =>
  import('./components/RecipeManagement/RecipeMenuWizard')
);

function LazyWizard() {
  return (
    <React.Suspense fallback={<WizardSkeleton />}>
      <RecipeMenuWizard />
    </React.Suspense>
  );
}
```

### Memory Management
- Form data is automatically cleaned up on unmount
- Image uploads are processed asynchronously
- Large ingredient lists are virtualized for performance

## Testing

### Unit Testing
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { RecipeMenuWizard } from './RecipeMenuWizard';

test('wizard progresses through steps correctly', async () => {
  render(<RecipeMenuWizard />);

  // Test creation type selection
  fireEvent.click(screen.getByText('Grundrecept'));
  fireEvent.click(screen.getByText('Nästa'));

  // Test basic info step
  fireEvent.change(screen.getByLabelText('Namn'), {
    target: { value: 'Test Recipe' }
  });

  // Continue through remaining steps...
});
```

### E2E Testing with Playwright
```tsx
import { test, expect } from '@playwright/test';

test('complete recipe creation flow', async ({ page }) => {
  await page.goto('/recipes/new');

  // Select recipe type
  await page.click('[data-testid="recipe-type"]');
  await page.click('button:has-text("Nästa")');

  // Fill basic info
  await page.fill('[data-testid="recipe-name"]', 'E2E Test Recipe');
  await page.fill('[data-testid="recipe-description"]', 'Created by E2E test');

  // Continue through wizard...

  await expect(page.getByText('Recept sparat!')).toBeVisible();
});
```

## Common Issues and Solutions

### Issue: Validation Errors Not Clearing
**Problem**: Validation errors persist after fixing issues
**Solution**: Ensure validation is re-run when data changes
```tsx
useEffect(() => {
  const errors = validateStep(currentStep);
  setErrors(errors);
}, [data, currentStep]);
```

### Issue: Cost Calculations Not Updating
**Problem**: Prices don't update when ingredients change
**Solution**: Use proper dependency arrays in useEffect
```tsx
useEffect(() => {
  recalculateCosts();
}, [ingredients, quantities]);
```

### Issue: Step Navigation Not Working
**Problem**: Cannot navigate between steps
**Solution**: Check that step validation is not blocking navigation
```tsx
const canNavigate = errors.length === 0 && requiredFieldsComplete;
```

## Future Enhancements

### Planned Features
- [ ] **Batch Creation**: Create multiple items simultaneously
- [ ] **Template System**: Save and reuse wizard configurations
- [ ] **Import/Export**: JSON-based data exchange
- [ ] **Collaboration**: Multi-user editing capabilities
- [ ] **Version Control**: Track changes and revisions
- [ ] **AI Assistance**: Smart suggestions and auto-completion

### Integration Opportunities
- [ ] **Inventory Management**: Real-time stock checking
- [ ] **Nutrition Analysis**: Automatic nutritional calculations
- [ ] **Cost Optimization**: Suggest cost-effective alternatives
- [ ] **Photo Management**: Integrated image upload and editing
- [ ] **Print Integration**: Professional recipe card generation

## Support and Maintenance

### Browser Support
- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Progressive Enhancement**: Basic functionality in older browsers

### Accessibility Compliance
- **WCAG 2.1 AA**: Full compliance with accessibility guidelines
- **Keyboard Navigation**: Complete keyboard accessibility
- **Screen Readers**: Optimized for NVDA, JAWS, and VoiceOver
- **High Contrast**: Support for high contrast modes

### Performance Metrics
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

---

## Quick Reference

### Essential Methods
```tsx
// Create wizard instance
<RecipeMenuWizard onComplete={handleComplete} />

// Navigate to specific step
goToStep('ingredients');

// Update wizard data
updateData({ basicInfo: { name: 'New Name' } });

// Validate current step
const errors = validateStep(currentStep);

// Reset wizard
reset();
```

### Key CSS Classes
```css
.recipe-menu-wizard          /* Main container */
.wizard-navigation           /* Navigation header */
.wizard-content             /* Main content area */
.wizard-step-container      /* Individual step wrapper */
.validation-message         /* Error/warning display */
.preview-container          /* Preview step container */
```

This documentation provides comprehensive guidance for using, customizing, and maintaining the RecipeMenuWizard component. For additional support or feature requests, please refer to the project's issue tracking system.