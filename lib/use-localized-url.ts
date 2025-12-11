'use client';

import { usePathname } from 'next/navigation';
import { useLocale } from '@/i18n/context';
import { getLocalizedUrl } from './localized-url';

/**
 * Hook to generate localized URLs in client components
 * Automatically preserves the locale-country prefix from the current URL
 */
export function useLocalizedUrl() {
  const pathname = usePathname();
  const { locale } = useLocale();

  /**
   * Generate a localized URL for a given path
   * @param path - The target path (e.g., '/dashboard', '/login')
   * @returns Localized URL with format /{locale}-{country}{path}
   */
  const localizedUrl = (path: string): string => {
    return getLocalizedUrl(path, pathname, locale);
  };

  return { localizedUrl };
}

