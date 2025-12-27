/**
 * Standardized error handling utilities
 * Provides consistent error handling patterns across the application
 */

export interface AppError {
  message: string
  code?: string
  details?: string
  userMessage?: string
}

/**
 * Standard error types
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Extract user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown, fallback: string = 'An error occurred'): string {
  if (error instanceof Error) {
    return error.message || fallback
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message) || fallback
  }
  
  return fallback
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false
  
  const errorMessage = getErrorMessage(error, '').toLowerCase()
  return (
    errorMessage.includes('fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('networkerror') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('aborted')
  )
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (!error) return false
  
  const errorMessage = getErrorMessage(error, '').toLowerCase()
  return (
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('forbidden') ||
    errorMessage.includes('authentication') ||
    errorMessage.includes('token') ||
    errorMessage.includes('session') ||
    errorMessage.includes('user not found') ||
    errorMessage.includes('signups not allowed')
  )
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  if (!error) return false
  
  const errorMessage = getErrorMessage(error, '').toLowerCase()
  return (
    errorMessage.includes('invalid') ||
    errorMessage.includes('required') ||
    errorMessage.includes('validation') ||
    errorMessage.includes('format')
  )
}

/**
 * Get error type from error
 */
export function getErrorType(error: unknown): ErrorType {
  if (isNetworkError(error)) return ErrorType.NETWORK
  if (isAuthError(error)) return ErrorType.AUTH
  if (isValidationError(error)) return ErrorType.VALIDATION
  
  // Check for server errors (5xx)
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number(error.status)
    if (status >= 500) return ErrorType.SERVER
  }
  
  return ErrorType.UNKNOWN
}

/**
 * Create standardized error object
 */
export function createAppError(
  error: unknown,
  userMessage?: string
): AppError {
  const message = getErrorMessage(error)
  const type = getErrorType(error)
  
  return {
    message,
    code: type,
    details: error instanceof Error ? error.stack : undefined,
    userMessage: userMessage || message,
  }
}

/**
 * Handle error with logging and user notification
 * Returns the error message for display
 */
export function handleError(
  error: unknown,
  context?: string
): string {
  const appError = createAppError(error)
  
  // Log error with context
  if (context) {
    console.error(`[${context}] Error:`, appError)
  } else {
    console.error('Error:', appError)
  }
  
  // Return user-friendly message
  return appError.userMessage || appError.message
}

