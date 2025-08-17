/**
 * Database Performance Test for GastroPartner API
 * Tests database query performance and monitors for slow queries
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config } from './config.js';
import { createHeaders, validateResponse, generateTestData, sendAlert } from './utils.js';

// Database-specific metrics
const dbQueryTime = new Trend('db_query_time');
const slowQueries = new Counter('slow_queries');
const dbErrors = new Rate('db_error_rate');

// Test configuration
export const options = {
  scenarios: {
    database_load: {
      executor: 'constant-vus',
      vus: 15,
      duration: '10m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.02'],
    db_query_time: ['p(95)<300'],
    slow_queries: ['count<50'], // Less than 50 slow queries during test
    db_error_rate: ['rate<0.01'],
  },
};

const baseUrl = config.baseUrl;
const headers = createHeaders(config.authToken);

// Test data pools for realistic database load
let ingredientPool = [];
let recipePool = [];
let menuItemPool = [];

export function setup() {
  console.log(`Starting database performance test against: ${baseUrl}`);
  
  // Pre-populate test data for more realistic queries
  const setupData = createTestDataPool();
  
  console.log('Database performance test setup completed');
  return { baseUrl, headers, ...setupData };
}

export default function(data) {
  const { baseUrl, headers } = data;
  
  // Mix of read-heavy and write operations (80% read, 20% write)
  const operation = Math.random();
  
  if (operation < 0.4) {
    // 40% - List operations (potential N+1 queries)
    testListOperations(baseUrl, headers);
  } else if (operation < 0.7) {
    // 30% - Search and filter operations
    testSearchOperations(baseUrl, headers);
  } else if (operation < 0.85) {
    // 15% - Complex queries (joins, aggregations)
    testComplexQueries(baseUrl, headers);
  } else {
    // 15% - Write operations
    testWriteOperations(baseUrl, headers);
  }
  
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5s think time
}

/**
 * Test list operations that might cause N+1 queries
 */
function testListOperations(baseUrl, headers) {
  const operations = [
    () => testIngredientsList(baseUrl, headers),
    () => testRecipesList(baseUrl, headers),
    () => testMenuItemsList(baseUrl, headers),
    () => testOrganizationsList(baseUrl, headers),
  ];
  
  const operation = operations[Math.floor(Math.random() * operations.length)];
  operation();
}

/**
 * Test ingredients list with performance monitoring
 */
function testIngredientsList(baseUrl, headers) {
  const startTime = Date.now();
  const response = http.get(`${baseUrl}/api/v1/ingredients/`, { headers });
  const queryTime = Date.now() - startTime;
  
  recordDatabaseMetrics(response, queryTime, 'ingredients_list');
  
  validateResponse(response, {
    status: 200,
    contentType: 'application/json',
    maxResponseTime: 500,
  });
}

/**
 * Test recipes list with performance monitoring
 */
function testRecipesList(baseUrl, headers) {
  const startTime = Date.now();
  const response = http.get(`${baseUrl}/api/v1/recipes/`, { headers });
  const queryTime = Date.now() - startTime;
  
  recordDatabaseMetrics(response, queryTime, 'recipes_list');
  
  validateResponse(response, {
    status: 200,
    contentType: 'application/json',
    maxResponseTime: 500,
  });
}

/**
 * Test menu items list with performance monitoring
 */
function testMenuItemsList(baseUrl, headers) {
  const startTime = Date.now();
  const response = http.get(`${baseUrl}/api/v1/menu-items/`, { headers });
  const queryTime = Date.now() - startTime;
  
  recordDatabaseMetrics(response, queryTime, 'menu_items_list');
  
  validateResponse(response, {
    status: 200,
    contentType: 'application/json',
    maxResponseTime: 500,
  });
}

/**
 * Test organizations list with performance monitoring
 */
function testOrganizationsList(baseUrl, headers) {
  const startTime = Date.now();
  const response = http.get(`${baseUrl}/api/v1/organizations/`, { headers });
  const queryTime = Date.now() - startTime;
  
  recordDatabaseMetrics(response, queryTime, 'organizations_list');
  
  validateResponse(response, {
    status: 200,
    contentType: 'application/json',
    maxResponseTime: 500,
  });
}

/**
 * Test search and filter operations
 */
function testSearchOperations(baseUrl, headers) {
  const searchTerms = [
    'test', 'ingredient', 'recipe', 'menu', 'chicken', 'beef', 
    'vegetable', 'sauce', 'spice', 'dairy'
  ];
  
  const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  
  // Test different search endpoints
  const searchOperations = [
    () => searchIngredients(baseUrl, headers, term),
    () => searchRecipes(baseUrl, headers, term),
    () => searchMenuItems(baseUrl, headers, term),
  ];
  
  const operation = searchOperations[Math.floor(Math.random() * searchOperations.length)];
  operation();
}

/**
 * Search ingredients
 */
function searchIngredients(baseUrl, headers, searchTerm) {
  const startTime = Date.now();
  const response = http.get(`${baseUrl}/api/v1/ingredients/?search=${searchTerm}`, { headers });
  const queryTime = Date.now() - startTime;
  
  recordDatabaseMetrics(response, queryTime, 'ingredients_search');
  
  validateResponse(response, {
    status: 200,
    contentType: 'application/json',
    maxResponseTime: 800, // Search might be slower
  });
}

/**
 * Search recipes
 */
function searchRecipes(baseUrl, headers, searchTerm) {
  const startTime = Date.now();
  const response = http.get(`${baseUrl}/api/v1/recipes/?search=${searchTerm}`, { headers });
  const queryTime = Date.now() - startTime;
  
  recordDatabaseMetrics(response, queryTime, 'recipes_search');
  
  validateResponse(response, {
    status: 200,
    contentType: 'application/json',
    maxResponseTime: 800,
  });
}

/**
 * Search menu items
 */
function searchMenuItems(baseUrl, headers, searchTerm) {
  const startTime = Date.now();
  const response = http.get(`${baseUrl}/api/v1/menu-items/?search=${searchTerm}`, { headers });
  const queryTime = Date.now() - startTime;
  
  recordDatabaseMetrics(response, queryTime, 'menu_items_search');
  
  validateResponse(response, {
    status: 200,
    contentType: 'application/json',
    maxResponseTime: 800,
  });
}

/**
 * Test complex queries (might involve joins, aggregations)
 */
function testComplexQueries(baseUrl, headers) {
  // These would be endpoints that perform complex database operations
  const complexOperations = [
    () => testAnalyticsEndpoint(baseUrl, headers),
    () => testCostCalculation(baseUrl, headers),
    () => testInventoryCheck(baseUrl, headers),
  ];
  
  const operation = complexOperations[Math.floor(Math.random() * complexOperations.length)];
  operation();
}

/**
 * Test analytics endpoint (likely complex aggregation)
 */
function testAnalyticsEndpoint(baseUrl, headers) {
  const startTime = Date.now();
  const response = http.get(`${baseUrl}/api/v1/analytics/summary`, { headers });
  const queryTime = Date.now() - startTime;
  
  recordDatabaseMetrics(response, queryTime, 'analytics_summary');
  
  // Analytics might take longer due to aggregations
  validateResponse(response, {
    maxResponseTime: 2000,
  });
}

/**
 * Test cost calculation (might involve complex joins)
 */
function testCostCalculation(baseUrl, headers) {
  const startTime = Date.now();
  const response = http.get(`${baseUrl}/api/v1/cost-control/analysis`, { headers });
  const queryTime = Date.now() - startTime;
  
  recordDatabaseMetrics(response, queryTime, 'cost_calculation');
  
  validateResponse(response, {
    maxResponseTime: 1500,
  });
}

/**
 * Test inventory check
 */
function testInventoryCheck(baseUrl, headers) {
  const startTime = Date.now();
  const response = http.get(`${baseUrl}/api/v1/ingredients/?low_stock=true`, { headers });
  const queryTime = Date.now() - startTime;
  
  recordDatabaseMetrics(response, queryTime, 'inventory_check');
  
  validateResponse(response, {
    status: 200,
    contentType: 'application/json',
    maxResponseTime: 1000,
  });
}

/**
 * Test write operations
 */
function testWriteOperations(baseUrl, headers) {
  const writeOperations = [
    () => createIngredient(baseUrl, headers),
    () => createRecipe(baseUrl, headers),
    () => createMenuItem(baseUrl, headers),
    () => updateExistingData(baseUrl, headers),
  ];
  
  const operation = writeOperations[Math.floor(Math.random() * writeOperations.length)];
  operation();
}

/**
 * Create ingredient with performance monitoring
 */
function createIngredient(baseUrl, headers) {
  const startTime = Date.now();
  const ingredientData = generateTestData('ingredient');
  
  const response = http.post(
    `${baseUrl}/api/v1/ingredients/`,
    JSON.stringify(ingredientData),
    { headers }
  );
  
  const queryTime = Date.now() - startTime;
  recordDatabaseMetrics(response, queryTime, 'ingredient_create');
  
  validateResponse(response, {
    status: 201,
    contentType: 'application/json',
    maxResponseTime: 1000,
  });
  
  // Store for potential updates
  if (response.status === 201) {
    try {
      const created = JSON.parse(response.body);
      ingredientPool.push(created.id);
      if (ingredientPool.length > 100) {
        ingredientPool = ingredientPool.slice(-50); // Keep pool manageable
      }
    } catch (e) {
      console.log(`Error storing ingredient ID: ${e.message}`);
    }
  }
}

/**
 * Create recipe with performance monitoring
 */
function createRecipe(baseUrl, headers) {
  const startTime = Date.now();
  const recipeData = generateTestData('recipe');
  
  const response = http.post(
    `${baseUrl}/api/v1/recipes/`,
    JSON.stringify(recipeData),
    { headers }
  );
  
  const queryTime = Date.now() - startTime;
  recordDatabaseMetrics(response, queryTime, 'recipe_create');
  
  validateResponse(response, {
    status: 201,
    contentType: 'application/json',
    maxResponseTime: 1000,
  });
  
  if (response.status === 201) {
    try {
      const created = JSON.parse(response.body);
      recipePool.push(created.id);
      if (recipePool.length > 100) {
        recipePool = recipePool.slice(-50);
      }
    } catch (e) {
      console.log(`Error storing recipe ID: ${e.message}`);
    }
  }
}

/**
 * Create menu item with performance monitoring
 */
function createMenuItem(baseUrl, headers) {
  const startTime = Date.now();
  const menuItemData = generateTestData('menuItem');
  
  const response = http.post(
    `${baseUrl}/api/v1/menu-items/`,
    JSON.stringify(menuItemData),
    { headers }
  );
  
  const queryTime = Date.now() - startTime;
  recordDatabaseMetrics(response, queryTime, 'menu_item_create');
  
  validateResponse(response, {
    status: 201,
    contentType: 'application/json',
    maxResponseTime: 1000,
  });
  
  if (response.status === 201) {
    try {
      const created = JSON.parse(response.body);
      menuItemPool.push(created.id);
      if (menuItemPool.length > 100) {
        menuItemPool = menuItemPool.slice(-50);
      }
    } catch (e) {
      console.log(`Error storing menu item ID: ${e.message}`);
    }
  }
}

/**
 * Update existing data
 */
function updateExistingData(baseUrl, headers) {
  if (ingredientPool.length > 0 && Math.random() < 0.5) {
    updateIngredient(baseUrl, headers);
  } else if (recipePool.length > 0 && Math.random() < 0.7) {
    updateRecipe(baseUrl, headers);
  } else if (menuItemPool.length > 0) {
    updateMenuItem(baseUrl, headers);
  }
}

/**
 * Update ingredient
 */
function updateIngredient(baseUrl, headers) {
  const id = ingredientPool[Math.floor(Math.random() * ingredientPool.length)];
  const updateData = { 
    cost_per_unit: Math.round((Math.random() * 100 + 1) * 100) / 100 
  };
  
  const startTime = Date.now();
  const response = http.put(
    `${baseUrl}/api/v1/ingredients/${id}`,
    JSON.stringify(updateData),
    { headers }
  );
  const queryTime = Date.now() - startTime;
  
  recordDatabaseMetrics(response, queryTime, 'ingredient_update');
  
  validateResponse(response, {
    maxResponseTime: 800,
  });
}

/**
 * Update recipe
 */
function updateRecipe(baseUrl, headers) {
  const id = recipePool[Math.floor(Math.random() * recipePool.length)];
  const updateData = { 
    prep_time_minutes: Math.floor(Math.random() * 60) + 10 
  };
  
  const startTime = Date.now();
  const response = http.put(
    `${baseUrl}/api/v1/recipes/${id}`,
    JSON.stringify(updateData),
    { headers }
  );
  const queryTime = Date.now() - startTime;
  
  recordDatabaseMetrics(response, queryTime, 'recipe_update');
  
  validateResponse(response, {
    maxResponseTime: 800,
  });
}

/**
 * Update menu item
 */
function updateMenuItem(baseUrl, headers) {
  const id = menuItemPool[Math.floor(Math.random() * menuItemPool.length)];
  const updateData = { 
    price: Math.round((Math.random() * 50 + 5) * 100) / 100 
  };
  
  const startTime = Date.now();
  const response = http.put(
    `${baseUrl}/api/v1/menu-items/${id}`,
    JSON.stringify(updateData),
    { headers }
  );
  const queryTime = Date.now() - startTime;
  
  recordDatabaseMetrics(response, queryTime, 'menu_item_update');
  
  validateResponse(response, {
    maxResponseTime: 800,
  });
}

/**
 * Record database-specific metrics
 */
function recordDatabaseMetrics(response, queryTime, operation) {
  dbQueryTime.add(queryTime);
  
  const isError = response.status >= 400;
  dbErrors.add(isError);
  
  // Track slow queries (>500ms)
  if (queryTime > 500) {
    slowQueries.add(1);
    console.log(`SLOW QUERY: ${operation} took ${queryTime}ms (VU: ${__VU})`);
    
    // Alert on very slow queries
    if (queryTime > 2000) {
      sendAlert(
        `Very slow database query: ${operation} took ${queryTime}ms`,
        'warning',
        { operation, queryTime, vu: __VU }
      );
    }
  }
  
  // Alert on database errors
  if (isError) {
    sendAlert(
      `Database operation failed: ${operation} returned ${response.status}`,
      'error',
      { operation, status: response.status, vu: __VU }
    );
  }
}

/**
 * Create test data pool for realistic database load
 */
function createTestDataPool() {
  console.log('Creating test data pool for database performance test...');
  return {
    ingredientPool: [],
    recipePool: [],
    menuItemPool: [],
  };
}

export function teardown(data) {
  console.log('Database performance test completed');
  
  // Report on slow queries and performance
  console.log(`Test completed with ingredient pool size: ${ingredientPool.length}`);
  console.log(`Test completed with recipe pool size: ${recipePool.length}`);
  console.log(`Test completed with menu item pool size: ${menuItemPool.length}`);
  
  sendAlert(
    'Database performance test completed',
    'info',
    { 
      test_type: 'database_performance',
      duration: '10m',
      vus: 15,
      ingredient_pool_size: ingredientPool.length,
      recipe_pool_size: recipePool.length,
      menu_item_pool_size: menuItemPool.length,
    }
  );
}