import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication to access protected routes
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'mock-user-id', email: 'test@example.com' }
      }));
    });
    
    await page.goto('/');
  });

  test('should display main navigation menu', async ({ page }) => {
    // Check if main navigation elements are present
    await expect(page.locator('nav')).toBeVisible();
    
    // Check for common navigation items (adjust based on your actual navigation)
    const navItems = ['Dashboard', 'Recipes', 'Ingredients', 'Menu Items'];
    
    for (const item of navItems) {
      await expect(page.locator(`text=${item}`)).toBeVisible();
    }
  });

  test('should navigate to recipes page', async ({ page }) => {
    await page.click('text=Recipes');
    await expect(page.url()).toContain('/recipes');
    await expect(page.locator('h1')).toContainText('Recipes');
  });

  test('should navigate to ingredients page', async ({ page }) => {
    await page.click('text=Ingredients');
    await expect(page.url()).toContain('/ingredients');
    await expect(page.locator('h1')).toContainText('Ingredients');
  });

  test('should navigate to menu items page', async ({ page }) => {
    await page.click('text=Menu Items');
    await expect(page.url()).toContain('/menu');
    await expect(page.locator('h1')).toContainText('Menu');
  });

  test('should handle responsive navigation on mobile', async ({ page, context }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // On mobile, navigation might be collapsed
    const mobileMenuButton = page.locator('[aria-label="Menu"]');
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
    }
    
    // Check that navigation items are accessible
    await expect(page.locator('text=Recipes')).toBeVisible();
  });

  test('should highlight current page in navigation', async ({ page }) => {
    await page.click('text=Recipes');
    
    // Check if the current page is highlighted (adjust selector based on your implementation)
    await expect(page.locator('nav a[href*="/recipes"]')).toHaveClass(/active|current/);
  });
});