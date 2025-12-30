'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNetworkStatus } from '@/lib/network-context';
import { getLocalizedUrl } from '@/lib/localized-url';

// Force dynamic rendering to avoid static generation issues with layout cookies
export const dynamic = 'force-dynamic';

export default function OfflinePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { status, checkConnection, isOnline } = useNetworkStatus();
  const [isRetrying, setIsRetrying] = useState(false);

  // Redirect to home when back online
  useEffect(() => {
    if (isOnline && status === 'online') {
      // Small delay to ensure connection is stable
      setTimeout(() => {
        const homeUrl = getLocalizedUrl('/', pathname);
        router.push(homeUrl);
        router.refresh();
      }, 500);
    }
  }, [isOnline, status, router, pathname]);

  const handleRetry = async () => {
    setIsRetrying(true);
    await checkConnection();
    setTimeout(() => setIsRetrying(false), 1000);
  };

  const handleGoHome = () => {
    const homeUrl = getLocalizedUrl('/', pathname);
    router.push(homeUrl);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gray-200 rounded-full blur-xl opacity-50" />
            <div className="relative bg-white p-6 rounded-full shadow-lg">
              <WifiOff className="h-16 w-16 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">
            You're Offline
          </h1>
          <p className="text-gray-600 text-lg">
            It looks like you've lost your internet connection. Please check your network settings and try again.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex-1 bg-[#F4610B] hover:bg-[#E55A0A] text-white h-12"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </>
            )}
          </Button>
          <Button
            onClick={handleGoHome}
            variant="outline"
            className="flex-1 h-12"
          >
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </div>

        {/* Status indicator */}
        {status === 'reconnecting' && (
          <div className="pt-4">
            <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Reconnecting...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

