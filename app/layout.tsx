import '@/app/globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/lib/auth/auth-context';
import { LoadingProvider } from '@/lib/loading-context';
import { NetworkStatusProvider } from '@/lib/network-context';
import { Header } from '@/components/header';
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
import { IBM_Plex_Sans_Arabic, Inter } from 'next/font/google';

// English font
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Arabic font
const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-arabic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Grow your business with Haady',
  description: 'The all-in-one platform to manage your stores, track sales, and scale your business effortlessly.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const fontClass = locale === 'ar' ? ibmPlexSansArabic.className : inter.className;

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={`h-full ${inter.variable} ${ibmPlexSansArabic.variable}`}>
      <body className={`h-full antialiased ${fontClass}`}>
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
                            <Header />
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
