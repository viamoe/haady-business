'use client';

import { useNetworkStatus } from '@/lib/network-context';
import { useEffect, useState, useRef } from 'react';
import { WifiOff, CloudOff, RefreshCw, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg';

function formatTimeSince(date: Date | null): string {
  if (!date) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  return `${diffHours} hours ago`;
}

export function NetworkStatusOverlay() {
  const { status, isOffline, lastOnlineAt, checkConnection } = useNetworkStatus();
  const [isRetrying, setIsRetrying] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [timeSinceOnline, setTimeSinceOnline] = useState('');

  // Debounce showing overlay to avoid flashing on brief disconnections
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (status === 'offline') {
      // Show overlay after 2 seconds of being offline
      timeoutId = setTimeout(() => {
        setShowOverlay(true);
      }, 2000);
    } else if (status === 'reconnecting') {
      // Keep overlay visible during reconnection
      // It will hide once status becomes 'online'
    } else {
      // Hide overlay when online or slow
      setShowOverlay(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [status]);

  // Update time since online
  useEffect(() => {
    if (!showOverlay || !lastOnlineAt) return;

    const updateTime = () => {
      setTimeSinceOnline(formatTimeSince(lastOnlineAt));
    };

    updateTime();
    const intervalId = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(intervalId);
  }, [showOverlay, lastOnlineAt]);

  const handleRetry = async () => {
    setIsRetrying(true);
    await checkConnection();
    setTimeout(() => setIsRetrying(false), 1000);
  };

  if (!showOverlay) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-md" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center p-8 max-w-md text-center">
        {/* Animated Icon */}
        <div className="relative mb-6">
          {status === 'reconnecting' ? (
            <div className="relative">
              <div className="absolute inset-0 bg-orange-100 rounded-full animate-ping opacity-75" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-orange-50 to-orange-100 rounded-full flex items-center justify-center">
                <RefreshCw className="w-10 h-10 text-[#F4610B] animate-spin" />
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-0 bg-gray-100 rounded-full animate-pulse" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center">
                <WifiOff className="w-10 h-10 text-gray-400" />
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {status === 'reconnecting' ? 'Reconnecting...' : 'You\'re Offline'}
        </h1>

        {/* Subtitle */}
        <p className="text-gray-500 mb-6 leading-relaxed">
          {status === 'reconnecting' 
            ? 'We detected your connection is back. Verifying...'
            : 'It looks like you\'ve lost your internet connection. Check your Wi-Fi or mobile data and try again.'
          }
        </p>

        {/* Last Online */}
        {lastOnlineAt && status !== 'reconnecting' && (
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <Clock className="w-4 h-4" />
            <span>Last online {timeSinceOnline}</span>
          </div>
        )}

        {/* Retry Button */}
        {status !== 'reconnecting' && (
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className="bg-[#F4610B] hover:bg-[#d9550a] text-white rounded-xl h-12 px-8 shadow-none"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </>
            )}
          </Button>
        )}

        {/* Tips */}
        <div className="mt-8 space-y-3 text-left w-full">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Quick Tips
          </p>
          <div className="flex items-start gap-3 text-sm text-gray-500">
            <WifiOff className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
            <span>Check if Wi-Fi or mobile data is turned on</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-gray-500">
            <CloudOff className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
            <span>Try moving closer to your router</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-gray-500">
            <Zap className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
            <span>Toggle airplane mode on and off</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Small indicator for slow connection (non-blocking)
export function SlowConnectionBanner() {
  const { status } = useNetworkStatus();
  const [showBanner, setShowBanner] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (status === 'slow') {
      // Show immediately when status becomes slow
      setShowBanner(true);
    } else if (status === 'online') {
      // Hide after a delay when connection improves
      hideTimeoutRef.current = setTimeout(() => {
        setShowBanner(false);
      }, 2000);
    } else {
      // For offline/reconnecting, hide immediately
      setShowBanner(false);
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [status]);

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-2 bg-[#F4610B] text-white px-4 py-2 rounded-full shadow-lg text-sm">
        <Zap className="w-4 h-4 text-white" />
        <span>Slow connection detected</span>
      </div>
    </div>
  );
}

