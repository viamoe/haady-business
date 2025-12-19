'use client'

import { OnboardingStep } from './OnboardingWizard'
import { useLocale } from '@/i18n/context'

interface OnboardingSidebarProps {
  steps: OnboardingStep[]
  currentStep: number
  totalSteps: number
}

export function OnboardingSidebar({
  steps,
  currentStep,
  totalSteps,
}: OnboardingSidebarProps) {
  const { locale, isRTL } = useLocale()

  return (
    <div className="hidden lg:flex flex-1 lg:w-1/4 h-full flex-col overflow-hidden" style={{
      background: 'linear-gradient(to bottom, rgba(243, 244, 246, 1) 0%, transparent 100%)'
    }}>
      {/* Graphics Container - Takes the rest of the space */}
      <div className="flex-1 flex items-center justify-center p-8">
        {/* Placeholder for onboarding graphics */}
        <div className="w-full h-full flex items-center justify-center">
          {/* Graphics content will go here */}
        </div>
      </div>
    </div>
  )
}

