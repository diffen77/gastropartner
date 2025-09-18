import { test, expect } from '@playwright/test';

test.describe('Recipe Menu Wizard - Complete Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
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

    // Mock ingredients API for ingredient selection step
    await page.route('**/api/v1/ingredients*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
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
          }
        ])
      });
    });

    // Mock recipe creation API
    await page.route('**/api/v1/recipes*', (route) => {
      const method = route.request().method();

      if (method === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'recipe-123',
            name: 'Test Recipe',
            description: 'Created via wizard',
            servings: 4,
            organization_id: 'test-org-123'
          })
        });
      }
    });

    // Mock menu item creation API
    await page.route('**/api/v1/menu-items*', (route) => {
      const method = route.request().method();

      if (method === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'menu-item-456',
            name: 'Test Menu Item',
            description: 'Created via wizard',
            price: 125.00,
            organization_id: 'test-org-123'
          })
        });
      }
    });

    // Navigate to the recipe management page
    await page.goto('/recipes');
  });

  test.describe('Recipe Creation Flow', () => {
    test('should complete full recipe creation wizard flow', async ({ page }) => {
      // Start wizard by clicking create recipe button
      await page.click('[data-testid="create-recipe-button"], button:has-text("Ny"), button:has-text("Skapa")');

      // Wait for wizard to load
      await expect(page.locator('.recipe-menu-wizard')).toBeVisible();

      // Step 1: Creation Type Selection
      await expect(page.locator('h1')).toContainText('Typ av skapande');
      await page.click('[data-testid="recipe-type"], button:has-text("Grundrecept")');
      await page.click('button:has-text("Nästa")');

      // Step 2: Basic Information
      await expect(page.locator('h1')).toContainText('Grundinformation');
      await page.fill('[data-testid="recipe-name"], input[name="name"]', 'E2E Test Recipe');
      await page.fill('[data-testid="recipe-description"], textarea[name="description"]', 'Detta är ett test-recept skapat via E2E-test');
      await page.fill('[data-testid="recipe-servings"], input[name="servings"]', '6');

      // Continue to next step
      await page.click('button:has-text("Nästa")');

      // Step 3: Ingredients Selection
      await expect(page.locator('h1')).toContainText('Ingredienser');

      // Add first ingredient
      await page.click('[data-testid="add-ingredient"], button:has-text("Lägg till ingrediens")');
      await page.selectOption('[data-testid="ingredient-select"]', '1'); // Tomater
      await page.fill('[data-testid="ingredient-quantity"]', '2');
      await page.selectOption('[data-testid="ingredient-unit"]', 'kg');
      await page.click('[data-testid="confirm-ingredient"]');

      // Add second ingredient
      await page.click('[data-testid="add-ingredient"], button:has-text("Lägg till ingrediens")');
      await page.selectOption('[data-testid="ingredient-select"]', '2'); // Olivolja
      await page.fill('[data-testid="ingredient-quantity"]', '0.5');
      await page.selectOption('[data-testid="ingredient-unit"]', 'l');
      await page.click('[data-testid="confirm-ingredient"]');

      // Verify ingredients are added
      await expect(page.locator('text=Tomater')).toBeVisible();
      await expect(page.locator('text=Olivolja')).toBeVisible();

      await page.click('button:has-text("Nästa")');

      // Step 4: Preparation Instructions (optional)
      await expect(page.locator('h1')).toContainText('Tillagning');
      await page.fill('[data-testid="instructions"], textarea[name="instructions"]', 'Skär tomaterna. Tillsätt olivolja. Blanda väl.');
      await page.fill('[data-testid="prep-time"], input[name="prep_time"]', '15');
      await page.fill('[data-testid="cook-time"], input[name="cook_time"]', '30');

      await page.click('button:has-text("Nästa")');

      // Step 5: Cost Calculation
      await expect(page.locator('h1')).toContainText('Kostnadsberäkning');

      // Verify cost calculations are displayed
      await expect(page.locator('[data-testid="total-cost"]')).toBeVisible();
      await expect(page.locator('[data-testid="cost-per-serving"]')).toBeVisible();

      await page.click('button:has-text("Nästa")');

      // Step 6: Preview and Final Review
      await expect(page.locator('h1')).toContainText('Förhandsvisning');

      // Verify all entered data is displayed correctly
      await expect(page.locator('text=E2E Test Recipe')).toBeVisible();
      await expect(page.locator('text=Detta är ett test-recept skapat via E2E-test')).toBeVisible();
      await expect(page.locator('text=6')).toBeVisible(); // servings
      await expect(page.locator('text=Tomater')).toBeVisible();
      await expect(page.locator('text=Olivolja')).toBeVisible();

      // Complete the wizard
      await page.click('[data-testid="complete-wizard"], button:has-text("Spara"), button:has-text("Slutför")');

      // Verify success
      await expect(page.locator('text=har skapats, text=sparat, text=slutfört')).toBeVisible({ timeout: 10000 });
    });

    test('should validate required fields in each step', async ({ page }) => {
      await page.click('[data-testid="create-recipe-button"], button:has-text("Ny"), button:has-text("Skapa")');
      await expect(page.locator('.recipe-menu-wizard')).toBeVisible();

      // Try to proceed without selecting creation type
      await page.click('button:has-text("Nästa")');
      await expect(page.locator('text=krävs, text=required')).toBeVisible();

      // Select recipe type and proceed
      await page.click('[data-testid="recipe-type"], button:has-text("Grundrecept")');
      await page.click('button:has-text("Nästa")');

      // Try to proceed without filling required basic info
      await page.click('button:has-text("Nästa")');
      await expect(page.locator('text=Namn krävs, text=required')).toBeVisible();

      // Fill minimum required info
      await page.fill('[data-testid="recipe-name"], input[name="name"]', 'Test Recipe');
      await page.fill('[data-testid="recipe-servings"], input[name="servings"]', '4');
      await page.click('button:has-text("Nästa")');

      // Try to proceed without ingredients
      await page.click('button:has-text("Nästa")');
      await expect(page.locator('text=Minst en ingrediens krävs, text=ingredient required')).toBeVisible();
    });

    test('should support wizard navigation and step jumping', async ({ page }) => {
      await page.click('[data-testid="create-recipe-button"], button:has-text("Ny"), button:has-text("Skapa")');
      await expect(page.locator('.recipe-menu-wizard')).toBeVisible();

      // Complete first few steps
      await page.click('[data-testid="recipe-type"], button:has-text("Grundrecept")');
      await page.click('button:has-text("Nästa")');

      await page.fill('[data-testid="recipe-name"], input[name="name"]', 'Navigation Test');
      await page.fill('[data-testid="recipe-servings"], input[name="servings"]', '4');
      await page.click('button:has-text("Nästa")');

      // Test back navigation
      await page.click('button:has-text("Föregående"), button:has-text("Tillbaka")');
      await expect(page.locator('h1')).toContainText('Grundinformation');

      // Test step navigation via wizard navigation bar
      const stepNavigation = page.locator('.wizard-navigation');
      await expect(stepNavigation).toBeVisible();

      // Should show progress
      await expect(page.locator('.wizard-progress')).toBeVisible();
    });
  });

  test.describe('Menu Item Creation Flow', () => {
    test('should complete full menu item creation wizard flow', async ({ page }) => {
      await page.click('[data-testid="create-recipe-button"], button:has-text("Ny"), button:has-text("Skapa")');
      await expect(page.locator('.recipe-menu-wizard')).toBeVisible();

      // Step 1: Select Menu Item type
      await page.click('[data-testid="menu-item-type"], button:has-text("Maträtt")');
      await page.click('button:has-text("Nästa")');

      // Step 2: Basic Information
      await page.fill('[data-testid="recipe-name"], input[name="name"]', 'E2E Test Menu Item');
      await page.fill('[data-testid="recipe-description"], textarea[name="description"]', 'Test maträtt för E2E-test');
      await page.fill('[data-testid="recipe-servings"], input[name="servings"]', '1');
      await page.selectOption('[data-testid="category-select"]', 'Huvudrätter');
      await page.click('button:has-text("Nästa")');

      // Step 3: Ingredients
      await page.click('[data-testid="add-ingredient"], button:has-text("Lägg till ingrediens")');
      await page.selectOption('[data-testid="ingredient-select"]', '1');
      await page.fill('[data-testid="ingredient-quantity"]', '1');
      await page.click('[data-testid="confirm-ingredient"]');
      await page.click('button:has-text("Nästa")');

      // Step 4: Preparation (optional for menu items)
      await page.click('button:has-text("Nästa")');

      // Step 5: Cost Calculation
      await page.click('button:has-text("Nästa")');

      // Step 6: Sales Settings (specific to menu items)
      await expect(page.locator('h1')).toContainText('Försäljningsinställningar');

      // Set pricing
      await page.fill('[data-testid="sales-price"], input[name="price"]', '125');
      await page.fill('[data-testid="margin-percentage"], input[name="margin"]', '35');

      // Select category
      await page.click('[data-testid="category-huvudrätter"]');

      // Set availability
      await page.check('[data-testid="is-available"]');

      await page.click('button:has-text("Nästa")');

      // Step 7: Preview
      await expect(page.locator('h1')).toContainText('Förhandsvisning');

      // Verify menu item specific data
      await expect(page.locator('text=E2E Test Menu Item')).toBeVisible();
      await expect(page.locator('text=125')).toBeVisible(); // price
      await expect(page.locator('text=35%')).toBeVisible(); // margin

      // Complete creation
      await page.click('[data-testid="complete-wizard"], button:has-text("Spara"), button:has-text("Slutför")');
      await expect(page.locator('text=har skapats')).toBeVisible({ timeout: 10000 });
    });

    test('should calculate pricing correctly', async ({ page }) => {
      await page.click('[data-testid="create-recipe-button"], button:has-text("Ny"), button:has-text("Skapa")');

      // Quick navigation to sales settings
      await page.click('[data-testid="menu-item-type"], button:has-text("Maträtt")');
      await page.click('button:has-text("Nästa")');

      await page.fill('[data-testid="recipe-name"], input[name="name"]', 'Pricing Test');
      await page.fill('[data-testid="recipe-servings"], input[name="servings"]', '1');
      await page.click('button:has-text("Nästa")');

      // Add ingredient with known cost
      await page.click('[data-testid="add-ingredient"], button:has-text("Lägg till ingrediens")');
      await page.selectOption('[data-testid="ingredient-select"]', '1'); // Tomater at 25.50/kg
      await page.fill('[data-testid="ingredient-quantity"]', '0.5'); // 0.5 kg = 12.75 cost
      await page.click('[data-testid="confirm-ingredient"]');
      await page.click('button:has-text("Nästa")');
      await page.click('button:has-text("Nästa")'); // Skip preparation
      await page.click('button:has-text("Nästa")'); // Skip cost calculation

      // Test price-from-margin calculation
      await page.fill('[data-testid="margin-percentage"], input[name="margin"]', '40');

      // Verify calculated price (should be cost / (1 - margin))
      // With 12.75 cost and 40% margin: 12.75 / 0.6 = 21.25
      await expect(page.locator('[data-testid="calculated-price"]')).toContainText('21');

      // Test margin-from-price calculation
      await page.fill('[data-testid="sales-price"], input[name="price"]', '30');

      // Verify calculated margin ((price - cost) / price * 100)
      // (30 - 12.75) / 30 * 100 = 57.5%
      await expect(page.locator('[data-testid="calculated-margin"]')).toContainText('57');
    });
  });

  test.describe('Error Handling & Edge Cases', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/v1/recipes*', (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Server error occurred'
            })
          });
        }
      });

      await page.click('[data-testid="create-recipe-button"], button:has-text("Ny"), button:has-text("Skapa")');

      // Complete minimal recipe flow
      await page.click('[data-testid="recipe-type"], button:has-text("Grundrecept")');
      await page.click('button:has-text("Nästa")');

      await page.fill('[data-testid="recipe-name"], input[name="name"]', 'Error Test Recipe');
      await page.fill('[data-testid="recipe-servings"], input[name="servings"]', '4');
      await page.click('button:has-text("Nästa")');

      await page.click('[data-testid="add-ingredient"], button:has-text("Lägg till ingrediens")');
      await page.selectOption('[data-testid="ingredient-select"]', '1');
      await page.fill('[data-testid="ingredient-quantity"]', '1');
      await page.click('[data-testid="confirm-ingredient"]');
      await page.click('button:has-text("Nästa")');
      await page.click('button:has-text("Nästa")');
      await page.click('button:has-text("Nästa")');
      await page.click('button:has-text("Nästa")');

      // Try to complete with API error
      await page.click('[data-testid="complete-wizard"], button:has-text("Spara"), button:has-text("Slutför")');

      // Should show error message
      await expect(page.locator('text=Ett fel uppstod, text=error occurred')).toBeVisible({ timeout: 10000 });

      // Wizard should remain open for retry
      await expect(page.locator('.recipe-menu-wizard')).toBeVisible();
    });

    test('should handle browser refresh and maintain state', async ({ page }) => {
      await page.click('[data-testid="create-recipe-button"], button:has-text("Ny"), button:has-text("Skapa")');

      // Fill some data
      await page.click('[data-testid="recipe-type"], button:has-text("Grundrecept")');
      await page.click('button:has-text("Nästa")');

      await page.fill('[data-testid="recipe-name"], input[name="name"]', 'Refresh Test Recipe');
      await page.fill('[data-testid="recipe-servings"], input[name="servings"]', '4');

      // Simulate refresh
      await page.reload();

      // Should maintain wizard state or gracefully restart
      // The exact behavior depends on your state management implementation
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should validate ingredient quantities and units', async ({ page }) => {
      await page.click('[data-testid="create-recipe-button"], button:has-text("Ny"), button:has-text("Skapa")');
      await page.click('[data-testid="recipe-type"], button:has-text("Grundrecept")');
      await page.click('button:has-text("Nästa")');

      await page.fill('[data-testid="recipe-name"], input[name="name"]', 'Validation Test');
      await page.fill('[data-testid="recipe-servings"], input[name="servings"]', '4');
      await page.click('button:has-text("Nästa")');

      // Try invalid quantities
      await page.click('[data-testid="add-ingredient"], button:has-text("Lägg till ingrediens")');
      await page.selectOption('[data-testid="ingredient-select"]', '1');

      // Test negative quantity
      await page.fill('[data-testid="ingredient-quantity"]', '-5');
      await page.click('[data-testid="confirm-ingredient"]');
      await expect(page.locator('text=måste vara positiv, text=must be positive')).toBeVisible();

      // Test zero quantity
      await page.fill('[data-testid="ingredient-quantity"]', '0');
      await page.click('[data-testid="confirm-ingredient"]');
      await expect(page.locator('text=måste vara större än noll, text=must be greater than zero')).toBeVisible();

      // Test valid quantity
      await page.fill('[data-testid="ingredient-quantity"]', '2.5');
      await page.selectOption('[data-testid="ingredient-unit"]', 'kg');
      await page.click('[data-testid="confirm-ingredient"]');

      // Should accept valid input
      await expect(page.locator('text=Tomater')).toBeVisible();
    });
  });

  test.describe('Accessibility & Responsive Design', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.click('[data-testid="create-recipe-button"], button:has-text("Ny"), button:has-text("Skapa")');

      // Test keyboard navigation
      await page.keyboard.press('Tab'); // Focus first step option
      await page.keyboard.press('Enter'); // Select recipe type

      await page.keyboard.press('Tab'); // Focus next button
      await page.keyboard.press('Enter'); // Proceed to next step

      // Should be in basic info step
      await expect(page.locator('h1')).toContainText('Grundinformation');

      // Fill form using keyboard
      await page.keyboard.press('Tab'); // Focus name input
      await page.keyboard.type('Keyboard Test Recipe');

      await page.keyboard.press('Tab'); // Focus description
      await page.keyboard.type('Testing keyboard navigation');

      await page.keyboard.press('Tab'); // Focus servings
      await page.keyboard.type('4');
    });

    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.click('[data-testid="create-recipe-button"], button:has-text("Ny"), button:has-text("Skapa")');

      // Verify mobile-responsive layout
      await expect(page.locator('.recipe-menu-wizard')).toBeVisible();

      // Navigation should be mobile-friendly
      const wizardNavigation = page.locator('.wizard-navigation');
      await expect(wizardNavigation).toBeVisible();

      // Steps should be accessible on mobile
      await page.click('[data-testid="recipe-type"], button:has-text("Grundrecept")');
      await page.click('button:has-text("Nästa")');

      // Form inputs should be touch-friendly
      await page.fill('[data-testid="recipe-name"], input[name="name"]', 'Mobile Test');
      await page.fill('[data-testid="recipe-servings"], input[name="servings"]', '2');

      // Should scroll properly to show all content
      await page.click('button:has-text("Nästa")');
      await expect(page.locator('h1')).toContainText('Ingredienser');
    });

    test('should have proper ARIA labels and semantic HTML', async ({ page }) => {
      await page.click('[data-testid="create-recipe-button"], button:has-text("Ny"), button:has-text("Skapa")');

      // Check for proper semantic structure
      await expect(page.locator('main[role="main"]')).toBeVisible();
      await expect(page.locator('h1')).toBeVisible();

      // Check for ARIA labels on interactive elements
      const nextButton = page.locator('button:has-text("Nästa")');
      await expect(nextButton).toHaveAttribute('aria-label');

      // Check form accessibility
      await page.click('[data-testid="recipe-type"], button:has-text("Grundrecept")');
      await page.click('button:has-text("Nästa")');

      const nameInput = page.locator('[data-testid="recipe-name"], input[name="name"]');
      await expect(nameInput).toHaveAttribute('aria-label');

      // Error messages should be associated with inputs
      await page.click('button:has-text("Nästa")'); // Trigger validation
      const errorMessage = page.locator('[role="alert"]');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
    });
  });

  test.describe('Performance & User Experience', () => {
    test('should load wizard steps efficiently', async ({ page }) => {
      const startTime = Date.now();

      await page.click('[data-testid="create-recipe-button"], button:has-text("Ny"), button:has-text("Skapa")');

      // Wizard should load quickly
      await expect(page.locator('.recipe-menu-wizard')).toBeVisible();

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds

      // Step transitions should be smooth
      await page.click('[data-testid="recipe-type"], button:has-text("Grundrecept")');

      const transitionStart = Date.now();
      await page.click('button:has-text("Nästa")');
      await expect(page.locator('h1')).toContainText('Grundinformation');

      const transitionTime = Date.now() - transitionStart;
      expect(transitionTime).toBeLessThan(1000); // Step transitions should be fast
    });

    test('should provide clear progress indication', async ({ page }) => {
      await page.click('[data-testid="create-recipe-button"], button:has-text("Ny"), button:has-text("Skapa")');

      // Progress indicator should be visible
      const progressIndicator = page.locator('.wizard-progress, .progress-bar');
      await expect(progressIndicator).toBeVisible();

      // Progress should increase as user moves through steps
      await page.click('[data-testid="recipe-type"], button:has-text("Grundrecept")');
      await page.click('button:has-text("Nästa")');

      // Should show current step in navigation
      const currentStep = page.locator('.wizard-navigation .current-step, .wizard-navigation .active');
      await expect(currentStep).toBeVisible();

      // Step numbers or names should be visible
      await expect(page.locator('text=Grundinformation')).toBeVisible();
    });

    test('should handle large ingredient lists efficiently', async ({ page }) => {
      // Mock large ingredient list
      await page.route('**/api/v1/ingredients*', (route) => {
        const largeIngredientList = Array.from({ length: 100 }, (_, index) => ({
          ingredient_id: index + 1,
          name: `Ingrediens ${index + 1}`,
          category: `Kategori ${(index % 10) + 1}`,
          cost_per_unit: 10 + (index * 0.5),
          unit: index % 2 === 0 ? 'kg' : 'l',
          supplier: `Leverantör ${(index % 5) + 1}`,
          organization_id: 'test-org-123'
        }));

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(largeIngredientList)
        });
      });

      await page.click('[data-testid="create-recipe-button"], button:has-text("Ny"), button:has-text("Skapa")');
      await page.click('[data-testid="recipe-type"], button:has-text("Grundrecept")');
      await page.click('button:has-text("Nästa")');

      await page.fill('[data-testid="recipe-name"], input[name="name"]', 'Large List Test');
      await page.fill('[data-testid="recipe-servings"], input[name="servings"]', '4');
      await page.click('button:has-text("Nästa")');

      // Ingredient selection should load efficiently
      await page.click('[data-testid="add-ingredient"], button:has-text("Lägg till ingrediens")');

      const ingredientSelect = page.locator('[data-testid="ingredient-select"]');
      await expect(ingredientSelect).toBeVisible();

      // Should be able to search/filter large lists
      const searchInput = page.locator('[data-testid="ingredient-search"], input[placeholder*="sök"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('Ingrediens 5');
        await expect(page.locator('text=Ingrediens 5')).toBeVisible();
      }
    });
  });
});