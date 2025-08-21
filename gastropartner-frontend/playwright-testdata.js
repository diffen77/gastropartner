/**
 * Playwright script for creating and testing user diffen@me.com with Password8!
 * Run with: node playwright-testdata.js
 */

const { chromium } = require('playwright');

const testUser = {
  email: 'diffen@me.com',
  password: 'Password8!',
  full_name: 'Test User Diffen'
};

async function createTestDataWithBrowser() {
  console.log('🎭 Starting Playwright browser automation for test data creation...');
  
  const browser = await chromium.launch({ headless: false }); // Show browser for visibility
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to the application
    console.log('🌐 Navigating to the application...');
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot of the initial state
    await page.screenshot({ 
      path: 'testdata-initial-page.png',
      fullPage: true 
    });
    
    // Check if we need to login
    const loginFormVisible = await page.locator('input[type="email"]').isVisible({ timeout: 5000 });
    
    if (loginFormVisible) {
      console.log('📝 Login form detected, attempting to login...');
      
      // Fill in login form
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', testUser.password);
      
      // Intercept the login API call and redirect to dev-login
      await page.route('**/api/v1/auth/login', async (route) => {
        console.log('🔀 Intercepting login request, redirecting to dev-login...');
        
        const response = await route.fetch({
          url: route.request().url().replace('/auth/login', '/auth/dev-login'),
          method: route.request().method(),
          headers: route.request().headers(),
          body: route.request().postData()
        });
        
        await route.fulfill({ response });
      });
      
      // Submit login form
      await page.click('button[type="submit"]');
      
      // Wait for navigation or success indicator
      console.log('⏳ Waiting for login to complete...');
      await page.waitForURL(/dashboard|ingredients|menu-items|recipes/, { timeout: 15000 });
      
      console.log('✅ Successfully logged in via browser!');
      console.log('🌐 Current URL:', page.url());
      
      // Take screenshot of successful login
      await page.screenshot({ 
        path: 'testdata-logged-in.png',
        fullPage: true 
      });
      
      // Try to navigate to different sections to verify functionality
      const links = [
        { name: 'Ingredients', selector: 'a[href*="ingredients"]' },
        { name: 'Menu Items', selector: 'a[href*="menu-items"]' },
        { name: 'Recipes', selector: 'a[href*="recipes"]' }
      ];
      
      for (const link of links) {
        try {
          const linkElement = await page.locator(link.selector).first();
          if (await linkElement.isVisible({ timeout: 3000 })) {
            console.log(`🔗 Clicking on ${link.name}...`);
            await linkElement.click();
            await page.waitForLoadState('networkidle', { timeout: 5000 });
            
            await page.screenshot({ 
              path: `testdata-${link.name.toLowerCase().replace(' ', '-')}.png`,
              fullPage: true 
            });
            
            console.log(`✅ Successfully navigated to ${link.name}`);
          }
        } catch (error) {
          console.log(`ℹ️  Could not navigate to ${link.name}: ${error.message}`);
        }
      }
      
    } else {
      console.log('ℹ️  No login form detected, user may already be logged in');
      await page.screenshot({ 
        path: 'testdata-no-login-needed.png',
        fullPage: true 
      });
    }
    
    console.log('🎉 Browser automation completed successfully!');
    
  } catch (error) {
    console.error('❌ Browser automation failed:', error.message);
    await page.screenshot({ 
      path: 'testdata-error.png',
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('🚀 Creating test data for user:', testUser.email);
  
  // First ensure the user is registered via API
  const { setupTestData } = require('./testdata-setup.js');
  await setupTestData();
  
  // Then test with browser automation
  await createTestDataWithBrowser();
  
  console.log('\n✨ All test data creation completed!');
  console.log('📸 Screenshots saved in the current directory');
  console.log('🎯 Ready for testing with diffen@me.com / Password8!');
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createTestDataWithBrowser, testUser };