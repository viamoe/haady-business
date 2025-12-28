'use client';
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

// Interval for checking if user still exists (60 seconds)
const USER_CHECK_INTERVAL = 60000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  // Helper function to check if error is a refresh token error
  const isRefreshTokenError = useCallback((error: any): boolean => {
    if (!error) return false;
    const errorMessage = (error.message || String(error) || '').toLowerCase();
    const errorCode = error.status || error.code || '';
    return (
      errorMessage.includes('refresh token') ||
      errorMessage.includes('refresh_token') ||
      errorMessage.includes('invalid refresh token') ||
      errorMessage.includes('refresh token not found') ||
      (error.name === 'AuthApiError' && errorMessage.includes('not found')) ||
      (error.name === 'AuthApiError' && errorCode === 'invalid_grant')
    );
  }, []);

  // Function to check if user still exists in the database
  const checkUserExists = useCallback(async (userId: string): Promise<boolean | 'error' | 'offline'> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'offline';
    }

    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        const errorMessage = authError.message?.toLowerCase() || '';
        
        if (isRefreshTokenError(authError)) {
          return 'error';
        }
        
        const isNetworkError = 
          errorMessage.includes('fetch') ||
          errorMessage.includes('network') ||
          errorMessage.includes('failed to fetch') ||
          errorMessage.includes('networkerror') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('aborted');

        if (isNetworkError) {
          return 'offline';
        }

        const isUserDeleted = 
          errorMessage.includes('user not found') ||
          errorMessage.includes('user has been deleted') ||
          errorMessage.includes('invalid user');
        
        if (isUserDeleted) {
          return false;
        }
        
        return 'error';
      }
      
      return authUser ? true : 'error';
    } catch (error) {
      const errorStr = String(error).toLowerCase();
      if (errorStr.includes('fetch') || errorStr.includes('network')) {
        return 'offline';
      }
      return 'error';
    }
  }, [isRefreshTokenError]);

  // Function to handle user deletion/logout
  const handleUserDeleted = useCallback(async () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }

    setSession(null);
    setUser(null);
    setLoading(false);

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }

    // Clear cookies
    const cookiesToClear = ['sb-access-token', 'sb-refresh-token', 'supabase.auth.token'];
    cookiesToClear.forEach(cookieName => {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
      const parts = window.location.hostname.split('.');
      if (parts.length > 2) {
        const parentDomain = '.' + parts.slice(-2).join('.');
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${parentDomain};`;
      }
    });

    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error('Error clearing storage:', e);
    }

    setTimeout(() => {
      window.location.replace('/auth/login?reason=account_deleted');
    }, 100);
  }, []);

  // Main auth state management - use onAuthStateChange as single source of truth
  useEffect(() => {
    let mounted = true;

    // Global error handler for unhandled refresh token errors
    const handleUnhandledError = (event: ErrorEvent) => {
      if (isRefreshTokenError(event.error)) {
        event.preventDefault();
        event.stopPropagation();
        // Silently handle refresh token errors - don't log to console
        supabase.auth.signOut().catch(() => {});
        return true;
      }
      return false;
    };
    
    // Also handle unhandled promise rejections (Supabase may throw refresh token errors as promises)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isRefreshTokenError(event.reason)) {
        event.preventDefault();
        // Silently handle refresh token errors
        supabase.auth.signOut().catch(() => {});
        return true;
      }
      return false;
    };
    
    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Get initial session synchronously from storage
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          if (isRefreshTokenError(error)) {
            await supabase.auth.signOut().catch(() => {});
          }
          setSession(null);
          setUser(null);
          setLoading(false);
          initializedRef.current = true;
          return;
        }

        // Set initial state from session
        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
        } else {
          setSession(null);
          setUser(null);
        }
        
        setLoading(false);
        initializedRef.current = true;
      } catch (error) {
        if (!mounted) return;
        console.warn('Error initializing auth:', error);
        setSession(null);
        setUser(null);
        setLoading(false);
        initializedRef.current = true;
      }
    };

    initializeAuth();

    // Listen for auth state changes - this is the primary source of truth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      // Suppress console logs for refresh token errors - they're handled gracefully
      if (process.env.NODE_ENV === 'development') {
        console.log('Auth state change:', event, newSession ? 'has session' : 'no session');
      }

      // Handle token refresh errors
      if (event === 'TOKEN_REFRESHED' && !newSession) {
        // Refresh token is invalid - silently sign out
        try {
          await supabase.auth.signOut();
        } catch (error) {
          // Ignore sign out errors - we're already handling the invalid token
        }
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      // Handle signed out event
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      // For events with a session, use the session's user directly
      // The session.user is already verified by Supabase
      if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);
        setLoading(false);
      } else {
        // No session, clear everything
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [isRefreshTokenError]);

  // Set up periodic check for user existence
  useEffect(() => {
    if (!user?.id || !initializedRef.current) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    const checkUser = async () => {
      const result = await checkUserExists(user.id);
      if (result === false) {
        handleUserDeleted();
      } else if (result === 'error') {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setLoading(false);
        window.location.replace('/auth/login');
      }
      // 'offline' and true cases - do nothing
    };

    checkIntervalRef.current = setInterval(checkUser, USER_CHECK_INTERVAL);

    const handleFocus = () => {
      checkUser();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id, checkUserExists, handleUserDeleted]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
