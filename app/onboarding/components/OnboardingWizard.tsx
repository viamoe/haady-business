'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { PersonalDetailsStep } from './steps/PersonalDetailsStep'
import { BusinessSetupStep } from './steps/BusinessSetupStep'
import { SummaryStep } from './steps/SummaryStep'
import { useLocale } from '@/i18n/context'
import { useOnboarding } from '@/lib/onboarding-context'
import { useLocalizedUrl } from '@/lib/use-localized-url'
import { useAuth } from '@/lib/auth/auth-context'
import { useLoading } from '@/lib/loading-context'
import { getStepIndex, isValidStep, type OnboardingStepId } from '@/lib/constants/onboarding'
import { Button } from '@/components/ui/button'
import { PlatformHeader } from '@/components/platform-header'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, Globe, CheckCircle2, Pause } from 'lucide-react'
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

// Transition timing constants (in milliseconds)
export const ONBOARDING_TRANSITION_DELAYS = {
  TRANSITION: 800, // Delay before starting transition
  POST_TRANSITION: 600, // Delay after transition completes
  LANGUAGE_SWITCH: 3000, // Delay for language switching
  URL_SYNC: 100, // Delay for URL synchronization
} as const

const TRANSITION_DELAY = ONBOARDING_TRANSITION_DELAYS.TRANSITION
const POST_TRANSITION_DELAY = ONBOARDING_TRANSITION_DELAYS.POST_TRANSITION
const LANGUAGE_SWITCH_DELAY = ONBOARDING_TRANSITION_DELAYS.LANGUAGE_SWITCH
const URL_SYNC_DELAY = ONBOARDING_TRANSITION_DELAYS.URL_SYNC

// Types
export type OnboardingStep = {
  id: string
  title: string
  titleAr?: string
  subtitle?: string
  subtitleAr?: string
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
    title: 'Personal details',
    titleAr: 'البيانات الشخصية',
    subtitle: "Let's get to know you",
    subtitleAr: 'دعنا نتعرف عليك',
    description: 'Add your info to create your Haady Business profile.',
    descriptionAr: 'أضف معلوماتك لإنشاء ملف هادي للأعمال الخاص بك.',
    component: PersonalDetailsStep,
  },
  {
    id: 'business-setup' as OnboardingStepId,
    title: 'Set up your store',
    titleAr: 'قم بإعداد متجرك',
    subtitle: 'Tell us about your store',
    subtitleAr: 'أخبرنا عن متجرك',
    description: 'These details help customers discover and trust your brand.',
    descriptionAr: 'هذه التفاصيل تساعد العملاء على اكتشاف علامتك التجارية والثقة بها.',
    component: BusinessSetupStep,
  },
  {
    id: 'summary' as OnboardingStepId,
    title: 'Review & Complete',
    titleAr: 'مراجعة وإكمال',
    subtitle: 'Finalize your setup',
    subtitleAr: 'أكمل إعدادك',
    description: 'Review your information and finalize setup',
    descriptionAr: 'راجع معلوماتك وأكمل الإعداد',
    component: SummaryStep,
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
  const router = useRouter()
  const { locale, isRTL, setLocale } = useLocale()
  const { setStepInfo } = useOnboarding()
  const { localizedUrl } = useLocalizedUrl()
  const { user, signOut, loading: authLoading } = useAuth()
  const { setLoading } = useLoading()
  
  const totalSteps = steps.length
  const isChangingStepRef = useRef(false)
  const urlSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Note: Server-side redirect in [step]/page.tsx already handles:
  // - Redirecting to correct step based on database
  // - Preventing access to future steps
  // - Redirecting completed users to dashboard
  // So we can trust the URL as the source of truth

  // Map onboarding_step to step index (for backward compatibility if needed)
  const getStepIndexFromOnboardingStep = useCallback((onboardingStep: string | null): number => {
    if (!onboardingStep || !isValidStep(onboardingStep)) return 0 // Start from beginning
    return getStepIndex(onboardingStep)
  }, [])
  
  // Get current step from URL (server ensures it's correct)
  const getCurrentStepFromUrl = useCallback((): number => {
    return getStepFromUrl(pathname)
  }, [pathname])

  // Initialize from URL path - works on both server and client
  // Server-side redirect in page.tsx already ensures the URL is correct
  const [currentStep, setCurrentStep] = useState(() => getStepFromUrl(pathname))
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Sync currentStep with URL when pathname changes (e.g., after navigation)
  useEffect(() => {
    const stepFromUrl = getStepFromUrl(pathname)
    if (stepFromUrl !== currentStep) {
      setCurrentStep(stepFromUrl)
    }
  }, [pathname, currentStep])

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
  // Server-side redirect handles preventing access to future steps, we just sync state
  useEffect(() => {
    if (isChangingStepRef.current) return
    
    const stepFromUrl = getStepFromUrl(pathname)
    
    // Only sync state if URL step is valid (server already prevented invalid steps)
    if (stepFromUrl !== -1 && stepFromUrl !== currentStep) {
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
    // Prevent going back to earlier steps - users must complete steps in order
    if (currentStep <= 0) return

    // Server-side redirect already prevents accessing steps beyond user's progress
    // We can safely allow going back one step
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
      <PlatformHeader
        variant="onboarding"
        onboardingSteps={steps.map(step => ({
          id: step.id,
          title: step.title,
          titleAr: step.titleAr,
          subtitle: step.subtitle,
          subtitleAr: step.subtitleAr,
        }))}
        currentOnboardingStep={currentStep}
      />
      <div className="flex h-full overflow-hidden">
        {/* Main Content */}
        <div className="w-full flex flex-col overflow-hidden">
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
              {/* Hide header for summary step - it has its own header */}
              {steps[currentStep]?.id !== 'summary' && (
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
              )}

              <StepComponent
                onNext={handleNext}
                onPrevious={handlePrevious}
                currentStep={currentStep}
                totalSteps={totalSteps}
              />
            </div>
          </main>
        </div>

      </div>
    </div>
  )
}
