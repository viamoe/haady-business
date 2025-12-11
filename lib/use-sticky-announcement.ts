'use client';

import { useCallback } from 'react';
import { useStickyAnnouncements } from '@/components/sticky-announcement';
import type { AnnouncementType } from '@/lib/announcement-context';

export interface StickyAnnouncementOptions {
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

/**
 * Hook to easily create and manage sticky announcements
 */
export function useStickyAnnouncement() {
  const { addStickyAnnouncement, removeStickyAnnouncement, dismissStickyAnnouncement } = useStickyAnnouncements();

  const showStickyAnnouncement = useCallback((options: StickyAnnouncementOptions & { id?: string }) => {
    const id = options.id || `sticky-announcement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    addStickyAnnouncement({
      ...options,
      id,
      dismissable: options.dismissable !== false,
      position: options.position || 'bottom',
    });
  }, [addStickyAnnouncement]);

  const showOnboardingProgress = useCallback((
    step: number,
    totalSteps: number,
    ctaText?: string,
    ctaAction?: () => void
  ) => {
    showStickyAnnouncement({
      type: 'info',
      title: `Onboarding Progress: ${step} of ${totalSteps} completed`,
      description: `You're ${Math.round((step / totalSteps) * 100)}% done with setup`,
      ctaText: ctaText || 'Continue',
      ctaAction,
      position: 'bottom',
      persistent: true,
      priority: 10,
    });
  }, [showStickyAnnouncement]);

  const showNewProductAnnouncement = useCallback((
    productName: string,
    ctaLink?: string
  ) => {
    showStickyAnnouncement({
      type: 'feature',
      title: `New Product: ${productName}`,
      description: 'Check out our latest addition!',
      ctaText: 'View Product',
      ctaLink,
      position: 'bottom',
      priority: 8,
    });
  }, [showStickyAnnouncement]);

  return {
    showStickyAnnouncement,
    showOnboardingProgress,
    showNewProductAnnouncement,
    removeStickyAnnouncement,
    dismissStickyAnnouncement,
  };
}


