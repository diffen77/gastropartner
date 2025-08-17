/**
 * Basic Load Test for GastroPartner API
 * Tests core API endpoints with light load
 * NOTE: This version focuses on public endpoints. For full testing,
 * configure authentication credentials in the environment.
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { config } from './config.js';
import { createHeaders, validateResponse, generateTestData, randomSleep } from './utils.js';

// Test configuration
export const options = {
  scenarios: {
    smoke_test: {
      executor: 'constant-vus',
      vus: 2,
      duration: '30s',  // Reduced for quicker testing
    },
  },
  thresholds: config.thresholds,
};

// Test data setup
const baseUrl = config.baseUrl;
const headers = createHeaders(config.authToken);
let testIngredientId = null;
let testRecipeId = null;

export function setup() {
  console.log(`Starting basic load test against: ${baseUrl}`);
  
  // Health check before starting tests
  const healthResponse = http.get(`${baseUrl}/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`Health check failed: ${healthResponse.status}`);
  }
  
  console.log('Health check passed. Starting load test...');
  return { baseUrl, headers };
}

export default function(data) {
  const { baseUrl, headers } = data;
  
  // Test 1: Health endpoint (always works)
  testHealthEndpoint(baseUrl);
  randomSleep(1, 0.2);
  
  // Test 2: Root endpoint (always works)
  testRootEndpoint(baseUrl);
  randomSleep(1, 0.2);
  
  // Test 3: Check if authentication is available
  const hasAuth = config.authToken && config.authToken.length > 0;
  
  if (hasAuth) {
    // Test protected endpoints with authentication
    testIngredientsEndpoints(baseUrl, headers);
    randomSleep(2, 0.3);
    
    testRecipesEndpoints(baseUrl, headers);
    randomSleep(2, 0.3);
    
    testMenuItemsEndpoints(baseUrl, headers);
    randomSleep(1, 0.2);
  } else {
    // Test only public endpoints and check auth requirement
    console.log('No authentication token provided, testing public endpoints only');
    testPublicEndpointsOnly(baseUrl, headers);
    randomSleep(1, 0.2);
  }
}

/**
 * Test public endpoints only (when no auth is available)
 */
function testPublicEndpointsOnly(baseUrl, headers) {
  // Test that protected endpoints properly require authentication
  const protectedEndpoints = [
    '/api/v1/ingredients/',
    '/api/v1/recipes/',
    '/api/v1/menu-items/',
    '/api/v1/organizations/',
  ];
  
  for (const endpoint of protectedEndpoints) {
    const response = http.get(`${baseUrl}${endpoint}`, { headers });
    
    // We expect these to return 403 (Forbidden) without auth
    validateResponse(response, {
      status: 403,
      contentType: 'application/json',
      maxResponseTime: 200,
    });
  }
}

/**
 * Test health endpoint
 */
function testHealthEndpoint(baseUrl) {
  const response = http.get(`${baseUrl}/health`);
  
  validateResponse(response, {
    status: 200,
    contentType: 'application/json',
    maxResponseTime: 100,
    jsonKeys: ['status', 'service', 'environment'],
  });
}

/**
 * Test root endpoint
 */
function testRootEndpoint(baseUrl) {
  const response = http.get(`${baseUrl}/`);
  
  validateResponse(response, {
    status: 200,
    contentType: 'application/json',
    maxResponseTime: 200,
    jsonKeys: ['message', 'environment', 'version'],
  });
}

/**
 * Test ingredients CRUD endpoints
 */
function testIngredientsEndpoints(baseUrl, headers) {
  // GET ingredients list
  const listResponse = http.get(`${baseUrl}/api/v1/ingredients/`, { headers });
  validateResponse(listResponse, {
    status: 200,
    contentType: 'application/json',
    maxResponseTime: 300,
  });
  
  // POST create ingredient
  const ingredientData = generateTestData('ingredient');
  const createResponse = http.post(
    `${baseUrl}/api/v1/ingredients/`,
    JSON.stringify(ingredientData),
    { headers }
  );
  
  const createValid = validateResponse(createResponse, {
    status: 201,
    contentType: 'application/json',
    maxResponseTime: 500,
  });
  
  if (createValid && createResponse.status === 201) {
    try {
      const createdIngredient = JSON.parse(createResponse.body);
      testIngredientId = createdIngredient.id;
      
      // GET specific ingredient
      if (testIngredientId) {
        const getResponse = http.get(`${baseUrl}/api/v1/ingredients/${testIngredientId}`, { headers });
        validateResponse(getResponse, {
          status: 200,
          contentType: 'application/json',
          maxResponseTime: 200,
        });
        
        // PUT update ingredient
        const updateData = { ...ingredientData, name: `Updated ${ingredientData.name}` };
        const updateResponse = http.put(
          `${baseUrl}/api/v1/ingredients/${testIngredientId}`,
          JSON.stringify(updateData),
          { headers }
        );
        validateResponse(updateResponse, {
          status: 200,
          contentType: 'application/json',
          maxResponseTime: 300,
        });
      }
    } catch (e) {
      console.log(`Error parsing ingredient response: ${e.message}`);
    }
  }
}

/**
 * Test recipes endpoints
 */
function testRecipesEndpoints(baseUrl, headers) {
  // GET recipes list
  const listResponse = http.get(`${baseUrl}/api/v1/recipes/`, { headers });
  validateResponse(listResponse, {
    status: 200,
    contentType: 'application/json',
    maxResponseTime: 300,
  });
  
  // POST create recipe
  const recipeData = generateTestData('recipe');
  const createResponse = http.post(
    `${baseUrl}/api/v1/recipes/`,
    JSON.stringify(recipeData),
    { headers }
  );
  
  const createValid = validateResponse(createResponse, {
    status: 201,
    contentType: 'application/json',
    maxResponseTime: 500,
  });
  
  if (createValid && createResponse.status === 201) {
    try {
      const createdRecipe = JSON.parse(createResponse.body);
      testRecipeId = createdRecipe.id;
      
      // GET specific recipe
      if (testRecipeId) {
        const getResponse = http.get(`${baseUrl}/api/v1/recipes/${testRecipeId}`, { headers });
        validateResponse(getResponse, {
          status: 200,
          contentType: 'application/json',
          maxResponseTime: 200,
        });
      }
    } catch (e) {
      console.log(`Error parsing recipe response: ${e.message}`);
    }
  }
}

/**
 * Test menu items endpoints
 */
function testMenuItemsEndpoints(baseUrl, headers) {
  // GET menu items list
  const listResponse = http.get(`${baseUrl}/api/v1/menu-items/`, { headers });
  validateResponse(listResponse, {
    status: 200,
    contentType: 'application/json',
    maxResponseTime: 300,
  });
  
  // POST create menu item
  const menuItemData = generateTestData('menuItem');
  const createResponse = http.post(
    `${baseUrl}/api/v1/menu-items/`,
    JSON.stringify(menuItemData),
    { headers }
  );
  
  validateResponse(createResponse, {
    status: 201,
    contentType: 'application/json',
    maxResponseTime: 500,
  });
}

export function teardown(data) {
  console.log('Basic load test completed');
  
  // Cleanup created test data
  if (testIngredientId) {
    try {
      http.del(`${data.baseUrl}/api/v1/ingredients/${testIngredientId}`, { headers: data.headers });
      console.log(`Cleaned up test ingredient: ${testIngredientId}`);
    } catch (e) {
      console.log(`Failed to cleanup ingredient ${testIngredientId}: ${e.message}`);
    }
  }
  
  if (testRecipeId) {
    try {
      http.del(`${data.baseUrl}/api/v1/recipes/${testRecipeId}`, { headers: data.headers });
      console.log(`Cleaned up test recipe: ${testRecipeId}`);
    } catch (e) {
      console.log(`Failed to cleanup recipe ${testRecipeId}: ${e.message}`);
    }
  }
}