'use client';

import { useLocale } from '@/i18n/context';
import type { Locale } from '@/i18n/request';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useLoading } from '@/lib/loading-context';

const SAUDI_ARABIA_FLAG_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/flags/new/saudi-arabia_321258.png';
const UNITED_KINGDOM_FLAG_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/flags/new/united-kingdom_321269.png';

const languages: { code: Locale; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const { setLoading } = useLoading();

  const otherLang = languages.find(l => l.code !== locale);

  const handleLanguageSwitch = () => {
    if (otherLang) {
      const loadingMessage = locale === 'ar' 
        ? 'جاري تبديل اللغة...' 
        : 'Switching language...';
      setLoading(true, loadingMessage);
      // Delay to ensure loading overlay is visible before reload
      setTimeout(() => {
        setLocale(otherLang.code);
      }, 2000);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLanguageSwitch}
      className="gap-2 py-4 px-4" 
      title={`Switch to ${otherLang?.name}`}
    >
      {otherLang?.code === 'ar' ? (
        <Image
          src={SAUDI_ARABIA_FLAG_URL}
          alt="Saudi Arabia Flag"
          width={32}
          height={32}
          className="h-[22px] w-[26px] object-contain rounded"
          unoptimized
        />
      ) : (
        <Image
          src={UNITED_KINGDOM_FLAG_URL}
          alt="United Kingdom Flag"
          width={32}
          height={32}
          className="h-[22px] w-[26px] object-contain rounded"
          unoptimized
        />
      )}
      <span 
        style={otherLang?.code === 'ar' 
          ? { fontFamily: 'var(--font-ibm-plex-arabic), sans-serif' }
          : { fontFamily: 'var(--font-inter), sans-serif' }
        }
      >
        {otherLang?.nativeName}
      </span>
    </Button>
  );
}

