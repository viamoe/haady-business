'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/i18n/context'
import { useLocalizedUrl } from '@/lib/use-localized-url'
import { useAuth } from '@/lib/auth/auth-context'
import { toast } from '@/lib/toast'
import { OnboardingStepProps } from '../OnboardingWizard'
import { CheckCircle2, Store, User, Link as LinkIcon, Loader2, ChevronRight, Edit2, Package } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ONBOARDING_STEPS, getOnboardingStepPath } from '@/lib/constants/onboarding'

// Translations
const translations = {
  en: {
    title: "You're almost there!",
    subtitle: 'Review your details before we get you started',
    personalInfo: 'Personal Information',
    storeDetails: 'Store Details',
    storeConnection: 'Store Connection',
    complete: 'Complete Setup',
    completing: 'Setting up your account...',
    success: 'Welcome to Haady! Redirecting to your dashboard...',
    error: 'Something went wrong',
    notConnected: 'No platform connected',
    skipped: 'Skipped - You can connect later',
    edit: 'Edit',
    name: 'Name',
    phone: 'Phone',
    country: 'Country',
    role: 'Role',
    storeName: 'Store Name',
    storeType: 'Store Type',
    categories: 'Categories',
    platform: 'Platform',
    connected: 'Connected',
    viewProducts: 'View Products',
    editPersonalInfo: 'Edit details',
  },
  ar: {
    title: 'أنت على وشك الانتهاء!',
    subtitle: 'راجع تفاصيلك قبل أن نبدأ',
    personalInfo: 'المعلومات الشخصية',
    storeDetails: 'تفاصيل المتجر',
    storeConnection: 'اتصال المتجر',
    complete: 'إكمال الإعداد',
    completing: 'جاري إعداد حسابك...',
    success: 'مرحباً بك في هادي! جاري التحويل إلى لوحة التحكم...',
    error: 'حدث خطأ ما',
    notConnected: 'لا يوجد منصة متصلة',
    skipped: 'تم التخطي - يمكنك الاتصال لاحقاً',
    edit: 'تعديل',
    name: 'الاسم',
    phone: 'الهاتف',
    country: 'البلد',
    role: 'الدور',
    storeName: 'اسم المتجر',
    storeType: 'نوع المتجر',
    categories: 'الفئات',
    platform: 'المنصة',
    connected: 'متصل',
    viewProducts: 'عرض المنتجات',
    editPersonalInfo: 'تعديل التفاصيل',
  },
}

interface SummaryData {
  personalInfo: {
    fullName: string | null
    phone: string | null
    country: string | null
    role: string | null
  }
  storeInfo: {
    name: string | null
    nameAr: string | null
    types: string[] | null
    categories: number | null
  }
  connectionInfo: {
    platform: string | null
    connected: boolean
    storeDomain: string | null
    externalStoreName: string | null
    email: string | null
    connectionId: string | null
  }
}

// Inner component that uses useSearchParams
function SummaryStepContent({ onNext, currentStep, totalSteps }: OnboardingStepProps) {
  console.log('🎬 SummaryStepContent rendering...')
  
  const router = useRouter()
  const { locale, isRTL } = useLocale()
  const { localizedUrl } = useLocalizedUrl()
  const { user, loading: authLoading } = useAuth()
  const t = translations[locale as keyof typeof translations] || translations.en
  
  const [isCompleting, setIsCompleting] = useState(false)
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // Debug log removed - check browser console if issues persist

  // Handle success/error messages from OAuth callback - only runs once
  useEffect(() => {
    console.log('🔔 Checking URL params for success/error messages')
    
    // Use window.location instead of searchParams to avoid re-render issues
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')
    
    if (success) {
      const platform = success.replace('_connected', '')
      console.log('✅ Success param found:', platform)
      toast.success(
        locale === 'ar' 
          ? `تم الاتصال بـ ${platform} بنجاح`
          : `Successfully connected to ${platform}`,
        {
          duration: 3000,
        }
      )
      // Clean up URL params without causing re-render
      urlParams.delete('success')
      urlParams.delete('store')
      const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`
      window.history.replaceState({}, '', newUrl)
    }
    
    if (error) {
      const message = urlParams.get('message') || 'Connection failed'
      console.log('❌ Error param found:', error, message)
      toast.error(
        locale === 'ar' ? 'فشل الاتصال' : 'Connection failed',
        {
          description: message,
          duration: 5000,
        }
      )
      // Clean up URL params without causing re-render
      urlParams.delete('error')
      urlParams.delete('message')
      const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`
      window.history.replaceState({}, '', newUrl)
    }
  }, [locale]) // Only depend on locale, not searchParams

  // Load summary data - waits for auth context to be ready
  useEffect(() => {
    // Skip if we already have valid data (not empty)
    if (summaryData?.personalInfo?.fullName) {
      return
    }
    
    // Wait for auth to finish loading
    if (authLoading) {
      console.log('⏳ Waiting for auth to load...')
      return
    }

    let isMounted = true
    setIsLoading(true)
    
    // Shorter timeout - 3 seconds
    const timeoutId = setTimeout(() => {
      if (isMounted && isLoading) {
        console.warn('⏰ Summary data loading timeout (3s)')
        setIsLoading(false)
      }
    }, 3000)

    const loadSummaryData = async () => {
      try {
        console.log('🔄 Loading summary data, auth user:', user?.id)
        
        // Use user from auth context first, fallback to getUser()
        let currentUser = user
        if (!currentUser) {
          console.log('🔄 No user in context, trying getUser()...')
          const { data: { user: fetchedUser }, error: userError } = await supabase.auth.getUser()
          if (userError) {
            console.error('❌ getUser error:', userError.message)
          }
          currentUser = fetchedUser
        }
        
        if (!currentUser) {
          console.warn('⚠️ No user found - auth may not be restored')
          if (isMounted) {
            setIsLoading(false)
          }
          return
        }

        console.log('✅ User found:', currentUser.id)

        // Get business profile
        const { data: profile, error: profileError } = await supabase
          .from('business_profile')
          .select(`
            id,
            full_name,
            phone,
            role,
            business_country,
            store_id
          `)
          .eq('auth_user_id', currentUser.id)
          .maybeSingle()

        console.log('🔍 Profile query result:', { 
          profile, 
          profileError: profileError?.message,
          userId: currentUser.id 
        })

        if (profileError) {
          console.error('❌ Error loading profile:', profileError)
          if (isMounted) {
            setIsLoading(false)
          }
          return
        }
        
        if (!profile) {
          console.warn('⚠️ No profile found for user:', currentUser.id)
          if (isMounted) {
            setIsLoading(false)
          }
          return
        }
        
        console.log('✅ Profile loaded:', profile.id, 'Store ID:', profile.store_id)
        
        if (!isMounted) return

        // Get store info
        let storeInfo = null
        if (profile?.store_id) {
          const { data: store, error: storeError } = await supabase
            .from('stores')
            .select(`
              name,
              name_ar,
              store_type,
              store_categories
            `)
            .eq('id', profile.store_id)
            .maybeSingle()

          if (!storeError && store) {
            storeInfo = store
          }
        }

        // Get country name
        let countryName = null
        if (profile?.business_country) {
          const { data: country, error: countryError } = await supabase
            .from('countries')
            .select('name, name_ar')
            .eq('id', profile.business_country)
            .maybeSingle()

          if (!countryError && country) {
            countryName = locale === 'ar' ? country.name_ar : country.name
          }
        }

        // Get store connection
        let connectionInfo = { 
          platform: null as string | null, 
          connected: false, 
          storeDomain: null as string | null, 
          externalStoreName: null as string | null, 
          email: null as string | null, 
          connectionId: null as string | null
        }
        
        console.log('🔍 Checking for store connection, store_id:', profile.store_id)
        
        if (profile.store_id) {
          console.log('🔍 Fetching store connection for store_id:', profile.store_id)
          const { data: connection, error: connectionError } = await supabase
            .from('store_connections')
            .select('id, platform, store_domain, external_store_name, email')
            .eq('store_id', profile.store_id)
            .maybeSingle()

          console.log('🔍 Connection query result:', { 
            connection, 
            connectionError: connectionError?.message,
            storeId: profile.store_id 
          })

          if (connectionError) {
            console.warn('⚠️ Error loading connection (non-fatal):', connectionError)
          } else if (connection) {
            console.log('✅ Connection found:', connection.platform)
            connectionInfo = {
              platform: connection.platform,
              connected: true,
              storeDomain: connection.store_domain,
              externalStoreName: connection.external_store_name,
              email: connection.email,
              connectionId: connection.id,
            }
          } else {
            console.log('ℹ️ No connection found for store')
          }
        } else {
          console.log('⚠️ No store_id in profile - this should not happen after onboarding step 2')
        }

        if (isMounted) {
          const finalData = {
            personalInfo: {
              fullName: profile.full_name || null,
              phone: profile.phone || null,
              country: countryName,
              role: profile.role || null,
            },
            storeInfo: {
              name: storeInfo?.name || null,
              nameAr: storeInfo?.name_ar || null,
              types: storeInfo?.store_type || null,
              categories: storeInfo?.store_categories ? (storeInfo.store_categories as any[]).length : 0,
            },
            connectionInfo: {
              platform: null,
              connected: false,
              storeDomain: null,
              externalStoreName: null,
              email: null,
              connectionId: null,
            },
          }
          setSummaryData(finalData)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error loading summary data:', error)
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadSummaryData()
    
    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [locale, authLoading, user?.id]) // Re-run when auth state changes

  const handleComplete = async () => {
    setIsCompleting(true)
    
    try {
      console.log('🔄 Starting complete_onboarding RPC...')
      
      // Call complete_onboarding RPC with timeout protection
      const rpcCall = supabase.rpc('complete_onboarding')
      
      // Add timeout to prevent infinite loading (30 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout. Please check your connection and try again.'))
        }, 30000)
      })
      
      const result = await Promise.race([rpcCall, timeoutPromise])
      const { data, error } = result
      
      console.log('📥 RPC response:', { data, error })
      
      if (error) {
        console.error('❌ RPC error:', error)
        throw new Error(error.message)
      }
      
      if (!data?.success) {
        console.error('❌ RPC returned error:', data?.error)
        throw new Error(data?.error || 'Failed to complete onboarding')
      }

      console.log('✅ Onboarding completed successfully:', data)

      // Verify the update was applied by checking the database
      const { data: verifyData, error: verifyError } = await supabase
        .from('business_profile')
        .select('is_onboarded, onboarding_step')
        .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle()

      console.log('🔍 Verification query:', { verifyData, verifyError })

      if (verifyError) {
        console.warn('⚠️ Verification query failed, but continuing:', verifyError)
      }

      toast.success(t.success, {
        duration: 2000,
      })

      // Wait a bit longer to ensure database transaction is committed and visible
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Use window.location for a full page reload to ensure clean state
      // This will trigger server-side redirect logic which checks is_onboarded
      window.location.href = localizedUrl('/dashboard')
    } catch (err: any) {
      console.error('❌ Error completing onboarding:', err)
      toast.error(t.error, {
        description: err?.message || 'Please try again',
        duration: 5000,
      })
      setIsCompleting(false)
    }
  }

  const formatRole = (role: string | null | undefined) => {
    if (!role) return '-'
    return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ')
  }

  const formatStoreTypes = (types: string[] | null | undefined) => {
    if (!types || types.length === 0) return '-'
    return types.map(t => t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ')).join(', ')
  }

  // Navigation handlers for edit buttons - using direct paths
  const handleEditPersonalInfo = useCallback(() => {
    const url = localizedUrl('/onboarding/personal-details')
    console.log('🔧 PERSONAL INFO button clicked - navigating to:', url)
    router.push(url)
  }, [router, localizedUrl])


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Success indicator */}
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-green-900">{t.title}</h3>
          <p className="text-sm text-green-700">{t.subtitle}</p>
        </div>
      </div>

      {/* Summary Sections */}
      <div className="space-y-4">
        {/* Personal Information */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">{t.personalInfo}</h3>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleEditPersonalInfo}
                    className="h-8 w-8 p-0 hover:bg-gray-200"
                    aria-label={t.editPersonalInfo}
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="text-xs">
                  <p>{t.editPersonalInfo}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t.name}</p>
                <p className="text-sm text-gray-900 font-medium">{summaryData?.personalInfo.fullName || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t.phone}</p>
                <p className="text-sm text-gray-900 font-medium" dir="ltr">{summaryData?.personalInfo.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t.country}</p>
                <p className="text-sm text-gray-900 font-medium">{summaryData?.personalInfo.country || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t.role}</p>
                <p className="text-sm text-gray-900 font-medium">{formatRole(summaryData?.personalInfo.role)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Store Details */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <Store className="w-4 h-4 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900">{t.storeDetails}</h3>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t.storeName}</p>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1 flex-1">
                    <p className="text-sm text-gray-900 font-medium" dir="ltr">
                      {summaryData?.storeInfo.name || '-'}
                    </p>
                    {summaryData?.storeInfo.nameAr && (
                      <p 
                        className="text-sm text-gray-600 text-left" 
                        dir="ltr"
                        style={{ fontFamily: 'var(--font-ibm-plex-arabic), sans-serif' }}
                      >
                        {summaryData.storeInfo.nameAr}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t.storeType}</p>
                <p className="text-sm text-gray-900 font-medium">{formatStoreTypes(summaryData?.storeInfo.types)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t.categories}</p>
                <p className="text-sm text-gray-900 font-medium">
                  {summaryData?.storeInfo.categories || 0} {locale === 'ar' ? 'فئة' : 'categories'}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Complete Button */}
      <Button
        onClick={handleComplete}
        disabled={isCompleting}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-base font-semibold rounded-xl shadow-sm"
      >
        {isCompleting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            {t.completing}
          </>
        ) : (
          <>
            {t.complete}
            <ChevronRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>

    </div>
  )
}

// Export the component directly (no Suspense needed since we removed useSearchParams)
export function SummaryStep(props: OnboardingStepProps) {
  return <SummaryStepContent {...props} />
}
