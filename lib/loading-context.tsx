'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { LoadingOverlay } from '@/components/loading-overlay';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean, message?: string) => void;
  loadingMessage: string | undefined;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | undefined>(undefined);
  const pathname = usePathname();

  // Clear loading when route changes (navigation occurred)
  useEffect(() => {
    // Only clear loading if it's currently active when pathname changes
    // This indicates navigation happened while loading was shown
    const timer = setTimeout(() => {
      setIsLoading((current) => {
        // Only clear if still loading (prevents race conditions)
        if (current) {
          return false;
        }
        return current;
      });
      setLoadingMessage(undefined);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [pathname]);

  // Safety timeout: automatically clear loading if it's been active for more than 10 seconds
  useEffect(() => {
    if (isLoading) {
      const safetyTimer = setTimeout(() => {
        setIsLoading(false);
        setLoadingMessage(undefined);
        console.warn('Loading state automatically cleared after 10 seconds (safety timeout)');
      }, 10000);
      
      return () => clearTimeout(safetyTimer);
    }
  }, [isLoading]);

  const setLoading = (loading: boolean, message?: string) => {
    setIsLoading(loading);
    setLoadingMessage(message);
  };

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading, loadingMessage }}>
      {children}
      <LoadingOverlay isLoading={isLoading} message={loadingMessage} />
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

