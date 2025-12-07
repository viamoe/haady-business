'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Locale } from './request';

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
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const isRTL = locale === 'ar';

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    // Set cookie for server-side
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    // Reload to apply new locale
    window.location.reload();
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

