'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface OnboardingModalContextType {
  isOpen: boolean
  open: () => void
  close: () => void
  step: 'choose' | 'connect-platform'
  setStep: (step: 'choose' | 'connect-platform') => void
}

const OnboardingModalContext = createContext<OnboardingModalContextType | undefined>(undefined)

export function OnboardingModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<'choose' | 'connect-platform'>('choose')

  const open = useCallback(() => {
    setStep('choose')
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setStep('choose')
  }, [])

  return (
    <OnboardingModalContext.Provider
      value={{
        isOpen,
        open,
        close,
        step,
        setStep,
      }}
    >
      {children}
    </OnboardingModalContext.Provider>
  )
}

export function useOnboardingModal() {
  const context = useContext(OnboardingModalContext)
  if (context === undefined) {
    throw new Error('useOnboardingModal must be used within an OnboardingModalProvider')
  }
  return context
}

