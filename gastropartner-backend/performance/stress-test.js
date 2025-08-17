/**
 * Stress Test for GastroPartner API
 * Tests API endpoints under high load to identify breaking points
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';
import { config } from './config.js';
import { createHeaders, validateResponse, generateTestData, sendAlert } from './utils.js';

// Custom metrics for stress testing
const errorRate = new Rate('stress_error_rate');
const responseTime = new Trend('stress_response_time');

// Test configuration
export const options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 10 },   // Ramp up to 10 users
        { duration: '3m', target: 10 },   // Stay at 10 users
        { duration: '2m', target: 20 },   // Ramp up to 20 users
        { duration: '3m', target: 20 },   // Stay at 20 users
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 100 },  // Spike to 100 users
        { duration: '2m', target: 100 },  // Stay at 100 users
        { duration: '3m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    // Relaxed thresholds for stress testing
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'], // Allow up to 5% error rate
    stress_error_rate: ['rate<0.1'], // Custom error rate threshold
    checks: ['rate>0.8'], // Lower check success rate for stress test
  },
};

const baseUrl = config.baseUrl;
const headers = createHeaders(config.authToken);

export function setup() {
  console.log(`Starting stress test against: ${baseUrl}`);
  
  // Health check
  const healthResponse = http.get(`${baseUrl}/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`Health check failed before stress test: ${healthResponse.status}`);
  }
  
  console.log('Starting stress test with ramping load...');
  return { baseUrl, headers };
}

export default function(data) {
  const { baseUrl, headers } = data;
  const currentVUs = __VU;
  const currentStage = getCurrentStage();
  
  // Adjust test intensity based on current load
  if (currentVUs <= 10) {
    runLightLoad(baseUrl, headers);
  } else if (currentVUs <= 20) {
    runMediumLoad(baseUrl, headers);
  } else if (currentVUs <= 50) {
    runHeavyLoad(baseUrl, headers);
  } else {
    runExtremeLoad(baseUrl, headers);
  }
  
  // Monitor for performance degradation
  checkPerformanceDegradation();
}

/**
 * Light load testing (1-10 VUs)
 */
function runLightLoad(baseUrl, headers) {
  // Health check
  const healthResponse = http.get(`${baseUrl}/health`);
  recordMetrics(healthResponse, 'health');
  
  // Basic CRUD operations
  testIngredientsFlow(baseUrl, headers);
  sleep(1);
}

/**
 * Medium load testing (11-20 VUs)
 */
function runMediumLoad(baseUrl, headers) {
  // Mix of operations
  const operations = [
    () => testIngredientsFlow(baseUrl, headers),
    () => testRecipesFlow(baseUrl, headers),
    () => testMenuItemsFlow(baseUrl, headers),
  ];
  
  // Random operation selection
  const operation = operations[Math.floor(Math.random() * operations.length)];
  operation();
  
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5s think time
}

/**
 * Heavy load testing (21-50 VUs)
 */
function runHeavyLoad(baseUrl, headers) {
  // Concurrent operations with shorter think times
  const batchSize = Math.floor(Math.random() * 3) + 1; // 1-3 operations
  
  for (let i = 0; i < batchSize; i++) {
    if (Math.random() < 0.4) {
      testIngredientsFlow(baseUrl, headers);
    } else if (Math.random() < 0.7) {
      testRecipesFlow(baseUrl, headers);
    } else {
      testMenuItemsFlow(baseUrl, headers);
    }
    
    if (i < batchSize - 1) {
      sleep(0.2); // Short pause between operations
    }
  }
  
  sleep(Math.random() * 1 + 0.2); // 0.2-1.2s think time
}

/**
 * Extreme load testing (51+ VUs)
 */
function runExtremeLoad(baseUrl, headers) {
  // Rapid-fire requests with minimal think time
  const rapidOperations = [
    () => quickHealthCheck(baseUrl),
    () => quickIngredientsList(baseUrl, headers),
    () => quickRecipesList(baseUrl, headers),
    () => quickMenuItemsList(baseUrl, headers),
  ];
  
  // Execute multiple rapid operations
  for (let i = 0; i < 3; i++) {
    const operation = rapidOperations[Math.floor(Math.random() * rapidOperations.length)];
    operation();
    sleep(0.1); // Minimal think time
  }
  
  sleep(Math.random() * 0.5 + 0.1); // 0.1-0.6s think time
}

/**
 * Quick health check
 */
function quickHealthCheck(baseUrl) {
  const response = http.get(`${baseUrl}/health`, { timeout: '5s' });
  recordMetrics(response, 'health_quick');
  return response.status === 200;
}

/**
 * Quick ingredients list
 */
function quickIngredientsList(baseUrl, headers) {
  const response = http.get(`${baseUrl}/api/v1/ingredients/`, { 
    headers, 
    timeout: '10s' 
  });
  recordMetrics(response, 'ingredients_list_quick');
  return response.status === 200;
}

/**
 * Quick recipes list
 */
function quickRecipesList(baseUrl, headers) {
  const response = http.get(`${baseUrl}/api/v1/recipes/`, { 
    headers, 
    timeout: '10s' 
  });
  recordMetrics(response, 'recipes_list_quick');
  return response.status === 200;
}

/**
 * Quick menu items list
 */
function quickMenuItemsList(baseUrl, headers) {
  const response = http.get(`${baseUrl}/api/v1/menu-items/`, { 
    headers, 
    timeout: '10s' 
  });
  recordMetrics(response, 'menu_items_list_quick');
  return response.status === 200;
}

/**
 * Test ingredients flow
 */
function testIngredientsFlow(baseUrl, headers) {
  // List ingredients
  const listResponse = http.get(`${baseUrl}/api/v1/ingredients/`, { headers });
  recordMetrics(listResponse, 'ingredients_list');
  
  if (listResponse.status === 200) {
    // Create ingredient
    const ingredientData = generateTestData('ingredient');
    const createResponse = http.post(
      `${baseUrl}/api/v1/ingredients/`,
      JSON.stringify(ingredientData),
      { headers, timeout: '15s' }
    );
    recordMetrics(createResponse, 'ingredients_create');
    
    // If creation successful, try to read it
    if (createResponse.status === 201) {
      try {
        const created = JSON.parse(createResponse.body);
        const getResponse = http.get(
          `${baseUrl}/api/v1/ingredients/${created.id}`, 
          { headers, timeout: '10s' }
        );
        recordMetrics(getResponse, 'ingredients_get');
      } catch (e) {
        console.log(`Error in ingredients flow: ${e.message}`);
      }
    }
  }
}

/**
 * Test recipes flow
 */
function testRecipesFlow(baseUrl, headers) {
  const listResponse = http.get(`${baseUrl}/api/v1/recipes/`, { headers });
  recordMetrics(listResponse, 'recipes_list');
  
  if (listResponse.status === 200) {
    const recipeData = generateTestData('recipe');
    const createResponse = http.post(
      `${baseUrl}/api/v1/recipes/`,
      JSON.stringify(recipeData),
      { headers, timeout: '15s' }
    );
    recordMetrics(createResponse, 'recipes_create');
  }
}

/**
 * Test menu items flow
 */
function testMenuItemsFlow(baseUrl, headers) {
  const listResponse = http.get(`${baseUrl}/api/v1/menu-items/`, { headers });
  recordMetrics(listResponse, 'menu_items_list');
  
  if (listResponse.status === 200) {
    const menuItemData = generateTestData('menuItem');
    const createResponse = http.post(
      `${baseUrl}/api/v1/menu-items/`,
      JSON.stringify(menuItemData),
      { headers, timeout: '15s' }
    );
    recordMetrics(createResponse, 'menu_items_create');
  }
}

/**
 * Record metrics for analysis
 */
function recordMetrics(response, operation) {
  const isError = response.status >= 400;
  const responseTimeMs = response.timings.duration;
  
  errorRate.add(isError);
  responseTime.add(responseTimeMs);
  
  // Log slow responses
  if (responseTimeMs > 2000) {
    console.log(`SLOW RESPONSE: ${operation} took ${responseTimeMs}ms (VU: ${__VU})`);
  }
  
  // Log errors
  if (isError) {
    console.log(`ERROR: ${operation} failed with status ${response.status} (VU: ${__VU})`);
  }
  
  // Check for critical thresholds
  if (responseTimeMs > 5000) {
    sendAlert(
      `Critical slow response: ${operation} took ${responseTimeMs}ms`,
      'critical',
      { operation, responseTime: responseTimeMs, vu: __VU }
    );
  }
  
  if (response.status >= 500) {
    sendAlert(
      `Server error: ${operation} returned ${response.status}`,
      'error',
      { operation, status: response.status, vu: __VU }
    );
  }
}

/**
 * Get current test stage based on time
 */
function getCurrentStage() {
  const elapsed = Math.floor(__ENV.K6_EXEC_DURATION || 0);
  
  if (elapsed < 120) return 'ramp_up_1';
  if (elapsed < 300) return 'steady_1';
  if (elapsed < 420) return 'ramp_up_2';
  if (elapsed < 600) return 'steady_2';
  if (elapsed < 720) return 'ramp_up_3';
  if (elapsed < 1020) return 'steady_3';
  if (elapsed < 1140) return 'spike';
  if (elapsed < 1260) return 'spike_steady';
  return 'ramp_down';
}

/**
 * Check for performance degradation
 */
function checkPerformanceDegradation() {
  // This would normally compare against baseline metrics
  // For now, we'll just log current performance
  const stage = getCurrentStage();
  const currentVUs = __VU;
  
  if (__ITER % 50 === 0) { // Log every 50 iterations
    console.log(`Stage: ${stage}, VUs: ${currentVUs}, Iteration: ${__ITER}`);
  }
}

export function teardown(data) {
  console.log(`Stress test completed. Final VU count: ${__VU}`);
  
  // Send completion alert
  sendAlert(
    'Stress test completed successfully',
    'info',
    { 
      test_type: 'stress_test',
      max_vus: 100,
      duration: '21m',
    }
  );
}