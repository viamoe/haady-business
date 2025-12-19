'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/i18n/context'
import { OnboardingStepProps } from '../OnboardingWizard'
import { Store, ShoppingBag, Link as LinkIcon, Check } from 'lucide-react'
import Image from 'next/image'

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
  {
    id: 'custom',
    name: 'Custom Platform',
    nameAr: 'منصة مخصصة',
    logo: null,
    icon: '⚙️',
    description: 'Connect your custom e-commerce',
    descriptionAr: 'اربط متجرك الإلكتروني المخصص',
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

export function ConnectStoreStep({ onNext, currentStep, totalSteps }: OnboardingStepProps) {
  const { locale, isRTL } = useLocale()
  const t = translations[locale as keyof typeof translations] || translations.en
  
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStep, setConnectionStep] = useState<'select' | 'connect'>('select')

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

  const handlePlatformSelect = (platformId: string) => {
    setSelectedPlatform(platformId)
    setValue('platform', platformId)
    setConnectionStep('connect')
  }

  const handleBack = () => {
    setSelectedPlatform(null)
    setConnectionStep('select')
  }

  const handleConnect = async (data: ConnectionFormData) => {
    setIsConnecting(true)
    
    try {
      // TODO: Implement actual API connection logic
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Store connection details
      console.log('Connecting to platform:', {
        platform: selectedPlatform,
        storeUrl: data.storeUrl,
        apiKey: data.apiKey,
      })
      
      await onNext()
    } catch (error) {
      console.error('Connection error:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSkip = async () => {
    // User chooses to skip this step
    await onNext()
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
                    <div className="text-4xl flex-shrink-0">{platform.icon}</div>
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

          {/* Skip Option */}
          <div className="pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleSkip}
              className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 transition-colors py-3 rounded-lg hover:bg-gray-50"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>{t.noConnection}</span>
            </button>
          </div>
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
                <div className="text-3xl flex-shrink-0">
                  {platforms.find(p => p.id === selectedPlatform)?.icon}
                </div>
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
                disabled={isConnecting}
              >
                {t.skip}
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                disabled={isConnecting}
              >
                {isConnecting ? t.connecting : t.connect}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

