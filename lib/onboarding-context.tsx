'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface OnboardingStepInfo {
  current: number
  total: number
  title: string
  titleAr?: string
  description?: string
  descriptionAr?: string
}

interface OnboardingContextType {
  stepInfo: OnboardingStepInfo | null
  setStepInfo: (info: OnboardingStepInfo | null) => void
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [stepInfo, setStepInfo] = useState<OnboardingStepInfo | null>(null)

  return (
    <OnboardingContext.Provider value={{ stepInfo, setStepInfo }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    return { stepInfo: null, setStepInfo: () => {} }
  }
  return context
}

