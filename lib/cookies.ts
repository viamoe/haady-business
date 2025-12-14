/**
 * Cookie utility functions for managing user preferences and UX enhancements
 */

export interface CookieOptions {
  maxAge?: number; // in seconds
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;

  const cookies = document.cookie.split('; ');
  const cookie = cookies.find(row => row.startsWith(`${encodeURIComponent(name)}=`));

  if (cookie) {
    return decodeURIComponent(cookie.split('=')[1]);
  }

  return null;
}

/**
 * Check if user has given cookie consent
 * Used internally to respect user preferences
 */
function hasCookieConsent(): boolean {
  if (typeof window === 'undefined') return true; // Server-side: allow cookies
  const consent = getCookie('cookie_consent');
  return consent === 'accepted';
}

/**
 * Check if user has given cookie consent
 * This function is exported and can be used by components
 */
export function checkCookieConsent(): boolean {
  return hasCookieConsent();
}

/**
 * Set a cookie with options
 * Respects user's cookie consent preference for non-essential cookies
 */
export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  if (typeof window === 'undefined') return;

  // Check if this is an essential cookie (always allowed)
  const essentialCookies = [
    'sb-access-token',
    'sb-refresh-token',
    'cookie_consent',
    COOKIE_NAMES.OAUTH_ORIGIN,
    COOKIE_NAMES.LOCALE, // Locale is essential for app functionality
  ];

  // If not essential and user hasn't consented, don't set the cookie
  if (!essentialCookies.includes(name) && !hasCookieConsent()) {
    return;
  }

  const {
    maxAge = 31536000, // 1 year default
    expires,
    path = '/',
    domain,
    secure = process.env.NODE_ENV === 'production',
    sameSite = 'Lax',
  } = options;

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (maxAge) {
    cookieString += `; max-age=${maxAge}`;
  }

  if (expires) {
    cookieString += `; expires=${expires.toUTCString()}`;
  }

  cookieString += `; path=${path}`;

  if (domain) {
    cookieString += `; domain=${domain}`;
  }

  if (secure) {
    cookieString += `; secure`;
  }

  cookieString += `; sameSite=${sameSite}`;

  document.cookie = cookieString;
}


/**
 * Delete a cookie
 */
export function deleteCookie(name: string, options: { path?: string; domain?: string } = {}): void {
  if (typeof window === 'undefined') return;

  const { path = '/', domain } = options;

  // Set cookie with expired date
  let cookieString = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;

  if (domain) {
    cookieString += `; domain=${domain}`;
  }

  document.cookie = cookieString;
}

/**
 * Cookie names constants
 */
export const COOKIE_NAMES = {
  // User preferences
  LOCALE: 'locale',
  COUNTRY: 'country',
  THEME: 'theme',
  TIMEZONE: 'timezone',
  
  // UI state
  SIDEBAR_OPEN: 'sidebar_open',
  DASHBOARD_VIEW: 'dashboard_view',
  TABLE_PAGE_SIZE: 'table_page_size',
  TABLE_SORT: 'table_sort',
  TABLE_FILTERS: 'table_filters',
  
  // Form state
  FORM_DRAFT: 'form_draft',
  LAST_FORM_DATA: 'last_form_data',
  
  // Navigation
  LAST_VISITED_PAGE: 'last_visited_page',
  NAVIGATION_HISTORY: 'navigation_history',
  
  // UX enhancements
  FIRST_VISIT: 'first_visit',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  FEATURE_DISCOVERED: 'feature_discovered',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
  
  // Performance
  API_CACHE_PREF: 'api_cache_pref',
  DATA_REFRESH_INTERVAL: 'data_refresh_interval',
  
  // OAuth
  OAUTH_ORIGIN: 'haady_oauth_origin',
} as const;

/**
 * User preferences cookie helpers
 */
export const UserPreferencesCookies = {
  setLocale: (locale: string) => {
    // Set cookie with explicit path to ensure it's accessible
    setCookie(COOKIE_NAMES.LOCALE, locale, { 
      maxAge: 31536000, // 1 year
      path: '/',
      sameSite: 'Lax' // Ensure cookie is sent on navigation
    });
  },

  getLocale: (): string | null => {
    return getCookie(COOKIE_NAMES.LOCALE);
  },

  setCountry: (country: string) => {
    setCookie(COOKIE_NAMES.COUNTRY, country, { maxAge: 31536000 }); // 1 year
  },

  getCountry: (): string | null => {
    return getCookie(COOKIE_NAMES.COUNTRY);
  },

  setTheme: (theme: 'light' | 'dark' | 'system') => {
    setCookie(COOKIE_NAMES.THEME, theme, { maxAge: 31536000 });
  },

  getTheme: (): 'light' | 'dark' | 'system' | null => {
    return getCookie(COOKIE_NAMES.THEME) as 'light' | 'dark' | 'system' | null;
  },

  setTimezone: (timezone: string) => {
    setCookie(COOKIE_NAMES.TIMEZONE, timezone, { maxAge: 31536000 });
  },

  getTimezone: (): string | null => {
    return getCookie(COOKIE_NAMES.TIMEZONE);
  },
};

/**
 * UI state cookie helpers
 */
export const UIStateCookies = {
  setSidebarOpen: (open: boolean) => {
    setCookie(COOKIE_NAMES.SIDEBAR_OPEN, String(open), { maxAge: 2592000 }); // 30 days
  },

  getSidebarOpen: (): boolean | null => {
    const value = getCookie(COOKIE_NAMES.SIDEBAR_OPEN);
    return value === null ? null : value === 'true';
  },

  setDashboardView: (view: 'grid' | 'list' | 'compact') => {
    setCookie(COOKIE_NAMES.DASHBOARD_VIEW, view, { maxAge: 2592000 });
  },

  getDashboardView: (): 'grid' | 'list' | 'compact' | null => {
    return getCookie(COOKIE_NAMES.DASHBOARD_VIEW) as 'grid' | 'list' | 'compact' | null;
  },

  setTablePageSize: (pageSize: number) => {
    setCookie(COOKIE_NAMES.TABLE_PAGE_SIZE, String(pageSize), { maxAge: 2592000 });
  },

  getTablePageSize: (): number | null => {
    const value = getCookie(COOKIE_NAMES.TABLE_PAGE_SIZE);
    return value ? parseInt(value, 10) : null;
  },

  setTableSort: (sort: string) => {
    setCookie(COOKIE_NAMES.TABLE_SORT, sort, { maxAge: 86400 }); // 1 day
  },

  getTableSort: (): string | null => {
    return getCookie(COOKIE_NAMES.TABLE_SORT);
  },

  setTableFilters: (filters: Record<string, any>) => {
    setCookie(COOKIE_NAMES.TABLE_FILTERS, JSON.stringify(filters), { maxAge: 86400 });
  },

  getTableFilters: (): Record<string, any> | null => {
    const value = getCookie(COOKIE_NAMES.TABLE_FILTERS);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  },
};

/**
 * Form state cookie helpers
 */
export const FormStateCookies = {
  saveFormDraft: (formId: string, data: Record<string, any>) => {
    const key = `${COOKIE_NAMES.FORM_DRAFT}_${formId}`;
    setCookie(key, JSON.stringify(data), { maxAge: 604800 }); // 7 days
  },

  getFormDraft: (formId: string): Record<string, any> | null => {
    const key = `${COOKIE_NAMES.FORM_DRAFT}_${formId}`;
    const value = getCookie(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  },

  clearFormDraft: (formId: string) => {
    const key = `${COOKIE_NAMES.FORM_DRAFT}_${formId}`;
    deleteCookie(key);
  },

  saveLastFormData: (formId: string, data: Record<string, any>) => {
    const key = `${COOKIE_NAMES.LAST_FORM_DATA}_${formId}`;
    setCookie(key, JSON.stringify(data), { maxAge: 2592000 }); // 30 days
  },

  getLastFormData: (formId: string): Record<string, any> | null => {
    const key = `${COOKIE_NAMES.LAST_FORM_DATA}_${formId}`;
    const value = getCookie(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  },
};

/**
 * Navigation cookie helpers
 */
export const NavigationCookies = {
  setLastVisitedPage: (path: string) => {
    setCookie(COOKIE_NAMES.LAST_VISITED_PAGE, path, { maxAge: 2592000 }); // 30 days
  },

  getLastVisitedPage: (): string | null => {
    return getCookie(COOKIE_NAMES.LAST_VISITED_PAGE);
  },

  addToHistory: (path: string, maxItems: number = 10) => {
    const history = NavigationCookies.getHistory();
    const updatedHistory = [path, ...history.filter(p => p !== path)].slice(0, maxItems);
    setCookie(COOKIE_NAMES.NAVIGATION_HISTORY, JSON.stringify(updatedHistory), { maxAge: 2592000 });
  },

  getHistory: (): string[] => {
    const value = getCookie(COOKIE_NAMES.NAVIGATION_HISTORY);
    if (!value) return [];
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  },

  clearHistory: () => {
    deleteCookie(COOKIE_NAMES.NAVIGATION_HISTORY);
  },
};

/**
 * UX enhancement cookie helpers
 */
export const UXCookies = {
  setFirstVisit: (isFirstVisit: boolean) => {
    setCookie(COOKIE_NAMES.FIRST_VISIT, String(isFirstVisit), { maxAge: 31536000 }); // 1 year
  },

  isFirstVisit: (): boolean => {
    const value = getCookie(COOKIE_NAMES.FIRST_VISIT);
    if (value === null) {
      UXCookies.setFirstVisit(true);
      return true;
    }
    return value === 'true';
  },

  setOnboardingComplete: (complete: boolean) => {
    setCookie(COOKIE_NAMES.ONBOARDING_COMPLETE, String(complete), { maxAge: 31536000 });
  },

  isOnboardingComplete: (): boolean => {
    const value = getCookie(COOKIE_NAMES.ONBOARDING_COMPLETE);
    return value === 'true';
  },

  setFeatureDiscovered: (feature: string) => {
    const discovered = UXCookies.getDiscoveredFeatures();
    if (!discovered.includes(feature)) {
      discovered.push(feature);
      setCookie(COOKIE_NAMES.FEATURE_DISCOVERED, JSON.stringify(discovered), { maxAge: 31536000 });
    }
  },

  getDiscoveredFeatures: (): string[] => {
    const value = getCookie(COOKIE_NAMES.FEATURE_DISCOVERED);
    if (!value) return [];
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  },

  isFeatureDiscovered: (feature: string): boolean => {
    return UXCookies.getDiscoveredFeatures().includes(feature);
  },

  setNotificationsEnabled: (enabled: boolean) => {
    setCookie(COOKIE_NAMES.NOTIFICATIONS_ENABLED, String(enabled), { maxAge: 31536000 });
  },

  areNotificationsEnabled: (): boolean => {
    const value = getCookie(COOKIE_NAMES.NOTIFICATIONS_ENABLED);
    return value !== 'false'; // Default to true if not set
  },
};

/**
 * Performance cookie helpers
 */
export const PerformanceCookies = {
  setApiCachePreference: (enabled: boolean) => {
    setCookie(COOKIE_NAMES.API_CACHE_PREF, String(enabled), { maxAge: 2592000 });
  },

  isApiCacheEnabled: (): boolean => {
    const value = getCookie(COOKIE_NAMES.API_CACHE_PREF);
    return value !== 'false'; // Default to true
  },

  setDataRefreshInterval: (interval: number) => {
    setCookie(COOKIE_NAMES.DATA_REFRESH_INTERVAL, String(interval), { maxAge: 2592000 });
  },

  getDataRefreshInterval: (): number | null => {
    const value = getCookie(COOKIE_NAMES.DATA_REFRESH_INTERVAL);
    return value ? parseInt(value, 10) : null;
  },
};

/**
 * Clear all cookies (useful for logout)
 */
export function clearAllCookies(): void {
  Object.values(COOKIE_NAMES).forEach(name => {
    deleteCookie(name);
  });
}

/**
 * Clear user preference cookies only
 */
export function clearUserPreferenceCookies(): void {
  deleteCookie(COOKIE_NAMES.LOCALE);
  deleteCookie(COOKIE_NAMES.COUNTRY);
  deleteCookie(COOKIE_NAMES.THEME);
  deleteCookie(COOKIE_NAMES.TIMEZONE);
}

