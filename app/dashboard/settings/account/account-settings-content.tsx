'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useState, useEffect, useRef } from 'react'
import { useLocale } from '@/i18n/context'
import { User, Building2, Store, Calendar, Mail } from 'lucide-react'
import Link from 'next/link'

interface AccountSettingsContentProps {
  business: {
    id: string
    name: string
    status: string
    created_at: string
  } | null
  businessUser: {
    id: string
    store_id: string | null
    is_onboarded: boolean | null
    onboarding_step: string | null
    full_name: string | null
  } | null
  storeCount: number
}

export function AccountSettingsContent({ 
  business, 
  businessUser,
  storeCount 
}: AccountSettingsContentProps) {
  const { locale, isRTL } = useLocale()
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedRef = useRef(false)
  
  // Helper function to detect if text contains Arabic characters
  const containsArabic = (text: string | null | undefined): boolean => {
    if (!text) return false
    const arabicPattern = /[\u0600-\u06FF]/
    return arabicPattern.test(text)
  }

  // Listen for navigation start event to show skeleton immediately
  useEffect(() => {
    const handleNavigationStart = (event: CustomEvent) => {
      const url = event.detail?.url
      // Only trigger if navigating to account settings page
      if (url && url.startsWith('/dashboard/settings/account')) {
        setIsLoading(true)
      }
    }

    window.addEventListener('dashboard-navigation-start', handleNavigationStart as EventListener)
    return () => {
      window.removeEventListener('dashboard-navigation-start', handleNavigationStart as EventListener)
    }
  }, [])

  useEffect(() => {
    if (hasLoadedRef.current) {
      setIsLoading(false)
      return
    }

    const timer = setTimeout(() => {
      setIsLoading(false)
      hasLoadedRef.current = true
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto w-full">
        {/* Breadcrumb Skeleton */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <Skeleton className="h-5 w-20" />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <Skeleton className="h-5 w-16" />
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="space-y-2 mt-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full space-y-6 max-w-7xl mx-auto w-full" lang={locale} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/settings" className="text-md font-medium hover:text-foreground">
                {locale === 'ar' ? 'الإعدادات' : 'Settings'}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-md font-medium">
              {locale === 'ar' ? 'الحساب' : 'Account'}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {locale === 'ar' ? 'إعدادات الحساب' : 'Account Settings'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {locale === 'ar' 
              ? 'إدارة إعدادات حساب التاجر الخاص بك'
              : 'Manage your business account settings'}
          </p>
        </div>
      </div>
      {/* Account Information */}
      <Card className="rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] border-0">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>
              {locale === 'ar' ? 'معلومات الحساب' : 'Account Information'}
            </CardTitle>
          </div>
          <CardDescription>
            {locale === 'ar' 
              ? 'معلومات حساب التاجر الخاص بك'
              : 'Your business account information'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {locale === 'ar' ? 'الاسم الكامل' : 'Full Name'}
              </label>
              <p className="text-sm font-medium mt-1">
                {businessUser?.full_name || locale === 'ar' ? 'غير متوفر' : 'Not available'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {locale === 'ar' ? 'معرف النشاط' : 'Business ID'}
              </label>
              <p className="text-sm font-medium mt-1 font-mono">
                {businessUser?.id || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card className="rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] border-0">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>
              {locale === 'ar' ? 'معلومات العمل' : 'Business Information'}
            </CardTitle>
          </div>
          <CardDescription>
            {locale === 'ar' 
              ? 'معلومات عملك التجاري'
              : 'Your business information'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {locale === 'ar' ? 'اسم العمل' : 'Business Name'}
              </label>
              <p 
                className="text-sm font-medium mt-1"
                lang={containsArabic(business?.name) ? 'ar' : locale}
              >
                {business?.name || locale === 'ar' ? 'غير متوفر' : 'Not available'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {locale === 'ar' ? 'الحالة' : 'Status'}
              </label>
              <div className="mt-1">
                <Badge 
                  variant={business?.status === 'active' ? 'default' : 'secondary'}
                  className="mt-1"
                >
                  {business?.status || 'unknown'}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {locale === 'ar' ? 'عدد المتاجر' : 'Number of Stores'}
              </label>
              <p className="text-sm font-medium mt-1">
                {storeCount} {locale === 'ar' ? 'متجر' : 'store(s)'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {locale === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}
              </label>
              <p className="text-sm font-medium mt-1">
                {business?.created_at 
                  ? new Date(business.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : locale === 'ar' ? 'غير متوفر' : 'Not available'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] border-0">
        <CardHeader>
          <CardTitle>
            {locale === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
          </CardTitle>
          <CardDescription>
            {locale === 'ar' 
              ? 'إدارة حسابك بسرعة'
              : 'Quickly manage your account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            <Store className="h-4 w-4 me-2" />
            {locale === 'ar' ? 'إدارة المتاجر' : 'Manage Stores'}
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Mail className="h-4 w-4 me-2" />
            {locale === 'ar' ? 'تغيير البريد الإلكتروني' : 'Change Email'}
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <User className="h-4 w-4 me-2" />
            {locale === 'ar' ? 'تحديث الملف الشخصي' : 'Update Profile'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

