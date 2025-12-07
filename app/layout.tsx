import '@/app/globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Grow your business with Haady',
  description: 'The all-in-one platform to manage your stores, track sales, and scale your business effortlessly.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className="h-full">
        <ThemeProvider defaultTheme="light" storageKey="haady-theme">
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
