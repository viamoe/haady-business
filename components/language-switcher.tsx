'use client';

import { useLocale } from '@/i18n/context';
import type { Locale } from '@/i18n/request';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

const languages: { code: Locale; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  const otherLang = languages.find(l => l.code !== locale);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => otherLang && setLocale(otherLang.code)}
      className="gap-2"
      title={`Switch to ${otherLang?.name}`}
    >
      <Languages className="h-4 w-4" />
      <span>{otherLang?.nativeName}</span>
    </Button>
  );
}

