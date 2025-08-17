/**
 * K6 Performance Testing Utilities
 * Common functions and helpers for performance tests
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('error_rate');
export const responseTime = new Trend('response_time');
export const requestCount = new Counter('request_count');

/**
 * Create HTTP headers with authentication
 * @param {string} authToken - Authentication token
 * @returns {object} HTTP headers
 */
export function createHeaders(authToken = '') {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  return headers;
}

/**
 * Make an authenticated HTTP request with error handling
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {object} payload - Request payload
 * @param {object} params - Request parameters
 * @returns {object} Response object with additional metrics
 */
export function makeRequest(method, url, payload = null, params = {}) {
  const startTime = Date.now();
  
  let response;
  if (method.toLowerCase() === 'get') {
    response = http.get(url, params);
  } else if (method.toLowerCase() === 'post') {
    response = http.post(url, JSON.stringify(payload), params);
  } else if (method.toLowerCase() === 'put') {
    response = http.put(url, JSON.stringify(payload), params);
  } else if (method.toLowerCase() === 'delete') {
    response = http.del(url, null, params);
  } else {
    throw new Error(`Unsupported HTTP method: ${method}`);
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Record custom metrics
  responseTime.add(duration);
  requestCount.add(1);
  errorRate.add(response.status >= 400);
  
  // Enhanced response object
  response.duration_ms = duration;
  response.success = response.status >= 200 && response.status < 400;
  
  return response;
}

/**
 * Validate API response structure and content
 * @param {object} response - HTTP response
 * @param {object} expectations - Expected response structure
 * @returns {boolean} Validation result
 */
export function validateResponse(response, expectations = {}) {
  const checks = {};
  
  // Status code validation
  if (expectations.status) {
    checks[`status is ${expectations.status}`] = () => response.status === expectations.status;
  } else {
    checks['status is 2xx'] = () => response.status >= 200 && response.status < 300;
  }
  
  // Response time validation
  if (expectations.maxResponseTime) {
    checks[`response time < ${expectations.maxResponseTime}ms`] = () => 
      response.timings.duration < expectations.maxResponseTime;
  }
  
  // Content-Type validation
  if (expectations.contentType) {
    checks[`content-type is ${expectations.contentType}`] = () => 
      response.headers['Content-Type'] && 
      response.headers['Content-Type'].includes(expectations.contentType);
  }
  
  // Body validation
  if (expectations.bodyContains) {
    checks[`body contains expected content`] = () => 
      response.body && response.body.includes(expectations.bodyContains);
  }
  
  // JSON structure validation
  if (expectations.jsonKeys) {
    checks['response has expected JSON keys'] = () => {
      try {
        const json = JSON.parse(response.body);
        return expectations.jsonKeys.every(key => key in json);
      } catch (e) {
        return false;
      }
    };
  }
  
  return check(response, checks);
}

/**
 * Generate random test data
 * @param {string} type - Type of data to generate
 * @returns {object} Generated test data
 */
export function generateTestData(type) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  
  switch (type) {
    case 'ingredient':
      return {
        name: `Test Ingredient ${timestamp}`,
        unit: ['kg', 'g', 'l', 'ml', 'pcs'][Math.floor(Math.random() * 5)],
        cost_per_unit: Math.round((Math.random() * 100 + 1) * 100) / 100,
        supplier: `Supplier ${random}`,
        category: `Category ${random % 10}`,
      };
      
    case 'recipe':
      return {
        name: `Test Recipe ${timestamp}`,
        description: `A test recipe created at ${new Date().toISOString()}`,
        instructions: `Step 1: Prepare ingredients\nStep 2: Mix\nStep 3: Cook for ${20 + random % 60} minutes`,
        prep_time_minutes: 10 + (random % 50),
        cook_time_minutes: 15 + (random % 120),
        servings: 1 + (random % 10),
      };
      
    case 'menuItem':
      return {
        name: `Menu Item ${timestamp}`,
        description: `A delicious menu item created for testing`,
        price: Math.round((Math.random() * 50 + 5) * 100) / 100,
        category: `Category ${random % 5}`,
        is_available: Math.random() > 0.2, // 80% available
      };
      
    case 'organization':
      return {
        name: `Test Org ${timestamp}`,
        type: ['restaurant', 'cafe', 'food_truck'][Math.floor(Math.random() * 3)],
        contact_email: `test${timestamp}@example.com`,
      };
      
    default:
      throw new Error(`Unknown test data type: ${type}`);
  }
}

/**
 * Think time simulation with random variation
 * @param {number} baseTime - Base think time in seconds
 * @param {number} variation - Variation percentage (0-1)
 */
export function randomSleep(baseTime, variation = 0.3) {
  const randomFactor = 1 + (Math.random() - 0.5) * 2 * variation;
  const sleepTime = Math.max(0.1, baseTime * randomFactor);
  sleep(sleepTime);
}

/**
 * Log performance metrics to console
 * @param {string} testName - Name of the test
 * @param {object} metrics - Metrics to log
 */
export function logMetrics(testName, metrics = {}) {
  console.log(`
=== ${testName} Performance Metrics ===
Timestamp: ${new Date().toISOString()}
VU: ${__VU}
Iteration: ${__ITER}
${Object.entries(metrics).map(([key, value]) => `${key}: ${value}`).join('\n')}
=====================================
  `);
}

/**
 * Send alert to external monitoring system
 * @param {string} message - Alert message
 * @param {string} severity - Alert severity (info, warning, error, critical)
 * @param {object} metadata - Additional metadata
 */
export function sendAlert(message, severity = 'info', metadata = {}) {
  const alert = {
    timestamp: new Date().toISOString(),
    test_name: __ENV.TEST_NAME || 'k6-performance-test',
    environment: __ENV.ENVIRONMENT || 'local',
    severity,
    message,
    metadata: {
      vu: __VU,
      iteration: __ITER,
      ...metadata,
    },
  };
  
  console.log(`ALERT [${severity.toUpperCase()}]: ${message}`, JSON.stringify(alert));
  
  // Send to external monitoring if webhook is configured
  const webhookUrl = __ENV.ALERT_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      http.post(webhookUrl, JSON.stringify(alert), {
        headers: { 'Content-Type': 'application/json' },
        timeout: '5s',
      });
    } catch (error) {
      console.log(`Failed to send alert to webhook: ${error.message}`);
    }
  }
}

/**
 * Create a load testing scenario configuration
 * @param {string} name - Scenario name
 * @param {object} options - Scenario options
 * @returns {object} K6 scenario configuration
 */
export function createScenario(name, options = {}) {
  const defaults = {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 10 },
      { duration: '1m', target: 10 },
      { duration: '30s', target: 0 },
    ],
    gracefulRampDown: '30s',
    env: {
      SCENARIO_NAME: name,
    },
  };
  
  return {
    [name]: {
      ...defaults,
      ...options,
    },
  };
}

export default {
  createHeaders,
  makeRequest,
  validateResponse,
  generateTestData,
  randomSleep,
  logMetrics,
  sendAlert,
  createScenario,
  errorRate,
  responseTime,
  requestCount,
};