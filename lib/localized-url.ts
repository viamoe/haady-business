import type { Locale } from '@/i18n/request';

/**
 * Get the locale-country prefix from a pathname
 * Returns { locale, country } if found, null otherwise
 */
export function parseLocaleCountry(pathname: string): { locale: Locale; country: string } | null {
  const match = pathname.match(/^\/([a-z]{2})-([a-z]{2})(\/.*)?$/i);
  if (match) {
    const locale = match[1].toLowerCase() as Locale;
    const country = match[2].toUpperCase();
    if ((locale === 'en' || locale === 'ar') && country) {
      return { locale, country };
    }
  }
  return null;
}

/**
 * Get locale and country from cookies (client-side only)
 */
export function getLocaleCountryFromCookies(): { locale: Locale; country: string } | null {
  if (typeof window === 'undefined') return null;
  
  const cookies = document.cookie.split('; ');
  const countryCookie = cookies.find(row => row.startsWith('country='));
  const localeCookie = cookies.find(row => row.startsWith('locale='));
  
  const country = countryCookie ? countryCookie.split('=')[1] : null;
  const locale = localeCookie ? localeCookie.split('=')[1] as Locale : null;
  
  if (locale && country && (locale === 'en' || locale === 'ar')) {
    return { locale, country };
  }
  
  return null;
}

/**
 * Get default locale and country
 */
export function getDefaultLocaleCountry(): { locale: Locale; country: string } {
  return { locale: 'en', country: 'AE' }; // Default to English, UAE
}

/**
 * Generate a localized URL from a path
 * @param path - The target path (e.g., '/dashboard', '/login')
 * @param currentPathname - Current pathname to extract locale-country from
 * @param fallbackLocale - Fallback locale if not found in pathname
 * @returns Localized URL with format /{locale}-{country}{path}
 */
export function getLocalizedUrl(
  path: string,
  currentPathname: string,
  fallbackLocale?: Locale
): string {
  // Try to get from current pathname first
  const parsed = parseLocaleCountry(currentPathname);
  if (parsed) {
    const cleanPath = path.replace(/^\/[a-z]{2}-[a-z]{2}/i, '') || '/';
    return `/${parsed.locale}-${parsed.country.toLowerCase()}${cleanPath === '/' ? '' : cleanPath}`;
  }
  
  // Try to get from cookies (client-side)
  const fromCookies = getLocaleCountryFromCookies();
  if (fromCookies) {
    const cleanPath = path.replace(/^\/[a-z]{2}-[a-z]{2}/i, '') || '/';
    return `/${fromCookies.locale}-${fromCookies.country.toLowerCase()}${cleanPath === '/' ? '' : cleanPath}`;
  }
  
  // Use fallback or default
  const locale = fallbackLocale || getDefaultLocaleCountry().locale;
  const country = getDefaultLocaleCountry().country;
  const cleanPath = path.replace(/^\/[a-z]{2}-[a-z]{2}/i, '') || '/';
  return `/${locale}-${country.toLowerCase()}${cleanPath === '/' ? '' : cleanPath}`;
}

/**
 * Server-side function to get localized URL from request
 * Uses cookies to determine locale and country
 */
export function getLocalizedUrlFromRequest(
  path: string,
  request: { cookies: { get: (name: string) => { value: string } | undefined } }
): string {
  const localeCookie = request.cookies.get('locale');
  const countryCookie = request.cookies.get('country');
  
  const locale = (localeCookie?.value || 'en') as Locale;
  const country = countryCookie?.value || 'AE';
  
  const cleanPath = path.replace(/^\/[a-z]{2}-[a-z]{2}/i, '') || '/';
  return `/${locale}-${country.toLowerCase()}${cleanPath === '/' ? '' : cleanPath}`;
}

