'use client';

import { useState, useEffect, useCallback } from 'react';
import * as React from 'react';
import { useLocale } from '@/i18n/context';
import type { Locale } from '@/i18n/request';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import { useLoading } from '@/lib/loading-context';
import { Check, Globe, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
import { useStickyAnnouncement } from '@/lib/use-sticky-announcement';

// Country-Language mappings
interface CountryLanguage {
  countryCode: string;
  countryName: string;
  countryNameAr: string;
  flagUrl: string;
  languages: {
    code: Locale;
    name: string;
    nativeName: string;
  }[];
}

// Flag URLs - Fetching from assets/flags/new
const FLAG_BASE_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/flags/new';

// Helper function to get flag URL from assets/flags/new
const getFlagUrl = (countryCode: string): string => {
  const flagMap: Record<string, string> = {
    'SA': `${FLAG_BASE_URL}/saudi-arabia.png`,
    'AE': `${FLAG_BASE_URL}/united-arab-emirates.png`,
    'KW': `${FLAG_BASE_URL}/kuwait.png`,
    'QA': `${FLAG_BASE_URL}/qatar.png`,
    'BH': `${FLAG_BASE_URL}/bahrain.png`,
    'OM': `${FLAG_BASE_URL}/oman.png`,
    'EG': `${FLAG_BASE_URL}/egypt.png`,
  };
  
  return flagMap[countryCode] || `${FLAG_BASE_URL}/default.png`;
};

const countryLanguages: CountryLanguage[] = [
  {
    countryCode: 'SA',
    countryName: 'Saudi Arabia',
    countryNameAr: 'المملكة العربية السعودية',
    flagUrl: getFlagUrl('SA'),
    languages: [
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'en', name: 'English', nativeName: 'English' },
    ],
  },
  {
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    countryNameAr: 'الإمارات العربية المتحدة',
    flagUrl: getFlagUrl('AE'),
    languages: [
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'en', name: 'English', nativeName: 'English' },
    ],
  },
  {
    countryCode: 'KW',
    countryName: 'Kuwait',
    countryNameAr: 'الكويت',
    flagUrl: getFlagUrl('KW'),
    languages: [
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'en', name: 'English', nativeName: 'English' },
    ],
  },
  {
    countryCode: 'QA',
    countryName: 'Qatar',
    countryNameAr: 'قطر',
    flagUrl: getFlagUrl('QA'),
    languages: [
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'en', name: 'English', nativeName: 'English' },
    ],
  },
  {
    countryCode: 'BH',
    countryName: 'Bahrain',
    countryNameAr: 'البحرين',
    flagUrl: getFlagUrl('BH'),
    languages: [
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'en', name: 'English', nativeName: 'English' },
    ],
  },
  {
    countryCode: 'OM',
    countryName: 'Oman',
    countryNameAr: 'عُمان',
    flagUrl: getFlagUrl('OM'),
    languages: [
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'en', name: 'English', nativeName: 'English' },
    ],
  },
  {
    countryCode: 'EG',
    countryName: 'Egypt',
    countryNameAr: 'مصر',
    flagUrl: getFlagUrl('EG'),
    languages: [
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'en', name: 'English', nativeName: 'English' },
    ],
  },
];

interface UserPreferences {
  countryCode: string;
  language: Locale;
}

export function AdvancedLanguageSelector() {
  const { locale, setLocale, isRTL } = useLocale();
  const { setLoading } = useLoading();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { showStickyAnnouncement, removeStickyAnnouncement } = useStickyAnnouncement();
  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [pendingCountryChange, setPendingCountryChange] = useState<{
    newCountryCode: string;
    previousCountryCode: string;
    newCountryName: string;
  } | null>(null);

  // Parse URL on mount to get country and language
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const path = pathname;
    // Check if URL has format /{lang}-{country} (e.g., /ar-eg, /en-ae)
    const urlMatch = path.match(/^\/([a-z]{2})-([a-z]{2})(\/.*)?$/i);
    
    if (urlMatch) {
      const [, urlLang, urlCountry] = urlMatch;
      const validLang = (urlLang.toLowerCase() === 'ar' || urlLang.toLowerCase() === 'en') 
        ? urlLang.toLowerCase() as Locale 
        : null;
      const validCountry = countryLanguages.find(c => c.countryCode.toLowerCase() === urlCountry.toLowerCase());
      
      if (validLang && validCountry) {
        // Set preferences from URL
        setUserPreferences({
          countryCode: validCountry.countryCode,
          language: validLang,
        });
        setSelectedCountryCode(validCountry.countryCode);
        // Update locale if different
        if (validLang !== locale) {
          setLocale(validLang);
        }
      }
    }
  }, [pathname, locale]); // Run when pathname or locale changes

  // Load user preferences from database
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user?.id) {
        setIsLoadingPreferences(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('merchant_users')
          .select('preferred_country, preferred_language')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          if (data.preferred_country && data.preferred_language) {
            setUserPreferences({
              countryCode: data.preferred_country,
              language: data.preferred_language as Locale,
            });
          }
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    loadUserPreferences();
  }, [user?.id]);

  // Determine current country and language - completely independent
  const getCurrentCountryLanguage = (): CountryLanguage | null => {
    // If user has saved preferences, use those (country is independent of language)
    if (userPreferences) {
      const country = countryLanguages.find(c => c.countryCode === userPreferences.countryCode);
      if (country) {
        return country;
      }
    }

    // If no saved preferences, default to first country (UAE) - not based on language
    return countryLanguages[0] || null;
  };

  const currentCountryLanguage = getCurrentCountryLanguage();
  const currentLanguage = userPreferences?.language || locale;
  const currentCountry = selectedCountryCode 
    ? countryLanguages.find(c => c.countryCode === selectedCountryCode)
    : currentCountryLanguage;

  // Get available languages for selected country
  const availableLanguages = currentCountry?.languages || [];

  // Save user preferences to database
  const saveUserPreferences = async (countryCode: string, language: Locale) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('merchant_users')
        .update({
          preferred_country: countryCode,
          preferred_language: language,
        })
        .eq('auth_user_id', user.id);

      if (error) {
        console.error('Error saving preferences:', error);
      } else {
        setUserPreferences({ countryCode, language });
      }
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  };

  // Helper function to update URL
  const updateURL = useCallback((countryCode: string, language: Locale) => {
    const country = countryLanguages.find(c => c.countryCode === countryCode);
    if (!country) return;
    
    // Get current path without locale-country prefix
    let basePath = pathname;
    // Remove existing locale-country prefix if present (e.g., /ar-eg/dashboard -> /dashboard)
    basePath = basePath.replace(/^\/[a-z]{2}-[a-z]{2}/i, '') || '/';
    
    // Build new URL with format /{lang}-{country}{path}
    const newPath = `/${language}-${countryCode.toLowerCase()}${basePath === '/' ? '' : basePath}`;
    
    // Only update if path actually changed
    if (newPath !== pathname) {
      // Update URL without reload
      router.replace(newPath);
    }
  }, [pathname, router]);

  const handleCountrySelect = (countryCode: string) => {
    // Get current country code
    const currentCountryCode = selectedCountryCode || userPreferences?.countryCode || currentCountryLanguage?.countryCode || 'AE';
    
    // If selecting the same country, just close the menu
    if (countryCode === currentCountryCode) {
      setIsCountryMenuOpen(false);
      return;
    }
    
    // Get country names for the announcement
    const newCountry = countryLanguages.find(c => c.countryCode === countryCode);
    const previousCountry = countryLanguages.find(c => c.countryCode === currentCountryCode);
    
    if (!newCountry || !previousCountry) {
      setIsCountryMenuOpen(false);
      return;
    }
    
    // Store pending change
    setPendingCountryChange({
      newCountryCode: countryCode,
      previousCountryCode: currentCountryCode,
      newCountryName: isRTL ? newCountry.countryNameAr : newCountry.countryName,
    });
    
    setIsCountryMenuOpen(false);
    
    // Show persistent sticky announcement at the top
    const announcementId = `country-change-${Date.now()}`;
    showStickyAnnouncement({
      id: announcementId,
      type: 'update',
      description: isRTL
        ? `أنت تقوم بتغيير سوق Haady إلى ${newCountry.countryNameAr}. إذا قمت بإلغاء هذا الإعلان، سيتم الاحتفاظ بالبلد الحالي.`
        : `Switching to ${newCountry.countryName} market. Dismiss to keep your current selection.`,
      ctaText: isRTL ? `تغيير إلى سوق ${newCountry.countryNameAr}` : `Change to ${newCountry.countryName} market`,
      ctaIcon: (
        <Image
          src={newCountry.flagUrl}
          alt={newCountry.countryName}
          width={20}
          height={20}
          className="h-5 w-5 object-contain rounded"
          unoptimized
        />
      ),
      ctaAction: () => {
        // Confirm: Save the new country
        confirmCountryChange(countryCode, userPreferences?.language || locale);
        removeStickyAnnouncement(announcementId);
        setPendingCountryChange(null);
      },
      dismissable: true,
      persistent: true,
      position: 'top',
      onDismiss: () => {
        // Dismiss: Revert to previous country and remove announcement (don't save to localStorage)
        revertCountryChange();
        removeStickyAnnouncement(announcementId);
        setPendingCountryChange(null);
      },
    });
  };

  const confirmCountryChange = async (countryCode: string, language: Locale) => {
    setSelectedCountryCode(countryCode);
    
    // Update URL with new country
    updateURL(countryCode, language);
    
    // Save country preference to database
    if (user?.id) {
      await saveUserPreferences(countryCode, language);
    }
    
    // Update user preferences state
    setUserPreferences({ countryCode, language });
  };

  const revertCountryChange = () => {
    // Revert to previous country - since we haven't saved anything yet,
    // we just need to ensure selectedCountryCode reflects the previous country
    if (pendingCountryChange) {
      // Restore previous selection - this ensures the UI shows the correct country
      setSelectedCountryCode(pendingCountryChange.previousCountryCode);
    }
  };

  const handleLanguageChange = async (language: Locale) => {
    // Use selected country if available, otherwise use current country from preferences
    const countryToUse = selectedCountryCode 
      ? countryLanguages.find(c => c.countryCode === selectedCountryCode)
      : currentCountry;
    
    if (!countryToUse) return;
    
    // Check if language is available for the selected country
    if (!countryToUse.languages.some(l => l.code === language)) {
      console.warn(`Language ${language} not available for country ${countryToUse.countryCode}`);
      return;
    }
    
    // Only check if language changed, not country (country and language are independent)
    if (language === locale) {
      setIsLanguageMenuOpen(false);
      return;
    }

    const loadingMessage = locale === 'ar' 
      ? 'جاري تبديل اللغة...' 
      : 'Switching language...';
    setLoading(true, loadingMessage);

    // Save preferences with the selected country (preserve country selection)
    await saveUserPreferences(countryToUse.countryCode, language);

    // Update URL with new language and country
    updateURL(countryToUse.countryCode, language);

    // Delay to ensure loading overlay is visible before reload
    setTimeout(() => {
      setLocale(language);
      setIsLanguageMenuOpen(false);
      // Don't reset selectedCountryCode - keep it so country persists after reload
    }, 2000);
  };

  const getCountryDisplayName = (country: CountryLanguage) => {
    return isRTL && country.countryNameAr ? country.countryNameAr : country.countryName;
  };

  const getLanguageDisplayName = (language: { name: string; nativeName: string }) => {
    return isRTL ? language.nativeName : language.name;
  };

  if (isLoadingPreferences) {
    return (
      <Button variant="ghost" size="sm" className="gap-2 py-4 px-4" disabled>
        <Globe className="h-4 w-4 animate-pulse" />
      </Button>
    );
  }

  // Use selected country if available, otherwise use current country from preferences
  const displayCountry = selectedCountryCode 
    ? countryLanguages.find(c => c.countryCode === selectedCountryCode) 
    : (currentCountryLanguage || countryLanguages[0]);
  const displayLanguage = displayCountry.languages.find(l => l.code === currentLanguage) || displayCountry.languages[0];

  return (
    <div className="flex items-center gap-2">
      {/* Country Selector */}
      <DropdownMenu open={isCountryMenuOpen} onOpenChange={setIsCountryMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 py-4 px-4"
            title={isRTL ? 'اختر البلد' : 'Select Country'}
          >
            <Image
              src={displayCountry.flagUrl}
              alt={displayCountry.countryName}
              width={32}
              height={32}
              className="h-8 w-8 object-contain rounded"
              unoptimized
            />
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end"
          sideOffset={8}
          className="w-[300px] max-h-[80vh] overflow-y-auto p-4 rounded-xl"
        >
          {/* Normal list layout */}
          <div className="space-y-1">
            {countryLanguages.map((country) => {
              // Check if this country is selected (either from selection or from preferences)
              const isSelected = selectedCountryCode 
                ? selectedCountryCode === country.countryCode
                : (currentCountryLanguage?.countryCode === country.countryCode);

              return (
                <div
                  key={country.countryCode}
                  onClick={() => handleCountrySelect(country.countryCode)}
                  className={cn(
                    'cursor-pointer rounded-lg px-3 py-2 transition-colors',
                    'hover:bg-sidebar-accent/50',
                    isSelected && 'bg-sidebar-accent text-sidebar-accent-foreground'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={country.flagUrl}
                      alt={country.countryName}
                      width={24}
                      height={24}
                      className="h-6 w-6 object-contain rounded flex-shrink-0"
                      unoptimized
                    />
                    <span 
                      className="text-sm font-medium flex-1"
                      style={isRTL 
                        ? { fontFamily: 'var(--font-ibm-plex-arabic), sans-serif' }
                        : { fontFamily: 'var(--font-inter), sans-serif' }
                      }
                    >
                      {getCountryDisplayName(country)}
                    </span>
                    {isSelected && (
                      <Check className="h-4 w-4 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Language Selector */}
      <DropdownMenu open={isLanguageMenuOpen} onOpenChange={setIsLanguageMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 py-4 px-4"
            title={isRTL ? 'اختر اللغة' : 'Select Language'}
          >
            <Globe className="h-4 w-4" />
            <span className="font-medium uppercase">
              {displayLanguage.code.toUpperCase()}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start"
          sideOffset={8}
          className="w-[150px] max-h-[80vh] overflow-y-auto p-2 rounded-xl"
        >
          {/* Languages for selected country */}
          <div className="space-y-1">
            {availableLanguages.map((language) => {
              const isSelected = currentLanguage === language.code;

              return (
                <div
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={cn(
                    'cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors',
                    'hover:bg-sidebar-accent/50',
                    isSelected && 'bg-sidebar-accent text-sidebar-accent-foreground'
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span 
                      className="flex-1"
                      style={language.code === 'ar'
                        ? { fontFamily: 'var(--font-ibm-plex-arabic), sans-serif' }
                        : { fontFamily: 'var(--font-inter), sans-serif' }
                      }
                    >
                      {getLanguageDisplayName(language)}
                    </span>
                    {isSelected && (
                      <Check className="h-4 w-4 ml-2 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

