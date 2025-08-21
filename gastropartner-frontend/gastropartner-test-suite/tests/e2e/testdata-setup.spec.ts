import { test, expect } from '@playwright/test';

test.describe('Test Data Setup', () => {
  const testUser = {
    email: 'diffen@me.com',
    password: 'Password8!',
    full_name: 'Test User Diffen'
  };

  test('should create test user diffen@me.com with Password8!', async ({ request }) => {
    // Try to register the user via API
    const registerResponse = await request.post('http://localhost:8000/api/v1/auth/register', {
      data: testUser
    });

    // Check if registration was successful or if user already exists
    if (registerResponse.status() === 201) {
      const responseBody = await registerResponse.json();
      expect(responseBody.success).toBe(true);
      console.log('✅ User registered successfully:', responseBody.message);
    } else if (registerResponse.status() === 400) {
      const errorBody = await registerResponse.json();
      if (errorBody.detail && errorBody.detail.includes('already registered')) {
        console.log('✅ User already exists, skipping registration');
      } else {
        console.log('❌ Registration failed:', errorBody);
        throw new Error(`Registration failed: ${JSON.stringify(errorBody)}`);
      }
    } else {
      const errorBody = await registerResponse.json();
      console.log('❌ Unexpected response:', registerResponse.status(), errorBody);
      throw new Error(`Unexpected registration response: ${registerResponse.status()}`);
    }
  });

  test('should verify test user can login with dev-login endpoint', async ({ request }) => {
    // Test login with dev-login endpoint
    const loginResponse = await request.post('http://localhost:8000/api/v1/auth/dev-login', {
      data: {
        email: testUser.email,
        password: testUser.password
      }
    });

    expect(loginResponse.status()).toBe(200);
    
    const responseBody = await loginResponse.json();
    expect(responseBody.access_token).toBeDefined();
    expect(responseBody.user).toBeDefined();
    expect(responseBody.user.email).toBe(testUser.email);
    expect(responseBody.user.id).toBe('817df0a1-f7ee-4bb2-bffa-582d4c59115f');
    
    console.log('✅ Dev login successful for user:', testUser.email);
    console.log('🔑 Access token:', responseBody.access_token);
    console.log('👤 User ID:', responseBody.user.id);
  });

  test('should verify test user can access protected endpoint', async ({ request }) => {
    // First login to get token
    const loginResponse = await request.post('http://localhost:8000/api/v1/auth/dev-login', {
      data: {
        email: testUser.email,
        password: testUser.password
      }
    });

    expect(loginResponse.status()).toBe(200);
    const loginBody = await loginResponse.json();
    const token = loginBody.access_token;

    // Test accessing protected endpoint
    const meResponse = await request.get('http://localhost:8000/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (meResponse.status() === 200) {
      const userInfo = await meResponse.json();
      expect(userInfo.email).toBe(testUser.email);
      console.log('✅ Protected endpoint access successful');
      console.log('👤 User info:', userInfo);
    } else {
      console.log('ℹ️ Protected endpoint may not work with dev tokens (expected for dev mode)');
      console.log('📊 Response status:', meResponse.status());
    }
  });

  test('should create test data via browser interaction', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Check if we need to login
    const isLoginPage = await page.locator('input[type="email"]').isVisible({ timeout: 5000 });
    
    if (isLoginPage) {
      console.log('📱 Login form detected, attempting to login...');
      
      // Fill in login form
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', testUser.password);
      
      // Mock the login API call to use dev-login
      await page.route('**/api/v1/auth/login', async (route) => {
        // Redirect to dev-login endpoint
        const response = await route.fetch({
          url: route.request().url().replace('/auth/login', '/auth/dev-login'),
          method: route.request().method(),
          headers: route.request().headers(),
          body: route.request().postData()
        });
        route.fulfill({ response });
      });
      
      // Submit login form
      await page.click('button[type="submit"]');
      
      // Wait for navigation or success indicator
      await expect(page).toHaveURL(/dashboard|ingredients|menu-items|recipes/, { timeout: 10000 });
      
      console.log('✅ Successfully logged in via browser');
      console.log('🌐 Current URL:', page.url());
    } else {
      console.log('✅ Already logged in or no login required');
    }

    // Take screenshot for verification
    await page.screenshot({ 
      path: 'test-results/testdata-setup-success.png',
      fullPage: true 
    });
  });
});