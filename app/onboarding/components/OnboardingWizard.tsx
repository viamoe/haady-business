'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { PersonalDetailsStep } from './steps/PersonalDetailsStep'
import { BusinessSetupStep } from './steps/BusinessSetupStep'
import { ConnectStoreStep } from './steps/ConnectStoreStep'
import { useLocale } from '@/i18n/context'
import { useOnboarding } from '@/lib/onboarding-context'
import { useLocalizedUrl } from '@/lib/use-localized-url'
import { useAuth } from '@/lib/auth/auth-context'
import { useLoading } from '@/lib/loading-context'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, Globe, CheckCircle2, Pause } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import dynamic from 'next/dynamic'

const OnboardingStorySlider = dynamic(
  () => import('@/components/onboarding-story-slider').then(mod => ({ default: mod.OnboardingStorySlider })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    ),
  }
)

// Constants
const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'
const TRANSITION_DELAY = 800
const POST_TRANSITION_DELAY = 600
const LANGUAGE_SWITCH_DELAY = 2000
const URL_SYNC_DELAY = 100

// Types
export type OnboardingStep = {
  id: string
  title: string
  titleAr?: string
  description?: string
  descriptionAr?: string
  component: React.ComponentType<OnboardingStepProps>
}

export interface OnboardingStepProps {
  onNext: () => Promise<void>
  onPrevious: () => void
  currentStep: number
  totalSteps: number
}

const steps: OnboardingStep[] = [
  {
    id: 'personal-details',
    title: "Let's get to know you",
    titleAr: 'دعنا نتعرف عليك',
    description: 'Add your info to create your Haady Business profile.',
    descriptionAr: 'أضف معلوماتك لإنشاء ملف هادي للأعمال الخاص بك.',
    component: PersonalDetailsStep,
  },
  {
    id: 'business-setup',
    title: 'Set up your store',
    titleAr: 'قم بإعداد متجرك',
    description: 'These details help customers discover and trust your brand.',
    descriptionAr: 'هذه التفاصيل تساعد العملاء على اكتشاف علامتك التجارية والثقة بها.',
    component: BusinessSetupStep,
  },
  {
    id: 'connect-store',
    title: 'Connect your store',
    titleAr: 'اربط متجرك',
    description: 'Import products from your existing store',
    descriptionAr: 'استورد المنتجات من متجرك الحالي',
    component: ConnectStoreStep,
  },
] as const

// Utility functions
const getUserInitials = (name: string | null, email: string): string => {
  if (name) {
    return name
      .split(/\s+/)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  if (!email) return 'U'
  const parts = email.split('@')[0].split(/[._-]/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return email[0].toUpperCase()
}

const getStepFromUrl = (pathname: string): number => {
  const pathSegments = pathname.split('/').filter(Boolean)
  const onboardingIndex = pathSegments.findIndex(seg => seg === 'onboarding')
  
  if (onboardingIndex === -1) return 0
  
  const stepSegment = pathSegments[onboardingIndex + 1]
  if (!stepSegment) return 0
  
  const stepIndex = steps.findIndex(step => step.id === stepSegment)
  return stepIndex >= 0 ? stepIndex : 0
}

export function OnboardingWizard() {
  const pathname = usePathname()
  const { locale, isRTL, setLocale } = useLocale()
  const { setStepInfo } = useOnboarding()
  const { localizedUrl } = useLocalizedUrl()
  const { user, signOut, loading: authLoading } = useAuth()
  const { setLoading } = useLoading()
  
  const totalSteps = steps.length
  const isChangingStepRef = useRef(false)
  const urlSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Memoize step calculation from URL
  const initialStep = useMemo(() => {
    if (typeof window !== 'undefined') {
      return getStepFromUrl(pathname)
    }
    return 0
  }, [pathname])

  const [currentStep, setCurrentStep] = useState(initialStep)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Memoize current step data
  const step = useMemo(() => steps[currentStep], [currentStep])
  const StepComponent = step.component

  // Memoize step title and description based on locale
  const stepTitle = useMemo(
    () => (locale === 'ar' && step.titleAr ? step.titleAr : step.title),
    [locale, step.title, step.titleAr]
  )
  const stepDescription = useMemo(
    () => (locale === 'ar' && step.descriptionAr ? step.descriptionAr : step.description),
    [locale, step.description, step.descriptionAr]
  )

  // Memoize progress percentage
  const progressPercentage = useMemo(
    () => ((currentStep + 1) / totalSteps) * 100,
    [currentStep, totalSteps]
  )

  // Memoize user initials
  const userInitials = useMemo(
    () => getUserInitials(
      user?.user_metadata?.full_name || null,
      user?.email || ''
    ),
    [user?.user_metadata?.full_name, user?.email]
  )

  // Update URL when step changes
  const updateUrl = useCallback((stepIndex: number) => {
    const stepId = steps[stepIndex]?.id
    if (!stepId) return

    const newPath = localizedUrl(`/onboarding/${stepId}`)
    isChangingStepRef.current = true
    window.history.pushState(null, '', newPath)
    
    // Clear existing timeout
    if (urlSyncTimeoutRef.current) {
      clearTimeout(urlSyncTimeoutRef.current)
    }
    
    // Reset the flag after delay
    urlSyncTimeoutRef.current = setTimeout(() => {
      isChangingStepRef.current = false
    }, URL_SYNC_DELAY)
  }, [localizedUrl])

  // Sync step with URL on mount and when pathname changes
  useEffect(() => {
    if (isChangingStepRef.current) return
    
    const stepFromUrl = getStepFromUrl(pathname)
    if (stepFromUrl !== currentStep) {
      setCurrentStep(stepFromUrl)
    }
  }, [pathname, currentStep])

  // Update step info in context
  useEffect(() => {
    setStepInfo({
      current: currentStep + 1,
      total: totalSteps,
      title: step.title,
      titleAr: step.titleAr,
      description: step.description,
      descriptionAr: step.descriptionAr,
    })
    
    return () => {
      setStepInfo(null)
    }
  }, [currentStep, totalSteps, step, setStepInfo])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (urlSyncTimeoutRef.current) {
        clearTimeout(urlSyncTimeoutRef.current)
      }
    }
  }, [])

  const handleNext = useCallback(async () => {
    if (currentStep >= totalSteps - 1) return

    setIsTransitioning(true)
    await new Promise(resolve => setTimeout(resolve, TRANSITION_DELAY))
    
    const nextStep = currentStep + 1
    setCurrentStep(nextStep)
    updateUrl(nextStep)
    
    await new Promise(resolve => setTimeout(resolve, POST_TRANSITION_DELAY))
    setIsTransitioning(false)
  }, [currentStep, totalSteps, updateUrl])

  const handlePrevious = useCallback(() => {
    if (currentStep <= 0) return

    const prevStep = currentStep - 1
    setCurrentStep(prevStep)
    updateUrl(prevStep)
  }, [currentStep, updateUrl])

  const handleLanguageToggle = useCallback(() => {
    const otherLang = locale === 'en' ? 'ar' : 'en'
    const loadingMessage = locale === 'ar' 
      ? 'جاري تبديل اللغة...' 
      : 'Switching language...'
    
    setLoading(true, loadingMessage)
    
    setTimeout(() => {
      setLocale(otherLang)
    }, LANGUAGE_SWITCH_DELAY)
  }, [locale, setLocale, setLoading])

  const handleSignOut = useCallback(async () => {
    setLoading(true, 'Signing out...')
    try {
      await signOut()
      setLoading(true, 'Redirecting...')
      window.location.href = localizedUrl('/')
    } catch (error) {
      console.error('Error signing out:', error)
      setLoading(false)
    }
  }, [signOut, localizedUrl, setLoading])

  const handleTogglePause = useCallback(() => {
    const slider = document.querySelector('[data-slider-container]')
    if (slider) {
      slider.dispatchEvent(new CustomEvent('togglePause'))
    }
  }, [])

  // Memoize RTL positioning classes
  const rtlPositionClasses = useMemo(() => ({
    topRight: isRTL ? 'left-0' : 'right-0',
    topLeft: isRTL ? 'right-0' : 'left-0',
    justify: isRTL ? 'justify-start' : 'justify-end',
    justifyReverse: isRTL ? 'justify-end' : 'justify-start',
  }), [isRTL])

  return (
    <div className="h-screen bg-gray-50 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex h-full overflow-hidden">
        {/* Main Content */}
        <div className="w-full lg:w-1/2 flex flex-col overflow-hidden">
          {/* Header with Logo */}
          <header className="flex items-center justify-between px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8 2xl:px-10 py-6 bg-white">
            <Link 
              href={localizedUrl('/')} 
              className="flex items-center gap-3 hover:opacity-80 transition-opacity" 
              suppressHydrationWarning
            >
              <Image
                src={HAADY_LOGO_URL}
                alt="Haady"
                width={32}
                height={32}
                className="w-8 h-8"
                priority
              />
              <span className="text-xl font-light tracking-tight text-foreground">
                {locale === 'ar' ? 'الأعمال' : 'Business'}
              </span>
              {process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  Preview
                </span>
              )}
            </Link>
            
            {/* Step Indicator */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100/50 transition-colors">
                  <span className="text-xs font-medium text-gray-400">
                    Step {currentStep + 1}/{totalSteps}
                  </span>
                  <div className="w-10 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-300 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                className="bg-white text-gray-900 border border-gray-200 shadow-lg p-3 min-w-[200px]"
                sideOffset={8}
              >
                <div className="space-y-2">
                  {steps.map((stepItem, index) => {
                    const isCompleted = index < currentStep
                    const isCurrent = index === currentStep
                    const itemTitle = locale === 'ar' && stepItem.titleAr ? stepItem.titleAr : stepItem.title
                    
                    return (
                      <div 
                        key={stepItem.id} 
                        className={`flex items-center gap-2 text-sm ${
                          isCompleted ? 'text-gray-500' : isCurrent ? 'text-gray-900 font-medium' : 'text-gray-600'
                        }`}
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="line-through">{itemTitle}</span>
                          </>
                        ) : (
                          <>
                            <div className="h-4 w-4 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
                              {isCurrent && <div className="h-2 w-2 rounded-full bg-gray-900" />}
                            </div>
                            <span>{itemTitle}</span>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </TooltipContent>
            </Tooltip>
          </header>
          
          {/* Step Content */}
          <main className="flex-1 overflow-y-auto bg-white relative">
            {/* Loading Overlay */}
            {isTransitioning && (
              <div className="absolute inset-0 bg-white z-50 flex items-center justify-center">
                <div className="animate-heartbeat">
                  <Image
                    src={HAADY_LOGO_URL}
                    alt="Haady"
                    width={64}
                    height={64}
                    className="w-16 h-16"
                    priority
                  />
                </div>
              </div>
            )}
            
            <div className="w-full max-w-[600px] px-16 pt-8 pb-12 mt-8 mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
                  {stepTitle}
                </h1>
                {stepDescription && (
                  <p className="text-lg text-gray-500 mb-12">
                    {stepDescription}
                  </p>
                )}
              </div>

              <StepComponent
                onNext={handleNext}
                onPrevious={handlePrevious}
                currentStep={currentStep}
                totalSteps={totalSteps}
              />
            </div>
          </main>
        </div>

        {/* Graphics/Content Area */}
        <aside className="hidden lg:flex w-full lg:w-1/2 flex-col relative group/slider">
          <div className="flex-1 overflow-hidden bg-orange-50 relative">
            <OnboardingStorySlider />
          
            {/* Pause Button */}
            <div 
              className={`absolute top-20 ${rtlPositionClasses.topLeft} flex items-center ${rtlPositionClasses.justifyReverse} ${isRTL ? 'pr-12' : 'pl-12'} z-30 opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300`}
            >
              <button
                onClick={handleTogglePause}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                aria-label="Toggle pause"
              >
                <Pause className="w-5 h-5 text-white" fill="white" />
              </button>
            </div>
          
            {/* Language Switcher and Avatar */}
            <div 
              className={`absolute top-20 ${rtlPositionClasses.topRight} flex items-center ${rtlPositionClasses.justify} ${isRTL ? 'pl-12' : 'pr-12'} z-30`}
            >
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLanguageToggle}
                  className="flex items-center gap-2 text-sm text-white hover:bg-white/20 hover:text-white"
                >
                  <Globe className="h-4 w-4 text-white" />
                  <span 
                    style={locale === 'en' ? { fontFamily: 'var(--font-ibm-plex-arabic), sans-serif' } : undefined} 
                    className="text-white"
                  >
                    {locale === 'en' ? 'العربية' : 'English'}
                  </span>
                </Button>
              
                {user && !authLoading && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-white text-sm font-medium hover:bg-orange-500 transition-colors focus:outline-none cursor-pointer shrink-0"
                        aria-label="User menu"
                      >
                        {userInitials}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      side="bottom"
                      sideOffset={8}
                      className="w-48 rounded-2xl p-0 shadow-[0_20px_60px_rgba(15,23,42,0.15)] bg-white overflow-hidden border-0"
                    >
                      <div className="p-2 space-y-1">
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault()
                            handleSignOut()
                          }}
                          className="cursor-pointer rounded-md flex items-center gap-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-600"
                        >
                          <LogOut className="h-4 w-4 text-red-600" />
                          Sign Out
                        </DropdownMenuItem>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
