/**
 * Environment-based logging utilities for GastroPartner Frontend
 * 
 * Preserves all debug functionality for development while cleaning production output.
 * Based on JWT Migration Analysis findings.
 */

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isDebugMode = localStorage.getItem('debug_mode') === 'true';
const shouldLog = isDevelopment || isDebugMode;

/**
 * Development-aware console logger
 * Preserves all debugging functionality in development, silent in production
 */
export const devLogger = {
  /**
   * Debug logging - for detailed flow debugging
   * Used in: AuthContext JWT flow, API calls, state changes
   */
  log: shouldLog ? console.log : () => {},
  
  /**
   * Error logging - ALWAYS shown as errors are critical
   * Used in: Authentication errors, API failures, validation errors
   */
  error: console.error, // Always show errors, even in production
  
  /**
   * Warning logging - ALWAYS shown as warnings are important
   * Used in: Deprecation warnings, fallback usage, configuration issues
   */
  warn: console.warn, // Always show warnings
  
  /**
   * Info logging - development only
   * Used in: Success confirmations, state updates, routine operations
   */
  info: shouldLog ? console.info : () => {},
  
  /**
   * JWT-specific debugging - critical for authentication troubleshooting
   * Used in: JWT token validation, signature verification, token refresh
   */
  jwt: shouldLog ? (...args: any[]) => console.log('🔐 JWT:', ...args) : () => {},
  
  /**
   * Organization-specific debugging - critical for multi-tenant functionality
   * Used in: Organization loading, tenant isolation, access control
   */
  org: shouldLog ? (...args: any[]) => console.log('🏢 ORG:', ...args) : () => {},
  
  /**
   * API call debugging - for request/response troubleshooting
   * Used in: API request tracking, response handling, error recovery
   */
  api: shouldLog ? (...args: any[]) => console.log('🌐 API:', ...args) : () => {},
  
  /**
   * Development mode debugging - enhanced logging for dev environment
   * Used in: Development token flow, mock data, testing scenarios
   */
  dev: shouldLog ? (...args: any[]) => console.log('🔧 DEV:', ...args) : () => {},
  
  /**
   * Authentication flow debugging - critical for login troubleshooting
   * Used in: Login attempts, session management, user state changes
   */
  auth: shouldLog ? (...args: any[]) => console.log('👤 AUTH:', ...args) : () => {},
  
  /**
   * Module system debugging - for module manager troubleshooting
   * Used in: Module toggling, settings updates, configuration changes
   */
  module: shouldLog ? (...args: any[]) => console.log('🧩 MODULE:', ...args) : () => {},
};

/**
 * Debug mode toggle for runtime debugging
 * Allows enabling debug output in production for troubleshooting
 */
export const toggleDebugMode = (enabled: boolean) => {
  if (enabled) {
    localStorage.setItem('debug_mode', 'true');
    console.log('🔍 Debug mode ENABLED - Restart app to see debug output');
  } else {
    localStorage.removeItem('debug_mode');
    console.log('🔍 Debug mode DISABLED - Restart app to hide debug output');
  }
};

/**
 * Check if debug mode is active
 */
export const isDebugActive = () => shouldLog;

/**
 * Development environment check
 */
export const isDev = () => isDevelopment;

/**
 * Legacy console replacement for gradual migration
 * @deprecated Use specific devLogger methods instead
 */
export const debugLog = devLogger.log;
export const debugError = devLogger.error;
export const debugWarn = devLogger.warn;