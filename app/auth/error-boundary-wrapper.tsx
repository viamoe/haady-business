'use client'

import { ErrorBoundary } from '@/components/error-boundary'

export function AuthErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log auth-specific errors
        console.error('Auth error:', error, errorInfo)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

