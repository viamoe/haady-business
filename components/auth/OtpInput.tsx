'use client'

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Input } from '@/components/ui/input'

export interface OtpInputProps {
  length?: number
  value: string[]
  onChange: (value: string[]) => void
  onComplete?: (value: string) => void
  error?: string
  disabled?: boolean
  autoFocus?: boolean
  className?: string
}

export interface OtpInputRef {
  focus: () => void
  clear: () => void
}

/**
 * OTP Input Component
 * A reusable component for entering OTP codes with auto-advance and paste support
 */
export const OtpInput = forwardRef<OtpInputRef, OtpInputProps>(
  (
    {
      length = 6,
      value,
      onChange,
      onComplete,
      error,
      disabled = false,
      autoFocus = false,
      className = '',
    },
    ref
  ) => {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

    // Initialize refs array
    useEffect(() => {
      inputRefs.current = inputRefs.current.slice(0, length)
    }, [length])

    // Auto-focus first input when component mounts
    useEffect(() => {
      if (autoFocus && inputRefs.current[0]) {
        setTimeout(() => {
          inputRefs.current[0]?.focus()
        }, 100)
      }
    }, [autoFocus])

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRefs.current[0]?.focus()
      },
      clear: () => {
        onChange(Array(length).fill(''))
        inputRefs.current[0]?.focus()
      },
    }))

    const handleChange = (index: number, inputValue: string) => {
      // Only allow digits
      const cleanedValue = inputValue.replace(/[^0-9]/g, '')

      // Handle paste (multiple digits)
      if (cleanedValue.length > 1) {
        const pasteData = cleanedValue.slice(0, length)
        const newOtp = [...value]
        
        pasteData.split('').forEach((char, i) => {
          if (index + i < length) {
            newOtp[index + i] = char
          }
        })
        
        onChange(newOtp)
        
        // Focus the last filled input
        const lastFilledIndex = Math.min(index + pasteData.length - 1, length - 1)
        inputRefs.current[lastFilledIndex]?.focus()
        
        // Check if all inputs are filled
        if (newOtp.every(digit => digit !== '')) {
          onComplete?.(newOtp.join(''))
        }
        return
      }

      // Single digit input
      const newOtp = [...value]
      newOtp[index] = cleanedValue
      onChange(newOtp)

      // Auto-advance to next input
      if (cleanedValue && index < length - 1) {
        inputRefs.current[index + 1]?.focus()
      }
      
      // Auto-advance back on backspace
      if (!cleanedValue && index > 0) {
        inputRefs.current[index - 1]?.focus()
      }

      // Check if all inputs are filled
      if (newOtp.every(digit => digit !== '')) {
        onComplete?.(newOtp.join(''))
      }
    }

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      // Handle backspace on empty input - move to previous
      if (e.key === 'Backspace' && value[index] === '' && index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    }

    const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const pastedData = e.clipboardData.getData('text')
      const cleanedValue = pastedData.replace(/[^0-9]/g, '')
      
      if (cleanedValue.length === 0) return
      
      // Start from the current input index
      const newOtp = [...value]
      const remainingSlots = length - index
      const pasteData = cleanedValue.slice(0, remainingSlots)
      
      pasteData.split('').forEach((char, i) => {
        if (index + i < length) {
          newOtp[index + i] = char
        }
      })
      
      onChange(newOtp)
      
      // Focus the last filled input or the next empty one
      const lastFilledIndex = Math.min(index + pasteData.length - 1, length - 1)
      const nextIndex = Math.min(lastFilledIndex + 1, length - 1)
      setTimeout(() => {
        inputRefs.current[nextIndex]?.focus()
      }, 0)
      
      // Check if all inputs are filled
      if (newOtp.every(digit => digit !== '')) {
        onComplete?.(newOtp.join(''))
      }
    }

    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex gap-2 justify-center">
          {Array.from({ length }).map((_, index) => (
            <Input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={value[index] || ''}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={(e) => handlePaste(index, e)}
              disabled={disabled}
              className={`w-12 h-12 text-center text-lg font-semibold ${
                error
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-gray-400 focus:ring-gray-400'
              }`}
              aria-label={`OTP digit ${index + 1} of ${length}`}
            />
          ))}
        </div>
        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}
      </div>
    )
  }
)

OtpInput.displayName = 'OtpInput'

