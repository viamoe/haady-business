"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import Image from "next/image"

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

interface WideCardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  children?: React.ReactNode
  showSkip?: boolean
  skipText?: string
  onSkip?: () => void
  className?: string
  dismissable?: boolean
  showLogo?: boolean
  /** If true, children will be in a scrollable container */
  scrollable?: boolean
}

export function WideCardModal({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  showSkip = true,
  skipText = "Skip",
  onSkip,
  className,
  dismissable = false,
  showLogo = true,
  scrollable = false,
}: WideCardModalProps) {
  const handleSkipClick = () => {
    if (onSkip) {
      // If onSkip is provided, call it without closing the modal
      // This is useful for "Back" button functionality
      onSkip()
    } else {
      // Otherwise close the modal
      onOpenChange(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-gray-500/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        
        {/* Card Content */}
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
            "w-[calc(100%-2rem)] max-w-2xl max-h-[calc(100vh-4rem)]",
            "bg-white rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] border-0",
            "p-6 sm:p-8",
            "flex flex-col",
            "overflow-hidden",
            "duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            className
          )}
          // Allow closing on backdrop click or escape key if dismissable
          onInteractOutside={(e) => {
            if (!dismissable) {
              e.preventDefault()
            }
          }}
          onEscapeKeyDown={(e) => {
            if (!dismissable) {
              e.preventDefault()
            }
          }}
        >
          {/* X Close Button (top right) - shown when dismissable */}
          {dismissable && (
            <DialogPrimitive.Close
              onClick={handleClose}
              className="absolute right-4 top-4 sm:right-6 sm:top-6 z-10 rounded-full p-1.5 bg-gray-100 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4 text-gray-600" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
          
          {/* Skip Button (top right) - shown when showSkip is true and not dismissable */}
          {showSkip && !dismissable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipClick}
              className="absolute right-4 top-4 sm:right-6 sm:top-6 text-gray-500 hover:text-gray-700 text-sm"
            >
              {skipText}
            </Button>
          )}

          {/* Header - Fixed */}
          <div className="flex-shrink-0">
            {/* Logo */}
            {showLogo && (
              <div className="flex justify-start mb-4">
                <Image
                  src={HAADY_LOGO_URL}
                  alt="Haady"
                  width={48}
                  height={48}
                  className="w-12 h-12"
                  unoptimized
                />
              </div>
            )}

            <div className="mb-4">
              <DialogPrimitive.Title className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight pr-8">
                {title}
              </DialogPrimitive.Title>
              {subtitle && (
                <DialogPrimitive.Description className="text-sm sm:text-base text-gray-500 mt-1">
                  {subtitle}
                </DialogPrimitive.Description>
              )}
            </div>
          </div>

          {/* Content - Scrollable if scrollable prop is true */}
          <div className={cn(
            scrollable ? "flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-custom" : "overflow-x-hidden"
          )}>
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

