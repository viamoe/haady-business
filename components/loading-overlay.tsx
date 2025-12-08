'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  className?: string;
}

export function LoadingOverlay({ isLoading, message, className }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Haady Logo with Heartbeat Animation */}
        <div className="animate-heartbeat">
          <Image
            src={HAADY_LOGO_URL}
            alt="Haady"
            width={64}
            height={64}
            className="w-16 h-16"
            priority
          />
        </div>
        
        {/* Message with Shimmer Effect */}
        {message && (
          <p className="text-sm font-medium text-gray-700 shimmer-text">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

