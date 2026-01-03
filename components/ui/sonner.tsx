"use client"

import { useTheme } from "@/components/theme-provider"
import { Toaster as Sonner } from "sonner"
import { useEffect, useState } from "react"
import { Check } from "@/components/animate-ui/icons/check"
import { AnimateIcon } from "@/components/animate-ui/icons/icon"
import { useLocale } from "@/i18n/context"

type ToasterProps = React.ComponentProps<typeof Sonner>

// Animated check icon component for success toasts
const AnimatedCheckIcon = () => {
  return (
    <AnimateIcon 
      animate={true}
      animateOnView={true}
      animateOnViewOnce={true}
      animateOnHover={false}
      animation="default"
    >
      <Check className="size-8 text-green-500" />
    </AnimateIcon>
  )
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()
  const { locale } = useLocale()
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light')
  
  useEffect(() => {
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      setActualTheme(systemTheme)
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => {
        setActualTheme(e.matches ? 'dark' : 'light')
      }
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      setActualTheme(theme as 'light' | 'dark')
    }
  }, [theme])

  const isArabic = locale === 'ar'
  const arabicFontClass = isArabic ? 'font-arabic' : ''

  return (
    <Sonner
      theme={actualTheme}
      className={`toaster group ${arabicFontClass}`}
      position="top-right"
      icons={{
        success: <AnimatedCheckIcon />,
      }}
      style={{
        "--border-radius": "0.5rem",
      } as React.CSSProperties}
      toastOptions={{
        classNames: {
          toast:
            `group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-950 group-[.toaster]:border group-[.toaster]:border-gray-100 group-[.toaster]:shadow-lg group-[.toaster]:items-center group-[.toaster]:rounded-lg group-[.toaster]:max-w-[420px] group-[.toaster]:p-3 ${isArabic ? 'group-[.toaster]:font-arabic' : ''}`,
          title: `group-[.toast]:max-w-full group-[.toast]:min-w-0 group-[.toast]:overflow-hidden group-[.toast]:w-full`,
          description: `group-[.toast]:text-gray-500 ${isArabic ? 'group-[.toast]:font-arabic' : ''}`,
          actionButton:
            `group-[.toast]:bg-gray-100 group-[.toast]:text-gray-900 group-[.toast]:hover:bg-gray-900 group-[.toast]:hover:text-white group-[.toast]:border group-[.toast]:border-[#F4610B] group-[.toast]:font-medium group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:rounded-md group-[.toast]:transition-colors group-[.toast]:text-sm ${isArabic ? 'group-[.toast]:font-arabic' : ''}`,
          cancelButton:
            `group-[.toast]:bg-gray-100 group-[.toast]:text-gray-500 ${isArabic ? 'group-[.toast]:font-arabic' : ''}`,
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

