import '@/app/globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/lib/auth/auth-context';
import { LoadingProvider } from '@/lib/loading-context';
import { NetworkStatusProvider } from '@/lib/network-context';
import { NetworkStatusOverlay, SlowConnectionBanner } from '@/components/network-status-overlay';
import { OfflineGuard } from '@/components/offline-guard';
import { AnnouncementProvider } from '@/lib/announcement-context';
import { AnnouncementModal } from '@/components/announcement-modal';
import { StickyAnnouncementProvider, StickyAnnouncementBanner } from '@/components/sticky-announcement';
import { CookieConsent } from '@/components/cookie-consent';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { LocaleProvider } from '@/i18n/context';
import { OnboardingProvider } from '@/lib/onboarding-context';
import { Toaster } from '@/components/ui/sonner';
import type { Metadata } from 'next';
import type { Locale } from '@/i18n/request';
import { Inter } from 'next/font/google';

// English font
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Arabic font is loaded via @font-face in globals.css from Supabase storage
// Variable is defined in globals.css

export const metadata: Metadata = {
  title: 'Grow your business with Haady',
  description: 'The all-in-one platform to manage your stores, track sales, and scale your business effortlessly.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  // Arabic font is loaded via @font-face in globals.css
  // The font-family is applied via CSS rules in globals.css based on lang="ar" or dir="rtl"
  const fontClass = inter.className;

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={`h-full ${inter.variable} hide-scrollbar`}>
      <body className={`h-full antialiased ${fontClass} hide-scrollbar`}>
        <NextIntlClientProvider messages={messages}>
          <LocaleProvider initialLocale={locale}>
            <ThemeProvider defaultTheme="light" storageKey="haady-theme">
              <NetworkStatusProvider>
                <AnnouncementProvider>
                  <StickyAnnouncementProvider>
                    <LoadingProvider>
                      <AuthProvider>
                        <OnboardingProvider>
                          <OfflineGuard>
                            {children}
                          <Toaster />
                          <NetworkStatusOverlay />
                          <SlowConnectionBanner />
                          <AnnouncementModal />
                          <StickyAnnouncementBanner />
                          <CookieConsent />
                        </OfflineGuard>
                        </OnboardingProvider>
                      </AuthProvider>
                    </LoadingProvider>
                  </StickyAnnouncementProvider>
                </AnnouncementProvider>
              </NetworkStatusProvider>
            </ThemeProvider>
          </LocaleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
