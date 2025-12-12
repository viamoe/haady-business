'use client';

import { useState, useEffect, useCallback } from 'react';
import * as React from 'react';
import { useLocale } from '@/i18n/context';
import type { Locale } from '@/i18n/request';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { useLoading } from '@/lib/loading-context';
import { Check, Globe, ChevronDown, X } from 'lucide-react';
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

// Flag URLs - Fetching from assets/flags (root folder)
const FLAG_BASE_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/flags';

// Helper function to get flag URL from assets/flags (root folder)
// Flags are stored with lowercase names matching the bucket files
const getFlagUrl = (countryCode: string): string => {
  const flagMap: Record<string, string> = {
    'SA': `${FLAG_BASE_URL}/saudi.png`,
    'AE': `${FLAG_BASE_URL}/uae.png`,
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [tempCountryCode, setTempCountryCode] = useState<string | null>(null);
  const [tempLanguage, setTempLanguage] = useState<Locale | null>(null);
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

  // Initialize temp values when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      // Compute current country code
      const currentCountryCode = selectedCountryCode || userPreferences?.countryCode || countryLanguages[0]?.countryCode || 'AE';
      setTempCountryCode(currentCountryCode);
      setTempLanguage(currentLanguage);
    }
  }, [isDialogOpen, selectedCountryCode, userPreferences?.countryCode, currentLanguage]);
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
    
    // If selecting the same country, just close the drawer
    if (countryCode === currentCountryCode) {
      setIsDialogOpen(false);
      return;
    }
    
    // Get country names for the announcement
    const newCountry = countryLanguages.find(c => c.countryCode === countryCode);
    const previousCountry = countryLanguages.find(c => c.countryCode === currentCountryCode);
    
    if (!newCountry || !previousCountry) {
      setIsDialogOpen(false);
      return;
    }
    
    // Store pending change
    setPendingCountryChange({
      newCountryCode: countryCode,
      previousCountryCode: currentCountryCode,
      newCountryName: isRTL ? newCountry.countryNameAr : newCountry.countryName,
    });
    
    setIsDialogOpen(false);
    
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
        // Confirm: Save the new country with current language
        confirmCountryChange(countryCode, userPreferences?.language || locale);
        removeStickyAnnouncement(announcementId);
        setPendingCountryChange(null);
      },
      dismissable: true,
      persistent: true,
      position: 'top',
      onDismiss: () => {
        // Dismiss: Revert to previous country and remove announcement
        revertCountryChange();
        removeStickyAnnouncement(announcementId);
        setPendingCountryChange(null);
      },
    });
  };

  const handleLanguageToggle = async (language: Locale) => {
    // Don't do anything if selecting the same language
    if (language === locale) {
      return;
    }

    // Get current country
    const countryToUse = selectedCountryCode 
      ? countryLanguages.find(c => c.countryCode === selectedCountryCode)
      : currentCountry;
    
    if (!countryToUse) return;
    
    // Check if language is available for the selected country
    if (!countryToUse.languages.some(l => l.code === language)) {
      console.warn(`Language ${language} not available for country ${countryToUse.countryCode}`);
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
    }, 2000);
  };

  const confirmCountryChange = async (countryCode: string, language: Locale) => {
    setSelectedCountryCode(countryCode);
    
    const loadingMessage = locale === 'ar' 
      ? 'جاري التبديل...' 
      : 'Switching...';
    setLoading(true, loadingMessage);
    
    // Update URL with new country and language
    updateURL(countryCode, language);
    
    // Save preferences to database
    if (user?.id) {
      await saveUserPreferences(countryCode, language);
    }
    
    // Update user preferences state
    setUserPreferences({ countryCode, language });
    
    // Delay to ensure loading overlay is visible before reload
    setTimeout(() => {
      setLocale(language);
    }, 2000);
  };

  const revertCountryChange = () => {
    // Revert to previous country - since we haven't saved anything yet,
    // we just need to ensure selectedCountryCode reflects the previous country
    if (pendingCountryChange) {
      // Restore previous selection - this ensures the UI shows the correct country
      setSelectedCountryCode(pendingCountryChange.previousCountryCode);
    }
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
  
  // Ensure displayCountry exists before accessing its properties
  if (!displayCountry) {
    return null;
  }
  
  const displayLanguage = displayCountry.languages.find(l => l.code === currentLanguage) || displayCountry.languages[0];

  const handleConfirmChanges = async () => {
    if (!tempCountryCode || !tempLanguage) return;

    const countryToUse = countryLanguages.find(c => c.countryCode === tempCountryCode);
    if (!countryToUse) return;

    // Check if language is available for the selected country
    if (!countryToUse.languages.some(l => l.code === tempLanguage)) {
      console.warn(`Language ${tempLanguage} not available for country ${tempCountryCode}`);
      return;
    }

    // Check if country is changing
    const currentCountryCode = selectedCountryCode || userPreferences?.countryCode || currentCountryLanguage?.countryCode || 'AE';
    const isCountryChanging = tempCountryCode !== currentCountryCode;
    const isLanguageChanging = tempLanguage !== currentLanguage;

    if (isCountryChanging) {
      // Show announcement for country change
      const newCountry = countryLanguages.find(c => c.countryCode === tempCountryCode);
      if (newCountry) {
        setPendingCountryChange({
          newCountryCode: tempCountryCode,
          previousCountryCode: currentCountryCode,
          newCountryName: isRTL ? newCountry.countryNameAr : newCountry.countryName,
        });
        
        setIsDialogOpen(false);
        
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
            confirmCountryChange(tempCountryCode, tempLanguage);
            removeStickyAnnouncement(announcementId);
            setPendingCountryChange(null);
          },
          dismissable: true,
          persistent: true,
          position: 'top',
          onDismiss: () => {
            revertCountryChange();
            removeStickyAnnouncement(announcementId);
            setPendingCountryChange(null);
          },
        });
      }
    } else if (isLanguageChanging) {
      // Only language is changing, apply immediately
      const loadingMessage = locale === 'ar' 
        ? 'جاري تبديل اللغة...' 
        : 'Switching language...';
      setLoading(true, loadingMessage);
      
      await saveUserPreferences(tempCountryCode, tempLanguage);
      updateURL(tempCountryCode, tempLanguage);
      
      setTimeout(() => {
        setLocale(tempLanguage);
        setIsDialogOpen(false);
      }, 2000);
    } else {
      // No changes, just close
      setIsDialogOpen(false);
    }
  };

  const tempCountry = tempCountryCode 
    ? countryLanguages.find(c => c.countryCode === tempCountryCode)
    : displayCountry;
  const tempLanguageDisplay = tempCountry?.languages.find(l => l.code === tempLanguage) || displayLanguage;

  return (
    <Drawer open={isDialogOpen} onOpenChange={setIsDialogOpen} direction={isRTL ? 'left' : 'right'}>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 py-4 px-4"
          title={isRTL ? 'اللغة والمنطقة' : 'Language and region'}
        >
          <Image
            src={displayCountry.flagUrl}
            alt={displayCountry.countryName}
            width={20}
            height={20}
            className="h-5 w-5 object-contain rounded"
            unoptimized
          />
          <span className="font-medium uppercase">
            {displayLanguage.code.toUpperCase()}
          </span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="rounded-none p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <DrawerHeader className="relative pb-4 pl-0 pr-0">
          <DrawerTitle className="text-lg font-semibold pr-8">
            {isRTL ? 'اللغة والمنطقة' : 'Language and region'}
          </DrawerTitle>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("absolute top-4 h-8 w-8 rounded-full", isRTL ? "left-4" : "right-4")}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">{isRTL ? 'إغلاق' : 'Close'}</span>
            </Button>
          </DrawerClose>
        </DrawerHeader>
        
        <div className="space-y-6">
          {/* Select your language */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {isRTL ? 'اختر لغتك' : 'Select your language'}
            </label>
            <Select
              value={tempLanguage || currentLanguage}
              onValueChange={(value) => setTempLanguage(value as Locale)}
            >
              <SelectTrigger className="w-full h-11 bg-gray-50 border-gray-200">
                <SelectValue>
                  <span style={tempLanguage === 'ar'
                    ? { fontFamily: 'var(--font-ibm-plex-arabic), sans-serif' }
                    : { fontFamily: 'var(--font-inter), sans-serif' }
                  }>
                    {tempLanguageDisplay ? getLanguageDisplayName(tempLanguageDisplay) : 'English'}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tempCountry?.languages.map((language) => (
                  <SelectItem key={language.code} value={language.code}>
                    <span style={language.code === 'ar'
                      ? { fontFamily: 'var(--font-ibm-plex-arabic), sans-serif' }
                      : { fontFamily: 'var(--font-inter), sans-serif' }
                    }>
                      {getLanguageDisplayName(language)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select your region */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {isRTL ? 'اختر منطقتك' : 'Select your region'}
            </label>
            <Select
              value={tempCountryCode || displayCountry.countryCode}
              onValueChange={(value) => {
                setTempCountryCode(value);
                // Update language to first available language for the new country
                const newCountry = countryLanguages.find(c => c.countryCode === value);
                if (newCountry && newCountry.languages.length > 0) {
                  const availableLang = newCountry.languages.find(l => l.code === tempLanguage) || newCountry.languages[0];
                  setTempLanguage(availableLang.code);
                }
              }}
            >
              <SelectTrigger className="w-full h-11 bg-gray-50 border-gray-200">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <Image
                      src={tempCountry?.flagUrl || displayCountry.flagUrl}
                      alt={tempCountry?.countryName || displayCountry.countryName}
                      width={20}
                      height={20}
                      className="h-5 w-5 object-contain rounded"
                      unoptimized
                    />
                    <span style={isRTL 
                      ? { fontFamily: 'var(--font-ibm-plex-arabic), sans-serif' }
                      : { fontFamily: 'var(--font-inter), sans-serif' }
                    }>
                      {tempCountry ? getCountryDisplayName(tempCountry) : getCountryDisplayName(displayCountry)}
                    </span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {countryLanguages.map((country) => (
                  <SelectItem key={country.countryCode} value={country.countryCode}>
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Image
                        src={country.flagUrl}
                        alt={country.countryName}
                        width={20}
                        height={20}
                        className="h-5 w-5 object-contain rounded"
                        unoptimized
                      />
                      <span style={isRTL 
                        ? { fontFamily: 'var(--font-ibm-plex-arabic), sans-serif' }
                        : { fontFamily: 'var(--font-inter), sans-serif' }
                      }>
                        {getCountryDisplayName(country)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info text */}
          <p className="text-xs text-muted-foreground">
            {isRTL ? 'قد تختلف المنتجات والميزات حسب المنطقة.' : 'Products and features may vary by region.'}
          </p>
        </div>

        {/* Confirm button */}
        <div className="flex justify-end pt-4 border-t mt-6">
          <Button
            onClick={handleConfirmChanges}
            className="px-6 py-2.5 text-sm font-medium bg-black hover:bg-gray-900 text-white rounded-lg"
          >
            {isRTL ? 'تأكيد التغييرات' : 'Confirm changes'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

