import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export default getRequestConfig(async () => {
  // Get locale from cookie, default to 'en'
  let locale: Locale = defaultLocale;
  
  try {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get('locale')?.value as Locale;
    if (cookieLocale && locales.includes(cookieLocale)) {
      locale = cookieLocale;
    }
  } catch (error) {
    // If cookies() fails (e.g., in middleware), use default locale
    console.warn('Failed to get locale from cookies, using default:', error);
  }

  try {
    return {
      locale,
      messages: (await import(`./locales/${locale}.json`)).default
    };
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error);
    // Fallback to English if locale file fails to load
    return {
      locale: defaultLocale,
      messages: (await import(`./locales/${defaultLocale}.json`)).default
    };
  }
});

