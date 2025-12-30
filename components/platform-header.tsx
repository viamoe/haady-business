'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from '@/i18n/context';
import { useAuth } from '@/lib/auth/auth-context';
import { useLocalizedUrl } from '@/lib/use-localized-url';
import { useLoading } from '@/lib/loading-context';
import { useOnboarding } from '@/lib/onboarding-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  ArrowRight,
  LayoutDashboard,
  LogOut,
  Settings,
  ChevronDown,
  Store,
  Languages,
  Globe,
  Menu,
} from 'lucide-react';
import { Flag } from '@/components/flag';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';
import { Link as AnimatedLink } from '@/components/animate-ui/icons/link';
import { AdvancedLanguageSelector } from '@/components/advanced-language-selector';
import { SimpleLanguageSwitcher } from '@/components/simple-language-switcher';
import { OnboardingStepper } from '@/components/onboarding-stepper';
import { supabase } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import * as React from 'react';

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg';

export type HeaderVariant = 'default' | 'landing' | 'onboarding';

interface OnboardingStep {
  id: string;
  title: string;
  titleAr?: string;
}

interface PlatformHeaderProps {
  variant?: HeaderVariant;
  className?: string;
  hideNavButtons?: boolean;
  showLanguageSwitcher?: boolean;
  // Landing page specific props
  homeUrl?: string;
  currentCountry?: {
    name: string;
    flag_url?: string;
  } | null;
  onLanguageToggle?: () => void;
  // Onboarding specific props
  onboardingSteps?: OnboardingStep[];
  currentOnboardingStep?: number;
}

export function PlatformHeader({
  variant = 'default',
  className,
  hideNavButtons = false,
  showLanguageSwitcher = false,
  homeUrl,
  currentCountry,
  onLanguageToggle,
  onboardingSteps,
  currentOnboardingStep,
}: PlatformHeaderProps) {
  const t = useTranslations();
  const { isRTL, locale, setLocale } = useLocale();
  const { user, session, signOut, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { setLoading } = useLoading();
  const { localizedUrl } = useLocalizedUrl();
  const { stepInfo } = useOnboarding();
  const [isScrolled, setIsScrolled] = useState(false);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [isLoadingBusinessName, setIsLoadingBusinessName] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
  const [selectedStoreLabel, setSelectedStoreLabel] = useState<string | null>(null);
  const [selectedStoreLogo, setSelectedStoreLogo] = useState<string | null>(null);
  const [selectedStoreLogoZoom, setSelectedStoreLogoZoom] = useState<number | null>(null);

  // Path detection
  const isAuthPage = pathname.includes('/auth/');
  const isDashboardPage = pathname.includes('/dashboard');
  const isOnboardingPage = pathname.includes('/onboarding');

  // Visibility logic
  const showNavButtons = !isAuthPage && !user && !isDashboardPage && !hideNavButtons && variant !== 'landing';
  const showUserInfo = user && !loading && !isDashboardPage && !isAuthPage;
  const showHeader = variant === 'onboarding' || (!isDashboardPage && !isOnboardingPage);

  // Scroll handler for landing variant
  useEffect(() => {
    if (variant !== 'landing') return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [variant]);

  // Default language toggle handler
  const defaultLanguageToggle = () => {
    const otherLang = locale === 'en' ? 'ar' : 'en';
    setLoading(true);
    setTimeout(() => {
      setLocale(otherLang);
    }, variant === 'landing' ? 1000 : 3000);
  };

  const handleLanguageToggle = onLanguageToggle || defaultLanguageToggle;

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

  // Fetch business name and onboarding status
  React.useEffect(() => {
    const fetchBusinessName = async () => {
      if (!user?.id) {
        setIsLoadingBusinessName(false);
        setHasCompletedOnboarding(false);
        setBusinessName(null);
        return;
      }

      setIsLoadingBusinessName(true);
      try {
        const { data: businessProfile } = await supabase
          .from('business_profile')
          .select('id, full_name, is_onboarded, onboarding_step, store_id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        const completed = !!(
          businessProfile?.is_onboarded ||
          businessProfile?.onboarding_step === null ||
          businessProfile?.store_id
        );
        setHasCompletedOnboarding(completed);

        if (businessProfile?.store_id) {
          const { data: store } = await supabase
            .from('stores')
            .select('name')
            .eq('id', businessProfile.store_id)
            .maybeSingle();

          if (store?.name) {
            setBusinessName(store.name);
          }
        }
      } catch (error) {
        console.error('Error fetching business name:', error);
        setHasCompletedOnboarding(false);
      } finally {
        setIsLoadingBusinessName(false);
      }
    };

    fetchBusinessName();
  }, [user?.id]);

  // Fetch selected store
  React.useEffect(() => {
    const fetchSelectedStore = async () => {
      if (!user?.id) {
        setSelectedStoreLabel(null);
        setSelectedStoreLogo(null);
        setSelectedStoreLogoZoom(null);
        return;
      }

      try {
        // First try to get from store_connections
        const { data, error } = await supabase
          .from('store_connections')
          .select('id, store_name, platform, store_logo_url, logo_zoom')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data?.length) {
          const savedConnectionId = typeof window !== 'undefined'
            ? localStorage.getItem('selectedStoreConnectionId')
            : null;

          const targetConnection = savedConnectionId
            ? data.find((conn) => conn.id === savedConnectionId) || data[0]
            : data[0];

          setSelectedStoreLabel(targetConnection?.store_name || targetConnection?.platform || null);
          setSelectedStoreLogo(targetConnection?.store_logo_url || null);
          setSelectedStoreLogoZoom(targetConnection?.logo_zoom || null);
          return;
        }

        // If no store_connections, try to get from stores table via business_profile
        const { data: businessProfile } = await supabase
          .from('business_profile')
          .select('id, store_id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (businessProfile?.store_id) {
          const { data: store } = await supabase
            .from('stores')
            .select('id, name, logo_url')
            .eq('id', businessProfile.store_id)
            .maybeSingle();

          if (store) {
            setSelectedStoreLabel(store.name || null);
            setSelectedStoreLogo(store.logo_url || null);
            setSelectedStoreLogoZoom(null);
            return;
          }
        }

        // No store data found - but don't set to null, let businessName be used as fallback
        setSelectedStoreLabel(null);
        setSelectedStoreLogo(null);
        setSelectedStoreLogoZoom(null);
      } catch (error) {
        console.error('Error fetching selected store:', error);
        // Don't set to null on error, let businessName be used as fallback
        setSelectedStoreLabel(null);
        setSelectedStoreLogo(null);
        setSelectedStoreLogoZoom(null);
      }
    };

    fetchSelectedStore();

    const handleStoreChanged = () => fetchSelectedStore();
    const handleStoreLogoUpdated = () => fetchSelectedStore();

    window.addEventListener('storeConnectionChanged', handleStoreChanged as EventListener);
    window.addEventListener('storeLogoUpdated', handleStoreLogoUpdated as EventListener);

    return () => {
      window.removeEventListener('storeConnectionChanged', handleStoreChanged as EventListener);
      window.removeEventListener('storeLogoUpdated', handleStoreLogoUpdated as EventListener);
    };
  }, [user?.id]);

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

  const userInitials = user ? getUserInitials(
    user.user_metadata?.full_name || null,
    user.email || ''
  ) : '';

  // Don't show header for dashboard/onboarding pages (unless explicitly onboarding variant)
  if (!showHeader) {
    return null;
  }

  // Header className based on variant
  const getHeaderClassName = () => {
    if (variant === 'landing') {
      return `fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/30 backdrop-blur-2xl shadow-[0_2px_20px_rgba(0,0,0,0.02)] border-b border-white/20'
          : 'bg-white/10 backdrop-blur-xl'
      }`;
    }
    if (variant === 'onboarding') {
      return 'sticky top-0 z-50 bg-white/30 backdrop-blur-2xl border-b border-white/20';
    }
    // For auth pages, make it fixed with white background (overlapping content)
    if (isAuthPage) {
      return className ?? 'fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl';
    }
    return className ?? 'bg-white/30 backdrop-blur-2xl border-b border-white/20';
  };

  const logoUrl = variant === 'landing' ? (homeUrl || localizedUrl('/')) : localizedUrl('/');

  return (
    <header className={getHeaderClassName()}>
      {variant === 'landing' ? (
        // Landing variant: Logo left, Nav centered, Actions right
        <div className="container mx-auto px-4 h-[100px]">
          <div className="relative flex items-center justify-between h-full">
            {/* Logo - Left */}
            <div className="flex items-center gap-4 flex-shrink-0 z-10">
              <Link
                href={logoUrl}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                suppressHydrationWarning
              >
                <Image
                  src={HAADY_LOGO_URL}
                  alt="Haady"
                  width={48}
                  height={48}
                  className="w-12 h-12"
                  unoptimized
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
            </div>

            {/* Navigation - Centered */}
            <nav className="group hidden items-center gap-12 text-sm font-normal lg:flex absolute left-1/2 transform -translate-x-1/2 z-10">
              <Link
                href={`${homeUrl || localizedUrl('/')}#features`}
                className="transition-opacity duration-200 group-hover:opacity-20 hover:opacity-100 hover:text-foreground/80"
                suppressHydrationWarning
              >
                {t('landing.header.nav.features')}
              </Link>
              <Link
                href={`${homeUrl || localizedUrl('/')}#integrations`}
                className="transition-opacity duration-200 group-hover:opacity-20 hover:opacity-100 hover:text-foreground/80"
                suppressHydrationWarning
              >
                {t('landing.header.nav.integrations')}
              </Link>
              <Link
                href={`${homeUrl || localizedUrl('/')}#how-it-works`}
                className="transition-opacity duration-200 group-hover:opacity-20 hover:opacity-100 hover:text-foreground/80"
                suppressHydrationWarning
              >
                {t('landing.header.nav.howItWorks')}
              </Link>
              <Link
                href={`${homeUrl || localizedUrl('/')}#faq`}
                className="transition-opacity duration-200 group-hover:opacity-20 hover:opacity-100 hover:text-foreground/80"
                suppressHydrationWarning
              >
                {t('landing.header.nav.faq')}
              </Link>
            </nav>

            {/* Right side actions - Right aligned */}
            <div className="flex items-center gap-3 flex-shrink-0 z-10">
              {/* Landing page CTA buttons - Contextual based on user state */}
              {loading || isLoadingBusinessName ? (
                // Auth state or business name is loading - show skeleton
                <>
                  <div className="flex items-center gap-3">
                    {/* Store logo skeleton */}
                    <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                    {/* Store name and dashboard text skeleton */}
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-4 w-24 rounded" />
                      <Skeleton className="h-3 w-16 rounded" />
                    </div>
                  </div>
                  {/* Language switcher skeleton */}
                  <Skeleton className="h-10 w-24 rounded-md" />
                  {/* Mobile menu skeleton */}
                  <Skeleton className="h-10 w-10 rounded-md lg:hidden" />
                </>
              ) : (
                <>
                  {user && !loading ? (
                    // User is logged in
                    hasCompletedOnboarding ? (
                  // User completed onboarding - Show store logo, name, and Dashboard link
                  <Link
                    href={localizedUrl('/dashboard')}
                    suppressHydrationWarning
                    className="group flex items-center gap-3 p-2 pr-4 rounded-lg hover:bg-[#F4610B]/5 transition-colors cursor-pointer"
                  >
                    {/* Store Logo */}
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 overflow-hidden relative ${
                        selectedStoreLogo ? '' : 'bg-[#F4610B]/10'
                      }`}
                    >
                      {selectedStoreLogo ? (
                        <img
                          src={selectedStoreLogo}
                          alt="Store Logo"
                          className="absolute inset-0 h-full w-full object-cover"
                          style={{
                            transform: `scale(${(selectedStoreLogoZoom || 100) / 100})`,
                            transition: 'transform 0.2s ease-out',
                          }}
                        />
                      ) : (
                        <Store className="h-5 w-5 text-[#F4610B] relative z-10" />
                      )}
                    </div>
                    {/* Store Name and Dashboard Link */}
                    <div className="flex flex-col items-start text-left min-w-0">
                      <span className="text-sm font-medium text-gray-900 group-hover:text-[#F4610B] leading-tight truncate max-w-[200px] transition-colors">
                        {selectedStoreLabel || businessName || 'Store'}
                      </span>
                      <span className="text-xs text-gray-600 group-hover:text-[#F4610B] transition-colors">
                        Dashboard
                      </span>
                    </div>
                  </Link>
                  ) : (
                    // User not completed onboarding - Complete Setup
                    <Button
                      asChild
                      className="text-sm bg-[#F46100] hover:bg-black text-white font-medium px-6 transition-colors"
                    >
                      <Link href={localizedUrl('/onboarding')} suppressHydrationWarning className="flex items-center gap-2">
                        <span>{t('landing.header.completeSetup')}</span>
                        <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                      </Link>
                    </Button>
                  )
                ) : (
                  // Not logged in - Join Haady and Login buttons
                  <>
                    <Button
                      asChild
                      variant="ghost"
                      className="text-sm text-gray-700 hover:text-[#F4610B] hover:bg-orange-50 font-medium px-4 transition-colors"
                    >
                      <Link href={localizedUrl('/auth/login')} suppressHydrationWarning>
                        {t('common.login')}
                      </Link>
                    </Button>
                    <Button
                      asChild
                      className="text-sm bg-[#F46100] hover:bg-black text-white font-medium px-6 transition-colors"
                    >
                      <Link href={localizedUrl('/auth/signup')} suppressHydrationWarning>
                        Join Haady
                      </Link>
                    </Button>
                  </>
                )}

                {/* Language switcher */}
                <Button
                  variant="ghost"
                  onClick={handleLanguageToggle}
                  className="flex items-center gap-2 text-sm h-10 text-gray-600 hover:text-[#F4610B] hover:bg-orange-50 transition-colors"
                >
                  {currentCountry && currentCountry.flag_url ? (
                    <Flag
                      countryName={currentCountry.name}
                      flagUrl={currentCountry.flag_url}
                      size="m"
                      className="shrink-0"
                    />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  <span
                    style={locale === 'en' ? { fontFamily: 'var(--font-ibm-plex-arabic), sans-serif' } : undefined}
                  >
                    {locale === 'en' ? 'العربية' : 'English'}
                  </span>
                </Button>

                {/* Mobile menu */}
                <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" className="lg:hidden" size="icon" aria-label={t('landing.header.mobileMenu')}>
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side={isRTL ? 'left' : 'right'}>
                  <SheetHeader>
                    <SheetTitle>{t('landing.header.mobileMenu')}</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-4 px-4">
                    <Link
                      href={`${homeUrl || localizedUrl('/')}#features`}
                      className="text-base font-medium"
                      suppressHydrationWarning
                    >
                      {t('landing.header.nav.features')}
                    </Link>
                    <Link
                      href={`${homeUrl || localizedUrl('/')}#integrations`}
                      className="text-base font-medium"
                      suppressHydrationWarning
                    >
                      {t('landing.header.nav.integrations')}
                    </Link>
                    <Link
                      href={`${homeUrl || localizedUrl('/')}#how-it-works`}
                      className="text-base font-medium"
                      suppressHydrationWarning
                    >
                      {t('landing.header.nav.howItWorks')}
                    </Link>
                    <Link
                      href={`${homeUrl || localizedUrl('/')}#faq`}
                      className="text-base font-medium"
                      suppressHydrationWarning
                    >
                      {t('landing.header.nav.faq')}
                    </Link>
                    {user ? (
                      hasCompletedOnboarding ? (
                        <Button asChild className="w-full bg-black text-white hover:bg-gray-900">
                          <Link
                            href={localizedUrl('/dashboard')}
                            suppressHydrationWarning
                            className="flex items-center justify-center gap-2"
                          >
                            <LayoutDashboard className="h-4 w-4" />
                            <span>{locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild className="w-full bg-[#F46100] hover:bg-black text-white">
                          <Link
                            href={localizedUrl('/onboarding')}
                            suppressHydrationWarning
                            className="flex items-center justify-center gap-2"
                          >
                            <span>{t('landing.header.completeSetup')}</span>
                            <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                          </Link>
                        </Button>
                      )
                    ) : (
                      <div className="flex flex-col gap-2 w-full">
                        <Button
                          asChild
                          variant="outline"
                          className="w-full border-gray-300 text-gray-700 hover:text-[#F4610B] hover:bg-orange-50 hover:border-orange-200 font-medium transition-colors"
                        >
                          <Link
                            href={localizedUrl('/auth/login')}
                            suppressHydrationWarning
                            className="flex items-center justify-center"
                          >
                            {t('common.login')}
                          </Link>
                        </Button>
                        <Button
                          asChild
                          className="w-full bg-[#F46100] hover:bg-black text-white font-medium transition-colors"
                        >
                          <Link
                            href={localizedUrl('/auth/signup')}
                            suppressHydrationWarning
                            className="flex items-center justify-center"
                          >
                            Join Haady
                          </Link>
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <span className="text-sm text-muted-foreground">{t('landing.header.mobileLanguage')}</span>
                      <Button
                        variant="ghost"
                        onClick={handleLanguageToggle}
                        className="flex items-center gap-2 text-sm h-10 text-gray-600 hover:text-[#F4610B] hover:bg-orange-50 transition-colors"
                      >
                        {currentCountry && currentCountry.flag_url ? (
                          <Flag
                            countryName={currentCountry.name}
                            flagUrl={currentCountry.flag_url}
                            size="m"
                            className="shrink-0"
                          />
                        ) : (
                          <Globe className="h-4 w-4" />
                        )}
                        <span
                          style={
                            locale === 'en' ? { fontFamily: 'var(--font-ibm-plex-arabic), sans-serif' } : undefined
                          }
                        >
                          {locale === 'en' ? 'العربية' : 'English'}
                        </span>
                      </Button>
                    </div>
                    {user && (
                      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                        <span className="text-sm text-muted-foreground">
                          {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSignOut}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4 mr-1" />
                          {locale === 'ar' ? 'خروج' : 'Sign Out'}
                        </Button>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Default and onboarding variants: Standard layout
        <div className="container mx-auto px-4">
          {variant === 'onboarding' ? (
            // Onboarding variant: Logo, stepper, and actions all in one row
            <div className="flex items-center justify-between gap-4 py-6">
              {/* Logo */}
              <Link
                href={logoUrl}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-shrink-0"
                suppressHydrationWarning
              >
                <Image
                  src={HAADY_LOGO_URL}
                  alt="Haady"
                  width={48}
                  height={48}
                  className="w-12 h-12"
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

              {/* Stepper - Centered */}
              {onboardingSteps && typeof currentOnboardingStep === 'number' && (
                <div className="flex-1 flex justify-center">
                  <OnboardingStepper
                    steps={onboardingSteps}
                    currentStep={currentOnboardingStep}
                    locale={locale}
                  />
                </div>
              )}

              {/* Right side actions */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Language switcher */}
                <Button
                  variant="ghost"
                  onClick={handleLanguageToggle}
                  className="flex items-center gap-2 text-sm h-10 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <Globe className="h-4 w-4 text-gray-600" />
                  <span 
                    style={locale === 'en' ? { fontFamily: 'var(--font-ibm-plex-arabic), sans-serif' } : undefined} 
                    className="text-gray-700"
                  >
                    {locale === 'en' ? 'العربية' : 'English'}
                  </span>
                </Button>

                {/* User avatar */}
                {showUserInfo && user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-white text-sm font-medium hover:bg-orange-500 transition-colors focus:outline-none cursor-pointer shrink-0"
                        aria-label="User menu"
                      >
                        {userInitials}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      side="bottom"
                      sideOffset={8}
                      className="w-48 rounded-2xl p-0 shadow-[0_20px_60px_rgba(15,23,42,0.15)] bg-white overflow-hidden border-0"
                    >
                      <div className="p-2 space-y-1">
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            handleSignOut();
                          }}
                          className="cursor-pointer rounded-md flex items-center gap-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-600"
                        >
                          <LogOut className="h-4 w-4 text-red-600" />
                          Sign Out
                        </DropdownMenuItem>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between h-[100px]">
              {/* Logo */}
              {(
              <div className="flex items-center gap-4">
                <Link
                  href={logoUrl}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  suppressHydrationWarning
                >
                  <Image
                    src={HAADY_LOGO_URL}
                    alt="Haady"
                    width={48}
                    height={48}
                    className="w-12 h-12"
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

                {/* Onboarding Step Indicator */}
                {isOnboardingPage && stepInfo && (
                  <React.Fragment>
                    <div className="h-1 w-1 rounded-full bg-gray-400" />
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-500">
                        Step {stepInfo.current}/{stepInfo.total}
                      </div>
                      <div className="h-1 w-1 rounded-full bg-gray-400" />
                      <div className="text-sm font-medium text-gray-900">
                        {locale === 'ar' && stepInfo.titleAr ? stepInfo.titleAr : stepInfo.title}
                      </div>
                    </div>
                  </React.Fragment>
                )}
              </div>
            )}

            {/* Right side actions - For default/onboarding variants */}
            <div className="flex items-center gap-3">
              {/* Loading skeleton */}
              {loading && !isAuthPage && (
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-20 rounded-md" />
                  <Skeleton className="h-9 w-28 rounded-md" />
                </div>
              )}

              {/* Navigation buttons for non-authenticated users (default variant only) */}
              {!loading && showNavButtons && variant === 'default' && (
                <>
                  <Button
                    variant="ghost"
                    onClick={handleLanguageToggle}
                    className="flex items-center gap-2 text-sm h-10 text-gray-600 hover:text-orange-500 hover:bg-orange-100 transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    <span>{locale === 'en' ? 'AR' : 'EN'}</span>
                  </Button>
                  <Button asChild className="bg-[#F46100] hover:bg-[#E05500] text-white font-medium px-6">
                    <Link href={localizedUrl('/auth/signup')} suppressHydrationWarning>
                      {t('landing.integrations.cta')}
                    </Link>
                  </Button>
                </>
              )}

              {/* Standalone language switcher */}
              {!loading && !showNavButtons && showLanguageSwitcher && !user && variant === 'default' && (
                <SimpleLanguageSwitcher />
              )}


              {/* Default variant - show store logo link for completed onboarding */}
              {variant === 'default' && showUserInfo && hasCompletedOnboarding && !isLoadingBusinessName && (
                <>
                  <Link
                    href={localizedUrl('/dashboard')}
                    className="group flex items-center gap-3 p-2 pr-4 rounded-lg hover:bg-[#F4610B]/5 transition-colors cursor-pointer"
                    suppressHydrationWarning
                  >
                    {/* Store Logo */}
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 overflow-hidden relative ${
                        selectedStoreLogo ? '' : 'bg-[#F4610B]/10'
                      }`}
                    >
                      {selectedStoreLogo ? (
                        <img
                          src={selectedStoreLogo}
                          alt="Store Logo"
                          className="absolute inset-0 h-full w-full object-cover"
                          style={{
                            transform: `scale(${(selectedStoreLogoZoom || 100) / 100})`,
                            transition: 'transform 0.2s ease-out',
                          }}
                        />
                      ) : (
                        <Store className="h-5 w-5 text-[#F4610B] relative z-10" />
                      )}
                    </div>
                    {/* Store Name and Dashboard Link */}
                    <div className="flex flex-col items-start text-left min-w-0">
                      <span className="text-sm font-medium text-gray-900 group-hover:text-[#F4610B] leading-tight truncate max-w-[200px] transition-colors">
                        {selectedStoreLabel || businessName || 'Store'}
                      </span>
                      <span className="text-xs text-gray-600 group-hover:text-[#F4610B] transition-colors">
                        Dashboard
                      </span>
                    </div>
                  </Link>
                  <AdvancedLanguageSelector />
                </>
              )}
            </div>
          </div>
          )}
        </div>
      )}
    </header>
  );
}

