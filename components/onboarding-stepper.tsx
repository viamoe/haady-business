'use client'

import { CheckCircle2, User, Store, Link2, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  title: string
  titleAr?: string
  subtitle?: string
  subtitleAr?: string
}

interface OnboardingStepperProps {
  steps: Step[]
  currentStep: number
  locale?: string
}

const stepIcons = [
  User,
  Store,
  Link2,
  CheckCircle,
]

export function OnboardingStepper({ steps, currentStep, locale = 'en' }: OnboardingStepperProps) {
  const isRTL = locale === 'ar'

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isActive = index === currentStep
        const isInactive = index > currentStep
        const Icon = stepIcons[index] || User
        const stepTitle = locale === 'ar' && step.titleAr ? step.titleAr : step.title

        return (
          <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
            {/* Step Card */}
            <div
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 min-w-[180px]'
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 transition-colors',
                  isActive
                    ? 'bg-orange-100'
                    : isCompleted
                    ? 'bg-green-500'
                    : 'bg-gray-200/50'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                ) : (
                  <Icon
                    className={cn(
                      'w-4 h-4',
                      isActive ? 'text-[#F4610B]' : 'text-gray-300'
                    )}
                  />
                )}
              </div>

              {/* Text Content */}
              <div className="flex flex-col min-w-0">
                <span
                  className={cn(
                    'text-xs font-semibold truncate',
                    isActive
                      ? 'text-[#F4610B]'
                      : isCompleted
                      ? 'text-gray-400'
                      : 'text-gray-300'
                  )}
                >
                  {stepTitle}
                </span>
                <span className={cn(
                  'text-xs font-medium',
                  isActive ? 'text-gray-400' : 'text-gray-300'
                )}>
                  {step.subtitle 
                    ? (locale === 'ar' && step.subtitleAr ? step.subtitleAr : step.subtitle)
                    : (locale === 'ar' ? `الخطوة ${index + 1}` : `Step ${index + 1}`)}
                </span>
              </div>
            </div>

            {/* Arrow */}
            {index < steps.length - 1 && (
              <div className="flex items-center justify-center flex-shrink-0 px-1">
                <svg
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isCompleted ? 'text-green-500' : 'text-gray-300'
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={isRTL ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
                  />
                </svg>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

