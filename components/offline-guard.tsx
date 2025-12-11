'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useNetworkStatus } from '@/lib/network-context';

/**
 * Component that redirects to /offline page when user goes offline
 * This replaces the browser's default "no connection" page
 */
export function OfflineGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isOffline, status } = useNetworkStatus();

  useEffect(() => {
    // Don't redirect if already on offline page
    if (pathname === '/offline') {
      return;
    }

    // Redirect to offline page when offline
    if (isOffline && status === 'offline') {
      // Small delay to avoid flashing
      const timeoutId = setTimeout(() => {
        router.push('/offline');
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [isOffline, status, pathname, router]);

  // Don't render children if we're offline and not on the offline page
  if (isOffline && status === 'offline' && pathname !== '/offline') {
    return null;
  }

  return <>{children}</>;
}

