'use client'

import { useLocale } from '@/i18n/context'
import type { Locale } from '@/i18n/request'
import { Button } from '@/components/ui/button'
import { useLoading } from '@/lib/loading-context'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

export function HeaderLanguageSwitcher() {
  const { locale, setLocale } = useLocale()
  const { setLoading } = useLoading()

  const otherLang: Locale = locale === 'en' ? 'ar' : 'en'
  // Show the language you can switch TO, not the current language
  const displayLang = otherLang.toUpperCase()
  const tooltipText = `Switch to ${otherLang === 'en' ? 'English' : 'Arabic'}`

  const handleLanguageSwitch = () => {
    setLoading(true)
    // Delay to ensure loading overlay is visible before reload
    setTimeout(() => {
      setLocale(otherLang)
    }, 3000)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 px-3 text-gray-600 hover:text-orange-500 hover:bg-orange-100 transition-colors flex items-center justify-center"
          onClick={handleLanguageSwitch}
          aria-label={tooltipText}
        >
          <span className="text-sm font-medium">{displayLang}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent 
        side="bottom" 
        sideOffset={16} 
        className="text-xs px-2 py-1.5"
      >
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  )
}

