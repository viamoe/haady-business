"use client"

import { useTheme } from "@/components/theme-provider"
import { Toaster as Sonner } from "sonner"
import { useEffect, useState } from "react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()
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

  return (
    <Sonner
      theme={actualTheme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-950 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-gray-500",
          actionButton:
            "group-[.toast]:bg-gray-900 group-[.toast]:text-gray-50",
          cancelButton:
            "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-500",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

