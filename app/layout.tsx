import '@/app/globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/lib/auth/auth-context';
import { LoadingProvider } from '@/lib/loading-context';
import { Header } from '@/components/header';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { LocaleProvider } from '@/i18n/context';
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
              <LoadingProvider>
                <AuthProvider>
                  <Header />
                    {children}
                  <Toaster />
                </AuthProvider>
              </LoadingProvider>
        </ThemeProvider>
          </LocaleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
