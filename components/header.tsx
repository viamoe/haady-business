'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from '@/i18n/context';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ArrowRight, LayoutDashboard, LogOut, Settings, ChevronDown, Store, Languages, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import * as React from 'react';
import { useLoading } from '@/lib/loading-context';
import { useLocalizedUrl } from '@/lib/use-localized-url';
import { AdvancedLanguageSelector } from '@/components/advanced-language-selector';
import { useOnboarding } from '@/lib/onboarding-context';

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg';

export function Header() {
  const t = useTranslations();
  const { isRTL, locale, setLocale } = useLocale();
  const { user, signOut, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { setLoading } = useLoading();
  const { localizedUrl } = useLocalizedUrl();
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [isLoadingBusinessName, setIsLoadingBusinessName] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
  const [selectedStoreLabel, setSelectedStoreLabel] = useState<string | null>(null);
  const [selectedStoreLogo, setSelectedStoreLogo] = useState<string | null>(null);
  const [selectedStoreLogoZoom, setSelectedStoreLogoZoom] = useState<number | null>(null);

  // Hide navigation buttons on login and setup pages
  // Check for both localized paths (e.g., /en-sa/auth/login) and non-localized paths (e.g., /auth/login)
  const isAuthPage = pathname.includes('/auth/') || pathname === '/setup' || pathname.includes('/setup');
  // Check for dashboard paths including localized ones (e.g., /en-sa/dashboard)
  const isDashboardPage = pathname.includes('/dashboard');
  // Check if we're on the onboarding page
  const isOnboardingPage = pathname.includes('/onboarding');
  // Hide nav buttons on auth pages (login/signup) and dashboard pages
  const showNavButtons = !isAuthPage && !user && !isDashboardPage;
  const showUserInfo = user && !loading && !isDashboardPage;
  const showHeader = !isDashboardPage && !isOnboardingPage; // Hide header on dashboard pages and onboarding pages
  
  // Get onboarding step info from context
  const { stepInfo } = useOnboarding();
  
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

  const handleLanguageToggle = () => {
    const otherLang = locale === 'en' ? 'ar' : 'en';
    const loadingMessage = locale === 'ar' 
      ? 'جاري تبديل اللغة...' 
      : 'Switching language...';
    setLoading(true, loadingMessage);
    // Delay to ensure loading overlay is visible before reload
    setTimeout(() => {
      setLocale(otherLang);
    }, 2000);
  };

  // Fetch business name and check onboarding status
  React.useEffect(() => {
    const fetchBusinessName = async () => {
      if (!user?.id) {
        setIsLoadingBusinessName(false);
        setHasCompletedOnboarding(false);
        return;
      }
      
      setIsLoadingBusinessName(true);
      try {
        const { data: businessProfile } = await supabase
          .from('business_profile')
          .select('id, business_name, full_name')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        // Check if onboarding is complete (has business_name)
        const completed = !!(businessProfile?.business_name);
        setHasCompletedOnboarding(completed);

        if (businessProfile?.business_name) {
          const { data: business } = await supabase
            .from('businesss')
            .select('name')
            .eq('id', businessProfile.id)
            .maybeSingle();

          if (business?.name) {
            setBusinessName(business.name);
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

  React.useEffect(() => {
    const fetchSelectedStore = async () => {
      if (!user?.id) {
        setSelectedStoreLabel(null)
        setSelectedStoreLogo(null)
        return
      }

      try {
        const { data, error } = await supabase
          .from('store_connections')
          .select('id, store_name, platform, store_logo_url, logo_zoom')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error || !data?.length) {
          setSelectedStoreLabel(null)
          setSelectedStoreLogo(null)
          setSelectedStoreLogoZoom(null)
          return
        }

        const savedConnectionId = typeof window !== 'undefined'
          ? localStorage.getItem('selectedStoreConnectionId')
          : null

        const targetConnection = savedConnectionId
          ? data.find((conn) => conn.id === savedConnectionId) || data[0]
          : data[0]

        setSelectedStoreLabel(targetConnection?.store_name || targetConnection?.platform || null)
        setSelectedStoreLogo(targetConnection?.store_logo_url || null)
        setSelectedStoreLogoZoom(targetConnection?.logo_zoom || null)
      } catch (error) {
        console.error('Error fetching selected store:', error)
        setSelectedStoreLabel(null)
        setSelectedStoreLogo(null)
        setSelectedStoreLogoZoom(null)
      }
    }

    fetchSelectedStore()

    const handleStoreChanged = () => fetchSelectedStore()
    const handleStoreLogoUpdated = () => fetchSelectedStore()
    
    window.addEventListener('storeConnectionChanged', handleStoreChanged as EventListener)
    window.addEventListener('storeLogoUpdated', handleStoreLogoUpdated as EventListener)

    return () => {
      window.removeEventListener('storeConnectionChanged', handleStoreChanged as EventListener)
      window.removeEventListener('storeLogoUpdated', handleStoreLogoUpdated as EventListener)
    }
  }, [user?.id])

  
  if (!showHeader) {
    return null;
  }

  return (
    <header className="bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Left side in English, Right side in Arabic */}
          <div className="flex items-center gap-4">
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

            {/* Onboarding Step Indicator - Next to Logo */}
            {isOnboardingPage && stepInfo && (
              <>
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
              </>
            )}
          </div>

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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLanguageToggle}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <Globe className="h-4 w-4" />
                  <span>{locale === 'en' ? 'AR' : 'EN'}</span>
                </Button>
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
            
            {/* For authenticated users who haven't completed onboarding - Show onboarding header style */}
            {showUserInfo && !hasCompletedOnboarding && !isLoadingBusinessName && (() => {
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

              const userInitials = getUserInitials(
                user.user_metadata?.full_name || null,
                user.email || ''
              );

              return (
                <>
                  {/* Language Toggle Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLanguageToggle}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <Globe className="h-4 w-4" />
                    <span>{locale === 'en' ? 'AR' : 'EN'}</span>
                  </Button>
                  
                  {/* User dropdown - Avatar only */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-white text-sm font-medium hover:opacity-80 transition-opacity focus:outline-none cursor-pointer shrink-0"
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
                  
                  {/* Complete Setup Button */}
                  <Button
                    asChild
                    className="h-9 bg-black text-white hover:bg-gray-900 flex items-center gap-2"
                  >
                    <Link href={localizedUrl('/onboarding/personal-details')}>
                      <span>{locale === 'ar' ? 'إكمال الإعداد' : 'Complete setup'}</span>
                      {locale === 'ar' ? (
                        <ArrowRight className="h-4 w-4 rotate-180" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                    </Link>
                  </Button>
                </>
              );
            })()}
            
            {/* For authenticated users who have completed onboarding - Show full header */}
            {showUserInfo && hasCompletedOnboarding && !isLoadingBusinessName && (() => {
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
                <>
                  {/* Advanced Language Selector with Country Selector - Before user button in Arabic */}
                  {locale === 'ar' && <AdvancedLanguageSelector />}
                  
                  <DropdownMenu>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={localizedUrl('/dashboard')}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              try {
                                const url = localizedUrl('/dashboard');
                                router.push(url);
                              } catch (error) {
                                console.error('Navigation error:', error);
                                router.push('/dashboard');
                              }
                            }}
                          >
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 overflow-hidden relative ${
                              selectedStoreLogo ? '' : 'bg-[#F4610B]/10'
                            }`}>
                              {selectedStoreLogo ? (
                                <img 
                                  src={selectedStoreLogo} 
                                  alt="Store Logo" 
                                  className="absolute inset-0 h-full w-full object-cover"
                                  style={{
                                    transform: `scale(${(selectedStoreLogoZoom || 100) / 100})`,
                                    transition: 'transform 0.2s ease-out'
                                  }}
                                />
                              ) : (
                                <Store className="h-6 w-6 text-[#F4610B] relative z-10" />
                              )}
                            </div>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="left" sideOffset={10} className="text-xs px-2 py-1.5">
                          {(() => {
                            const dashboardLabel = t('dashboard.pageName.dashboard')
                            const storeLabel = selectedStoreLabel || dashboardLabel
                            if (!selectedStoreLabel) return dashboardLabel
                            return isRTL
                              ? `${storeLabel} ${dashboardLabel}`
                              : `${storeLabel} Dashboard`
                          })()}
                        </TooltipContent>
                      </Tooltip>
                      <DropdownMenuTrigger asChild>
                        <button
                        className="group flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100/75 rounded-lg pl-2 pr-3 py-1.5 transition-colors focus:outline-none"
                        >
                          <div className="flex flex-col items-start text-left min-w-0">
                            <span className="text-sm font-medium text-gray-900 leading-tight">
                              {selectedStoreLabel || businessName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                            </span>
                            <span className="text-xs text-gray-600 leading-tight">
                              {user.email}
                            </span>
                          </div>
                          <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                        </button>
                      </DropdownMenuTrigger>
                    </div>
                    <DropdownMenuContent
                      align="end"
                      side="bottom"
                      sideOffset={-48}
                      className="w-60 rounded-2xl p-0 shadow-[0_20px_60px_rgba(15,23,42,0.15)] bg-white overflow-hidden border-0"
                    >
                      <div className="px-4 py-3 bg-gray-50 flex items-center gap-3 border-b border-gray-100">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-lg shrink-0 overflow-hidden relative ${
                          selectedStoreLogo ? '' : 'bg-[#F4610B]/10'
                        }`}>
                          {selectedStoreLogo ? (
                            <img 
                              src={selectedStoreLogo} 
                              alt="Store Logo" 
                              className="absolute inset-0 h-full w-full object-cover"
                              style={{
                                transform: `scale(${(selectedStoreLogoZoom || 100) / 100})`,
                                transition: 'transform 0.2s ease-out'
                              }}
                            />
                          ) : (
                            <Store className="h-6 w-6 text-[#F4610B]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {selectedStoreLabel || businessName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="p-2 space-y-1">
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            try {
                              const url = localizedUrl('/dashboard');
                              router.push(url);
                            } catch (error) {
                              console.error('Navigation error:', error);
                              // Fallback to default URL
                              router.push('/dashboard');
                            }
                          }}
                          className="cursor-pointer rounded-xl flex items-center gap-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
                        >
                          <LayoutDashboard className="h-4 w-4 text-gray-400" />
                          Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            try {
                              const url = localizedUrl('/dashboard/settings/account');
                              router.push(url);
                            } catch (error) {
                              console.error('Navigation error:', error);
                              // Fallback to default URL
                              router.push('/dashboard/settings/account');
                            }
                          }}
                          className="cursor-pointer rounded-xl flex items-center gap-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
                        >
                          <Settings className="h-4 w-4 text-gray-400" />
                          Account Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            const otherLang = locale === 'en' ? 'ar' : 'en';
                            const loadingMessage = locale === 'ar' 
                              ? 'جاري تبديل اللغة...' 
                              : 'Switching language...';
                            setLoading(true, loadingMessage);
                            // Delay to ensure loading overlay is visible before reload
                            setTimeout(() => {
                              setLocale(otherLang);
                            }, 2000);
                          }}
                          className="cursor-pointer rounded-xl flex items-center gap-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
                        >
                          <Languages className="h-4 w-4 text-gray-400" />
                          {locale === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-2 bg-gray-100" />
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            handleSignOut();
                          }}
                          className="cursor-pointer rounded-xl flex items-center gap-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-600"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </DropdownMenuItem>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Advanced Language Selector with Country Selector - After user button in English */}
                  {locale !== 'ar' && <AdvancedLanguageSelector />}
                </>
              );
            })()}
            
            {/* Loading skeleton for user email on auth pages */}
            {loading && isAuthPage && user === null && (
              <Skeleton className="h-5 w-36 rounded" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
