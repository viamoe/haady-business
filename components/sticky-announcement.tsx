'use client';

import * as React from 'react';
import { X, ChevronRight, Sparkles, Globe, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnnouncements } from '@/lib/announcement-context';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import type { AnnouncementType } from '@/lib/announcement-context';
import { useLocale } from '@/i18n/context';

interface StickyAnnouncement {
  id: string;
  type: AnnouncementType;
  title?: string;
  description?: string;
  ctaText?: string;
  ctaIcon?: React.ReactNode;
  ctaAction?: () => void;
  ctaLink?: string;
  position?: 'top' | 'bottom';
  dismissable?: boolean;
  persistent?: boolean;
  priority?: number;
  startDate?: Date;
  endDate?: Date;
  onDismiss?: () => void;
}

interface StickyAnnouncementContextType {
  stickyAnnouncements: StickyAnnouncement[];
  activeStickyAnnouncement: StickyAnnouncement | null;
  addStickyAnnouncement: (announcement: StickyAnnouncement) => void;
  removeStickyAnnouncement: (id: string) => void;
  dismissStickyAnnouncement: (id: string) => void;
}

const StickyAnnouncementContext = React.createContext<StickyAnnouncementContextType>({
  stickyAnnouncements: [],
  activeStickyAnnouncement: null,
  addStickyAnnouncement: () => {},
  removeStickyAnnouncement: () => {},
  dismissStickyAnnouncement: () => {},
});

export function StickyAnnouncementProvider({ children }: { children: React.ReactNode }) {
  const [stickyAnnouncements, setStickyAnnouncements] = React.useState<StickyAnnouncement[]>([]);
  const [activeStickyAnnouncement, setActiveStickyAnnouncement] = React.useState<StickyAnnouncement | null>(null);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());

  // Load dismissed announcements from localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('haady-dismissed-sticky-announcements');
      if (stored) {
        try {
          const ids = JSON.parse(stored) as string[];
          setDismissedIds(new Set(ids));
        } catch (error) {
          console.error('Error loading dismissed sticky announcements:', error);
        }
      }
    }
  }, []);

  // Save dismissed announcements to localStorage
  const saveDismissedIds = React.useCallback((ids: Set<string>) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('haady-dismissed-sticky-announcements', JSON.stringify(Array.from(ids)));
    }
  }, []);

  // Filter out dismissed and expired announcements
  const getActiveStickyAnnouncements = React.useCallback(() => {
    const now = new Date();
    return stickyAnnouncements
      .filter(announcement => {
        // Skip if dismissed
        if (dismissedIds.has(announcement.id)) return false;
        
        // Check date range
        if (announcement.startDate && now < announcement.startDate) return false;
        if (announcement.endDate && now > announcement.endDate) return false;
        
        return true;
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }, [stickyAnnouncements, dismissedIds]);

  // Show the highest priority active announcement
  React.useEffect(() => {
    const active = getActiveStickyAnnouncements();
    if (active.length > 0 && !activeStickyAnnouncement) {
      setActiveStickyAnnouncement(active[0]);
    } else if (active.length === 0) {
      setActiveStickyAnnouncement(null);
    }
  }, [stickyAnnouncements, dismissedIds, activeStickyAnnouncement, getActiveStickyAnnouncements]);

  const addStickyAnnouncement = React.useCallback((announcement: StickyAnnouncement) => {
    setStickyAnnouncements(prev => {
      // Check if announcement with same ID already exists
      if (prev.some(a => a.id === announcement.id)) {
        return prev;
      }
      return [...prev, announcement];
    });
  }, []);

  const removeStickyAnnouncement = React.useCallback((id: string) => {
    setStickyAnnouncements(prev => prev.filter(a => a.id !== id));
    if (activeStickyAnnouncement?.id === id) {
      setActiveStickyAnnouncement(null);
    }
  }, [activeStickyAnnouncement]);

  const dismissStickyAnnouncement = React.useCallback((id: string) => {
    const newDismissedIds = new Set(dismissedIds);
    newDismissedIds.add(id);
    setDismissedIds(newDismissedIds);
    saveDismissedIds(newDismissedIds);
    
    if (activeStickyAnnouncement?.id === id) {
      setActiveStickyAnnouncement(null);
    }
  }, [dismissedIds, activeStickyAnnouncement, saveDismissedIds]);

  const value: StickyAnnouncementContextType = {
    stickyAnnouncements,
    activeStickyAnnouncement,
    addStickyAnnouncement,
    removeStickyAnnouncement,
    dismissStickyAnnouncement,
  };

  return (
    <StickyAnnouncementContext.Provider value={value}>
      {children}
    </StickyAnnouncementContext.Provider>
  );
}

export const useStickyAnnouncements = () => {
  const context = React.useContext(StickyAnnouncementContext);
  if (context === undefined) {
    throw new Error('useStickyAnnouncements must be used within a StickyAnnouncementProvider');
  }
  return context;
};

export function StickyAnnouncementBanner() {
  const { activeStickyAnnouncement, dismissStickyAnnouncement } = useStickyAnnouncements();
  const router = useRouter();
  const { isRTL } = useLocale();
  const [isClosing, setIsClosing] = React.useState(false);

  if (!activeStickyAnnouncement) return null;

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      // Call onDismiss callback if provided
      if (activeStickyAnnouncement.onDismiss) {
        activeStickyAnnouncement.onDismiss();
      }
      dismissStickyAnnouncement(activeStickyAnnouncement.id);
      setIsClosing(false);
    }, 300);
  };

  const handleCTA = () => {
    if (activeStickyAnnouncement.ctaAction) {
      activeStickyAnnouncement.ctaAction();
    } else if (activeStickyAnnouncement.ctaLink) {
      // Check if link already has locale-country prefix
      const hasPrefix = /^\/[a-z]{2}-[a-z]{2}/i.test(activeStickyAnnouncement.ctaLink);
      if (hasPrefix) {
        router.push(activeStickyAnnouncement.ctaLink);
      } else {
        // Localize the link
        const { getLocalizedUrl } = require('@/lib/localized-url');
        const localizedLink = getLocalizedUrl(activeStickyAnnouncement.ctaLink, window.location.pathname);
        router.push(localizedLink);
      }
    }
    if (!activeStickyAnnouncement.persistent) {
      handleDismiss();
    }
  };

  const getTypeStyles = () => {
    switch (activeStickyAnnouncement.type) {
      case 'feature':
        return {
          bg: 'bg-gradient-to-r from-purple-600 to-purple-700',
          border: 'border-purple-500',
          icon: Sparkles,
          iconColor: 'text-purple-200',
        };
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-green-600 to-green-700',
          border: 'border-green-500',
          icon: CheckCircle2,
          iconColor: 'text-green-200',
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-amber-600 to-amber-700',
          border: 'border-amber-500',
          icon: AlertTriangle,
          iconColor: 'text-amber-200',
        };
      case 'update':
        return {
          bg: 'bg-gradient-to-r from-blue-600 to-blue-700',
          border: 'border-blue-500',
          icon: Globe,
          iconColor: 'text-blue-200',
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-700 to-gray-800',
          border: 'border-gray-600',
          icon: Info,
          iconColor: 'text-gray-200',
        };
    }
  };

  const styles = getTypeStyles();
  const Icon = styles.icon;
  const position = activeStickyAnnouncement.position || 'bottom';

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-[150] px-4 py-3',
        position === 'top' ? 'top-0' : 'bottom-0',
        position === 'top' 
          ? 'animate-in slide-in-from-top duration-300' 
          : 'animate-in slide-in-from-bottom duration-300',
        isClosing && (position === 'top' 
          ? 'animate-out slide-out-to-top' 
          : 'animate-out slide-out-to-bottom'),
        styles.bg,
        position === 'top' ? 'border-b' : 'border-t',
        styles.border,
        'shadow-lg'
      )}
    >
      <div className="container mx-auto max-w-7xl flex items-center justify-between gap-4">
        {/* Left side - Icon and Content */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Icon className={cn('h-5 w-5 flex-shrink-0', styles.iconColor)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {activeStickyAnnouncement.title && (
                <span className="font-semibold text-white text-sm sm:text-base">
                  {activeStickyAnnouncement.title}
                </span>
              )}
              {activeStickyAnnouncement.description && (
                <span className="text-white/90 text-xs sm:text-sm">
                  {activeStickyAnnouncement.description}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side - CTA and Close */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {activeStickyAnnouncement.ctaText && (
            <Button
              onClick={handleCTA}
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 h-8 px-4 text-xs sm:text-sm font-medium gap-2"
            >
              {activeStickyAnnouncement.ctaIcon}
              {activeStickyAnnouncement.ctaText}
              <ChevronRight className={cn("h-3 w-3", isRTL && "rotate-180")} />
            </Button>
          )}
          {activeStickyAnnouncement.dismissable !== false && (
            <button
              onClick={handleDismiss}
              className="rounded-full p-1.5 hover:bg-white/20 text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

