/**
 * Universal Error Handler
 * 
 * Provides a centralized way to handle and display errors throughout the application.
 * Supports different error types and provides user-friendly error messages.
 */

import { toast } from './toast'
import { getToastTranslations } from './translations'

type ToastTranslations = ReturnType<typeof getToastTranslations>

export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API',
  VALIDATION = 'VALIDATION',
  AUTH = 'AUTH',
  PERMISSION = 'PERMISSION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

export interface ErrorDetails {
  type: ErrorType
  message: string
  originalError?: any
  statusCode?: number
  context?: string
  retryable?: boolean
}

/**
 * Get error type display name
 */
function getErrorTypeName(errorType: ErrorType, translations?: ToastTranslations): string {
  if (translations) {
    switch (errorType) {
      case ErrorType.NETWORK:
        return translations.errors.network.title
      case ErrorType.AUTH:
        return translations.errors.auth.title
      case ErrorType.PERMISSION:
        return translations.errors.permission.title
      case ErrorType.VALIDATION:
        return translations.errors.validation.title
      case ErrorType.NOT_FOUND:
        return translations.errors.notFound.title
      case ErrorType.SERVER:
        return translations.errors.server.title
      case ErrorType.API:
        return translations.errors.api.title
      case ErrorType.UNKNOWN:
      default:
        return translations.errors.unknown.title
    }
  }
  
  // Fallback to English
  switch (errorType) {
    case ErrorType.NETWORK:
      return 'Network Error'
    case ErrorType.AUTH:
      return 'Authentication Error'
    case ErrorType.PERMISSION:
      return 'Permission Denied'
    case ErrorType.VALIDATION:
      return 'Validation Error'
    case ErrorType.NOT_FOUND:
      return 'Not Found'
    case ErrorType.SERVER:
      return 'Server Error'
    case ErrorType.API:
      return 'Request Failed'
    case ErrorType.UNKNOWN:
    default:
      return 'Error'
  }
}

/**
 * Get error-specific action button configuration
 */
function getErrorAction(
  errorType: ErrorType,
  retryable?: boolean,
  onRetry?: () => void | Promise<void>,
  translations?: ToastTranslations
): { label: string; onClick: () => void } | undefined {
  switch (errorType) {
    case ErrorType.NETWORK:
      return {
        label: translations?.errors.network.action || 'Refresh',
        onClick: () => {
          window.location.reload()
        },
      }
    
    case ErrorType.AUTH:
      return {
        label: translations?.errors.auth.action || 'Login',
        onClick: () => {
          window.location.href = '/auth/login'
        },
      }
    
    case ErrorType.SERVER:
    case ErrorType.API:
      if (retryable) {
        if (onRetry) {
          return {
            label: translations?.errors.api.action || 'Retry',
            onClick: () => {
              onRetry()
            },
          }
        }
        return {
          label: translations?.errors.server.action || 'Refresh',
          onClick: () => {
            window.location.reload()
          },
        }
      }
      return undefined
    
    case ErrorType.PERMISSION:
      return {
        label: translations?.errors.permission.action || 'Contact Support',
        onClick: () => {
          // You can customize this to open a support modal or navigate to support page
          window.open('mailto:support@haady.com?subject=Permission Issue', '_blank')
        },
      }
    
    default:
      return undefined
  }
}

/**
 * Get error-specific toast configuration
 */
function getErrorToastConfig(
  errorType: ErrorType,
  context?: string,
  retryable?: boolean
): {
  toastType: 'error' | 'warning' | 'info'
  description?: string
  className: string
} {
  const baseClasses = 'error-toast-custom'
  
  switch (errorType) {
    case ErrorType.NETWORK:
      return {
        toastType: 'warning',
        description: 'Check your internet connection and try again',
        className: `${baseClasses} error-toast-network`,
      }
    
    case ErrorType.AUTH:
      return {
        toastType: 'error',
        description: 'Please sign in again to continue',
        className: `${baseClasses} error-toast-auth`,
      }
    
    case ErrorType.PERMISSION:
      return {
        toastType: 'warning',
        description: 'You don\'t have permission to perform this action',
        className: `${baseClasses} error-toast-permission`,
      }
    
    case ErrorType.VALIDATION:
      return {
        toastType: 'warning',
        description: 'Please check your input and try again',
        className: `${baseClasses} error-toast-validation`,
      }
    
    case ErrorType.NOT_FOUND:
      return {
        toastType: 'info',
        description: 'The requested resource could not be found',
        className: `${baseClasses} error-toast-not-found`,
      }
    
    case ErrorType.SERVER:
      return {
        toastType: 'error',
        description: retryable 
          ? 'Server is temporarily unavailable. Please try again in a moment'
          : 'Server error occurred. Please contact support if the issue persists',
        className: `${baseClasses} error-toast-server`,
      }
    
    case ErrorType.API:
      return {
        toastType: 'error',
        description: retryable
          ? 'Request failed. Please try again'
          : 'An error occurred while processing your request',
        className: `${baseClasses} error-toast-api`,
      }
    
    case ErrorType.UNKNOWN:
    default:
      return {
        toastType: 'error',
        description: context || 'An unexpected error occurred. Please try again',
        className: `${baseClasses} error-toast-unknown`,
      }
  }
}

/**
 * Detects the error type from an error object
 */
function detectErrorType(error: any): ErrorType {
  // Network errors (including timeouts and connection issues)
  const errorMessage = error?.message || error?.toString() || ''
  const errorName = error?.name || ''
  
  // Check for network-related error patterns
  const isNetworkError = 
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('NetworkError') ||
    errorMessage.includes('Network request failed') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection is too slow') ||
    errorMessage.includes('unavailable') ||
    errorMessage.includes('network') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('ENOTFOUND') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorName === 'AbortError' ||
    errorName === 'TimeoutError' ||
    (errorName === 'TypeError' && (errorMessage.includes('fetch') || errorMessage === 'Failed to fetch')) ||
    (errorName === 'TypeError' && typeof navigator !== 'undefined' && !navigator.onLine) ||
    (errorName === 'NetworkError')
  
  if (isNetworkError) {
    return ErrorType.NETWORK
  }

  // API errors with status codes
  if (error?.status || error?.statusCode) {
    const status = error.status || error.statusCode
    if (status === 401 || status === 403) {
      return ErrorType.AUTH
    }
    if (status === 404) {
      return ErrorType.NOT_FOUND
    }
    if (status === 403 || status === 422) {
      return ErrorType.PERMISSION
    }
    if (status >= 500) {
      return ErrorType.SERVER
    }
    return ErrorType.API
  }

  // Supabase errors
  if (error?.code) {
    if (error.code === 'PGRST116' || error.code === '42501') {
      return ErrorType.PERMISSION
    }
    if (error.code === '23505') {
      return ErrorType.VALIDATION
    }
  }

  // Validation errors
  if (
    error?.message?.includes('validation') ||
    error?.message?.includes('invalid') ||
    error?.message?.includes('required')
  ) {
    return ErrorType.VALIDATION
  }

  // Auth errors
  if (
    error?.message?.includes('unauthorized') ||
    error?.message?.includes('authentication') ||
    error?.message?.includes('token') ||
    error?.message?.includes('session')
  ) {
    return ErrorType.AUTH
  }

  return ErrorType.UNKNOWN
}

/**
 * Extracts user-friendly error message from various error formats
 */
function extractErrorMessage(error: any, context?: string): string {
  // If it's already a formatted error details object
  if (error?.type && error?.message) {
    return error.message
  }

  // Try to get message from different error formats
  let message = 
    error?.error?.message ||
    error?.error?.error ||
    error?.message ||
    error?.error ||
    error?.details?.message ||
    error?.details?.error ||
    error?.toString() ||
    'An unexpected error occurred'

  // Clean up common error prefixes
  message = message
    .replace(/^Error:\s*/i, '')
    .replace(/^TypeError:\s*/i, '')
    .replace(/^NetworkError:\s*/i, '')

  // Add context if provided
  if (context) {
    message = `${context}: ${message}`
  }

  return message
}

/**
 * Gets user-friendly error message based on error type
 */
function getUserFriendlyMessage(errorType: ErrorType, originalMessage: string, context?: string, translations?: ToastTranslations): string {
  const contextPrefix = context ? `${context}: ` : ''

  if (translations) {
    switch (errorType) {
      case ErrorType.NETWORK:
        // Use slow connection message if it's a timeout
        const isSlowConnection = originalMessage?.includes('timeout') || originalMessage?.includes('too slow')
        const networkMessage = isSlowConnection && translations.errors.network.messageSlow
          ? translations.errors.network.messageSlow
          : translations.errors.network.message
        return `${contextPrefix}${networkMessage}`
      
      case ErrorType.AUTH:
        return `${contextPrefix}${translations.errors.auth.message}`
      
      case ErrorType.PERMISSION:
        return `${contextPrefix}${translations.errors.permission.message}`
      
      case ErrorType.NOT_FOUND:
        return `${contextPrefix}${translations.errors.notFound.message}`
      
      case ErrorType.VALIDATION:
        return originalMessage || `${contextPrefix}${translations.errors.validation.message}`
      
      case ErrorType.SERVER:
        return `${contextPrefix}${translations.errors.server.message}`
      
      case ErrorType.API:
        return originalMessage || `${contextPrefix}${translations.errors.api.message}`
      
      default:
        return originalMessage || `${contextPrefix}${translations.errors.unknown.message}`
    }
  }

  // Fallback to English
  switch (errorType) {
    case ErrorType.NETWORK:
      // Check if it's a timeout/slow connection error
      if (originalMessage?.includes('timeout') || originalMessage?.includes('too slow')) {
        return `${contextPrefix}Connection timeout. Your internet connection is too slow. Please check your connection and try again.`
      }
      return `${contextPrefix}Network connection failed. Please check your internet connection and try again.`
    
    case ErrorType.AUTH:
      return `${contextPrefix}Authentication failed. Please sign in again.`
    
    case ErrorType.PERMISSION:
      return `${contextPrefix}You don't have permission to perform this action.`
    
    case ErrorType.NOT_FOUND:
      return `${contextPrefix}The requested resource was not found.`
    
    case ErrorType.VALIDATION:
      return originalMessage || `${contextPrefix}Please check your input and try again.`
    
    case ErrorType.SERVER:
      return `${contextPrefix}Server error occurred. Please try again later or contact support.`
    
    case ErrorType.API:
      return originalMessage || `${contextPrefix}Request failed. Please try again.`
    
    default:
      return originalMessage || `${contextPrefix}An unexpected error occurred. Please try again.`
  }
}

/**
 * Main error handler function
 */
export function handleError(
  error: any,
  options?: {
    context?: string
    showToast?: boolean
    logError?: boolean
    fallbackMessage?: string
    onRetry?: () => void | Promise<void>
    locale?: 'en' | 'ar'
  }
): ErrorDetails {
  const {
    context,
    showToast = true,
    logError = true,
    fallbackMessage,
    onRetry,
    locale = 'en',
  } = options || {}
  
  // Get translations if locale is provided
  const translations = locale ? getToastTranslations(locale) : undefined

  // Detect error type
  const errorType = detectErrorType(error)

  // Extract error message
  const originalMessage = extractErrorMessage(error, context)
  const userMessage = getUserFriendlyMessage(errorType, originalMessage, context, translations) || fallbackMessage || 'An error occurred'

  // Determine if error is retryable
  const retryable = errorType === ErrorType.NETWORK || errorType === ErrorType.SERVER

  // Get status code if available
  const statusCode = error?.status || error?.statusCode || error?.response?.status

  // Create error details
  const errorDetails: ErrorDetails = {
    type: errorType,
    message: userMessage,
    originalError: error,
    statusCode,
    context,
    retryable,
  }

  // Log error (only in development or if explicitly enabled)
  if (logError) {
    // Use console.warn for handled errors to avoid triggering Next.js error overlay
    // The error is already handled and shown to user via toast
    const logLevel = 'warn'
    
    // Safely serialize error for logging
    const safeError: any = {}
    try {
      safeError.name = error?.name
      safeError.message = error?.message || error?.error || String(error)
      safeError.stack = error?.stack
      safeError.code = error?.code
      safeError.status = error?.status || error?.statusCode
      if (error?.response) {
        safeError.responseStatus = error.response.status
        safeError.responseStatusText = error.response.statusText
      }
    } catch (e) {
      safeError.serializationError = 'Could not serialize error'
    }
    
    // Log with separate console statements to avoid serialization issues
    // Use console.groupCollapsed to keep logs tidy
    console.groupCollapsed(`⚠️ [Error Handler] ${errorType}${context ? ` - ${context}` : ''}`)
    console.log('Type:', errorType)
    console.log('User Message:', userMessage)
    console.log('Original Message:', originalMessage)
    if (context) console.log('Context:', context)
    if (statusCode) console.log('Status Code:', statusCode)
    console.log('Retryable:', retryable)
    console.log('Error Details:', safeError)
    if (error && typeof error === 'object') {
      console.log('Original Error Object:', error)
    }
    console.groupEnd()
  }

  // Show toast notification with custom styling per error type
  if (showToast) {
    // Determine toast duration based on error type
    const duration = errorType === ErrorType.NETWORK ? 7000 : 5000

    // Get error-specific configuration
    const errorConfig = getErrorToastConfig(errorType, context, retryable)
    
    // Use appropriate toast method based on error type
    const toastMethod = errorConfig.toastType === 'warning' 
      ? toast.warning 
      : errorConfig.toastType === 'info'
      ? toast.info
      : toast.error

    // Extract title (context or error type name) and use message without context prefix as description
    const title = context || getErrorTypeName(errorType, translations)
    // Remove context prefix from description if it exists
    let description = userMessage
    if (context && userMessage.startsWith(`${context}: `)) {
      description = userMessage.replace(`${context}: `, '')
    }

    // Get action button based on error type
    const action = getErrorAction(errorType, retryable, onRetry, translations)

    toastMethod(title, {
      description,
      duration,
      className: errorConfig.className,
      errorType,
      action: action ? {
        label: action.label,
        onClick: action.onClick,
      } : undefined,
    })
  }

  return errorDetails
}

/**
 * Wrapper for async functions to automatically handle errors
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    context?: string
    showToast?: boolean
    onError?: (error: ErrorDetails) => void
  }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      const errorDetails = handleError(error, {
        context: options?.context || fn.name,
        showToast: options?.showToast,
      })

      if (options?.onError) {
        options.onError(errorDetails)
      }

      throw errorDetails
    }
  }) as T
}

/**
 * Handles fetch API errors specifically
 */
export async function handleFetchError(response: Response, context?: string, locale?: 'en' | 'ar'): Promise<never> {
  let error: any = {}

  try {
    // Try to parse as JSON first
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      error = await response.json()
    } else {
      // If not JSON, get as text
      const text = await response.text()
      error = { error: text || `Request failed with status ${response.status}` }
    }
  } catch (parseError) {
    error = { error: `Request failed with status ${response.status}` }
  }

  // Add status code to error
  error.status = response.status
  error.statusCode = response.status

  // Handle error and throw the ErrorDetails object
  const errorDetails = handleError(error, { context, showToast: true, locale })
  throw errorDetails
}

/**
 * Safe fetch wrapper with automatic error handling and timeout
 */
export async function safeFetch(
  url: string,
  options?: RequestInit,
  errorOptions?: {
    context?: string
    showToast?: boolean
    locale?: 'en' | 'ar'
    timeout?: number // Timeout in milliseconds (default: 30000 = 30 seconds)
  }
): Promise<Response> {
  const timeout = errorOptions?.timeout || 30000 // 30 seconds default timeout
  
  try {
    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, timeout)

    // Merge abort signal with existing options
    const fetchOptions: RequestInit = {
      ...options,
      signal: controller.signal,
    }

    try {
      console.log('🌐 Fetching:', url, { method: options?.method || 'GET' })
      const response = await fetch(url, fetchOptions)
      clearTimeout(timeoutId)

      console.log('📡 Response received:', {
        url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      })

      if (!response.ok) {
        // Log error response before handling
        const responseClone = response.clone()
        try {
          const errorData = await responseClone.json().catch(() => null)
          console.error('❌ API Error Response:', {
            url,
            status: response.status,
            statusText: response.statusText,
            errorData,
          })
        } catch (e) {
          const errorText = await responseClone.text().catch(() => 'Could not read response')
          console.error('❌ API Error Response (text):', {
            url,
            status: response.status,
            statusText: response.statusText,
            errorText,
          })
        }
        
        await handleFetchError(response, errorOptions?.context, errorOptions?.locale)
        // handleFetchError throws, so this won't execute
        return response
      }

      return response
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      // Check if it's a timeout/abort error
      if (fetchError.name === 'AbortError' || controller.signal.aborted) {
        const timeoutError = new Error('Request timeout - connection is too slow or unavailable')
        timeoutError.name = 'TimeoutError'
        const errorDetails = handleError(timeoutError, {
          context: errorOptions?.context || `Fetch to ${url}`,
          showToast: errorOptions?.showToast,
          locale: errorOptions?.locale,
        })
        throw errorDetails
      }
      
      // Normalize "Failed to fetch" errors to ensure they're properly detected
      // This can happen when network is unavailable, CORS issues, or server unreachable
      if (
        fetchError?.message === 'Failed to fetch' ||
        (fetchError?.name === 'TypeError' && fetchError?.message?.includes('fetch')) ||
        fetchError?.toString()?.includes('Failed to fetch')
      ) {
        // Ensure the error has the right structure for detection
        const networkError = new Error('Failed to fetch')
        networkError.name = fetchError?.name || 'TypeError'
        // Copy any additional properties
        if (fetchError?.stack) {
          networkError.stack = fetchError.stack
        }
        const errorDetails = handleError(networkError, {
          context: errorOptions?.context || `Fetch to ${url}`,
          showToast: errorOptions?.showToast,
          locale: errorOptions?.locale,
        })
        throw errorDetails
      }
      
      // Re-throw to be handled below
      throw fetchError
    }
  } catch (error: any) {
    // If it's already our ErrorDetails, re-throw it
    if (error?.type && error?.message) {
      throw error
    }

    // Normalize "Failed to fetch" errors that might have slipped through
    if (
      error?.message === 'Failed to fetch' ||
      (error?.name === 'TypeError' && error?.message?.includes('fetch')) ||
      error?.toString()?.includes('Failed to fetch')
    ) {
      const networkError = new Error('Failed to fetch')
      networkError.name = error?.name || 'TypeError'
      if (error?.stack) {
        networkError.stack = error.stack
      }
      const errorDetails = handleError(networkError, {
        context: errorOptions?.context || `Fetch to ${url}`,
        showToast: errorOptions?.showToast,
        locale: errorOptions?.locale,
      })
      throw errorDetails
    }

    // Otherwise, handle it and throw the ErrorDetails
    const errorDetails = handleError(error, {
      context: errorOptions?.context || `Fetch to ${url}`,
      showToast: errorOptions?.showToast,
      locale: errorOptions?.locale,
    })
    
    throw errorDetails
  }
}

/**
 * Handles Supabase errors specifically
 */
export function handleSupabaseError(error: any, context?: string): ErrorDetails {
  // Supabase errors often have a specific structure
  let message = error?.message || 'Database operation failed'

  // Handle specific Supabase error codes
  if (error?.code) {
    switch (error.code) {
      case 'PGRST116':
        message = 'The requested record was not found'
        break
      case '42501':
        message = 'You do not have permission to perform this action'
        break
      case '23505':
        message = 'This record already exists'
        break
      case '23503':
        message = 'Cannot delete this record because it is referenced by other records'
        break
      case '23502':
        message = 'Required field is missing'
        break
    }
  }

  return handleError(
    { ...error, message },
    {
      context: context || 'Database operation',
      showToast: true,
    }
  )
}

