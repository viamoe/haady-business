'use client';

import * as React from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnnouncements } from '@/lib/announcement-context';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg';

export function AnnouncementModal() {
  const { activeAnnouncement, dismissAnnouncement } = useAnnouncements();
  const router = useRouter();
  const [isClosing, setIsClosing] = React.useState(false);

  if (!activeAnnouncement) return null;

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      dismissAnnouncement(activeAnnouncement.id);
      setIsClosing(false);
    }, 300);
  };

  const handleCTA = () => {
    if (activeAnnouncement.ctaAction) {
      activeAnnouncement.ctaAction();
    } else if (activeAnnouncement.ctaLink) {
      // Check if link already has locale-country prefix
      const hasPrefix = /^\/[a-z]{2}-[a-z]{2}/i.test(activeAnnouncement.ctaLink);
      if (hasPrefix) {
        router.push(activeAnnouncement.ctaLink);
      } else {
        // Localize the link
        const { getLocalizedUrl } = require('@/lib/localized-url');
        const localizedLink = getLocalizedUrl(activeAnnouncement.ctaLink, window.location.pathname);
        router.push(localizedLink);
      }
    }
    handleDismiss();
  };

  const getTypeStyles = () => {
    switch (activeAnnouncement.type) {
      case 'feature':
        return {
          bg: 'bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900',
          button: 'bg-purple-500 hover:bg-purple-600 text-white',
          accent: 'text-purple-300',
        };
      case 'success':
        return {
          bg: 'bg-gradient-to-br from-green-900 via-green-800 to-green-900',
          button: 'bg-green-500 hover:bg-green-600 text-white',
          accent: 'text-green-300',
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900',
          button: 'bg-amber-500 hover:bg-amber-600 text-white',
          accent: 'text-amber-300',
        };
      case 'update':
        return {
          bg: 'bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900',
          button: 'bg-blue-500 hover:bg-blue-600 text-white',
          accent: 'text-blue-300',
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900',
          button: 'bg-[#F4610B] hover:bg-[#E55A0A] text-white',
          accent: 'text-gray-300',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className={cn(
        'fixed inset-0 z-[200] flex items-center justify-center p-4',
        'data-[state=closing]:animate-out data-[state=closing]:fade-out-0',
        isClosing && 'data-[state=closing]'
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-500/50"
        onClick={activeAnnouncement.dismissable !== false ? handleDismiss : undefined}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden',
          'animate-in fade-in-0 zoom-in-95 duration-300',
          styles.bg,
          isClosing && 'animate-out fade-out-0 zoom-out-95'
        )}
      >
        {/* Close button */}
        {activeAnnouncement.dismissable !== false && (
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 z-10 rounded-full p-2 bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="flex flex-col lg:flex-row">
          {/* Left side - Preview/Image */}
          {(activeAnnouncement.previewComponent || activeAnnouncement.imageUrl) && (
            <div className="lg:w-2/5 p-6 lg:p-8 flex items-center justify-center bg-black/20 relative overflow-hidden">
              {/* Decorative confetti elements - scattered around */}
              <div className="absolute top-8 left-8 w-10 h-10 bg-purple-400 rounded-full opacity-50 blur-md animate-pulse" />
              <div className="absolute top-16 right-12 w-8 h-8 bg-orange-400 rounded-full opacity-50 blur-md animate-pulse delay-300" />
              <div className="absolute bottom-12 left-12 w-9 h-9 bg-green-400 rounded-full opacity-50 blur-md animate-pulse delay-700" />
              <div className="absolute bottom-8 right-8 w-7 h-7 bg-blue-400 rounded-full opacity-50 blur-md animate-pulse delay-500" />
              <div className="absolute top-1/2 left-4 w-6 h-6 bg-pink-400 rounded-full opacity-40 blur-sm" />
              <div className="absolute top-1/3 right-6 w-5 h-5 bg-yellow-400 rounded-full opacity-40 blur-sm" />
              
              {activeAnnouncement.previewComponent ? (
                <div className="relative w-full max-w-sm z-10">
                  {/* Preview content */}
                  <div className="relative bg-white rounded-xl border-2 border-white/40 p-3 shadow-2xl">
                    {activeAnnouncement.previewComponent}
                  </div>
                </div>
              ) : activeAnnouncement.imageUrl ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-white/40 shadow-2xl z-10">
                  <Image
                    src={activeAnnouncement.imageUrl}
                    alt={activeAnnouncement.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : null}
            </div>
          )}

          {/* Right side - Content */}
          <div className={cn(
            'flex-1 p-8 lg:p-12 flex flex-col justify-center',
            activeAnnouncement.previewComponent || activeAnnouncement.imageUrl ? 'lg:pl-12' : ''
          )}>
            <div className="space-y-6">
              {/* Icon/Sparkles */}
              <div className="flex items-center gap-2">
                <Sparkles className={cn('h-5 w-5', styles.accent)} />
                {activeAnnouncement.type === 'feature' && (
                  <span className={cn('text-xs font-medium uppercase tracking-wider', styles.accent)}>
                    New Feature
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="text-3xl lg:text-5xl font-bold text-white leading-tight">
                {activeAnnouncement.title}
              </h2>

              {/* Description */}
              <p className="text-lg lg:text-xl text-white/85 leading-relaxed max-w-lg">
                {activeAnnouncement.description}
              </p>

              {/* CTA Button */}
              {activeAnnouncement.ctaText && (
                <div className="pt-2">
                  <Button
                    onClick={handleCTA}
                    className={cn('h-14 px-10 text-lg font-semibold rounded-xl shadow-lg', styles.button)}
                  >
                    {activeAnnouncement.ctaText}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

