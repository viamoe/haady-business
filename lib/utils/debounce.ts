/**
 * Debounce utility function
 * Delays function execution until after a specified time has passed since the last invocation
 */

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Debounce configuration constants
 */
export const DEBOUNCE_DELAYS = {
  EMAIL_CHECK: 500, // 500ms for email validation checks
  SEARCH: 300, // 300ms for search inputs
  INPUT: 300, // 300ms for general input fields
} as const

