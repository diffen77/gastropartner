import { test, expect } from '@playwright/test';

test.describe('Recipe Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'mock-user-id', email: 'test@example.com' }
      }));
    });

    // Mock API responses
    await page.route('**/api/v1/recipes*', (route) => {
      const method = route.request().method();
      
      if (method === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              name: 'Test Recipe',
              description: 'A test recipe',
              instructions: 'Mix ingredients',
              prep_time: 15,
              cook_time: 30,
              servings: 4
            }
          ])
        });
      } else if (method === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 2,
            name: 'New Recipe',
            description: 'Newly created recipe',
            instructions: 'Follow steps',
            prep_time: 10,
            cook_time: 20,
            servings: 2
          })
        });
      }
    });

    await page.goto('/recipes');
  });

  test('should display recipe list', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Recipes');
    await expect(page.locator('text=Test Recipe')).toBeVisible();
  });

  test('should open create recipe form', async ({ page }) => {
    // Look for create/add button
    const createButton = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")').first();
    await createButton.click();

    // Check if form is displayed
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[name="name"], input[placeholder*="name"]')).toBeVisible();
  });

  test('should create a new recipe', async ({ page }) => {
    // Click create button
    const createButton = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")').first();
    await createButton.click();

    // Fill form
    await page.fill('input[name="name"], input[placeholder*="name"]', 'New Test Recipe');
    await page.fill('textarea[name="description"], textarea[placeholder*="description"]', 'Test description');
    await page.fill('textarea[name="instructions"], textarea[placeholder*="instructions"]', 'Test instructions');
    
    // Fill time fields if present
    const prepTimeField = page.locator('input[name="prep_time"], input[placeholder*="prep"]');
    if (await prepTimeField.isVisible()) {
      await prepTimeField.fill('15');
    }
    
    const cookTimeField = page.locator('input[name="cook_time"], input[placeholder*="cook"]');
    if (await cookTimeField.isVisible()) {
      await cookTimeField.fill('25');
    }

    // Submit form
    await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Create")');

    // Verify success (adjust based on your UI feedback)
    await expect(page.locator('text=created successfully, text=Recipe saved')).toBeVisible({ timeout: 5000 });
  });

  test('should validate required fields', async ({ page }) => {
    const createButton = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")').first();
    await createButton.click();

    // Try to submit empty form
    await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Create")');

    // Should show validation errors
    await expect(page.locator('text=required').first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/recipes*', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Recipe name already exists'
          })
        });
      }
    });

    const createButton = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")').first();
    await createButton.click();

    await page.fill('input[name="name"], input[placeholder*="name"]', 'Duplicate Recipe');
    await page.fill('textarea[name="description"], textarea[placeholder*="description"]', 'Test description');
    
    await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Create")');

    // Should show error message
    await expect(page.locator('text=already exists')).toBeVisible({ timeout: 5000 });
  });

  test('should search recipes', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="search"], input[type="search"]');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test Recipe');
      
      // Should filter results
      await expect(page.locator('text=Test Recipe')).toBeVisible();
    }
  });
});