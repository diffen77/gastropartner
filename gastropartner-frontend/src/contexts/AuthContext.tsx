/**
 * Authentication context för GastroPartner React app
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

  const loadUserData = useCallback(async (existingSession?: Session | null) => {
    console.log('loadUserData called with session:', existingSession ? 'provided' : 'will fetch');
    try {
      setLoading(true);
      
      let session = existingSession;
      
      // Only fetch session if not provided
      if (!session) {
        console.log('Getting session from Supabase...');
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );
        
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        session = result.data.session;
      }
      
      console.log('Session result:', session);
      
      if (!session || !session.user) {
        console.log('No valid session found, skipping user data load');
        setUser(null);
        setOrganizations([]);
        setCurrentOrganization(null);
        return;
      }
      
      console.log('Valid session found, loading user data...');
      
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
      if (orgsData.length > 0 && !currentOrganization) {
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
  }, [currentOrganization]);

  // Initialize auth state
  useEffect(() => {
    console.log('AuthProvider useEffect running...');
    
    // Get initial session with timeout
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...');
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
          loadUserData(session);
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          await loadUserData(session);
        } else {
          setUser(null);
          setOrganizations([]);
          setCurrentOrganization(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadUserData]); // Include loadUserData dependency

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
      // Use Supabase direct authentication
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          message: error.message,
        };
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
      await supabase.auth.signOut();
      setUser(null);
      setOrganizations([]);
      setCurrentOrganization(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refreshOrganizations = async () => {
    // Double check we have a valid session before making API calls
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession || !currentSession.user) {
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