'use client';

import { useCallback } from 'react';
import { useAnnouncements } from './announcement-context';
import type { Announcement } from './announcement-context';

/**
 * Hook to easily create and manage announcements
 */
export function useAnnouncement() {
  const { addAnnouncement, removeAnnouncement, dismissAnnouncement } = useAnnouncements();

  const showAnnouncement = useCallback((announcement: Omit<Announcement, 'id'> & { id?: string }) => {
    const id = announcement.id || `announcement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    addAnnouncement({
      ...announcement,
      id,
      dismissable: announcement.dismissable !== false,
    });
  }, [addAnnouncement]);

  const showFeatureAnnouncement = useCallback((
    title: string,
    description: string,
    options?: {
      ctaText?: string;
      ctaAction?: () => void;
      ctaLink?: string;
      previewComponent?: React.ReactNode;
      imageUrl?: string;
      persistent?: boolean;
      priority?: number;
    }
  ) => {
    showAnnouncement({
      type: 'feature',
      title,
      description,
      ...options,
    });
  }, [showAnnouncement]);

  const showUpdateAnnouncement = useCallback((
    title: string,
    description: string,
    options?: {
      ctaText?: string;
      ctaAction?: () => void;
      ctaLink?: string;
      previewComponent?: React.ReactNode;
      imageUrl?: string;
      persistent?: boolean;
      priority?: number;
    }
  ) => {
    showAnnouncement({
      type: 'update',
      title,
      description,
      ...options,
    });
  }, [showAnnouncement]);

  return {
    showAnnouncement,
    showFeatureAnnouncement,
    showUpdateAnnouncement,
    removeAnnouncement,
    dismissAnnouncement,
  };
}

