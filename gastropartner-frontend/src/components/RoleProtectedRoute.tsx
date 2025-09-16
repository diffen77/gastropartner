import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin' | 'superadmin' | 'system_admin';
  fallbackMessage?: string;
}

export default function RoleProtectedRoute({ 
  children, 
  requiredRole = 'admin', 
  fallbackMessage 
}: RoleProtectedRouteProps) {
  const { user } = useAuth();

  // For now, allow access to all authenticated users
  // TODO: Implement proper role checking
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Simple role check - in a real app, check user.role against requiredRole
  // For now, allow all authenticated users access to system_admin routes
  return <>{children}</>;
}