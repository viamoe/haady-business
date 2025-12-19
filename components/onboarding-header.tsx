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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import * as React from 'react';
import { useLoading } from '@/lib/loading-context';
import { useLocalizedUrl } from '@/lib/use-localized-url';
import { useOnboarding } from '@/lib/onboarding-context';

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg';

export function OnboardingHeader() {
  const t = useTranslations();
  const { isRTL, locale, setLocale } = useLocale();
  const { user, signOut, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { setLoading } = useLoading();
  const { localizedUrl } = useLocalizedUrl();
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [isLoadingBusinessName, setIsLoadingBusinessName] = useState(true);
  const [selectedStoreLabel, setSelectedStoreLabel] = useState<string | null>(null);
  const [selectedStoreLogo, setSelectedStoreLogo] = useState<string | null>(null);
  const [selectedStoreLogoZoom, setSelectedStoreLogoZoom] = useState<number | null>(null);

  // Check if we're on the onboarding page
  const isOnboardingPage = pathname.includes('/onboarding');
  const showUserInfo = user && !loading;
  
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

  // Fetch business name
  React.useEffect(() => {
    const fetchBusinessName = async () => {
      if (!user?.id) {
        setIsLoadingBusinessName(false);
        return;
      }
      
      setIsLoadingBusinessName(true);
      try {
        const { data: businessProfile } = await supabase
          .from('business_profile')
          .select('id, business_name, full_name')
          .eq('auth_user_id', user.id)
          .maybeSingle();

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

  return (
    <header className="sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Empty space where logo was */}
          <div></div>

          {/* Right side - User info and Language Switcher */}
          <div className="flex items-center gap-3">
            {/* Loading skeleton */}
            {loading && (
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-20 rounded-md" />
                <Skeleton className="h-9 w-28 rounded-md" />
              </div>
            )}
            
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
            
            {/* User dropdown for authenticated users */}
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

              const userInitials = getUserInitials(
                user.user_metadata?.full_name || null,
                user.email || ''
              );

              return (
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
              );
            })()}
          </div>
        </div>
      </div>
    </header>
  );
}

