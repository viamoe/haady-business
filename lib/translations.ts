'use client'

import { useLocale } from '@/i18n/context'
import enTranslations from '@/i18n/locales/en.json'
import arTranslations from '@/i18n/locales/ar.json'

type Translations = typeof enTranslations

const translations: Record<'en' | 'ar', Translations> = {
  en: enTranslations,
  ar: arTranslations,
}

export function useTranslations() {
  const { locale } = useLocale()
  const t = translations[locale]

  return {
    t,
    locale,
  }
}

/**
 * Get translation for toast errors
 */
export function getToastTranslations(locale: 'en' | 'ar' = 'en') {
  return translations[locale].toast
}

