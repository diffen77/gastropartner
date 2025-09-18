import { defineConfig } from '@playwright/test';

/**
 * Specialized test configuration for Recipe Menu Wizard E2E tests
 * Optimized for wizard workflow testing with extended timeouts and retries
 */
export default defineConfig({
  // Extend base configuration for wizard-specific needs
  timeout: 60000, // Extended timeout for multi-step wizard flows
  expect: {
    timeout: 10000 // Extended expect timeout for wizard step transitions
  },

  // Wizard tests benefit from sequential execution due to state dependencies
  fullyParallel: false,
  workers: 1,

  // Enhanced retry strategy for complex wizard flows
  retries: process.env.CI ? 3 : 1,

  use: {
    // Extended action timeout for wizard step transitions
    actionTimeout: 15000,

    // Enhanced tracing for wizard flow debugging
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Wizard-specific viewport testing
    viewport: { width: 1280, height: 1024 },

    // Slow down actions slightly for more stable wizard testing
    launchOptions: {
      slowMo: process.env.CI ? 0 : 100
    }
  },

  // Wizard-specific test projects
  projects: [
    {
      name: 'wizard-desktop-chrome',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 1024 }
      },
      testMatch: ['**/recipe-menu-wizard*.spec.ts']
    },
    {
      name: 'wizard-mobile-chrome',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 667 }
      },
      testMatch: ['**/recipe-menu-wizard-simplified.spec.ts']
    },
    {
      name: 'wizard-accessibility',
      use: {
        browserName: 'firefox',
        // Enable enhanced accessibility testing
        extraHTTPHeaders: {
          'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8'
        }
      },
      testMatch: ['**/recipe-menu-wizard.spec.ts']
    }
  ],

  // Custom reporters for wizard test results
  reporter: [
    ['list'],
    ['json', {
      outputFile: 'gastropartner-test-suite/reports/wizard-test-results.json'
    }],
    ['html', {
      outputFolder: 'gastropartner-test-suite/reports/wizard-report',
      open: 'never'
    }]
  ],

  // Global setup for wizard tests
  globalSetup: undefined, // Could add wizard-specific global setup if needed
  globalTeardown: undefined,

  // Test metadata for better reporting
  metadata: {
    testType: 'wizard-e2e',
    component: 'RecipeMenuWizard',
    version: '1.0.0'
  }
});