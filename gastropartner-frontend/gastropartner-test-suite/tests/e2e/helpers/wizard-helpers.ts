import { Page, expect } from '@playwright/test';

/**
 * Test helpers for Recipe Menu Wizard E2E tests
 * Provides reusable functions for common wizard operations
 */

export interface TestIngredient {
  ingredient_id: number;
  name: string;
  category: string;
  cost_per_unit: number;
  unit: string;
  supplier: string;
  organization_id: string;
}

export interface WizardStepData {
  creationType?: 'recipe' | 'menu-item';
  basicInfo?: {
    name: string;
    description?: string;
    servings: number;
    category?: string;
  };
  ingredients?: Array<{
    ingredientId: number;
    quantity: number;
    unit: string;
  }>;
  preparation?: {
    instructions?: string;
    prepTime?: number;
    cookTime?: number;
  };
  salesSettings?: {
    price?: number;
    margin?: number;
    category?: string;
    isAvailable?: boolean;
  };
}

/**
 * Setup authentication and common API mocks
 */
export async function setupWizardTest(page: Page) {
  // Mock authentication
  await page.addInitScript(() => {
    localStorage.setItem('supabase.auth.token', JSON.stringify({
      access_token: 'mock-token',
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
        organization_id: 'test-org-123'
      }
    }));
  });

  // Mock default ingredients
  await mockIngredientsAPI(page, getDefaultTestIngredients());

  // Mock recipe creation
  await page.route('**/api/v1/recipes*', (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'recipe-test-123',
          name: 'Test Recipe',
          organization_id: 'test-org-123'
        })
      });
    }
  });

  // Mock menu item creation
  await page.route('**/api/v1/menu-items*', (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'menu-item-test-456',
          name: 'Test Menu Item',
          organization_id: 'test-org-123'
        })
      });
    }
  });

  await page.goto('/recipes');
}

/**
 * Get default test ingredients for mocking
 */
export function getDefaultTestIngredients(): TestIngredient[] {
  return [
    {
      ingredient_id: 1,
      name: 'Tomater',
      category: 'Grönsaker',
      cost_per_unit: 25.50,
      unit: 'kg',
      supplier: 'Lokala Gården',
      organization_id: 'test-org-123'
    },
    {
      ingredient_id: 2,
      name: 'Olivolja',
      category: 'Oljor',
      cost_per_unit: 89.00,
      unit: 'l',
      supplier: 'Premium Foods',
      organization_id: 'test-org-123'
    },
    {
      ingredient_id: 3,
      name: 'Basilika',
      category: 'Kryddor',
      cost_per_unit: 15.00,
      unit: 'g',
      supplier: 'Herb Co',
      organization_id: 'test-org-123'
    },
    {
      ingredient_id: 4,
      name: 'Vitlök',
      category: 'Kryddor',
      cost_per_unit: 45.00,
      unit: 'kg',
      supplier: 'Fresh Market',
      organization_id: 'test-org-123'
    },
    {
      ingredient_id: 5,
      name: 'Lök',
      category: 'Grönsaker',
      cost_per_unit: 18.00,
      unit: 'kg',
      supplier: 'Lokala Gården',
      organization_id: 'test-org-123'
    }
  ];
}

/**
 * Mock ingredients API with custom ingredient list
 */
export async function mockIngredientsAPI(page: Page, ingredients: TestIngredient[]) {
  await page.route('**/api/v1/ingredients*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(ingredients)
    });
  });
}

/**
 * Start the wizard from recipe management page
 */
export async function startWizard(page: Page) {
  await page.click('[data-testid="create-recipe-button"], button:has-text("Ny"), button:has-text("Skapa")');
  await expect(page.locator('.recipe-menu-wizard')).toBeVisible();
}

/**
 * Complete the creation type step
 */
export async function selectCreationType(page: Page, type: 'recipe' | 'menu-item') {
  await expect(page.locator('h1')).toContainText('Typ av skapande');

  if (type === 'recipe') {
    await page.click('[data-testid="recipe-type"], button:has-text("Grundrecept")');
  } else {
    await page.click('[data-testid="menu-item-type"], button:has-text("Maträtt")');
  }

  await page.click('button:has-text("Nästa")');
}

/**
 * Complete the basic information step
 */
export async function fillBasicInfo(page: Page, basicInfo: WizardStepData['basicInfo']) {
  await expect(page.locator('h1')).toContainText('Grundinformation');

  if (basicInfo?.name) {
    await page.fill('[data-testid="recipe-name"], input[name="name"]', basicInfo.name);
  }

  if (basicInfo?.description) {
    await page.fill('[data-testid="recipe-description"], textarea[name="description"]', basicInfo.description);
  }

  if (basicInfo?.servings) {
    await page.fill('[data-testid="recipe-servings"], input[name="servings"]', basicInfo.servings.toString());
  }

  if (basicInfo?.category) {
    await page.selectOption('[data-testid="category-select"]', basicInfo.category);
  }

  await page.click('button:has-text("Nästa")');
}

/**
 * Add ingredients in the ingredients step
 */
export async function addIngredients(page: Page, ingredients: WizardStepData['ingredients']) {
  await expect(page.locator('h1')).toContainText('Ingredienser');

  if (ingredients) {
    for (const ingredient of ingredients) {
      await page.click('[data-testid="add-ingredient"], button:has-text("Lägg till ingrediens")');
      await page.selectOption('[data-testid="ingredient-select"]', ingredient.ingredientId.toString());
      await page.fill('[data-testid="ingredient-quantity"]', ingredient.quantity.toString());
      await page.selectOption('[data-testid="ingredient-unit"]', ingredient.unit);
      await page.click('[data-testid="confirm-ingredient"]');

      // Verify ingredient was added
      await expect(page.locator(`text=${getDefaultTestIngredients().find(i => i.ingredient_id === ingredient.ingredientId)?.name}`)).toBeVisible();
    }
  }

  await page.click('button:has-text("Nästa")');
}

/**
 * Fill preparation information
 */
export async function fillPreparation(page: Page, preparation?: WizardStepData['preparation']) {
  await expect(page.locator('h1')).toContainText('Tillagning');

  if (preparation?.instructions) {
    await page.fill('[data-testid="instructions"], textarea[name="instructions"]', preparation.instructions);
  }

  if (preparation?.prepTime) {
    await page.fill('[data-testid="prep-time"], input[name="prep_time"]', preparation.prepTime.toString());
  }

  if (preparation?.cookTime) {
    await page.fill('[data-testid="cook-time"], input[name="cook_time"]', preparation.cookTime.toString());
  }

  await page.click('button:has-text("Nästa")');
}

/**
 * Navigate through cost calculation step
 */
export async function reviewCostCalculation(page: Page) {
  await expect(page.locator('h1')).toContainText('Kostnadsberäkning');

  // Verify cost calculations are visible
  await expect(page.locator('[data-testid="total-cost"]')).toBeVisible();
  await expect(page.locator('[data-testid="cost-per-serving"]')).toBeVisible();

  await page.click('button:has-text("Nästa")');
}

/**
 * Fill sales settings (menu items only)
 */
export async function fillSalesSettings(page: Page, salesSettings?: WizardStepData['salesSettings']) {
  await expect(page.locator('h1')).toContainText('Försäljningsinställningar');

  if (salesSettings?.price) {
    await page.fill('[data-testid="sales-price"], input[name="price"]', salesSettings.price.toString());
  }

  if (salesSettings?.margin) {
    await page.fill('[data-testid="margin-percentage"], input[name="margin"]', salesSettings.margin.toString());
  }

  if (salesSettings?.category) {
    await page.click(`[data-testid="category-${salesSettings.category.toLowerCase()}"]`);
  }

  if (salesSettings?.isAvailable !== undefined) {
    if (salesSettings.isAvailable) {
      await page.check('[data-testid="is-available"]');
    } else {
      await page.uncheck('[data-testid="is-available"]');
    }
  }

  await page.click('button:has-text("Nästa")');
}

/**
 * Review and complete the wizard
 */
export async function completeWizard(page: Page, expectedData: Partial<WizardStepData>) {
  await expect(page.locator('h1')).toContainText('Förhandsvisning');

  // Verify displayed data matches expected
  if (expectedData.basicInfo?.name) {
    await expect(page.locator(`text=${expectedData.basicInfo.name}`)).toBeVisible();
  }

  if (expectedData.basicInfo?.description) {
    await expect(page.locator(`text=${expectedData.basicInfo.description}`)).toBeVisible();
  }

  if (expectedData.basicInfo?.servings) {
    await expect(page.locator(`text=${expectedData.basicInfo.servings}`)).toBeVisible();
  }

  // Complete the wizard
  await page.click('[data-testid="complete-wizard"], button:has-text("Spara"), button:has-text("Slutför")');

  // Verify success
  await expect(page.locator('text=har skapats, text=sparat, text=slutfört')).toBeVisible({ timeout: 10000 });
}

/**
 * Complete entire recipe creation flow with provided data
 */
export async function createRecipeFlow(page: Page, data: WizardStepData) {
  await startWizard(page);
  await selectCreationType(page, 'recipe');

  if (data.basicInfo) {
    await fillBasicInfo(page, data.basicInfo);
  }

  if (data.ingredients) {
    await addIngredients(page, data.ingredients);
  } else {
    // Skip ingredients step
    await page.click('button:has-text("Nästa")');
  }

  await fillPreparation(page, data.preparation);
  await reviewCostCalculation(page);
  await completeWizard(page, data);
}

/**
 * Complete entire menu item creation flow with provided data
 */
export async function createMenuItemFlow(page: Page, data: WizardStepData) {
  await startWizard(page);
  await selectCreationType(page, 'menu-item');

  if (data.basicInfo) {
    await fillBasicInfo(page, data.basicInfo);
  }

  if (data.ingredients) {
    await addIngredients(page, data.ingredients);
  } else {
    // Skip ingredients step
    await page.click('button:has-text("Nästa")');
  }

  await fillPreparation(page, data.preparation);
  await reviewCostCalculation(page);

  if (data.salesSettings) {
    await fillSalesSettings(page, data.salesSettings);
  } else {
    // Skip sales settings step
    await page.click('button:has-text("Nästa")');
  }

  await completeWizard(page, data);
}

/**
 * Verify wizard navigation and progress tracking
 */
export async function verifyWizardNavigation(page: Page) {
  // Check that navigation is visible
  const wizardNavigation = page.locator('.wizard-navigation');
  await expect(wizardNavigation).toBeVisible();

  // Check progress indicator
  const progressIndicator = page.locator('.wizard-progress, .progress-bar');
  await expect(progressIndicator).toBeVisible();

  // Check that current step is highlighted
  const currentStep = page.locator('.wizard-navigation .current-step, .wizard-navigation .active');
  await expect(currentStep).toBeVisible();
}

/**
 * Test wizard step navigation (back/forward)
 */
export async function testStepNavigation(page: Page) {
  // Test forward navigation
  await page.click('button:has-text("Nästa")');

  // Test backward navigation
  await page.click('button:has-text("Föregående"), button:has-text("Tillbaka")');

  // Test forward again
  await page.click('button:has-text("Nästa")');
}

/**
 * Mock API error responses for error testing
 */
export async function mockAPIError(page: Page, endpoint: string, errorCode: number = 500, errorMessage: string = 'Server error') {
  await page.route(`**${endpoint}*`, (route) => {
    route.fulfill({
      status: errorCode,
      contentType: 'application/json',
      body: JSON.stringify({
        error: errorMessage
      })
    });
  });
}

/**
 * Verify accessibility features of the wizard
 */
export async function verifyWizardAccessibility(page: Page) {
  // Check for main landmark
  await expect(page.locator('main[role="main"]')).toBeVisible();

  // Check for proper heading structure
  await expect(page.locator('h1')).toBeVisible();

  // Check for ARIA labels on buttons
  const nextButton = page.locator('button:has-text("Nästa")');
  if (await nextButton.isVisible()) {
    await expect(nextButton).toHaveAttribute('aria-label');
  }

  // Check form accessibility
  const nameInput = page.locator('[data-testid="recipe-name"], input[name="name"]');
  if (await nameInput.isVisible()) {
    await expect(nameInput).toHaveAttribute('aria-label');
  }
}

/**
 * Test keyboard navigation through the wizard
 */
export async function testKeyboardNavigation(page: Page) {
  // Use Tab to navigate through interactive elements
  await page.keyboard.press('Tab');

  // Use Enter to activate buttons
  await page.keyboard.press('Enter');

  // Use Arrow keys for selection if applicable
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
}

/**
 * Verify mobile responsiveness
 */
export async function verifyMobileLayout(page: Page) {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });

  // Verify wizard is still visible and usable
  await expect(page.locator('.recipe-menu-wizard')).toBeVisible();

  // Check that navigation adapts to mobile
  const wizardNavigation = page.locator('.wizard-navigation');
  await expect(wizardNavigation).toBeVisible();

  // Verify form inputs are touch-friendly
  const inputs = page.locator('input, textarea, select');
  const inputCount = await inputs.count();

  for (let i = 0; i < inputCount; i++) {
    const input = inputs.nth(i);
    if (await input.isVisible()) {
      // Check that inputs are large enough for touch
      const boundingBox = await input.boundingBox();
      if (boundingBox) {
        expect(boundingBox.height).toBeGreaterThan(30); // Minimum touch target size
      }
    }
  }
}

/**
 * Measure performance of wizard operations
 */
export async function measureWizardPerformance(page: Page) {
  const startTime = Date.now();

  await startWizard(page);

  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds

  return {
    loadTime,
    timestamp: new Date().toISOString()
  };
}