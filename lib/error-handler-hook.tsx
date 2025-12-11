/**
 * React Hook for Error Handling
 * 
 * Provides a hook to easily handle errors in React components
 */

'use client'

import { useCallback } from 'react'
import { handleError, ErrorDetails, ErrorType } from './error-handler'
import { useLocale } from '@/i18n/context'

export function useErrorHandler() {
  const { locale } = useLocale()
  
  const handle = useCallback(
    (
      error: any,
      options?: {
        context?: string
        showToast?: boolean
        logError?: boolean
        fallbackMessage?: string
      }
    ): ErrorDetails => {
      return handleError(error, { ...options, locale })
    },
    [locale]
  )

  const handleNetworkError = useCallback(
    (error: any, context?: string) => {
      return handleError(error, {
        context,
        showToast: true,
        locale,
      })
    },
    [locale]
  )

  const handleApiError = useCallback(
    async (response: Response, context?: string) => {
      let error: any = {}
      try {
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          error = await response.json()
        } else {
          const text = await response.text()
          error = { error: text || `Request failed with status ${response.status}` }
        }
      } catch (parseError) {
        error = { error: `Request failed with status ${response.status}` }
      }
      error.status = response.status
      error.statusCode = response.status
      return handleError(error, { context, showToast: true, locale })
    },
    [locale]
  )

  const handleSilentError = useCallback(
    (error: any, context?: string) => {
      return handleError(error, {
        context,
        showToast: false,
        logError: true,
        locale,
      })
    },
    [locale]
  )

  return {
    handleError: handle,
    handleNetworkError,
    handleApiError,
    handleSilentError,
    ErrorType,
  }
}

