'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/i18n/context';
import { useLoading } from '@/lib/loading-context';

const FLAG_BASE_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/flags';

// Country flag mappings
const COUNTRY_FLAGS: Record<string, string> = {
  'sa': `${FLAG_BASE_URL}/saudi.png`,
  'ae': `${FLAG_BASE_URL}/uae.png`,
  'kw': `${FLAG_BASE_URL}/kuwait.png`,
  'qa': `${FLAG_BASE_URL}/qatar.png`,
  'bh': `${FLAG_BASE_URL}/bahrain.png`,
  'om': `${FLAG_BASE_URL}/oman.png`,
  'eg': `${FLAG_BASE_URL}/egypt.png`,
};

// Language display names
const LANGUAGE_NAMES = {
  ar: 'العربية',
  en: 'English',
} as const;

// Default fallbacks
const DEFAULT_COUNTRY = 'sa';
const DEFAULT_FLAG = COUNTRY_FLAGS['sa'];

interface SimpleLanguageSwitcherProps {
  className?: string;
}

export function SimpleLanguageSwitcher({ className }: SimpleLanguageSwitcherProps) {
  const { locale, setLocale } = useLocale();
  const { setLoading } = useLoading();
  const pathname = usePathname();
  
  const [currentCountry, setCurrentCountry] = useState<string>(DEFAULT_COUNTRY);
  const [currentLanguage, setCurrentLanguage] = useState<'ar' | 'en'>(locale as 'ar' | 'en');

  // Parse URL to get language and country
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if URL has format /{lang}-{country} (e.g., /ar-eg, /en-sa)
    const urlMatch = pathname.match(/^\/([a-z]{2})-([a-z]{2})(\/.*)?$/i);
    
    if (urlMatch) {
      const [, urlLang, urlCountry] = urlMatch;
      const lang = urlLang.toLowerCase();
      const country = urlCountry.toLowerCase();
      
      if (lang === 'ar' || lang === 'en') {
        setCurrentLanguage(lang as 'ar' | 'en');
      }
      
      if (COUNTRY_FLAGS[country]) {
        setCurrentCountry(country);
      }
    } else {
      // Fallback to locale context
      setCurrentLanguage(locale as 'ar' | 'en');
    }
  }, [pathname, locale]);

  // Get flag URL for current country
  const flagUrl = COUNTRY_FLAGS[currentCountry] || DEFAULT_FLAG;
  
  // Determine target language for switching (show this in the button)
  const targetLanguage = currentLanguage === 'en' ? 'ar' : 'en';
  
  // Get target language display name
  const targetLanguageName = LANGUAGE_NAMES[targetLanguage];

  const handleLanguageToggle = () => {
    setLoading(true);
    // Delay to ensure loading overlay is visible before reload
    setTimeout(() => {
      setLocale(targetLanguage);
    }, 3000);
  };

  return (
    <Button
      variant="ghost"
      onClick={handleLanguageToggle}
      className={className ?? "flex items-center gap-2 text-sm h-10 px-4 text-gray-600 hover:text-orange-500 hover:bg-orange-100 transition-colors"}
    >
      <Image
        src={flagUrl}
        alt={currentCountry.toUpperCase()}
        width={24}
        height={24}
        className="h-6 w-6 object-contain rounded-full"
        unoptimized
      />
      <span 
        style={{
          fontFamily: targetLanguage === 'ar' 
            ? 'var(--font-ibm-plex-arabic), sans-serif' 
            : 'var(--font-inter), sans-serif'
        }}
        className="font-medium"
      >
        {targetLanguageName}
      </span>
    </Button>
  );
}
