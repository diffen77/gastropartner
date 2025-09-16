/**
 * Authentication context för GastroPartner React app
 * Enhanced with intelligent logging system that preserves debug functionality
 * in development while maintaining clean production output.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, api, User, Organization, OrganizationSettings } from '../lib/supabase';
import { devLogger } from '../utils/logger';
import { isTokenExpired, shouldRefreshToken } from '../utils/jwt';

interface AuthContextType {
  // Authentication state
  session: Session | null;
  user: User | null;
  loading: boolean;

  // Organizations
  organizations: Organization[];
  currentOrganization: Organization | null;

  // Organization settings
  organizationSettings: OrganizationSettings | null;

  // Onboarding state
  hasCompletedOnboarding: boolean | null;
  onboardingLoading: boolean;
  setHasCompletedOnboarding: (completed: boolean | null) => void;
  setOnboardingLoading: (loading: boolean) => void;

  // Authentication methods
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; message: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signOut: () => Promise<void>;

  // Organization methods
  setCurrentOrganization: (org: Organization | null) => void;
  refreshOrganizations: () => Promise<void>;
  getOrganizations: () => Promise<Organization[]>;
  createOrganization: (name: string, description?: string) => Promise<Organization>;

}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  // Organization settings state
  const [organizationSettings, setOrganizationSettings] = useState<OrganizationSettings | null>(null);

  // Onboarding state
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  
  // Token refresh management
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  // Clear any existing refresh timer
  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // Automatic token refresh mechanism
  const scheduleTokenRefresh = useCallback((token: string) => {
    clearRefreshTimer();

    // Check if token needs refresh
    if (!shouldRefreshToken(token)) {
      // Token still has plenty of time, check again in 5 minutes
      refreshTimerRef.current = setTimeout(() => {
        const currentToken = localStorage.getItem('auth_token');
        if (currentToken) {
          scheduleTokenRefresh(currentToken);
        }
      }, 5 * 60 * 1000); // 5 minutes
      return;
    }

    // Token needs refresh soon, try to refresh now
    const refreshTokenValue = localStorage.getItem('refresh_token');
    if (!refreshTokenValue || isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    
    api.refreshToken(refreshTokenValue)
      .then((authResponse) => {
        devLogger.jwt('Token refreshed successfully');
        
        // Update stored tokens
        localStorage.setItem('auth_token', authResponse.access_token);
        localStorage.setItem('refresh_token', authResponse.refresh_token);
        
        // Update session state
        const mockSession = {
          access_token: authResponse.access_token,
          refresh_token: authResponse.refresh_token,
          expires_in: authResponse.expires_in,
          user: authResponse.user
        };
        setSession(mockSession as any);
        setUser(authResponse.user);
        
        // Schedule next refresh check
        scheduleTokenRefresh(authResponse.access_token);
      })
      .catch((error) => {
        devLogger.error('Token refresh failed:', error);
        
        // If refresh fails, clear tokens and redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        setSession(null);
        setUser(null);
        setOrganizations([]);
        setCurrentOrganization(null);
        setOrganizationSettings(null);
      })
      .finally(() => {
        isRefreshingRef.current = false;
      });
  }, [clearRefreshTimer]);


  // Initialize auth state
  useEffect(() => {
    devLogger.auth('AuthProvider useEffect running...');
    
    // Get initial session with timeout
    const getInitialSession = async () => {
      try {
        devLogger.auth('Getting initial session...');
        
        // Check for development mode token first
        const devToken = localStorage.getItem('auth_token');
        const refreshToken = localStorage.getItem('refresh_token');
        if (devToken) {
          devLogger.dev('Development token found, using dev mode authentication');
          
          // Always trust the stored tokens initially - don't clear them on API failures
          // Create a mock session for compatibility immediately
          const mockSession = {
            access_token: devToken,
            refresh_token: refreshToken,
            user: null // Will be populated after successful API call
          };
          setSession(mockSession as any);
          
          try {
            // Check if the token is expired before making API calls
            if (isTokenExpired(devToken)) {
              devLogger.jwt('Development token is expired, attempting refresh...');
              
              // Try to refresh the token
              const refreshTokenValue = localStorage.getItem('refresh_token');
              if (refreshTokenValue) {
                try {
                  const authResponse = await api.refreshToken(refreshTokenValue);
                  
                  // Update stored tokens
                  localStorage.setItem('auth_token', authResponse.access_token);
                  localStorage.setItem('refresh_token', authResponse.refresh_token);
                  
                  // Update devToken variable for this session
                  const newDevToken = authResponse.access_token;
                  
                  // Create new session with refreshed token
                  const refreshedSession = {
                    access_token: newDevToken,
                    refresh_token: authResponse.refresh_token,
                    user: authResponse.user
                  };
                  setSession(refreshedSession as any);
                  setUser(authResponse.user);
                  
                  // Schedule automatic refresh for the new token
                  scheduleTokenRefresh(newDevToken);
                  
                  devLogger.jwt('Development token refreshed successfully');
                } catch (refreshError) {
                  devLogger.error('Token refresh failed during initialization:', refreshError);
                  // Clear invalid tokens and continue with normal error handling
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('refresh_token');
                  setSession(null);
                  setUser(null);
                  setOrganizations([]);
                  setCurrentOrganization(null);
                  setOrganizationSettings(null);
                  setLoading(false);
                  return;
                }
              } else {
                devLogger.jwt('No refresh token available, clearing expired token');
                localStorage.removeItem('auth_token');
                localStorage.removeItem('refresh_token');
                setSession(null);
                setUser(null);
                setOrganizations([]);
                setCurrentOrganization(null);
                setOrganizationSettings(null);
                setLoading(false);
                return;
              }
            } else {
              // Token is still valid, schedule refresh check
              scheduleTokenRefresh(devToken);
            }

            // Try to get current user with the (possibly refreshed) dev token
            const currentToken = localStorage.getItem('auth_token') || devToken;
            const userData = await api.getCurrentUser();
            setUser(userData);
            
            // Update session with user data
            const updatedSession = {
              access_token: currentToken,
              refresh_token: localStorage.getItem('refresh_token'),
              user: userData
            };
            setSession(updatedSession as any);
            
            // Load organizations
            const orgsData = await api.getOrganizations();
            setOrganizations(orgsData);
            if (orgsData.length > 0) {
              setCurrentOrganization(orgsData[0]);
              
              // Load organization settings for the first organization
              try {
                const orgId = getOrganizationId(orgsData[0]);
                devLogger.org('Loading organization settings:', orgId);
                const settings = await api.getOrganizationSettings(orgId);
                devLogger.org('Organization settings loaded:', settings);
                setOrganizationSettings(settings);
              } catch (settingsError) {
                devLogger.warn('Could not load organization settings:', settingsError);
                setOrganizationSettings(null);
              }
            } else {
              devLogger.org('No organizations found');
            }
            
          } catch (error) {
            devLogger.jwt('Development token validation failed, clearing invalid tokens:', error);
            
            // Clear invalid tokens immediately when JWT signature validation fails
            if (error instanceof Error && (
              error.message.includes('401') || 
              error.message.includes('signature is invalid') ||
              error.message.includes('invalid JWT') ||
              error.message.includes('unable to parse or verify signature')
            )) {
              devLogger.jwt('JWT token is invalid (signature/format error), clearing tokens...');
              localStorage.removeItem('auth_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('onboarding_completed');
              setSession(null);
              setUser(null);
              setOrganizations([]);
              setCurrentOrganization(null);
              setHasCompletedOnboarding(null);
              setOrganizationSettings(null);
            }
          }
          
          setLoading(false);
          return;
        }
        
        // Fallback to Supabase session if no dev token
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Initial session timeout')), 5000)
        );
        
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        const { data: { session } } = result;
        devLogger.auth('Initial session check:', session ? 'found session' : 'no session', session);
        
        setSession(session);
        if (session?.user) {
          devLogger.auth('User found, loading user data...');
          try {
            setLoading(true);
            
            // Load user profile från backend
            devLogger.api('Calling api.getCurrentUser()...');
            const userData = await api.getCurrentUser(session.access_token);
            devLogger.api('User data received:', userData);
            setUser(userData);
            
            // Load organizations
            devLogger.api('Calling api.getOrganizations()...');
            const orgsData = await api.getOrganizations(session.access_token);
            devLogger.org('Organizations data received:', orgsData);
            setOrganizations(orgsData);
            
            // Set first organization as current if none selected
            if (orgsData.length > 0) {
              setCurrentOrganization(orgsData[0]);
              
              // Load organization settings for the first organization
              try {
                const orgId = getOrganizationId(orgsData[0]);
                devLogger.org('Loading organization settings:', orgId);
                const settings = await api.getOrganizationSettings(orgId);
                devLogger.org('Organization settings loaded:', settings);
                setOrganizationSettings(settings);
              } catch (settingsError) {
                devLogger.warn('Could not load organization settings:', settingsError);
                setOrganizationSettings(null);
              }
            } else {
              devLogger.org('No organizations found (Supabase)');
            }
            
          } catch (error) {
            devLogger.error('Error loading user data:', error);
            // If backend call fails, we can't get organization_id which is required
            // So we must set user to null and let user re-authenticate
            setUser(null);
            setOrganizations([]);
            setCurrentOrganization(null);
            setHasCompletedOnboarding(null);
          } finally {
            setLoading(false);
          }
        } else {
          devLogger.auth('No user found, setting loading to false');
          setLoading(false);
        }
      } catch (error) {
        devLogger.error('Error getting initial session:', error);
        devLogger.auth('Session check failed, assuming no user - setting loading to false');
        setSession(null);
        setLoading(false);
      }
    };
    
    getInitialSession();

    // Listen for auth changes - but only for Supabase sessions, not dev tokens
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only handle Supabase sessions if no dev token exists
        const devToken = localStorage.getItem('auth_token');
        if (devToken) {
          devLogger.dev('Development token exists, ignoring Supabase auth changes');
          return; // Don't interfere with dev token authentication
        }
        
        setSession(session);
        
        if (session?.user) {
          try {
            setLoading(true);
            
            // Load user profile från backend
            devLogger.api('Auth change: Calling api.getCurrentUser()...');
            const userData = await api.getCurrentUser(session.access_token);
            devLogger.api('Auth change: User data received:', userData);
            setUser(userData);
            
            // Load organizations
            devLogger.api('Auth change: Calling api.getOrganizations()...');
            const orgsData = await api.getOrganizations(session.access_token);
            devLogger.org('Auth change: Organizations data received:', orgsData);
            setOrganizations(orgsData);
            
            // Set first organization as current if none selected
            if (orgsData.length > 0) {
              setCurrentOrganization(orgsData[0]);
              
              // Load organization settings for the first organization
              try {
                const orgId = getOrganizationId(orgsData[0]);
                devLogger.org('Loading organization settings:', orgId);
                const settings = await api.getOrganizationSettings(orgId);
                devLogger.org('Organization settings loaded:', settings);
                setOrganizationSettings(settings);
              } catch (settingsError) {
                devLogger.warn('Could not load organization settings:', settingsError);
                setOrganizationSettings(null);
              }
            } else {
              // No organizations - assume onboarding not completed
              devLogger.org('No organizations found (Auth change), onboarding not completed');
              setHasCompletedOnboarding(false);
            }
            
          } catch (error) {
            devLogger.error('Auth change: Error loading user data:', error);
            // If backend call fails, we can't get organization_id which is required
            // So we must set user to null and let user re-authenticate
            setUser(null);
            setOrganizations([]);
            setCurrentOrganization(null);
            setHasCompletedOnboarding(null);
          } finally {
            setLoading(false);
          }
        } else {
          setUser(null);
          setOrganizations([]);
          setCurrentOrganization(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      clearRefreshTimer(); // Clean up the refresh timer
    };
  }, [scheduleTokenRefresh, clearRefreshTimer]); // Add missing dependencies
  
  // Cleanup refresh timer on unmount
  useEffect(() => {
    return () => {
      clearRefreshTimer();
    };
  }, [clearRefreshTimer]);

  // Helper function to get organization ID from any organization object (handles both id and organization_id)
  const getOrganizationId = (org: Organization): string => {
    const id = org.organization_id || org.id;
    if (!id) {
      throw new Error('Organization missing both organization_id and id fields');
    }
    return id;
  };

  // Onboarding methods



  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      await api.register(email, password, fullName);
      return {
        success: true,
        message: 'Registration successful! Please check your email for verification.',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // Use development API login for development
      devLogger.dev('Development mode: Using API login');
      const authResponse = await api.devLogin(email, password);
      
      // Store the token for API calls
      localStorage.setItem('auth_token', authResponse.access_token);
      localStorage.setItem('refresh_token', authResponse.refresh_token);
      
      // Create a mock session object for compatibility
      const mockSession = {
        access_token: authResponse.access_token,
        refresh_token: authResponse.refresh_token,
        expires_in: authResponse.expires_in,
        user: authResponse.user
      };
      
      // Set user and session state
      setUser(authResponse.user);
      setSession(mockSession as any);
      
      // Schedule automatic token refresh for the new token
      scheduleTokenRefresh(authResponse.access_token);
      
      // Load organizations
      try {
        const orgsData = await api.getOrganizations();
        setOrganizations(orgsData);
        if (orgsData.length > 0) {
          setCurrentOrganization(orgsData[0]);
          
          // Load organization settings for the first organization
          try {
            const orgId = getOrganizationId(orgsData[0]);
            devLogger.org('Loading organization settings during login:', orgId);
            const settings = await api.getOrganizationSettings(orgId);
            devLogger.org('✅ Organization settings loaded during login:', settings);
            setOrganizationSettings(settings);
          } catch (settingsError) {
            devLogger.warn('Could not load organization settings during login:', settingsError);
            setOrganizationSettings(null);
          }
        } else {
          devLogger.org('No organizations found (Login)');
        }
      } catch (orgError) {
        devLogger.warn('Could not load organizations:', orgError);
        setOrganizations([]);
      }

      return {
        success: true,
        message: 'Login successful!',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      };
    }
  };

  const signOut = async () => {
    try {
      // Clear automatic token refresh
      clearRefreshTimer();
      
      // Clear development tokens
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      
      
      // Also sign out from Supabase (in case both are used)
      await supabase.auth.signOut();
      
      setUser(null);
      setSession(null);
      setOrganizations([]);
      setCurrentOrganization(null);
      
      // Clear organization state
      setOrganizationSettings(null);
      setOnboardingLoading(false);
      
      devLogger.auth('✅ Successfully signed out and cleared all cached data');
    } catch (error) {
      devLogger.error('Error signing out:', error);
    }
  };

  const refreshOrganizations = async () => {
    // Use existing session state instead of fetching again
    if (!session || !session.user) {
      devLogger.org('No valid session for refreshing organizations');
      return;
    }
    
    try {
      const orgsData = await api.getOrganizations();
      setOrganizations(orgsData);
    } catch (error) {
      devLogger.error('Error refreshing organizations:', error);
    }
  };

  const createOrganization = async (
    name: string,
    description?: string
  ): Promise<Organization> => {
    if (!session) {
      throw new Error('Must be logged in to create organization');
    }

    try {
      const newOrg = await api.createOrganization(name, description);
      
      // Refresh organizations list
      await refreshOrganizations();
      
      // Set as current organization if it's the first one
      if (organizations.length === 0) {
        setCurrentOrganization(newOrg);
      }
      
      return newOrg;
    } catch (error) {
      throw error;
    }
  };

  const getOrganizations = async (): Promise<Organization[]> => {
    try {
      return await api.getOrganizations();
    } catch (error) {
      devLogger.error('Error getting organizations:', error);
      return [];
    }
  };

  const value: AuthContextType = {
    session,
    user,
    loading,
    organizations,
    currentOrganization,
    organizationSettings,
    hasCompletedOnboarding,
    onboardingLoading,
    setHasCompletedOnboarding,
    setOnboardingLoading,
    signUp,
    signIn,
    signOut,
    setCurrentOrganization,
    refreshOrganizations,
    getOrganizations,
    createOrganization,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}