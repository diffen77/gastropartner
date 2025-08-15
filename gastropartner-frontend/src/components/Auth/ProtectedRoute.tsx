/**
 * Protected route component - Kräver authentication
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="protected-route__loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Laddar...</p>
        </div>
      </div>
    );
  }

  // Check for development token as fallback if no session
  const devToken = localStorage.getItem('auth_token');
  const isAuthenticated = session || devToken;

  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Redirect to login page, preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}