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

// Interval for checking if user still exists (30 seconds)
const USER_CHECK_INTERVAL = 30000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to check if user still exists in the database
  const checkUserExists = useCallback(async (userId: string): Promise<boolean> => {
    try {
      // Verify the user still exists in Supabase Auth
      // This is the primary check - if user is deleted from auth.users, getUser() will fail
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        console.warn('User no longer exists in auth system:', authError?.message);
        return false;
      }

      // If getUser() succeeds, user exists in auth system
      // We don't need to check merchant_users table because:
      // 1. New users might not be in merchant_users yet (they're still setting up)
      // 2. The auth.users table is the source of truth for user existence
      return true;
    } catch (error) {
      console.error('Error checking user existence:', error);
      // On error, assume user still exists to prevent false logouts
      // Network issues, etc. should not trigger logout
      return true;
    }
  }, []);

  // Function to handle user deletion/logout
  const handleUserDeleted = useCallback(async () => {
    console.warn('User has been deleted, signing out...');
    
    // Clear the check interval
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }

    // Clear state first
    setSession(null);
    setUser(null);
    setLoading(false);

    // Sign out the user and wait for it to complete
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }

    // Clear all Supabase-related cookies manually to ensure they're gone
    const cookiesToClear = [
      'sb-access-token',
      'sb-refresh-token',
      'supabase.auth.token',
    ];
    
    cookiesToClear.forEach(cookieName => {
      // Clear for current domain
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      // Clear for all possible paths
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
      // Clear for parent domain if subdomain
      const parts = window.location.hostname.split('.');
      if (parts.length > 2) {
        const parentDomain = '.' + parts.slice(-2).join('.');
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${parentDomain};`;
      }
    });

    // Clear localStorage and sessionStorage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error('Error clearing storage:', e);
    }

    // Wait a bit to ensure cookies are cleared, then redirect
    // Use replace to prevent back button from going back to logged-in state
    setTimeout(() => {
      window.location.replace('/login?reason=account_deleted&logout=true');
    }, 100);
  }, []);

  useEffect(() => {
    // Get initial user - using getUser() for security (verifies with Supabase Auth server)
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (!error && user) {
        // Get session for compatibility with components that need it
        supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
          // If session error is due to invalid refresh token, clear it
          if (sessionError && sessionError.message?.includes('refresh_token')) {
            console.warn('Invalid refresh token detected, clearing session');
            supabase.auth.signOut();
            setSession(null);
            setUser(null);
          } else {
            setSession(session);
            setUser(user);
          }
          setLoading(false);
        });
      } else {
        // If getUser fails, clear any invalid session
        if (error?.message?.includes('refresh_token')) {
          supabase.auth.signOut();
        }
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle token refresh errors
      if (event === 'TOKEN_REFRESHED' && !session) {
        // Token refresh failed, clear invalid session
        console.warn('Token refresh failed, signing out');
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      // Handle user deleted event
      if (event === 'USER_DELETED') {
        handleUserDeleted();
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [handleUserDeleted]);

  // Set up periodic check for user existence
  useEffect(() => {
    if (!user?.id) {
      // Clear interval if no user
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    // Check user existence periodically
    const checkUser = async () => {
      const exists = await checkUserExists(user.id);
      if (!exists) {
        handleUserDeleted();
      }
    };

    // Set up interval
    checkIntervalRef.current = setInterval(checkUser, USER_CHECK_INTERVAL);

    // Also check on window focus (when user returns to the tab)
    const handleFocus = () => {
      checkUser();
    };
    window.addEventListener('focus', handleFocus);

    // Cleanup
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

