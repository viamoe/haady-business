'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from '@/i18n/context';
import { useAuth } from '@/lib/auth/auth-context';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from '@/components/ui/button';
import { LogOut, User, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLoading } from '@/lib/loading-context';

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg';

export function Header() {
  const t = useTranslations();
  const { isRTL } = useLocale();
  const { user, signOut, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { setLoading } = useLoading();
  const [isCheckingMerchant, setIsCheckingMerchant] = useState(false);
  
  // Hide navigation buttons on login and get-started pages
  const isAuthPage = pathname === '/login' || pathname === '/get-started' || pathname.startsWith('/login/') || pathname.startsWith('/get-started/');
  const showNavButtons = !isAuthPage && !user;
  const showUserInfo = user && !loading;
  
  const handleSignOut = async () => {
    setLoading(true, 'Signing out...');
    try {
      await signOut();
      setLoading(true, 'Redirecting...');
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      setLoading(false);
    }
  };

  const handleEmailClick = async () => {
    if (!user || isCheckingMerchant) return;
    
    setIsCheckingMerchant(true);
    setLoading(true, 'Loading your account...');
    try {
      // Check if user has a merchant account
      const { data: merchantUser, error } = await supabase
        .from('merchant_users')
        .select('merchant_id')
        .eq('auth_user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is expected for users without merchant account
        console.error('Error checking merchant account:', error);
      }

      if (merchantUser) {
        // User has completed onboarding, navigate to dashboard
        setLoading(true, 'Redirecting to dashboard...');
        router.push('/dashboard');
        router.refresh();
      } else {
        // User is still in onboarding, navigate to onboarding page
        setLoading(true, 'Redirecting to onboarding...');
        router.push('/onboarding');
        router.refresh();
      }
    } catch (error) {
      console.error('Error navigating to account:', error);
      // Fallback to onboarding if check fails
      setLoading(true, 'Redirecting...');
      router.push('/onboarding');
    } finally {
      setIsCheckingMerchant(false);
    }
  };
  
  return (
    <header className="bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Left side in English, Right side in Arabic */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image
              src={HAADY_LOGO_URL}
              alt="Haady"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="text-xl font-light tracking-tight text-foreground">Business</span>
          </Link>

          {/* Right side - Navigation buttons, User info, and Language Switcher */}
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {showNavButtons && (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">{t('common.login')}</Link>
                </Button>
                <Button asChild>
                  <Link href="/get-started">
                    {t('common.createStore')}
                  </Link>
                </Button>
              </>
            )}
            
            {showUserInfo && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    disabled={isCheckingMerchant}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none"
                  >
                    <span>{user.email}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={handleEmailClick}
                    disabled={isCheckingMerchant}
                    className="cursor-pointer"
                  >
                    <User className="h-4 w-4 mr-2" />
                    <span>Account</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    variant="destructive"
                    className="cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>{t('common.signOut')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}

