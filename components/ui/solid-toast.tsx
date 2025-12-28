'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

interface SolidToastContextType {
  showToast: (type: ToastType, title: string, options?: { description?: string; duration?: number }) => void
}

const SolidToastContext = createContext<SolidToastContextType | null>(null)

export function useSolidToast() {
  const context = useContext(SolidToastContext)
  if (!context) {
    throw new Error('useSolidToast must be used within a SolidToastProvider')
  }
  return context
}

const bgColors: Record<ToastType, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  warning: 'bg-amber-600',
  info: 'bg-blue-600',
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id)
    }, toast.duration || 4000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onDismiss])

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 w-full h-[113px] flex items-center justify-center',
        bgColors[toast.type]
      )}
      style={{ 
        width: '100vw', 
        zIndex: 999999,
        isolation: 'isolate',
        contain: 'layout style paint',
      }}
    >
      <span className="text-white font-semibold text-[15px]">{toast.title}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="absolute right-6 top-1/2 -translate-y-1/2 text-white p-1"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}

export function SolidToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const showToast = useCallback((
    type: ToastType,
    title: string,
    options?: { description?: string; duration?: number }
  ) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: Toast = {
      id,
      type,
      title,
      description: options?.description,
      duration: options?.duration || 4000,
    }
    setToasts(prev => [...prev, newToast])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <SolidToastContext.Provider value={{ showToast }}>
      {children}
      {mounted && createPortal(
        <>
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </>,
        document.body
      )}
    </SolidToastContext.Provider>
  )
}

// Standalone function for use outside of React components
let globalShowToast: SolidToastContextType['showToast'] | null = null

export function setGlobalToast(showToast: SolidToastContextType['showToast']) {
  globalShowToast = showToast
}

export const solidToast = {
  success: (title: string, options?: { description?: string; duration?: number }) => {
    globalShowToast?.('success', title, options)
  },
  error: (title: string, options?: { description?: string; duration?: number }) => {
    globalShowToast?.('error', title, options)
  },
  warning: (title: string, options?: { description?: string; duration?: number }) => {
    globalShowToast?.('warning', title, options)
  },
  info: (title: string, options?: { description?: string; duration?: number }) => {
    globalShowToast?.('info', title, options)
  },
}

