import '@/app/globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Haady Business',
  description: 'Haady Business Portal',
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
