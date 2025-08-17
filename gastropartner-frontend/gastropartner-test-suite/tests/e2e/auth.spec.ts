import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form when not authenticated', async ({ page }) => {
    // Check if login form is visible
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should show validation error (this will depend on your actual implementation)
    await expect(page.locator('text=Invalid email')).toBeVisible({ timeout: 5000 });
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.click('button[type="submit"]');
    
    // Should show validation errors for required fields
    await expect(page.locator('text=required').first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to dashboard on successful login', async ({ page }) => {
    // Mock successful login response if needed
    await page.route('**/auth/v1/token*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          user: {
            id: 'mock-user-id',
            email: 'test@example.com'
          }
        })
      });
    });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard or main app
    await expect(page.url()).toContain('/dashboard');
  });

  test('should handle login errors gracefully', async ({ page }) => {
    // Mock failed login response
    await page.route('**/auth/v1/token*', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid credentials'
        })
      });
    });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 5000 });
  });
});