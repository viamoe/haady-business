'use client'

import * as React from 'react'
import { Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = React.useMemo(() => {
    if (!mounted) return true
    if (theme === 'dark') return true
    // System theme always uses dark
    return true
  }, [theme, mounted])

  if (!mounted) {
    return (
      <Button 
        variant="ghost" 
        size="icon"
        className="h-10 w-10 items-center justify-center text-muted-foreground hover:text-white transition-colors"
      >
        <Moon className="h-4 w-4" />
        <span className="sr-only">Theme</span>
      </Button>
    )
  }

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('dark')
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 items-center justify-center text-muted-foreground hover:text-white transition-colors"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Switch to system mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
      <span className="sr-only">{theme === 'dark' ? 'Dark mode' : 'System mode'}</span>
    </Button>
  )
}
