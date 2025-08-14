/**
 * Protected route component - Kräver authentication
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthForm } from './AuthForm';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { session, loading } = useAuth();
  const [authMode, setAuthMode] = React.useState<'login' | 'register'>('login');

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

  if (!session) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="protected-route__auth">
        <div className="auth-container">
          <div className="auth-container__header">
            <h1>GastroPartner</h1>
            <p>SaaS för restauranger och livsmedelsproducenter</p>
          </div>
          <AuthForm mode={authMode} onModeChange={setAuthMode} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}