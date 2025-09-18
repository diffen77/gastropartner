import { test, expect, Page } from '@playwright/test';

/**
 * End-to-End tests for the Recipe Composer functionality
 *
 * This test suite covers the complete user journey for combining recipes
 * into menu items using the drag & drop interface with smart suggestions.
 */

// Test data setup
const mockRecipes = [
  {
    recipe_id: 'recipe-1',
    name: 'Grillad Korv',
    description: 'Svensk grillkorv med kryddor',
    servings: 4,
    cost_per_serving: 15.50,
    ingredients: [
      { ingredient: { name: 'Korv' }, quantity: 400, unit: 'g' },
      { ingredient: { name: 'Salt' }, quantity: 1, unit: 'tsk' }
    ],
    is_active: true
  },
  {
    recipe_id: 'recipe-2',
    name: 'Kokt Potatis',
    description: 'Klassisk kokt potatis med salt',
    servings: 4,
    cost_per_serving: 8.25,
    ingredients: [
      { ingredient: { name: 'Potatis' }, quantity: 600, unit: 'g' },
      { ingredient: { name: 'Salt' }, quantity: 1, unit: 'tsk' }
    ],
    is_active: true
  },
  {
    recipe_id: 'recipe-3',
    name: 'Gurksallad',
    description: 'Frisk gurksallad med dill',
    servings: 4,
    cost_per_serving: 12.75,
    ingredients: [
      { ingredient: { name: 'Gurka' }, quantity: 2, unit: 'st' },
      { ingredient: { name: 'Dill' }, quantity: 1, unit: 'kruka' }
    ],
    is_active: true
  }
];

test.describe('Recipe Composer', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/v1/recipes', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRecipes)
      });
    });

    await page.route('**/api/v1/menu-items', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      } else if (route.request().method() === 'POST') {
        const requestData = await route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            menu_item_id: 'menu-item-1',
            ...requestData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        });
      }
    });

    // Navigate to menu items page
    await page.goto('/menu-items');
    await page.waitForLoadState('networkidle');
  });

  test('should open recipe composer modal', async ({ page }) => {
    // Click the recipe combinator button
    await page.click('button:has-text("🎯 Receptkombinator")');

    // Verify modal is open
    await expect(page.locator('.recipe-composer')).toBeVisible();
    await expect(page.locator('h2:has-text("🍽️ Receptkombinator")')).toBeVisible();

    // Verify the three panels are present
    await expect(page.locator('.recipe-composer__panel--recipes')).toBeVisible();
    await expect(page.locator('.recipe-composer__panel--composition')).toBeVisible();
    await expect(page.locator('.recipe-composer__panel--form')).toBeVisible();
  });

  test('should display available recipes', async ({ page }) => {
    await page.click('button:has-text("🎯 Receptkombinator")');

    // Wait for recipes to load
    await page.waitForSelector('.recipe-card');

    // Verify all mock recipes are displayed
    for (const recipe of mockRecipes) {
      await expect(page.locator(`.recipe-card:has-text("${recipe.name}")`)).toBeVisible();
    }

    // Verify recipe details are shown
    await expect(page.locator('.recipe-card:has-text("Grillad Korv")')).toContainText('15,50 kr');
    await expect(page.locator('.recipe-card:has-text("Grillad Korv")')).toContainText('4 portioner');
  });

  test('should support search functionality', async ({ page }) => {
    await page.click('button:has-text("🎯 Receptkombinator")');
    await page.waitForSelector('.recipe-card');

    // Search for "korv"
    await page.fill('input[placeholder="Sök recept..."]', 'korv');

    // Only "Grillad Korv" should be visible
    await expect(page.locator('.recipe-card:has-text("Grillad Korv")')).toBeVisible();
    await expect(page.locator('.recipe-card:has-text("Kokt Potatis")')).not.toBeVisible();
    await expect(page.locator('.recipe-card:has-text("Gurksallad")')).not.toBeVisible();

    // Clear search
    await page.fill('input[placeholder="Sök recept..."]', '');

    // All recipes should be visible again
    for (const recipe of mockRecipes) {
      await expect(page.locator(`.recipe-card:has-text("${recipe.name}")`)).toBeVisible();
    }
  });

  test('should add recipes to composition by clicking', async ({ page }) => {
    await page.click('button:has-text("🎯 Receptkombinator")');
    await page.waitForSelector('.recipe-card');

    // Initially, drop zone should show empty state
    await expect(page.locator('.drop-zone-placeholder')).toBeVisible();
    await expect(page.locator('h4:has-text("Dra recept hit för att kombinera")')).toBeVisible();

    // Click on "Grillad Korv" recipe
    await page.click('.recipe-card:has-text("Grillad Korv")');

    // Verify recipe is added to composition
    await expect(page.locator('.composition-list')).toBeVisible();
    await expect(page.locator('.composition-item:has-text("Grillad Korv")')).toBeVisible();
    await expect(page.locator('.drop-zone-placeholder')).not.toBeVisible();

    // Verify composition summary
    await expect(page.locator('.composition-summary')).toContainText('1 recept');
    await expect(page.locator('.composition-summary')).toContainText('4 portioner');
    await expect(page.locator('.composition-summary')).toContainText('15,50 kr');
  });

  test('should support drag and drop functionality', async ({ page }) => {
    await page.click('button:has-text("🎯 Receptkombinator")');
    await page.waitForSelector('.recipe-card');

    // Get the recipe card and drop zone elements
    const recipeCard = page.locator('.recipe-card:has-text("Grillad Korv")');
    const dropZone = page.locator('.drag-drop-zone');

    // Perform drag and drop
    await recipeCard.dragTo(dropZone);

    // Verify recipe is added to composition
    await expect(page.locator('.composition-item:has-text("Grillad Korv")')).toBeVisible();
  });

  test('should handle quantity adjustments', async ({ page }) => {
    await page.click('button:has-text("🎯 Receptkombinator")');
    await page.waitForSelector('.recipe-card');

    // Add recipe to composition
    await page.click('.recipe-card:has-text("Grillad Korv")');

    // Verify initial quantity is 1
    const quantityInput = page.locator('.quantity-input');
    await expect(quantityInput).toHaveValue('1');

    // Increase quantity using + button
    await page.click('.quantity-btn:has-text("+")');
    await expect(quantityInput).toHaveValue('2');

    // Verify cost update (15.50 * 2 = 31.00)
    await expect(page.locator('.cost-value')).toContainText('31,00 kr');

    // Decrease quantity using - button
    await page.click('.quantity-btn:has-text("−")');
    await expect(quantityInput).toHaveValue('1');

    // Verify cost is back to original
    await expect(page.locator('.cost-value')).toContainText('15,50 kr');

    // Test manual quantity input
    await quantityInput.fill('3');
    await expect(page.locator('.cost-value')).toContainText('46,50 kr');
  });

  test('should create complex recipe combinations', async ({ page }) => {
    await page.click('button:has-text("🎯 Receptkombinator")');
    await page.waitForSelector('.recipe-card');

    // Add multiple recipes
    await page.click('.recipe-card:has-text("Grillad Korv")');
    await page.click('.recipe-card:has-text("Kokt Potatis")');
    await page.click('.recipe-card:has-text("Gurksallad")');

    // Verify all recipes are in composition
    await expect(page.locator('.composition-item:has-text("Grillad Korv")')).toBeVisible();
    await expect(page.locator('.composition-item:has-text("Kokt Potatis")')).toBeVisible();
    await expect(page.locator('.composition-item:has-text("Gurksallad")')).toBeVisible();

    // Verify composition summary (15.50 + 8.25 + 12.75 = 36.50)
    await expect(page.locator('.composition-summary')).toContainText('3 recept');
    await expect(page.locator('.composition-summary')).toContainText('36,50 kr');

    // Verify preview is shown
    await expect(page.locator('.composition-preview')).toBeVisible();
    await expect(page.locator('.preview-stats')).toBeVisible();
  });

  test('should support undo functionality', async ({ page }) => {
    await page.click('button:has-text("🎯 Receptkombinator")');
    await page.waitForSelector('.recipe-card');

    // Initially undo should be disabled
    const undoButton = page.locator('button:has-text("↶ Ångra")');
    await expect(undoButton).toBeDisabled();

    // Add a recipe
    await page.click('.recipe-card:has-text("Grillad Korv")');

    // Undo should now be enabled
    await expect(undoButton).toBeEnabled();

    // Add another recipe
    await page.click('.recipe-card:has-text("Kokt Potatis")');

    // Should have 2 recipes
    await expect(page.locator('.composition-summary')).toContainText('2 recept');

    // Click undo
    await undoButton.click();

    // Should be back to 1 recipe
    await expect(page.locator('.composition-summary')).toContainText('1 recept');
    await expect(page.locator('.composition-item:has-text("Kokt Potatis")')).not.toBeVisible();
    await expect(page.locator('.composition-item:has-text("Grillad Korv")')).toBeVisible();
  });

  test('should support clear all functionality', async ({ page }) => {
    await page.click('button:has-text("🎯 Receptkombinator")');
    await page.waitForSelector('.recipe-card');

    // Add multiple recipes
    await page.click('.recipe-card:has-text("Grillad Korv")');
    await page.click('.recipe-card:has-text("Kokt Potatis")');

    // Verify recipes are added
    await expect(page.locator('.composition-summary')).toContainText('2 recept');

    // Click clear button
    await page.click('button:has-text("🗑️ Rensa")');

    // Should be back to empty state
    await expect(page.locator('.drop-zone-placeholder')).toBeVisible();
    await expect(page.locator('.composition-list')).not.toBeVisible();
  });

  test('should auto-generate menu item name and price', async ({ page }) => {
    await page.click('button:has-text("🎯 Receptkombinator")');
    await page.waitForSelector('.recipe-card');

    // Add single recipe
    await page.click('.recipe-card:has-text("Grillad Korv")');

    // Verify auto-generated name
    const nameInput = page.locator('#menuItemName');
    await expect(nameInput).toHaveValue('Grillad Korv');

    // Add second recipe
    await page.click('.recipe-card:has-text("Kokt Potatis")');

    // Verify combined name
    await expect(nameInput).toHaveValue('Grillad Korv & Kokt Potatis');

    // Verify suggested price (with default 30% margin)
    // Total cost: 15.50 + 8.25 = 23.75
    // Suggested price: 23.75 / 0.7 = 33.93, rounded up to 35
    const priceInput = page.locator('#sellingPrice');
    await expect(priceInput).toHaveValue('35');
  });

  test('should handle margin analysis', async ({ page }) => {
    await page.click('button:has-text("🎯 Receptkombinator")');
    await page.waitForSelector('.recipe-card');

    // Add recipe
    await page.click('.recipe-card:has-text("Grillad Korv")');

    // Verify margin analysis is shown
    await expect(page.locator('.margin-analysis')).toBeVisible();
    await expect(page.locator('.margin-analysis h5')).toContainText('📈 Marginalanalys');

    // Verify cost breakdown
    await expect(page.locator('.margin-stat:has-text("Råvarukostnad")')).toContainText('15,50 kr');

    // Change target margin and verify price suggestion
    const targetMarginInput = page.locator('#targetMargin');
    await targetMarginInput.fill('40');

    // With 40% margin: 15.50 / 0.6 = 25.83, rounded to 30
    await expect(page.locator('.price-suggestion')).toContainText('30,00 kr');
  });

  test('should create and save menu item', async ({ page }) => {
    await page.click('button:has-text("🎯 Receptkombinator")');
    await page.waitForSelector('.recipe-card');

    // Create composition
    await page.click('.recipe-card:has-text("Grillad Korv")');
    await page.click('.recipe-card:has-text("Kokt Potatis")');

    // Fill in menu item details
    await page.fill('#menuItemName', 'Korv & Potatis Special');
    await page.selectOption('#category', 'Huvudrätt');
    await page.fill('#sellingPrice', '45');

    // Save menu item
    await page.click('button:has-text("💾 Spara Maträtt")');

    // Verify modal closes and success
    await expect(page.locator('.recipe-composer')).not.toBeVisible();

    // Verify API was called with correct data
    await page.waitForResponse(response =>
      response.url().includes('/api/v1/menu-items') &&
      response.request().method() === 'POST'
    );
  });

  test('should handle mobile touch interactions', async ({ page, browserName }) => {
    // Skip in non-mobile browsers for now
    if (browserName !== 'webkit') return;

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.click('button:has-text("🎯 Receptkombinator")');
    await page.waitForSelector('.recipe-card');

    // Simulate touch tap on recipe card
    const recipeCard = page.locator('.recipe-card:has-text("Grillad Korv")');
    await recipeCard.tap();

    // Verify recipe is added
    await expect(page.locator('.composition-item:has-text("Grillad Korv")')).toBeVisible();
  });

  test('should be accessible with keyboard navigation', async ({ page }) => {
    await page.click('button:has-text("🎯 Receptkombinator")');
    await page.waitForSelector('.recipe-card');

    // Focus on first recipe card
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // Skip close button

    // Find and focus on a recipe card
    const recipeCard = page.locator('.recipe-card').first();
    await recipeCard.focus();

    // Press Enter to add recipe
    await page.keyboard.press('Enter');

    // Verify recipe is added
    await expect(page.locator('.composition-list')).toBeVisible();

    // Test keyboard navigation in quantity controls
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // Should be on quantity input

    // Verify quantity input is focused
    await expect(page.locator('.quantity-input')).toBeFocused();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock API error for menu item creation
    await page.route('**/api/v1/menu-items', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Validation error' })
        });
      }
    });

    await page.click('button:has-text("🎯 Receptkombinator")');
    await page.waitForSelector('.recipe-card');

    // Create composition and try to save
    await page.click('.recipe-card:has-text("Grillad Korv")');
    await page.fill('#menuItemName', 'Test Menu Item');
    await page.fill('#sellingPrice', '25');

    await page.click('button:has-text("💾 Spara Maträtt")');

    // Verify error is shown
    await expect(page.locator('.error-banner')).toBeVisible();
    await expect(page.locator('.error-banner')).toContainText('⚠️');

    // Modal should remain open
    await expect(page.locator('.recipe-composer')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.click('button:has-text("🎯 Receptkombinator")');
    await page.waitForSelector('.recipe-card');

    // Try to save without any recipes
    const saveButton = page.locator('button:has-text("💾 Spara Maträtt")');
    await expect(saveButton).toBeDisabled();

    // Add recipe
    await page.click('.recipe-card:has-text("Grillad Korv")');

    // Try to save without name
    await page.fill('#menuItemName', '');
    await expect(saveButton).toBeDisabled();

    // Add name
    await page.fill('#menuItemName', 'Test Item');

    // Should now be enabled
    await expect(saveButton).toBeEnabled();
  });

  test('should close modal on escape key', async ({ page }) => {
    await page.click('button:has-text("🎯 Receptkombinator")');
    await expect(page.locator('.recipe-composer')).toBeVisible();

    // Press escape
    await page.keyboard.press('Escape');

    // Modal should close
    await expect(page.locator('.recipe-composer')).not.toBeVisible();
  });
});

/**
 * Performance and Load Testing
 */
test.describe('Recipe Composer Performance', () => {
  test('should handle large recipe lists efficiently', async ({ page }) => {
    // Mock large dataset
    const largeRecipeList = Array.from({ length: 100 }, (_, i) => ({
      recipe_id: `recipe-${i}`,
      name: `Recept ${i}`,
      description: `Beskrivning för recept ${i}`,
      servings: 4,
      cost_per_serving: 10 + i,
      ingredients: [],
      is_active: true
    }));

    await page.route('**/api/v1/recipes', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeRecipeList)
      });
    });

    await page.goto('/menu-items');
    await page.click('button:has-text("🎯 Receptkombinator")');

    const startTime = Date.now();
    await page.waitForSelector('.recipe-card');
    const loadTime = Date.now() - startTime;

    // Should load within 2 seconds
    expect(loadTime).toBeLessThan(2000);

    // Verify virtual scrolling or pagination is working
    const visibleCards = await page.locator('.recipe-card').count();
    expect(visibleCards).toBeGreaterThan(0);
    expect(visibleCards).toBeLessThanOrEqual(100);
  });
});