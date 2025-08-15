/**
 * Authentication context för GastroPartner React app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, api, User, Organization } from '../lib/supabase';

interface AuthContextType {
  // Authentication state
  session: Session | null;
  user: User | null;
  loading: boolean;
  
  // Organizations
  organizations: Organization[];
  currentOrganization: Organization | null;
  
  // Authentication methods
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; message: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signOut: () => Promise<void>;
  
  // Organization methods
  setCurrentOrganization: (org: Organization | null) => void;
  refreshOrganizations: () => Promise<void>;
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


  // Initialize auth state
  useEffect(() => {
    console.log('AuthProvider useEffect running...');
    
    // Get initial session with timeout
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...');
        
        // Check for development mode token first
        const devToken = localStorage.getItem('auth_token');
        const refreshToken = localStorage.getItem('refresh_token');
        if (devToken) {
          console.log('🔧 Development token found, using dev mode authentication');
          
          // Always trust the stored tokens initially - don't clear them on API failures
          // Create a mock session for compatibility immediately
          const mockSession = {
            access_token: devToken,
            refresh_token: refreshToken,
            user: null // Will be populated after successful API call
          };
          setSession(mockSession as any);
          
          try {
            // Try to get current user with the dev token
            const userData = await api.getCurrentUser();
            setUser(userData);
            
            // Update session with user data
            const updatedSession = {
              ...mockSession,
              user: userData
            };
            setSession(updatedSession as any);
            
            // Load organizations
            const orgsData = await api.getOrganizations();
            setOrganizations(orgsData);
            if (orgsData.length > 0) {
              setCurrentOrganization(orgsData[0]);
            }
            
          } catch (error) {
            console.warn('Development token validation failed, but keeping tokens for retry:', error);
            // Don't clear tokens here - let them be used for the session
            // The API calls will handle invalid tokens on a per-request basis
            // Only clear if we get a 401/403 indicating the token is definitely invalid
            if (error instanceof Error && error.message.includes('401')) {
              console.log('Token is definitely invalid (401), clearing...');
              localStorage.removeItem('auth_token');
              localStorage.removeItem('refresh_token');
              setSession(null);
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
        console.log('Initial session check:', session ? 'found session' : 'no session', session);
        
        setSession(session);
        if (session?.user) {
          console.log('User found, loading user data...');
          try {
            setLoading(true);
            
            // Load user profile från backend
            console.log('Calling api.getCurrentUser()...');
            const userData = await api.getCurrentUser(session.access_token);
            console.log('User data received:', userData);
            setUser(userData);
            
            // Load organizations
            console.log('Calling api.getOrganizations()...');
            const orgsData = await api.getOrganizations(session.access_token);
            console.log('Organizations data received:', orgsData);
            setOrganizations(orgsData);
            
            // Set first organization as current if none selected
            if (orgsData.length > 0) {
              setCurrentOrganization(orgsData[0]);
            }
            
          } catch (error) {
            console.error('Error loading user data:', error);
            // If backend call fails, still try to get basic user info från Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              setUser({
                id: user.id,
                email: user.email || '',
                full_name: user.user_metadata?.full_name || '',
                created_at: user.created_at,
                updated_at: user.updated_at || user.created_at,
                email_confirmed_at: user.email_confirmed_at || null,
                last_sign_in_at: user.last_sign_in_at || null,
              });
            } else {
              // If no user at all, clear all state
              setUser(null);
              setOrganizations([]);
              setCurrentOrganization(null);
            }
          } finally {
            setLoading(false);
          }
        } else {
          console.log('No user found, setting loading to false');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        console.log('Session check failed, assuming no user - setting loading to false');
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
          console.log('🔧 Development token exists, ignoring Supabase auth changes');
          return; // Don't interfere with dev token authentication
        }
        
        setSession(session);
        
        if (session?.user) {
          try {
            setLoading(true);
            
            // Load user profile från backend
            console.log('Auth change: Calling api.getCurrentUser()...');
            const userData = await api.getCurrentUser(session.access_token);
            console.log('Auth change: User data received:', userData);
            setUser(userData);
            
            // Load organizations
            console.log('Auth change: Calling api.getOrganizations()...');
            const orgsData = await api.getOrganizations(session.access_token);
            console.log('Auth change: Organizations data received:', orgsData);
            setOrganizations(orgsData);
            
            // Set first organization as current if none selected
            if (orgsData.length > 0) {
              setCurrentOrganization(orgsData[0]);
            }
            
          } catch (error) {
            console.error('Auth change: Error loading user data:', error);
            // If backend call fails, still try to get basic user info från Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              setUser({
                id: user.id,
                email: user.email || '',
                full_name: user.user_metadata?.full_name || '',
                created_at: user.created_at,
                updated_at: user.updated_at || user.created_at,
                email_confirmed_at: user.email_confirmed_at || null,
                last_sign_in_at: user.last_sign_in_at || null,
              });
            } else {
              // If no user at all, clear all state
              setUser(null);
              setOrganizations([]);
              setCurrentOrganization(null);
            }
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

    return () => subscription.unsubscribe();
  }, []); // Remove loadUserData dependency to prevent infinite loops

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
      console.log('🔧 Development mode: Using API login');
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
      
      // Load organizations
      try {
        const orgsData = await api.getOrganizations();
        setOrganizations(orgsData);
        if (orgsData.length > 0) {
          setCurrentOrganization(orgsData[0]);
        }
      } catch (orgError) {
        console.warn('Could not load organizations:', orgError);
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
      // Clear development tokens
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      
      // Also sign out from Supabase (in case both are used)
      await supabase.auth.signOut();
      
      setUser(null);
      setSession(null);
      setOrganizations([]);
      setCurrentOrganization(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refreshOrganizations = async () => {
    // Use existing session state instead of fetching again
    if (!session || !session.user) {
      console.log('No valid session for refreshing organizations');
      return;
    }
    
    try {
      const orgsData = await api.getOrganizations();
      setOrganizations(orgsData);
    } catch (error) {
      console.error('Error refreshing organizations:', error);
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

  const value: AuthContextType = {
    session,
    user,
    loading,
    organizations,
    currentOrganization,
    signUp,
    signIn,
    signOut,
    setCurrentOrganization,
    refreshOrganizations,
    createOrganization,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}