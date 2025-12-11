'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

type NetworkStatus = 'online' | 'offline' | 'slow' | 'reconnecting';

interface NetworkContextType {
  status: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
  lastOnlineAt: Date | null;
  checkConnection: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType>({
  status: 'online',
  isOnline: true,
  isOffline: false,
  lastOnlineAt: null,
  checkConnection: async () => true,
});

// Ping endpoint to verify actual connectivity (not just browser online status)
const CONNECTIVITY_CHECK_URL = 'https://www.google.com/generate_204';
const CONNECTIVITY_CHECK_INTERVAL = 30000; // 30 seconds
const SLOW_CONNECTION_THRESHOLD = 5000; // 5 seconds

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<NetworkStatus>('online');
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(new Date());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check actual connectivity by making a request
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      setStatus('offline');
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SLOW_CONNECTION_THRESHOLD);

      const startTime = Date.now();
      
      await fetch(CONNECTIVITY_CHECK_URL, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (responseTime > SLOW_CONNECTION_THRESHOLD * 0.8) {
        setStatus('slow');
      } else {
        setStatus('online');
        setLastOnlineAt(new Date());
      }

      return true;
    } catch (error) {
      // If fetch fails, we're likely offline or have very poor connectivity
      if (navigator.onLine) {
        // Browser thinks we're online but fetch failed - could be slow or blocked
        setStatus('slow');
      } else {
        setStatus('offline');
      }
      return false;
    }
  }, []);

  // Handle browser online event
  const handleOnline = useCallback(() => {
    setStatus('reconnecting');
    
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Verify actual connectivity
    reconnectTimeoutRef.current = setTimeout(async () => {
      const isConnected = await checkConnection();
      if (isConnected) {
        setStatus('online');
        setLastOnlineAt(new Date());
      }
    }, 1000);
  }, [checkConnection]);

  // Handle browser offline event
  const handleOffline = useCallback(() => {
    setStatus('offline');
  }, []);

  // Set up event listeners and periodic checks
  useEffect(() => {
    // Initial check
    if (typeof window !== 'undefined') {
      if (!navigator.onLine) {
        setStatus('offline');
      } else {
        checkConnection();
      }
    }

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up periodic connectivity check
    checkIntervalRef.current = setInterval(() => {
      if (navigator.onLine) {
        checkConnection();
      }
    }, CONNECTIVITY_CHECK_INTERVAL);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [handleOnline, handleOffline, checkConnection]);

  const value: NetworkContextType = {
    status,
    isOnline: status === 'online' || status === 'slow',
    isOffline: status === 'offline',
    lastOnlineAt,
    checkConnection,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetworkStatus = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetworkStatus must be used within a NetworkStatusProvider');
  }
  return context;
};

