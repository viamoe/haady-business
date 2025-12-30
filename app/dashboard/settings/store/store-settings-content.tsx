'use client'

import { useLocale } from '@/i18n/context'
import { useState, useEffect, useRef } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Store, User, Bell, Shield, Globe } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'

export function StoreSettingsContent() {
  const { locale, isRTL } = useLocale()
  const t = useTranslations()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedRef = useRef(false)

  // Get sub-page name from pathname for breadcrumb
  const pathSegments = pathname.split('/').filter(Boolean)
  const isSubPage = pathSegments.length > 2 && pathSegments[1] === 'settings' && pathSegments[2] !== undefined
  const subPageName = isSubPage ? pathSegments[2] : null
  const subPageTitle = subPageName === 'store' 
    ? (locale === 'ar' ? 'المتجر' : 'Store')
    : subPageName === 'account'
    ? (locale === 'ar' ? 'الحساب' : 'Account')
    : subPageName 
    ? subPageName.charAt(0).toUpperCase() + subPageName.slice(1)
    : null

  // Listen for navigation start event to show skeleton immediately
  useEffect(() => {
    const handleNavigationStart = (event: CustomEvent) => {
      const url = event.detail?.url
      // Only trigger if navigating to store settings page
      if (url && url.startsWith('/dashboard/settings/store')) {
        setIsLoading(true)
      }
    }

    window.addEventListener('dashboard-navigation-start', handleNavigationStart as EventListener)
    return () => {
      window.removeEventListener('dashboard-navigation-start', handleNavigationStart as EventListener)
    }
  }, [])

  useEffect(() => {
    // Only show skeleton on initial mount, not on subsequent renders
    if (hasLoadedRef.current) {
      setIsLoading(false)
      return
    }

    // Show skeleton for minimum time on initial load
    const timer = setTimeout(() => {
      setIsLoading(false)
      hasLoadedRef.current = true
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  const settingsSections = [
    {
      id: 'store',
      title: locale === 'ar' ? 'إعدادات المتجر' : 'Store Settings',
      description: locale === 'ar' ? 'إدارة معلومات المتجر والإعدادات' : 'Manage your store information and settings',
      icon: Store,
      href: '/dashboard/settings/store',
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      id: 'account',
      title: locale === 'ar' ? 'إعدادات الحساب' : 'Account Settings',
      description: locale === 'ar' ? 'إدارة معلومات حسابك الشخصي' : 'Manage your personal account information',
      icon: User,
      href: '/dashboard/settings/account',
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
    },
    {
      id: 'notifications',
      title: locale === 'ar' ? 'الإشعارات' : 'Notifications',
      description: locale === 'ar' ? 'إدارة تفضيلات الإشعارات' : 'Manage your notification preferences',
      icon: Bell,
      href: '/dashboard/settings/notifications',
      iconColor: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
    },
    {
      id: 'security',
      title: locale === 'ar' ? 'الأمان' : 'Security',
      description: locale === 'ar' ? 'إعدادات الأمان وكلمة المرور' : 'Security and password settings',
      icon: Shield,
      href: '/dashboard/settings/security',
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
    },
    {
      id: 'language',
      title: locale === 'ar' ? 'اللغة' : 'Language & Region',
      description: locale === 'ar' ? 'إعدادات اللغة والمنطقة' : 'Language and regional settings',
      icon: Globe,
      href: '/dashboard/settings/language',
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
    },
  ]

  return (
    <div className="h-full" lang={locale} dir={isRTL ? 'rtl' : 'ltr'}>
      {isLoading ? (
        // Skeleton
        <div className="space-y-6 max-w-7xl mx-auto w-full">
          {/* Breadcrumb Skeleton */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Skeleton className="h-5 w-20" />
              </BreadcrumbItem>
              {isSubPage && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <Skeleton className="h-5 w-16" />
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>

          <div className="space-y-2 mt-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-32 rounded-3xl" />
            ))}
          </div>
        </div>
      ) : (
        // Content with fade-in animation
        <div className="fade-in-content space-y-6 max-w-7xl mx-auto w-full">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                {isSubPage ? (
                  <BreadcrumbLink asChild>
                    <Link href="/dashboard/settings" className="text-md font-medium hover:text-foreground">
                      {locale === 'ar' ? 'الإعدادات' : 'Settings'}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="text-md font-medium">
                    {locale === 'ar' ? 'الإعدادات' : 'Settings'}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {isSubPage && subPageTitle && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-md font-medium">{subPageTitle}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {locale === 'ar' ? 'الإعدادات' : 'Settings'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {locale === 'ar' 
                  ? 'إدارة إعدادات حسابك ومتجرك'
                  : 'Manage your account and store settings'}
              </p>
            </div>
          </div>

          {/* Settings Sections Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {settingsSections.map((section) => {
              const Icon = section.icon
              return (
                <Link
                  key={section.id}
                  href={section.href}
                  className="group"
                >
                  <Card className="group relative min-h-[200px] overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] border-0 flex flex-col transition-all duration-200 hover:-translate-y-1">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`h-12 w-12 rounded-xl ${section.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className={`h-6 w-6 ${section.iconColor}`} />
                        </div>
                        <CardTitle className="text-lg font-bold">
                          {section.title}
                        </CardTitle>
                      </div>
                      <CardDescription className="text-sm">
                        {section.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

