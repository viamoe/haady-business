'use client'

import { ErrorBoundary } from '@/components/error-boundary'

export function OnboardingErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log onboarding-specific errors
        console.error('Onboarding error:', error, errorInfo)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

