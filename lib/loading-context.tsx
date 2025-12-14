'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { LoadingOverlay } from '@/components/loading-overlay';
import { LoadingBar } from '@/components/loading-bar';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean, message?: string, duration?: number, showOverlay?: boolean, disableSafetyTimeout?: boolean) => void;
  loadingMessage: string | undefined;
  loadingDuration: number | undefined;
  showOverlay: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | undefined>(undefined);
  const [loadingDuration, setLoadingDuration] = useState<number | undefined>(undefined);
  const [showOverlay, setShowOverlay] = useState(true); // Default to showing overlay
  const pathname = usePathname();
  const prevPathnameRef = useRef<string | null>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Automatically show loading bar on navigation
  useEffect(() => {
    // Skip on initial mount
    if (prevPathnameRef.current === null) {
      prevPathnameRef.current = pathname;
      return;
    }

    // If pathname changed, it means navigation occurred
    if (prevPathnameRef.current !== pathname) {
      // Check if this is navigation within dashboard (internal navigation)
      const isDashboardNavigation = 
        prevPathnameRef.current?.startsWith('/dashboard') && 
        pathname.startsWith('/dashboard');
      
      // Show loading bar for all navigation (including dashboard)
      // But disable overlay for dashboard navigation
      setIsLoading(true);
      setLoadingMessage(undefined);
      setLoadingDuration(undefined);
      
      // Disable overlay for dashboard navigation
      if (isDashboardNavigation) {
        setShowOverlay(false);
      } else {
        setShowOverlay(true);
      }

      // Clear any existing timeout
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }

      // Hide loading bar after navigation completes
      // Use a shorter delay for dashboard navigation, longer for others
      const delay = isDashboardNavigation ? 300 : 800;
      navigationTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setLoadingMessage(undefined);
        setLoadingDuration(undefined);
      }, delay);

      // Update previous pathname
      prevPathnameRef.current = pathname;
    }

    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, [pathname]);

  // Intercept link clicks to show loading bar
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href) {
        const url = new URL(link.href);
        const currentUrl = new URL(window.location.href);
        
        // Only show loading for same-origin navigation
        if (url.origin === currentUrl.origin && url.pathname !== currentUrl.pathname) {
          // Check if this is navigation within dashboard (internal navigation)
          const isDashboardNavigation = 
            currentUrl.pathname.startsWith('/dashboard') && 
            url.pathname.startsWith('/dashboard');
          
          // Show loading bar for all navigation, but disable overlay for dashboard
          if (!link.hasAttribute('download') && !link.hasAttribute('target')) {
            setIsLoading(true);
            setLoadingMessage(undefined);
            setLoadingDuration(undefined);
            
            // Disable overlay for dashboard navigation
            if (isDashboardNavigation) {
              setShowOverlay(false);
            } else {
              setShowOverlay(true);
            }
          }
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  // Show loading bar on page refresh/reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      setIsLoading(true);
      setLoadingMessage('Refreshing...');
    };

    // Check if this is a page refresh (not initial load)
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry?.type === 'reload') {
      setIsLoading(true);
      setLoadingMessage('Loading...');
      // Hide after a short delay (page should be loaded by then)
      const timer = setTimeout(() => {
        setIsLoading(false);
        setLoadingMessage(undefined);
      }, 500);
      return () => clearTimeout(timer);
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Safety timeout: automatically clear loading if it's been active for too long
  // Use longer timeout for sync operations (60s) vs normal operations (10s)
  useEffect(() => {
    if (isLoading) {
      const isSyncOperation = loadingMessage?.toLowerCase().includes('sync') || false
      const timeout = isSyncOperation ? 60000 : 10000 // 60s for sync, 10s for others
      
      const safetyTimer = setTimeout(() => {
        setIsLoading(false);
        setLoadingMessage(undefined);
        setLoadingDuration(undefined);
        console.warn(`Loading state automatically cleared after ${timeout / 1000} seconds (safety timeout)`);
      }, timeout);
      
      return () => clearTimeout(safetyTimer);
    }
  }, [isLoading, loadingMessage]);

  const setLoading = (loading: boolean, message?: string, duration?: number, showOverlayFlag: boolean = true) => {
    setIsLoading(loading);
    setLoadingMessage(message);
    setLoadingDuration(duration);
    setShowOverlay(showOverlayFlag);
  };

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading, loadingMessage, loadingDuration, showOverlay }}>
      {children}
      <LoadingBar isLoading={isLoading} duration={loadingDuration} />
      {/* Only show overlay when explicitly enabled (not for dashboard navigation) */}
      <LoadingOverlay isLoading={isLoading && showOverlay} message={loadingMessage} />
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

