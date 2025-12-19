'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Store, Plus, MapPin, Globe, Pencil, Trash2, ExternalLink, Power, Loader2, Save, X, Clock, Truck, Pause, Play, ShoppingBag, ShoppingCart, Package, Box, RefreshCcw } from 'lucide-react'
import { ChevronUpDown } from '@/components/animate-ui/icons/chevron-up-down'
import { AnimateIcon } from '@/components/animate-ui/icons/icon'
import { useLocale } from '@/i18n/context'
import React, { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/toast'
import { ProductApprovalModal, ProductPreview } from '@/components/product-approval-modal'
import { safeFetch, handleError } from '@/lib/error-handler'

interface StoreData {
  id: string
  name: string
  slug: string
  logo_url: string | null
  platform: string
  store_type: string
  country: string | null
  city: string | null
  is_active: boolean | null
  created_at: string
  store_connection_id: string | null
  delivery_methods: string[] | null
  opening_hours: any | null
  product_count?: number
}

interface StoresContentProps {
  stores: StoreData[]
}

// Platform logos mapping
const PLATFORM_LOGOS: Record<string, string> = {
  salla: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce/salla-icon.png',
  zid: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce/zid.svg',
  shopify: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce/shopify-icon.png',
  haady: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg',
}

// Helper function to detect if text contains Arabic characters
const containsArabic = (text: string | null | undefined): boolean => {
  if (!text) return false
  const arabicPattern = /[\u0600-\u06FF]/
  return arabicPattern.test(text)
}

// Get platform display name
function getPlatformName(platform: string): string {
  const names: Record<string, string> = {
    salla: 'Salla',
    zid: 'Zid',
    shopify: 'Shopify',
    haady: 'Haady',
  }
  return names[platform] || platform.charAt(0).toUpperCase() + platform.slice(1)
}

export function StoresContent({ stores }: StoresContentProps) {
  const t = useTranslations()
  const { locale, isRTL } = useLocale()
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedRef = useRef(false)
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null)

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

  // Separate stores into active and inactive
  const activeStores = stores.filter(store => store.is_active !== false)
  const inactiveStores = stores.filter(store => store.is_active === false)

  const handleStoreExpand = (storeId: string) => {
    setExpandedStoreId(prev => prev === storeId ? null : storeId)
  }

  return (
    <div className="h-full" lang={locale} dir={isRTL ? 'rtl' : 'ltr'}>
      {isLoading ? (
        // Skeleton
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      ) : (
        // Content with fade-in animation
        <div className="fade-in-content space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {locale === 'ar' ? 'المتاجر' : 'Stores'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {locale === 'ar' 
                  ? 'إدارة متاجرك ومتاجرك المتصلة'
                  : 'Manage your stores and connected platforms'}
              </p>
            </div>
            <Button 
              onClick={() => {
                // Open the existing onboarding modal with the choice between Connect or Create
                window.dispatchEvent(new CustomEvent('openOnboardingModal', { bubbles: true }))
              }}
              className="bg-[#F4610B] hover:bg-[#d54e00] text-white w-auto"
            >
              <Plus className="h-4 w-4 me-2" />
              {locale === 'ar' ? 'إضافة متجر' : 'Add Store'}
            </Button>
          </div>

          {/* Active Stores */}
          {activeStores.length > 0 || inactiveStores.length > 0 ? (
            <div className="space-y-6">
              {/* Active Stores Section */}
              {activeStores.length > 0 && (
                <div className="space-y-3">
                  {activeStores.map((store) => (
                    <StoreListItem 
                      key={store.id} 
                      store={store} 
                      locale={locale} 
                      isRTL={isRTL}
                      isExpanded={expandedStoreId === store.id}
                      onExpand={() => handleStoreExpand(store.id)}
                      hasExpandedStore={expandedStoreId !== null}
                    />
                  ))}
                </div>
              )}

              {/* Inactive Stores Section */}
              {inactiveStores.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-700">
                      {locale === 'ar' ? 'المتاجر غير النشطة' : 'Inactive Stores'}
                    </h2>
                    <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                      {inactiveStores.length}
                    </Badge>
                  </div>
                  {inactiveStores.map((store) => (
                    <StoreListItem 
                      key={store.id} 
                      store={store} 
                      locale={locale} 
                      isRTL={isRTL}
                      isExpanded={expandedStoreId === store.id}
                      onExpand={() => handleStoreExpand(store.id)}
                      hasExpandedStore={expandedStoreId !== null}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Card className="border-2 border-dashed border-amber-200 bg-amber-50/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Store className="h-16 w-16 text-amber-500 mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  {locale === 'ar' ? 'لا توجد متاجر' : 'No Stores Yet'}
                </h3>
                <p className="text-sm text-gray-500 text-center mb-6 max-w-md">
                  {locale === 'ar' 
                    ? 'ابدأ بإنشاء متجر Haady أو قم بتوصيل متجرك الحالي من منصة أخرى'
                    : 'Start by creating a Haady store or connect your existing store from another platform'}
                </p>
                <div className="flex gap-3">
                  <Link href="/onboarding/create-store">
                    <Button className="bg-[#F4610B] hover:bg-[#d54e00] text-white">
                      <Plus className="h-4 w-4 me-2" />
                      {locale === 'ar' ? 'إنشاء متجر Haady' : 'Create Haady Store'}
                    </Button>
                  </Link>
                  <Link href="/onboarding/connect">
                    <Button variant="outline">
                      <ExternalLink className="h-4 w-4 me-2" />
                      {locale === 'ar' ? 'توصيل متجر' : 'Connect Store'}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

// Store Card Component
function StoreCard({ store, locale, isRTL }: { store: StoreData; locale: string; isRTL: boolean }) {
  const router = useRouter()
  const platformLogo = PLATFORM_LOGOS[store.platform?.toLowerCase()]
  const isHaady = store.platform === 'haady'
  const isActive = store.is_active !== false
  const isActivatedInSelector = !!store.store_connection_id
  const [isActivating, setIsActivating] = useState(false)

  const handleActivate = async () => {
    setIsActivating(true)
    try {
      const response = await fetch(`/api/stores/${store.id}/activate`, {
        method: 'POST',
      })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to activate store')
      }
      
      toast.success(locale === 'ar' ? 'تم تفعيل المتجر بنجاح' : 'Store activated successfully')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || (locale === 'ar' ? 'فشل تفعيل المتجر' : 'Failed to activate store'))
    } finally {
      setIsActivating(false)
    }
  }

  const handleDeactivate = async () => {
    setIsActivating(true)
    try {
      const response = await fetch(`/api/stores/${store.id}/activate`, {
        method: 'DELETE',
      })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to deactivate store')
      }
      
      toast.success(locale === 'ar' ? 'تم إلغاء تفعيل المتجر' : 'Store deactivated successfully')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || (locale === 'ar' ? 'فشل إلغاء تفعيل المتجر' : 'Failed to deactivate store'))
    } finally {
      setIsActivating(false)
    }
  }

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      isActive ? "border-gray-200" : "border-gray-200 opacity-60"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-lg overflow-hidden",
              store.logo_url ? "bg-white border border-gray-200" : "bg-[#F4610B]/10"
            )}>
              {store.logo_url ? (
                <Image
                  src={store.logo_url}
                  alt={store.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : platformLogo ? (
                <Image
                  src={platformLogo}
                  alt={store.platform}
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              ) : (
                <Store className="h-6 w-6 text-[#F4610B]" />
              )}
            </div>
            <div>
              <CardTitle 
                className="text-base"
                lang={containsArabic(store.name) ? 'ar' : undefined}
              >
                {store.name}
              </CardTitle>
              <CardDescription className="flex items-center gap-1 mt-0.5">
                {isHaady ? (
                  <Badge variant="outline" className="text-xs bg-[#F4610B]/10 text-[#F4610B] border-[#F4610B]/20">
                    Haady
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    {getPlatformName(store.platform)}
                  </Badge>
                )}
                {store.store_type && (
                  <span className="text-xs text-gray-500 capitalize">
                    • {store.store_type}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant={isActive ? "default" : "secondary"}
            className={cn(
              "text-xs",
              isActive ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500"
            )}
          >
            {isActive 
              ? (locale === 'ar' ? 'نشط' : 'Active')
              : (locale === 'ar' ? 'غير نشط' : 'Inactive')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {(store.city || store.country) && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
            <MapPin className="h-3.5 w-3.5" />
            <span>
              {[store.city, store.country].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
        {store.slug && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
            <Globe className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">{store.slug}</span>
          </div>
        )}
        {/* Activation status for Haady stores */}
        {isHaady && (
          <div className={cn(
            "flex items-center gap-2 text-xs mb-3 p-2 rounded-lg",
            isActivatedInSelector 
              ? "bg-emerald-50 text-emerald-700" 
              : "bg-amber-50 text-amber-700"
          )}>
            <Power className="h-3.5 w-3.5" />
            <span>
              {isActivatedInSelector
                ? (locale === 'ar' ? 'يظهر في قائمة المتاجر' : 'Listed in store selector')
                : (locale === 'ar' ? 'غير مفعل في قائمة المتاجر' : 'Not in store selector')}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 mt-4">
          {/* Activate/Deactivate button for Haady stores */}
          {isHaady && (
            <Button 
              variant={isActivatedInSelector ? "outline" : "default"}
              size="sm" 
              className={cn(
                "flex-1 text-xs",
                isActivatedInSelector 
                  ? "border-amber-300 text-amber-700 hover:bg-amber-50" 
                  : "bg-[#F4610B] hover:bg-[#d54e00] text-white"
              )}
              onClick={isActivatedInSelector ? handleDeactivate : handleActivate}
              disabled={isActivating}
            >
              {isActivating ? (
                <Loader2 className="h-3 w-3 me-1 animate-spin" />
              ) : (
                <Power className="h-3 w-3 me-1" />
              )}
              {isActivatedInSelector
                ? (locale === 'ar' ? 'إلغاء التفعيل' : 'Deactivate')
                : (locale === 'ar' ? 'تفعيل' : 'Activate')}
            </Button>
          )}
          <Button variant="outline" size="sm" className={cn("text-xs", !isHaady && "flex-1")}>
            <Pencil className="h-3 w-3 me-1" />
            {locale === 'ar' ? 'تعديل' : 'Edit'}
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Store List Item Component (horizontal list view)
function StoreListItem({ 
  store, 
  locale, 
  isRTL,
  isExpanded,
  onExpand,
  hasExpandedStore
}: { 
  store: StoreData
  locale: string
  isRTL: boolean
  isExpanded: boolean
  onExpand: () => void
  hasExpandedStore: boolean
}) {
  const router = useRouter()
  const platformLogo = PLATFORM_LOGOS[store.platform?.toLowerCase()]
  const isHaady = store.platform === 'haady'
  const isActive = store.is_active !== false
  const [isSaving, setIsSaving] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [countries, setCountries] = useState<Array<{ id: string; name: string; iso2: string; flag_url: string | null }>>([])
  const [isLoadingCountries, setIsLoadingCountries] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [showProductApprovalModal, setShowProductApprovalModal] = useState(false)
  const [previewProducts, setPreviewProducts] = useState<ProductPreview[]>([])
  const [formData, setFormData] = useState({
    name: store.name,
    slug: store.slug,
    city: store.city || '',
    country: store.country || '',
    store_type: store.store_type || '',
    delivery_methods: store.delivery_methods || [],
    opening_hours: store.opening_hours || {},
  })

  const originalData = {
    name: store.name,
    slug: store.slug,
    city: store.city || '',
    country: store.country || '',
    store_type: store.store_type || '',
    delivery_methods: store.delivery_methods || [],
    opening_hours: store.opening_hours || {},
  }

  // Check if form data has changed
  const hasChanges = 
    formData.name !== originalData.name ||
    formData.slug !== originalData.slug ||
    formData.city !== originalData.city ||
    formData.country !== originalData.country ||
    formData.store_type !== originalData.store_type ||
    JSON.stringify(formData.delivery_methods) !== JSON.stringify(originalData.delivery_methods) ||
    JSON.stringify(formData.opening_hours) !== JSON.stringify(originalData.opening_hours)

  // Reset form data when store changes or when collapsed
  useEffect(() => {
    setFormData({
      name: store.name,
      slug: store.slug,
      city: store.city || '',
      country: store.country || '',
      store_type: store.store_type || '',
      delivery_methods: store.delivery_methods || [],
      opening_hours: store.opening_hours || {},
    })
    setEditingField(null) // Reset editing field when store changes
  }, [store.id, store.name, store.slug, store.city, store.country, store.store_type, store.delivery_methods, store.opening_hours])

  // Reset editing field when collapsed
  useEffect(() => {
    if (!isExpanded) {
      setEditingField(null)
    }
  }, [isExpanded])

  // Fetch countries when editing country field
  useEffect(() => {
    if (editingField === 'country' && countries.length === 0 && !isLoadingCountries) {
      setIsLoadingCountries(true)
      fetch('/api/countries')
        .then(res => res.json())
        .then(data => {
          if (data.countries) {
            setCountries(data.countries)
          }
        })
        .catch(error => {
          console.error('Error fetching countries:', error)
          toast.error(locale === 'ar' ? 'فشل تحميل قائمة الدول' : 'Failed to load countries')
        })
        .finally(() => {
          setIsLoadingCountries(false)
        })
    }
  }, [editingField, countries.length, isLoadingCountries, locale])

  const handleExpand = () => {
    onExpand()
  }

  const handleInputChange = (field: string, value: string | string[] | any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleDeliveryMethodToggle = (method: string) => {
    setFormData(prev => {
      const currentMethods = prev.delivery_methods || []
      const newMethods = currentMethods.includes(method)
        ? currentMethods.filter(m => m !== method)
        : [...currentMethods, method]
      return { ...prev, delivery_methods: newMethods }
    })
  }

  const handleOpeningHoursChange = (day: string, field: string, value: string | boolean) => {
    setFormData(prev => {
      const hours = { ...(prev.opening_hours || {}) }
      if (!hours[day]) {
        hours[day] = { open: '09:00', close: '17:00', closed: false }
      }
      hours[day] = { ...hours[day], [field]: value }
      return { ...prev, opening_hours: hours }
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/stores/${store.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update store')
      }

      toast.success(locale === 'ar' ? 'تم تحديث المتجر بنجاح' : 'Store updated successfully')
      router.refresh()
      // Don't collapse after saving - keep it open
    } catch (error: any) {
      toast.error(error.message || (locale === 'ar' ? 'فشل تحديث المتجر' : 'Failed to update store'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/stores/${store.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !isActive }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update store status')
      }

      toast.success(
        !isActive 
          ? (locale === 'ar' ? 'تم تفعيل المتجر' : 'Store activated')
          : (locale === 'ar' ? 'تم إيقاف المتجر' : 'Store paused')
      )
      // Trigger refresh of sidebar store connections immediately
      window.dispatchEvent(new CustomEvent('refreshStoreConnections', { bubbles: true }))
      // Then refresh the page data
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || (locale === 'ar' ? 'فشل تحديث حالة المتجر' : 'Failed to update store status'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDismiss = () => {
    setFormData({
      name: store.name,
      slug: store.slug,
      city: store.city || '',
      country: store.country || '',
      store_type: store.store_type || '',
      delivery_methods: store.delivery_methods || [],
      opening_hours: store.opening_hours || {},
    })
    setEditingField(null)
  }

  // Handle sync button click - show product approval modal
  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent expanding the store item
    
    if (!store.store_connection_id) {
      toast.error(locale === 'ar' ? 'لا يمكن مزامنة متجر Haady الأصلي' : 'Cannot sync native Haady stores')
      return
    }

    if (isSyncing || isLoadingPreview) {
      return // Prevent multiple simultaneous syncs
    }

    setIsLoadingPreview(true)
    try {
      const previewResponse = await safeFetch(
        `/api/store-connections/${store.store_connection_id}/sync/preview`,
        { method: 'GET' },
        { context: 'Preview products', showToast: false }
      )

      if (!previewResponse.ok) {
        const errorData = await previewResponse.json().catch(() => ({ error: 'Failed to fetch preview' }))
        throw new Error(errorData.error || 'Failed to preview products')
      }

      const previewData = await previewResponse.json()
      
      if (!previewData.success || !previewData.products) {
        throw new Error(previewData.error || 'Failed to preview products')
      }

      setPreviewProducts(previewData.products)
      setShowProductApprovalModal(true)
    } catch (error: any) {
      const errorMessage = error?.message || String(error)
      if (errorMessage.includes('not yet implemented') || errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        // Fallback to direct sync if preview is not implemented
        await performDirectSync()
      } else {
        handleError(error, {
          context: 'Preview products',
          showToast: true,
        })
        setIsLoadingPreview(false)
      }
    } finally {
      // Only set loading to false if we're not doing direct sync
      if (!isSyncing) {
        setIsLoadingPreview(false)
      }
    }
  }

  // Perform direct sync (fallback when preview is not available)
  const performDirectSync = async () => {
    if (!store.store_connection_id) return

    setIsSyncing(true)
    try {
      const response = await safeFetch(
        `/api/store-connections/${store.store_connection_id}/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'all' }),
        },
        { context: 'Sync store products', showToast: true }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        toast.success(locale === 'ar' ? 'تمت المزامنة بنجاح' : 'Sync completed successfully')
        // Dispatch sync completed event to refresh dashboard
        window.dispatchEvent(new CustomEvent('productsSyncCompleted', { 
          detail: { connectionId: store.store_connection_id, success: true } 
        }))
        router.refresh()
      } else {
        throw new Error(data.error || 'Sync failed')
      }
    } catch (error: any) {
      // Dispatch sync failed event
      window.dispatchEvent(new CustomEvent('productsSyncCompleted', { 
        detail: { connectionId: store.store_connection_id, success: false } 
      }))
      handleError(error, {
        context: 'Sync store products',
        showToast: true,
      })
    } finally {
      setIsSyncing(false)
      setIsLoadingPreview(false)
    }
  }

  // Handle product approval - sync selected products
  const handleApproveProducts = async (selectedProductIds: string[]) => {
    if (!store.store_connection_id || selectedProductIds.length === 0) {
      return
    }

    setIsSyncing(true)
    setShowProductApprovalModal(false)

    try {
      const response = await safeFetch(
        `/api/store-connections/${store.store_connection_id}/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            type: 'selected',
            selectedProductIds 
          }),
        },
        { context: 'Sync selected products', showToast: true }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        toast.success(
          locale === 'ar' 
            ? `تمت مزامنة ${selectedProductIds.length} منتج بنجاح`
            : `Successfully synced ${selectedProductIds.length} product${selectedProductIds.length === 1 ? '' : 's'}`
        )
        // Dispatch sync completed event to refresh dashboard
        window.dispatchEvent(new CustomEvent('productsSyncCompleted', { 
          detail: { connectionId: store.store_connection_id, success: true } 
        }))
        router.refresh()
      } else {
        throw new Error(data.error || 'Sync failed')
      }
    } catch (error: any) {
      // Dispatch sync failed event
      window.dispatchEvent(new CustomEvent('productsSyncCompleted', { 
        detail: { connectionId: store.store_connection_id, success: false } 
      }))
      handleError(error, {
        context: 'Sync selected products',
        showToast: true,
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleFieldClick = (field: string) => {
    setEditingField(field)
  }

  const handleFieldBlur = (field: string) => {
    // Don't blur if the field value hasn't changed
    if (formData[field as keyof typeof formData] === originalData[field as keyof typeof originalData]) {
      setEditingField(null)
    }
  }

  const handleFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: string) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
      setEditingField(null)
    } else if (e.key === 'Escape') {
      // Revert to original value
      setFormData(prev => ({ ...prev, [field]: originalData[field as keyof typeof originalData] }))
      setEditingField(null)
    }
  }

  return (
    <div className={cn(
      "group bg-white rounded-2xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_35px_80px_rgba(15,23,42,0.12)] border-0 transition-all duration-200 overflow-hidden",
      !isActive && "opacity-60 grayscale",
      isExpanded && "shadow-[0_35px_80px_rgba(15,23,42,0.12)]",
      hasExpandedStore && !isExpanded && "opacity-40 hover:opacity-100"
    )}>
      <div 
        className="flex items-start gap-5 p-5 cursor-pointer"
        onClick={handleExpand}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      {/* Logo */}
      <div className={cn(
        "flex h-14 w-14 items-center justify-center rounded-xl overflow-hidden shrink-0",
        store.logo_url ? "bg-white shadow-sm" : "bg-[#F4610B]/10"
      )}>
        {store.logo_url ? (
          <Image
            src={store.logo_url}
            alt={store.name}
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        ) : platformLogo ? (
          <Image
            src={platformLogo}
            alt={store.platform}
            width={28}
            height={28}
            className="w-7 h-7"
          />
        ) : (
          <Store className="h-7 w-7 text-[#F4610B]" />
        )}
      </div>

      {/* Store Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-1.5">
          <h3 
            className="text-base font-bold text-gray-900 truncate"
            lang={containsArabic(store.name) ? 'ar' : undefined}
          >
            {store.name}
          </h3>
          {platformLogo && (
            <div className="flex h-5 w-5 items-center justify-center shrink-0">
              <Image
                src={platformLogo}
                alt={store.platform}
                width={20}
                height={20}
                className="w-5 h-5 object-contain"
              />
            </div>
          )}
        </div>
        {store.slug && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Globe className="h-3.5 w-3.5" />
            <span className="font-mono">{store.slug}</span>
          </div>
        )}
      </div>

      {/* Status Badge and Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-2">
          {isActive && store.product_count !== undefined && (
            <Badge 
              variant="outline"
              className="text-[10px] px-2.5 py-1 shrink-0 font-medium bg-gray-50 text-gray-600 border-gray-200 flex items-center gap-1.5"
            >
              <Box className="h-3 w-3 text-gray-400" />
              {store.product_count} {locale === 'ar' ? 'منتج' : store.product_count === 1 ? 'product' : 'products'}
            </Badge>
          )}
          <Badge 
            variant="outline"
            className={cn(
              "text-[10px] px-2.5 py-1 shrink-0 font-medium flex items-center gap-1.5",
              isActive 
                ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                : "bg-amber-50 text-amber-600 border-amber-200"
            )}
          >
            {isActive && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
            )}
            {isActive 
              ? (locale === 'ar' ? 'متصل' : 'Online')
              : (locale === 'ar' ? 'متوقف' : 'Paused')}
          </Badge>
        </div>

        {/* Sync Button - Show for stores with connection when expanded */}
        {store.store_connection_id && isExpanded && (
          <Button
            onClick={handleSync}
            disabled={isSyncing || isLoadingPreview || !isActive}
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              "text-gray-600 hover:text-gray-700 hover:bg-gray-50",
              (!isActive || isSyncing || isLoadingPreview) && "opacity-50 cursor-not-allowed"
            )}
            title={locale === 'ar' ? 'مزامنة المنتجات' : 'Sync Products'}
          >
            {isSyncing || isLoadingPreview ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Pause/Resume Store Button */}
        {isExpanded && (
          <Button
            onClick={(e) => {
              e.stopPropagation()
              handleToggleActive()
            }}
            disabled={isSaving}
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              isActive 
                ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" 
                : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            )}
            title={isActive ? (locale === 'ar' ? 'إيقاف المتجر' : 'Pause Store') : (locale === 'ar' ? 'تفعيل المتجر' : 'Resume Store')}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isActive ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Save and Dismiss buttons - only show when there are changes */}
        {hasChanges && (
          <>
            <Button
              onClick={(e) => {
                e.stopPropagation()
                handleSave()
              }}
              disabled={isSaving}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-900 hover:bg-gray-100"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation()
                handleDismiss()
              }}
              disabled={isSaving}
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs text-gray-400 hover:text-gray-900 hover:bg-gray-100"
            >
              {locale === 'ar' ? 'إلغاء' : 'Dismiss'}
            </Button>
          </>
        )}

        {/* Expand Indicator */}
        <div className="flex items-start pt-1">
          <AnimateIcon animate={isHovered}>
            <ChevronUpDown 
              className="h-5 w-5 text-gray-400 shrink-0"
            />
          </AnimateIcon>
        </div>
      </div>

      </div>

      {/* Expanded Form Section */}
      <div 
        className={cn(
          "overflow-hidden",
          isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        )}
        style={{
          transition: isExpanded 
            ? 'max-height 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 400ms cubic-bezier(0.4, 0, 0.2, 1) 100ms'
            : 'max-height 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div className="px-5 pb-5 pt-0 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Store Name */}
            <div className="space-y-2">
              <Label htmlFor={`name-${store.id}`} className="text-sm font-medium text-gray-700">
                {locale === 'ar' ? 'اسم المتجر' : 'Store Name'}
              </Label>
              {editingField === 'name' ? (
                <Input
                  id={`name-${store.id}`}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  onBlur={() => handleFieldBlur('name')}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'name')}
                  placeholder={locale === 'ar' ? 'اسم المتجر' : 'Store name'}
                  className="h-10"
                  autoFocus
                />
              ) : (
                <div
                  onClick={() => handleFieldClick('name')}
                  className="h-10 px-3 py-2 rounded-md border border-transparent hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors flex items-center text-sm"
                >
                  {formData.name || <span className="text-gray-400">{locale === 'ar' ? 'اسم المتجر' : 'Store name'}</span>}
                </div>
              )}
            </div>

            {/* Store Slug */}
            <div className="space-y-2">
              <Label htmlFor={`slug-${store.id}`} className="text-sm font-medium text-gray-700">
                {locale === 'ar' ? 'الرابط' : 'Slug'}
              </Label>
              {editingField === 'slug' ? (
                <Input
                  id={`slug-${store.id}`}
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  onBlur={() => handleFieldBlur('slug')}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'slug')}
                  placeholder={locale === 'ar' ? 'store-slug' : 'store-slug'}
                  className="h-10 font-mono"
                  autoFocus
                />
              ) : (
                <div
                  onClick={() => handleFieldClick('slug')}
                  className="h-10 px-3 py-2 rounded-md border border-transparent hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors flex items-center text-sm font-mono"
                >
                  {formData.slug || <span className="text-gray-400">{locale === 'ar' ? 'store-slug' : 'store-slug'}</span>}
                </div>
              )}
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor={`city-${store.id}`} className="text-sm font-medium text-gray-700">
                {locale === 'ar' ? 'المدينة' : 'City'}
              </Label>
              {editingField === 'city' ? (
                <Input
                  id={`city-${store.id}`}
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  onBlur={() => handleFieldBlur('city')}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'city')}
                  placeholder={locale === 'ar' ? 'المدينة' : 'City'}
                  className="h-10"
                  autoFocus
                />
              ) : (
                <div
                  onClick={() => handleFieldClick('city')}
                  className="h-10 px-3 py-2 rounded-md border border-transparent hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors flex items-center text-sm"
                >
                  {formData.city || <span className="text-gray-400">{locale === 'ar' ? 'المدينة' : 'City'}</span>}
                </div>
              )}
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor={`country-${store.id}`} className="text-sm font-medium text-gray-700">
                {locale === 'ar' ? 'الدولة' : 'Country'}
              </Label>
              {editingField === 'country' ? (
                <Select
                  value={formData.country}
                  onValueChange={(value) => {
                    handleInputChange('country', value)
                    setEditingField(null)
                  }}
                  onOpenChange={(open) => {
                    if (!open && formData.country === originalData.country) {
                      setEditingField(null)
                    }
                  }}
                >
                  <SelectTrigger className="h-10 w-full" id={`country-${store.id}`}>
                    <SelectValue placeholder={isLoadingCountries ? (locale === 'ar' ? 'جاري التحميل...' : 'Loading...') : (locale === 'ar' ? 'اختر الدولة' : 'Select country')}>
                      {formData.country && (() => {
                        const selectedCountry = countries.find(c => c.name === formData.country)
                        return selectedCountry ? (
                          <div className="flex items-center gap-2">
                            {selectedCountry.flag_url && (
                              <Image
                                src={selectedCountry.flag_url}
                                alt={selectedCountry.name}
                                width={20}
                                height={15}
                                className="w-5 h-4 object-cover rounded-sm"
                                unoptimized
                              />
                            )}
                            <span>{selectedCountry.name}</span>
                          </div>
                        ) : formData.country
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingCountries ? (
                      <SelectItem value="loading" disabled>
                        {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                      </SelectItem>
                    ) : countries.length === 0 ? (
                      <SelectItem value="no-data" disabled>
                        {locale === 'ar' ? 'لا توجد دول' : 'No countries available'}
                      </SelectItem>
                    ) : (
                      countries.map((country) => (
                        <SelectItem key={country.id} value={country.name}>
                          <div className="flex items-center gap-2">
                            {country.flag_url && (
                              <Image
                                src={country.flag_url}
                                alt={country.name}
                                width={20}
                                height={15}
                                className="w-5 h-4 object-cover rounded-sm"
                                unoptimized
                              />
                            )}
                            <span>{country.name}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <div
                  onClick={() => handleFieldClick('country')}
                  className="h-12 px-3 py-2 rounded-md border border-transparent hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-2 text-sm"
                >
                  {formData.country ? (() => {
                    const selectedCountry = countries.find(c => c.name === formData.country)
                    return selectedCountry ? (
                      <>
                        {selectedCountry.flag_url && (
                          <Image
                            src={selectedCountry.flag_url}
                            alt={selectedCountry.name}
                            width={20}
                            height={15}
                            className="w-5 h-4 object-cover rounded-sm"
                            unoptimized
                          />
                        )}
                        <span>{selectedCountry.name}</span>
                      </>
                    ) : (
                      <span>{formData.country}</span>
                    )
                  })() : (
                    <span className="text-gray-400">{locale === 'ar' ? 'الدولة' : 'Country'}</span>
                  )}
                </div>
              )}
            </div>

            {/* Store Type */}
            <div className="space-y-2">
              <Label htmlFor={`store_type-${store.id}`} className="text-sm font-medium text-gray-700">
                {locale === 'ar' ? 'نوع المتجر' : 'Store Type'}
              </Label>
              {editingField === 'store_type' ? (
                <Input
                  id={`store_type-${store.id}`}
                  value={formData.store_type}
                  onChange={(e) => handleInputChange('store_type', e.target.value)}
                  onBlur={() => handleFieldBlur('store_type')}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'store_type')}
                  placeholder={locale === 'ar' ? 'نوع المتجر' : 'Store type'}
                  className="h-10"
                  autoFocus
                />
              ) : (
                <div
                  onClick={() => handleFieldClick('store_type')}
                  className="h-10 px-3 py-2 rounded-md border border-transparent hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors flex items-center text-sm"
                >
                  {formData.store_type || <span className="text-gray-400">{locale === 'ar' ? 'نوع المتجر' : 'Store type'}</span>}
                </div>
              )}
            </div>

            {/* Delivery Methods */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                {locale === 'ar' ? 'طرق التوصيل' : 'Delivery Methods'}
              </Label>
              {editingField === 'delivery_methods' ? (
                <div className="space-y-2 p-4 border border-gray-200 rounded-md bg-gray-50">
                  {['Delivery', 'Pickup', 'Dine-in', 'Drive-through'].map((method) => (
                    <div key={method} className="flex items-center gap-2">
                      <Checkbox
                        id={`${method}-${store.id}`}
                        checked={(formData.delivery_methods || []).includes(method)}
                        onCheckedChange={() => handleDeliveryMethodToggle(method)}
                      />
                      <Label
                        htmlFor={`${method}-${store.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {method}
                      </Label>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingField(null)}
                      className="h-8 text-xs"
                    >
                      {locale === 'ar' ? 'تم' : 'Done'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => handleFieldClick('delivery_methods')}
                  className="min-h-12 px-3 py-2 rounded-md border border-transparent hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-2 text-sm flex-wrap"
                >
                  {(formData.delivery_methods && formData.delivery_methods.length > 0) ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {formData.delivery_methods.map((method) => (
                        <Badge key={method} variant="outline" className="text-xs">
                          {method}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">{locale === 'ar' ? 'لا توجد طرق توصيل' : 'No delivery methods'}</span>
                  )}
                </div>
              )}
            </div>

            {/* Opening Hours */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {locale === 'ar' ? 'ساعات العمل' : 'Opening Hours'}
              </Label>
              {editingField === 'opening_hours' ? (
                <div className="space-y-2 p-3 border border-gray-200 rounded-md bg-gray-50 max-h-96 overflow-y-auto">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                    const dayHours = formData.opening_hours?.[day.toLowerCase()] || { open: '09:00', close: '17:00', closed: false }
                    return (
                      <div key={day} className="flex items-center gap-2 text-xs">
                        <div className="w-20 text-sm font-medium">{day.slice(0, 3)}</div>
                        <Checkbox
                          id={`${day}-closed-${store.id}`}
                          checked={dayHours.closed}
                          onCheckedChange={(checked) => handleOpeningHoursChange(day.toLowerCase(), 'closed', checked === true)}
                          className="h-3.5 w-3.5"
                        />
                        <Label htmlFor={`${day}-closed-${store.id}`} className="text-xs text-gray-500">
                          {locale === 'ar' ? 'مغلق' : 'Closed'}
                        </Label>
                        {!dayHours.closed && (
                          <>
                            <Input
                              type="time"
                              value={dayHours.open || '09:00'}
                              onChange={(e) => handleOpeningHoursChange(day.toLowerCase(), 'open', e.target.value)}
                              className="h-7 w-20 text-xs"
                            />
                            <span className="text-xs text-gray-400">-</span>
                            <Input
                              type="time"
                              value={dayHours.close || '17:00'}
                              onChange={(e) => handleOpeningHoursChange(day.toLowerCase(), 'close', e.target.value)}
                              className="h-7 w-20 text-xs"
                            />
                          </>
                        )}
                      </div>
                    )
                  })}
                  <div className="flex gap-2 pt-2 border-t border-gray-200">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingField(null)}
                      className="h-7 text-xs"
                    >
                      {locale === 'ar' ? 'تم' : 'Done'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => handleFieldClick('opening_hours')}
                  className="min-h-12 px-3 py-2 rounded-md border border-transparent hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors text-sm"
                >
                  {formData.opening_hours && Object.keys(formData.opening_hours).length > 0 ? (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                        const dayHours = formData.opening_hours?.[day.toLowerCase()]
                        if (!dayHours) return null
                        return (
                          <div key={day} className="flex items-center gap-2 text-xs">
                            <span className="w-16 font-medium">{day.slice(0, 3)}:</span>
                            {dayHours.closed ? (
                              <span className="text-gray-400">{locale === 'ar' ? 'مغلق' : 'Closed'}</span>
                            ) : (
                              <span>{dayHours.open || '09:00'} - {dayHours.close || '17:00'}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <span className="text-gray-400">{locale === 'ar' ? 'لا توجد ساعات عمل' : 'No opening hours set'}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Approval Modal for Sync */}
      {store.store_connection_id && (
        <ProductApprovalModal
          open={showProductApprovalModal}
          onOpenChange={setShowProductApprovalModal}
          products={previewProducts}
          platform={store.platform}
          onApprove={handleApproveProducts}
          isLoading={isSyncing}
        />
      )}
    </div>
  )
}

