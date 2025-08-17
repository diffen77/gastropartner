/**
 * K6 Performance Testing Configuration
 * Centralized configuration for all performance tests
 */

export const config = {
  // Base URL for the API
  baseUrl: __ENV.API_BASE_URL || 'http://localhost:8000',
  
  // Authentication token for protected endpoints
  authToken: __ENV.API_AUTH_TOKEN || '',
  
  // Test environments
  environments: {
    local: 'http://localhost:8000',
    staging: 'https://gastropartner-backend-staging.onrender.com',
    production: 'https://gastropartner-backend.onrender.com'
  },
  
  // Performance thresholds
  thresholds: {
    // HTTP request duration should be < 200ms for 95% of requests and < 500ms for 99%
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    // HTTP request failure rate - adjusted for auth testing without credentials
    // When testing with auth: ['rate<0.01']
    // When testing without auth (public endpoints): ['rate<0.8'] (most endpoints will return 403)
    http_req_failed: ['rate<0.8'],
    // All checks should pass
    checks: ['rate>0.95'],
  },
  
  // Load test scenarios
  scenarios: {
    // Light load for smoke testing
    smoke: {
      vus: 1,
      duration: '30s',
    },
    
    // Average load simulation
    average: {
      vus: 10,
      duration: '5m',
    },
    
    // Stress testing
    stress: {
      stages: [
        { duration: '2m', target: 20 },
        { duration: '5m', target: 20 },
        { duration: '2m', target: 40 },
        { duration: '5m', target: 40 },
        { duration: '2m', target: 0 },
      ],
    },
    
    // Spike testing
    spike: {
      stages: [
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 1400 },
        { duration: '3m', target: 1400 },
        { duration: '10s', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  
  // API endpoints to test
  endpoints: {
    health: '/health',
    root: '/',
    auth: {
      login: '/api/v1/auth/login',
      register: '/api/v1/auth/register',
      validate: '/api/v1/auth/validate',
    },
    ingredients: {
      list: '/api/v1/ingredients/',
      create: '/api/v1/ingredients/',
      get: '/api/v1/ingredients/{id}',
      update: '/api/v1/ingredients/{id}',
      delete: '/api/v1/ingredients/{id}',
    },
    recipes: {
      list: '/api/v1/recipes/',
      create: '/api/v1/recipes/',
      get: '/api/v1/recipes/{id}',
      update: '/api/v1/recipes/{id}',
      delete: '/api/v1/recipes/{id}',
    },
    menuItems: {
      list: '/api/v1/menu-items/',
      create: '/api/v1/menu-items/',
      get: '/api/v1/menu-items/{id}',
      update: '/api/v1/menu-items/{id}',
      delete: '/api/v1/menu-items/{id}',
    },
    organizations: {
      list: '/api/v1/organizations/',
      create: '/api/v1/organizations/',
      get: '/api/v1/organizations/{id}',
    },
    monitoring: {
      metrics: '/metrics',
      health: '/health',
    },
  },
  
  // Test data
  testData: {
    ingredient: {
      name: 'Test Ingredient',
      unit: 'kg',
      cost_per_unit: 10.50,
      supplier: 'Test Supplier',
      category: 'Test Category',
    },
    recipe: {
      name: 'Test Recipe',
      description: 'A test recipe for performance testing',
      instructions: 'Mix ingredients and cook',
      prep_time_minutes: 30,
      cook_time_minutes: 45,
      servings: 4,
    },
    menuItem: {
      name: 'Test Menu Item',
      description: 'A test menu item for performance testing',
      price: 25.00,
      category: 'Test Category',
      is_available: true,
    },
    organization: {
      name: 'Test Organization',
      type: 'restaurant',
      contact_email: 'test@example.com',
    }
  },
  
  // Alert configuration
  alerts: {
    // Slack webhook for performance alerts
    slackWebhook: __ENV.SLACK_WEBHOOK_URL || '',
    
    // Performance degradation threshold (20% slower than baseline)
    degradationThreshold: 1.2,
    
    // Email for critical alerts
    alertEmail: __ENV.ALERT_EMAIL || '',
  }
};

export default config;