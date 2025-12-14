'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Locale } from './request';
import { UserPreferencesCookies } from '@/lib/cookies';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ 
  children, 
  initialLocale = 'en' 
}: { 
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  // Initialize from server-side locale, but also check cookie on client
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const cookieLocale = UserPreferencesCookies.getLocale() as Locale | null;
      if (cookieLocale && (cookieLocale === 'en' || cookieLocale === 'ar')) {
        return cookieLocale;
      }
    }
    return initialLocale;
  });

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const isRTL = locale === 'ar';

  // Sync with cookie on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cookieLocale = UserPreferencesCookies.getLocale() as Locale | null;
      if (cookieLocale && (cookieLocale === 'en' || cookieLocale === 'ar') && cookieLocale !== locale) {
        setLocaleState(cookieLocale);
      }
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    // Set cookie directly using document.cookie (simpler, more reliable)
    if (typeof document !== 'undefined') {
      // Use the same approach as haady-app for consistency
      document.cookie = `locale=${newLocale};path=/;max-age=31536000;sameSite=Lax`;
    }
    // Update state
    setLocaleState(newLocale);
    // Use replace() instead of href assignment to ensure cookie is sent with navigation
    // Adding a small delay to ensure cookie is persisted before navigation
    setTimeout(() => {
      // Use replace() to avoid adding to history, and add cache-busting query param
      const url = new URL(window.location.href);
      url.searchParams.set('_locale', newLocale);
      url.searchParams.set('_t', Date.now().toString());
      window.location.replace(url.toString());
    }, 100);
  }, []);

  useEffect(() => {
    // Update document direction
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, dir, isRTL }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

