/**
 * JWT token utilities for GastroPartner frontend
 * Provides token decoding, expiry checking, and automatic refresh functionality
 */

export interface JWTPayload {
  sub: string;  // user ID
  email: string;
  exp: number;  // expiration timestamp
  iat: number;  // issued at timestamp
  organization_id?: string;
  iss?: string;
  aud?: string;
  [key: string]: any;
}

/**
 * Decode a JWT token payload without verification (client-side only)
 * ⚠️ This is for client-side expiry checking only - server validates the signature
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    // Split the token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.warn('Failed to decode JWT token:', error);
    return null;
  }
}

/**
 * Check if a JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true; // Assume expired if can't decode
  }

  // Check if token expires within the next 5 minutes (300 seconds)
  const now = Math.floor(Date.now() / 1000);
  const buffer = 300; // 5 minutes buffer for refresh
  return payload.exp <= (now + buffer);
}

/**
 * Check if a JWT token is about to expire (within 10 minutes)
 * Used to trigger proactive token refresh
 */
export function shouldRefreshToken(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true; // Should refresh if can't decode
  }

  // Check if token expires within the next 10 minutes (600 seconds)
  const now = Math.floor(Date.now() / 1000);
  const buffer = 600; // 10 minutes buffer for proactive refresh
  return payload.exp <= (now + buffer);
}

/**
 * Get token expiry time in human-readable format
 */
export function getTokenExpiry(token: string): string | null {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return null;
  }

  const expiryDate = new Date(payload.exp * 1000);
  return expiryDate.toISOString();
}

/**
 * Extract user information from JWT token
 */
export function extractUserFromToken(token: string): { id: string; email: string; organization_id?: string } | null {
  const payload = decodeJWT(token);
  if (!payload) {
    return null;
  }

  return {
    id: payload.sub,
    email: payload.email,
    organization_id: payload.organization_id,
  };
}