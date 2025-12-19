'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type AnnouncementType = 'info' | 'success' | 'warning' | 'feature' | 'update';

export interface Announcement {
  id: string;
  type: AnnouncementType;
  title: string;
  description: string;
  ctaText?: string;
  ctaAction?: () => void;
  ctaLink?: string;
  imageUrl?: string;
  previewComponent?: React.ReactNode;
  dismissable?: boolean;
  persistent?: boolean; // If true, shows until explicitly dismissed
  priority?: number; // Higher priority shows first
  startDate?: Date;
  endDate?: Date;
  targetAudience?: 'all' | 'businesses' | 'admins';
}

interface AnnouncementContextType {
  announcements: Announcement[];
  activeAnnouncement: Announcement | null;
  addAnnouncement: (announcement: Announcement) => void;
  removeAnnouncement: (id: string) => void;
  dismissAnnouncement: (id: string) => void;
  showNextAnnouncement: () => void;
}

const AnnouncementContext = createContext<AnnouncementContextType>({
  announcements: [],
  activeAnnouncement: null,
  addAnnouncement: () => {},
  removeAnnouncement: () => {},
  dismissAnnouncement: () => {},
  showNextAnnouncement: () => {},
});

export function AnnouncementProvider({ children }: { children: React.ReactNode }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Load dismissed announcements from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('haady-dismissed-announcements');
      if (stored) {
        try {
          const ids = JSON.parse(stored) as string[];
          setDismissedIds(new Set(ids));
        } catch (error) {
          console.error('Error loading dismissed announcements:', error);
        }
      }
    }
  }, []);

  // Save dismissed announcements to localStorage
  const saveDismissedIds = useCallback((ids: Set<string>) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('haady-dismissed-announcements', JSON.stringify(Array.from(ids)));
    }
  }, []);

  // Filter out dismissed and expired announcements
  const getActiveAnnouncements = useCallback(() => {
    const now = new Date();
    return announcements
      .filter(announcement => {
        // Skip if dismissed
        if (dismissedIds.has(announcement.id)) return false;
        
        // Check date range
        if (announcement.startDate && now < announcement.startDate) return false;
        if (announcement.endDate && now > announcement.endDate) return false;
        
        return true;
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }, [announcements, dismissedIds]);

  // Show the highest priority active announcement
  useEffect(() => {
    const active = getActiveAnnouncements();
    if (active.length > 0 && !activeAnnouncement) {
      setActiveAnnouncement(active[0]);
    } else if (active.length === 0) {
      setActiveAnnouncement(null);
    }
  }, [announcements, dismissedIds, activeAnnouncement, getActiveAnnouncements]);

  const addAnnouncement = useCallback((announcement: Announcement) => {
    setAnnouncements(prev => {
      // Check if announcement with same ID already exists
      if (prev.some(a => a.id === announcement.id)) {
        return prev;
      }
      return [...prev, announcement];
    });
  }, []);

  const removeAnnouncement = useCallback((id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    if (activeAnnouncement?.id === id) {
      setActiveAnnouncement(null);
    }
  }, [activeAnnouncement]);

  const dismissAnnouncement = useCallback((id: string) => {
    const newDismissedIds = new Set(dismissedIds);
    newDismissedIds.add(id);
    setDismissedIds(newDismissedIds);
    saveDismissedIds(newDismissedIds);
    
    if (activeAnnouncement?.id === id) {
      setActiveAnnouncement(null);
    }
  }, [dismissedIds, activeAnnouncement, saveDismissedIds]);

  const showNextAnnouncement = useCallback(() => {
    const active = getActiveAnnouncements();
    const currentIndex = active.findIndex(a => a.id === activeAnnouncement?.id);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < active.length) {
      setActiveAnnouncement(active[nextIndex]);
    } else {
      setActiveAnnouncement(null);
    }
  }, [activeAnnouncement, getActiveAnnouncements]);

  const value: AnnouncementContextType = {
    announcements,
    activeAnnouncement,
    addAnnouncement,
    removeAnnouncement,
    dismissAnnouncement,
    showNextAnnouncement,
  };

  return (
    <AnnouncementContext.Provider value={value}>
      {children}
    </AnnouncementContext.Provider>
  );
}

export const useAnnouncements = () => {
  const context = useContext(AnnouncementContext);
  if (context === undefined) {
    throw new Error('useAnnouncements must be used within an AnnouncementProvider');
  }
  return context;
};

