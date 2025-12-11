'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from '@/i18n/context';
import { useAuth } from '@/lib/auth/auth-context';
import { AdvancedLanguageSelector } from '@/components/advanced-language-selector';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import * as React from 'react';
import { useLoading } from '@/lib/loading-context';
import { useLocalizedUrl } from '@/lib/use-localized-url';

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg';

export function Header() {
  const t = useTranslations();
  const { isRTL, locale } = useLocale();
  const { user, signOut, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { setLoading } = useLoading();
  const { localizedUrl } = useLocalizedUrl();
  const [businessName, setBusinessName] = useState<string | null>(null);

  // Hide navigation buttons on login and setup pages
  const isAuthPage = pathname.startsWith('/auth/') || pathname === '/setup' || pathname.startsWith('/setup/');
  const isDashboardPage = pathname.startsWith('/dashboard');
  const showNavButtons = !isAuthPage && !user && !isDashboardPage;
  const showUserInfo = user && !loading && !isDashboardPage;
  const showHeader = !isDashboardPage; // Hide header on dashboard pages (sidebar handles navigation)
  
  const handleSignOut = async () => {
    setLoading(true, 'Signing out...');
    try {
      await signOut();
      setLoading(true, 'Redirecting...');
      window.location.href = localizedUrl('/');
    } catch (error) {
      console.error('Error signing out:', error);
      setLoading(false);
    }
  };

  // Fetch business name
  React.useEffect(() => {
    const fetchBusinessName = async () => {
      if (!user?.id) return;
      
      try {
        const { data: merchantUser } = await supabase
          .from('merchant_users')
          .select('merchant_id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (merchantUser?.merchant_id) {
          const { data: merchant } = await supabase
            .from('merchants')
            .select('name')
            .eq('id', merchantUser.merchant_id)
            .maybeSingle();

          if (merchant?.name) {
            setBusinessName(merchant.name);
          }
        }
      } catch (error) {
        console.error('Error fetching business name:', error);
      }
    };

    fetchBusinessName();
  }, [user?.id]);

  
  if (!showHeader) {
    return null;
  }

  return (
    <header className="bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Left side in English, Right side in Arabic */}
          <Link href={localizedUrl('/')} className="flex items-center gap-3 hover:opacity-80 transition-opacity" suppressHydrationWarning>
            <Image
              src={HAADY_LOGO_URL}
              alt="Haady"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="text-xl font-light tracking-tight text-foreground">
              {locale === 'ar' ? 'الأعمال' : 'Business'}
            </span>
            {process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                Preview
              </span>
            )}
          </Link>

          {/* Right side - Navigation buttons, User info, and Language Switcher */}
          <div className="flex items-center gap-3">
            {/* Loading skeleton */}
            {loading && !isAuthPage && (
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-20 rounded-md" />
                <Skeleton className="h-9 w-28 rounded-md" />
              </div>
            )}
            
            {/* Navigation buttons for non-authenticated users */}
            {!loading && showNavButtons && (
              <>
                <Button asChild variant="ghost">
                  <Link href={localizedUrl('/auth/login')} suppressHydrationWarning>{t('common.login')}</Link>
                </Button>
                <Button asChild>
                  <Link href={localizedUrl('/auth/signup')} suppressHydrationWarning>
                    {t('common.createStore')}
                  </Link>
                </Button>
              </>
            )}
            
            {/* Advanced Language Selector - Before user button in Arabic, after in English */}
            {locale === 'ar' && <AdvancedLanguageSelector />}
            
            {/* User button for authenticated users - routes to dashboard */}
            {showUserInfo && (() => {
              const getUserInitials = (name: string | null, email: string) => {
                if (name) {
                  return name.split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2);
                }
                if (!email) return 'U';
                const parts = email.split('@')[0].split(/[._-]/);
                if (parts.length >= 2) {
                  return (parts[0][0] + parts[1][0]).toUpperCase();
                }
                return email[0].toUpperCase();
              };

              return (
                <button
                  onClick={() => router.push(localizedUrl('/dashboard'))}
                  className="group flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100/75 rounded-lg pl-2 pr-4 py-1.5 transition-colors focus:outline-none"
                >
                  <Avatar className="h-8 w-8 rounded-lg !border-0 !shadow-none">
                    <AvatarImage 
                      src={user.user_metadata?.avatar_url || user.user_metadata?.picture} 
                      alt={businessName || user.email?.split('@')[0] || 'User'}
                    />
                    <AvatarFallback className="text-xs font-medium rounded-lg">
                      {getUserInitials(businessName, user.email || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left relative min-w-0">
                    {businessName && (
                      <>
                        <span className="text-sm font-medium text-gray-900 leading-tight group-hover:opacity-0 transition-opacity">
                          {businessName}
                        </span>
                        <span className="absolute top-0 left-0 flex items-center gap-1.5 text-sm font-medium text-gray-900 leading-tight opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          Dashboard
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </>
                    )}
                    <span className="text-xs text-gray-600 leading-tight">
                      {user.email}
                    </span>
                  </div>
                </button>
              );
            })()}
            
            {/* Loading skeleton for user email on auth pages */}
            {loading && isAuthPage && user === null && (
              <Skeleton className="h-5 w-36 rounded" />
            )}
            
            {/* Advanced Language Selector - After user button in English */}
            {locale !== 'ar' && <AdvancedLanguageSelector />}
          </div>
        </div>
      </div>
    </header>
  );
}

