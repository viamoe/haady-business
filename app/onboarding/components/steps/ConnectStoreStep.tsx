'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/i18n/context'
import { useLocalizedUrl } from '@/lib/use-localized-url'
import { toast } from '@/lib/toast'
import { OnboardingStepProps } from '../OnboardingWizard'
import { Store, Link as LinkIcon, Check, Loader2 } from 'lucide-react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const ECOMMERCE_STORAGE_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce'

// Platform definitions
const platforms = [
  {
    id: 'salla',
    name: 'Salla',
    nameAr: 'سلة',
    logo: `${ECOMMERCE_STORAGE_URL}/salla-icon.png`,
    description: 'Connect your Salla store',
    descriptionAr: 'اربط متجر سلة الخاص بك',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    nameAr: 'شوبيفاي',
    logo: `${ECOMMERCE_STORAGE_URL}/shopify-icon.png`,
    description: 'Connect your Shopify store',
    descriptionAr: 'اربط متجر شوبيفاي الخاص بك',
  },
  {
    id: 'zid',
    name: 'Zid',
    nameAr: 'زد',
    logo: `${ECOMMERCE_STORAGE_URL}/zid-icon.png`,
    description: 'Connect your Zid store',
    descriptionAr: 'اربط متجر زد الخاص بك',
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    nameAr: 'ووكومرس',
    logo: `${ECOMMERCE_STORAGE_URL}/woow-logo.png`,
    description: 'Connect your WooCommerce store',
    descriptionAr: 'اربط متجر ووكومرس الخاص بك',
  },
]

// Form schema
const createConnectionSchema = (locale: string) => {
  const errors = {
    storeUrl: {
      required: locale === 'ar' ? 'رابط المتجر مطلوب' : 'Store URL is required',
      invalid: locale === 'ar' ? 'رابط المتجر غير صالح' : 'Invalid store URL',
    },
    apiKey: {
      required: locale === 'ar' ? 'مفتاح API مطلوب' : 'API key is required',
    },
  }

  return z.object({
    platform: z.string().optional(),
    storeUrl: z.string().optional(),
    apiKey: z.string().optional(),
  })
}

type ConnectionFormData = z.infer<ReturnType<typeof createConnectionSchema>>

// Translations
const translations = {
  en: {
    skip: 'Skip for now',
    continue: 'Continue',
    connect: 'Connect',
    connecting: 'Connecting...',
    selectPlatform: 'Select your platform',
    storeUrl: 'Store URL',
    storeUrlPlaceholder: 'https://your-store.com',
    apiKey: 'API Key',
    apiKeyPlaceholder: 'Enter your API key',
    apiSecret: 'API Secret',
    apiSecretPlaceholder: 'Enter your API secret (optional)',
    connectionSuccess: 'Store connected successfully!',
    connectionError: 'Failed to connect store',
    noConnection: "I'll add products manually",
  },
  ar: {
    skip: 'تخطي الآن',
    continue: 'متابعة',
    connect: 'اتصال',
    connecting: 'جاري الاتصال...',
    selectPlatform: 'اختر منصتك',
    storeUrl: 'رابط المتجر',
    storeUrlPlaceholder: 'https://your-store.com',
    apiKey: 'مفتاح API',
    apiKeyPlaceholder: 'أدخل مفتاح API الخاص بك',
    apiSecret: 'API Secret',
    apiSecretPlaceholder: 'أدخل API secret (اختياري)',
    connectionSuccess: 'تم ربط المتجر بنجاح!',
    connectionError: 'فشل في ربط المتجر',
    noConnection: 'سأضيف المنتجات يدويًا',
  },
}

// Inner component that uses useSearchParams
function ConnectStoreStepContent({ onNext, currentStep, totalSteps }: OnboardingStepProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { locale, isRTL } = useLocale()
  const { localizedUrl } = useLocalizedUrl()
  const t = translations[locale as keyof typeof translations] || translations.en
  
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSkipping, setIsSkipping] = useState(false)
  const [connectionStep, setConnectionStep] = useState<'select' | 'connect'>('select')
  const [user, setUser] = useState<any>(null)
  const [shopDomainInput, setShopDomainInput] = useState('')
  const [showShopifyDialog, setShowShopifyDialog] = useState(false)

  const connectionSchema = createConnectionSchema(locale)
  
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
  } = useForm<ConnectionFormData>({
    resolver: zodResolver(connectionSchema),
    mode: 'onChange',
    criteriaMode: 'all',
  })

  const storeUrl = watch('storeUrl')
  const apiKey = watch('apiKey')

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (err) {
        console.error('Error getting user:', err)
      }
    }
    getUser()
  }, [])

  // Check for OAuth callback success/error
  useEffect(() => {
    try {
      const success = searchParams.get('success')
      const error = searchParams.get('error')
      
      if (success) {
        toast.success(t.connectionSuccess, { duration: 3000 })
        // Move to summary step instead of completing
        setTimeout(() => {
          router.push(localizedUrl('/onboarding/summary'))
        }, 1000)
      } else if (error) {
        const message = searchParams.get('message') || t.connectionError
        toast.error(message, { duration: 5000 })
        // Clean up URL params
        router.replace(localizedUrl('/onboarding?step=connect'))
      }
    } catch (err) {
      console.error('Error reading search params:', err)
    }
  }, [searchParams, router, localizedUrl, t])

  const handlePlatformSelect = (platformId: string) => {
    // For OAuth platforms, trigger OAuth flow directly
    if (platformId === 'salla') {
      handleSallaClick()
    } else if (platformId === 'zid') {
      handleZidClick()
    } else if (platformId === 'shopify') {
      setShowShopifyDialog(true)
    } else {
      // For WooCommerce and Custom, show API key form
    setSelectedPlatform(platformId)
    setValue('platform', platformId)
    setConnectionStep('connect')
    }
  }

  const handleBack = () => {
    setSelectedPlatform(null)
    setConnectionStep('select')
  }

  // OAuth handlers
  const handleSallaClick = () => {
    const clientId = process.env.NEXT_PUBLIC_SALLA_CLIENT_ID
    const redirectUri = process.env.NEXT_PUBLIC_SALLA_REDIRECT_URI || `${window.location.origin}/callback`
    
    if (!clientId) {
      toast.error(locale === 'ar' ? 'Salla OAuth غير مُكوّن' : 'Salla OAuth not configured', {
        description: 'Please configure NEXT_PUBLIC_SALLA_CLIENT_ID in your environment variables',
        duration: 5000,
      })
      return
    }

    if (!user?.id) {
      toast.error(locale === 'ar' ? 'المستخدم غير مصادق عليه' : 'User not authenticated')
      return
    }

    // Note: Scopes must be enabled in Salla Partner Dashboard for your app
    // Start with minimal scopes - add more as needed based on app permissions
    const scopes = [
      'offline_access',
    ].join(' ')

    // Include onboarding flag in state: userId:platform:onboarding
    const state = `${user.id}:salla:onboarding`

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      state: state,
    })

    const authUrl = `https://accounts.salla.sa/oauth2/auth?${params.toString()}`
    window.location.href = authUrl
  }

  const handleZidClick = () => {
    const clientId = process.env.NEXT_PUBLIC_ZID_CLIENT_ID
    const redirectUri = process.env.NEXT_PUBLIC_ZID_REDIRECT_URI || `${window.location.origin}/callback`
    
    if (!clientId) {
      toast.error(locale === 'ar' ? 'Zid OAuth غير مُكوّن' : 'Zid OAuth not configured')
      return
    }

    if (!user?.id) {
      toast.error(locale === 'ar' ? 'المستخدم غير مصادق عليه' : 'User not authenticated')
      return
    }

    const scopes = [
      'account.read',
      'products.read',
      'products.write',
      'product_inventory_stock.read',
      'product_inventory_stock.write',
      'orders.read',
      'orders.write',
      'abandoned_carts.read',
      'categories.read',
      'inventory.read',
      'inventory.write',
    ].join(' ')

    // Include onboarding flag in state: userId:platform:onboarding
    const state = `${user.id}:zid:onboarding`

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      state: state,
    })

    const authUrl = `https://oauth.zid.sa/oauth/authorize?${params.toString()}`
    window.location.href = authUrl
  }

  const handleShopifyDialogSubmit = () => {
    const shopDomain = shopDomainInput.trim()
    
    if (!shopDomain) {
      toast.error(locale === 'ar' ? 'اسم المتجر مطلوب' : 'Shop domain is required')
      return
    }

    // Clean the shop domain
    let cleanShop = shopDomain
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .trim()

    if (cleanShop.endsWith('.myshopify.com')) {
      cleanShop = cleanShop.replace(/\.myshopify\.com$/, '')
    }
    
    if (cleanShop.includes('admin.shopify.com/store/')) {
      cleanShop = cleanShop.replace(/.*admin\.shopify\.com\/store\//, '')
    }

    if (!cleanShop || !/^[a-zA-Z0-9_-]+$/.test(cleanShop)) {
      toast.error(locale === 'ar' ? 'اسم المتجر غير صالح' : 'Invalid shop domain')
      return
    }

    setShowShopifyDialog(false)
    proceedWithShopifyOAuth(cleanShop)
  }

  const proceedWithShopifyOAuth = (cleanShop: string) => {
    const clientId = process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID
    const redirectUri = process.env.NEXT_PUBLIC_SHOPIFY_REDIRECT_URI || `${window.location.origin}/callback`
    
    if (!clientId) {
      toast.error(locale === 'ar' ? 'Shopify OAuth غير مُكوّن' : 'Shopify OAuth not configured')
      return
    }

    if (!user?.id) {
      toast.error(locale === 'ar' ? 'المستخدم غير مصادق عليه' : 'User not authenticated')
      return
    }

    const scopes = [
      'read_products',
      'write_products',
      'read_orders',
      'write_orders',
      'read_inventory',
      'write_inventory',
      'read_customers',
      'read_fulfillments',
      'write_fulfillments',
      'read_shipping',
    ].join(',')

    // Include onboarding flag and shop in state: userId:shopify:shopDomain:onboarding
    const state = `${user.id}:shopify:${cleanShop}:onboarding`

    const shopUrl = `https://${cleanShop}.myshopify.com`
    const params = new URLSearchParams({
      client_id: clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      state: state,
    })

    const authUrl = `${shopUrl}/admin/oauth/authorize?${params.toString()}`
    window.location.href = authUrl
  }

  // Complete onboarding and redirect to dashboard
  const completeOnboarding = async () => {
    try {
      const { data, error } = await supabase.rpc('complete_onboarding')
      
      if (error) {
        console.error('Error completing onboarding:', error)
        // Still redirect even if this fails
      }
      
      if (data && !data.success) {
        console.warn('Onboarding completion warning:', data.error)
      }
      
      // Redirect to dashboard
      router.push(localizedUrl('/dashboard'))
    } catch (err) {
      console.error('Error in completeOnboarding:', err)
      // Still redirect
      router.push(localizedUrl('/dashboard'))
    }
  }

  const handleConnect = async (data: ConnectionFormData) => {
    setIsConnecting(true)
    
    try {
      if (!selectedPlatform) {
        throw new Error('Please select a platform')
      }

      if (!data.apiKey) {
        throw new Error('API key is required')
      }

      // Save store connection via RPC with timeout protection
      const rpcCall = supabase.rpc('save_store_connection_onboarding', {
        p_platform: selectedPlatform,
        p_access_token: data.apiKey,
        p_refresh_token: null, // Will be set during OAuth flow
        p_token_expires_at: null,
        p_external_store_id: null, // Will be fetched from platform API
        p_store_url: data.storeUrl || null,
        p_webhook_secret: null,
      })
      
      // Add timeout to prevent infinite loading (30 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout. Please check your connection and try again.'))
        }, 30000)
      })
      
      const result = await Promise.race([rpcCall, timeoutPromise])
      const { data: rpcData, error } = result

      if (error) {
        throw new Error(error.message)
      }

      if (!rpcData?.success) {
        throw new Error(rpcData?.error || 'Failed to save store connection')
      }

      console.log('Store connection saved:', rpcData)

      toast.success(t.connectionSuccess, {
        duration: 3000,
      })

      // Move to summary step with timeout protection
      try {
        const nextStepPromise = onNext()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Navigation timeout')), 10000)
        )
        
        await Promise.race([nextStepPromise, timeoutPromise])
      } catch (nextError: any) {
        // If navigation fails, still consider the form submitted successfully
        // The data is already saved, so we can manually navigate
        console.warn('Navigation error (data already saved):', nextError)
        router.push(localizedUrl('/onboarding/summary'))
      }
    } catch (err: any) {
      console.error('Connection error:', err)
      toast.error(t.connectionError, {
        description: err?.message || 'Please try again',
        duration: 5000,
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSkip = async () => {
    setIsSkipping(true)
    try {
      // User chooses to skip - no store_connections record will be created
      // Update onboarding_step to summary with timeout protection
      const rpcCall = supabase.rpc('skip_store_connection_onboarding')
      
      // Add timeout to prevent infinite loading (30 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout. Please check your connection and try again.'))
        }, 30000)
      })
      
      const result = await Promise.race([rpcCall, timeoutPromise])
      const { data, error } = result
      
      if (error) {
        console.error('Error updating onboarding step:', error)
      }
      
      if (data && !data.success) {
        console.warn('Onboarding step update warning:', data.error)
      }
      
      // Move to summary step with timeout protection
      try {
        const nextStepPromise = onNext()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Navigation timeout')), 10000)
        )
        
        await Promise.race([nextStepPromise, timeoutPromise])
      } catch (nextError: any) {
        // If navigation fails, still try to redirect manually
        console.warn('Navigation error:', nextError)
        router.push(localizedUrl('/onboarding/summary'))
      }
    } catch (err) {
      console.error('Error skipping:', err)
      // Still try to redirect
      router.push(localizedUrl('/onboarding/summary'))
    } finally {
      setIsSkipping(false)
    }
  }

  return (
    <div className="space-y-6">
      {connectionStep === 'select' ? (
        <>
          {/* Platform Selection */}
          <div className="flex flex-col gap-4">
            {platforms.map((platform) => (
              <button
                key={platform.id}
                type="button"
                onClick={() => handlePlatformSelect(platform.id)}
                className={`relative p-6 rounded-3xl border-0 transition-all duration-200 w-full ${
                  selectedPlatform === platform.id
                    ? 'shadow-[0_0_80px_rgba(15,23,42,0.12)] bg-white'
                    : 'shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] bg-white hover:-translate-y-1'
                } ${isRTL ? 'text-right' : 'text-left'} group`}
              >
                <div className="flex items-start gap-4">
                  {platform.logo ? (
                    <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                      <Image
                        src={platform.logo}
                        alt={platform.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-contain"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="text-4xl flex-shrink-0">🏪</div>
                  )}
                  <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {locale === 'ar' ? platform.nameAr : platform.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {locale === 'ar' ? platform.descriptionAr : platform.description}
                    </p>
                  </div>
                  <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Shopify Domain Dialog */}
          <Dialog open={showShopifyDialog} onOpenChange={setShowShopifyDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {locale === 'ar' ? 'أدخل اسم متجر Shopify' : 'Enter your Shopify store name'}
                </DialogTitle>
                <DialogDescription>
                  {locale === 'ar' 
                    ? 'أدخل اسم متجرك فقط (مثل: mystore) بدون .myshopify.com'
                    : 'Enter just your store name (e.g., mystore) without .myshopify.com'
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder={locale === 'ar' ? 'mystore' : 'mystore'}
                  value={shopDomainInput}
                  onChange={(e) => setShopDomainInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleShopifyDialogSubmit()
                    }
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowShopifyDialog(false)}
                  >
                    {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={handleShopifyDialogSubmit}>
                    {locale === 'ar' ? 'متابعة' : 'Continue'}
                  </Button>
                </div>
          </div>
            </DialogContent>
          </Dialog>

        </>
      ) : (
        <>
          {/* Connection Form */}
          <form onSubmit={handleSubmit(handleConnect)} className="space-y-6">
            {/* Selected Platform Display */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              {platforms.find(p => p.id === selectedPlatform)?.logo ? (
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                  <Image
                    src={platforms.find(p => p.id === selectedPlatform)?.logo || ''}
                    alt={platforms.find(p => p.id === selectedPlatform)?.name || ''}
                    width={48}
                    height={48}
                    className="w-full h-full object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="text-3xl flex-shrink-0">🏪</div>
              )}
              <div className="flex-1">
                <div className="text-sm text-gray-600">
                  {locale === 'ar' ? 'الاتصال بـ' : 'Connecting to'}
                </div>
                <div className="font-semibold text-gray-900">
                  {locale === 'ar' 
                    ? platforms.find(p => p.id === selectedPlatform)?.nameAr
                    : platforms.find(p => p.id === selectedPlatform)?.name
                  }
                </div>
              </div>
              <button
                type="button"
                onClick={handleBack}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {locale === 'ar' ? 'تغيير' : 'Change'}
              </button>
            </div>

            {/* Store URL */}
            <div className="space-y-2">
              <Label htmlFor="storeUrl" className="text-sm font-medium text-gray-700">
                {t.storeUrl}
              </Label>
              <Input
                id="storeUrl"
                type="url"
                placeholder={t.storeUrlPlaceholder}
                {...register('storeUrl')}
                className="!border-gray-300 hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              {errors.storeUrl && (
                <p className="text-xs text-red-500">{errors.storeUrl.message}</p>
              )}
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-sm font-medium text-gray-700">
                {t.apiKey}
              </Label>
              <Input
                id="apiKey"
                type="text"
                placeholder={t.apiKeyPlaceholder}
                {...register('apiKey')}
                className="!border-gray-300 hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              {errors.apiKey && (
                <p className="text-xs text-red-500">{errors.apiKey.message}</p>
              )}
            </div>

            {/* API Secret (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="apiSecret" className="text-sm font-medium text-gray-700">
                {t.apiSecret}
              </Label>
              <Input
                id="apiSecret"
                type="password"
                placeholder={t.apiSecretPlaceholder}
                className="!border-gray-300 hover:!border-orange-500 hover:!ring-1 hover:!ring-orange-500 focus-visible:!ring-1 focus-visible:!ring-orange-500 focus-visible:!border-orange-500"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            {/* Help Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                {locale === 'ar' 
                  ? 'ستحتاج إلى مفتاح API من لوحة تحكم منصتك. لا تقلق، يمكنك دائمًا إضافة هذا لاحقًا من الإعدادات.'
                  : "You'll need an API key from your platform's dashboard. Don't worry, you can always add this later from settings."
                }
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                className="flex-1 sm:flex-none"
                disabled={isConnecting || isSkipping}
              >
                {isSkipping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {locale === 'ar' ? 'جاري الإعداد...' : 'Setting up...'}
                  </>
                ) : (
                  t.skip
                )}
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                disabled={isConnecting || isSkipping}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t.connecting}
                  </>
                ) : (
                  t.connect
                )}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

// Wrapper component with Suspense
export function ConnectStoreStep(props: OnboardingStepProps) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    }>
      <ConnectStoreStepContent {...props} />
    </Suspense>
  )
}
