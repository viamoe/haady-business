"use client"

import * as React from "react"
import { WideCardModal } from "@/components/ui/wide-card-modal"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Sparkles } from "lucide-react"
import { AnimateIcon } from "@/components/animate-ui/icons/icon"
import Image from "next/image"

const ECOMMERCE_STORAGE_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce'

interface CelebrationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  platform: string
  storeName?: string
  onDismiss: () => void
}

export function CelebrationModal({
  open,
  onOpenChange,
  platform,
  storeName,
  onDismiss,
}: CelebrationModalProps) {
  const platformLogo = 
    platform === 'salla' 
      ? `${ECOMMERCE_STORAGE_URL}/salla-logo.png`
      : platform === 'zid'
      ? `${ECOMMERCE_STORAGE_URL}/zid-logo.png`
      : platform === 'shopify'
      ? `${ECOMMERCE_STORAGE_URL}/shopify-logo.png`
      : null

  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1)

  const handleDismiss = () => {
    onOpenChange(false)
    onDismiss()
  }

  return (
    <WideCardModal
      open={open}
      onOpenChange={onOpenChange}
      title="🎉 Store Connected Successfully!"
      subtitle={storeName 
        ? `Your ${platformName} store "${storeName}" is now linked to Haady`
        : `Your ${platformName} store is now linked to Haady`}
      dismissable={true}
      showLogo={false}
      className="max-w-md"
    >
      <div className="flex flex-col items-center text-center space-y-6 py-4">
        {/* Celebration Icon */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimateIcon animate={true} animateOnView={true} animation="default">
              <Sparkles className="h-16 w-16 text-[#F4610B] opacity-20" />
            </AnimateIcon>
          </div>
          <div className="relative">
            <AnimateIcon animate={true} animateOnView={true} animation="default">
              <CheckCircle2 className="h-20 w-20 text-green-500" />
            </AnimateIcon>
          </div>
        </div>

        {/* Platform Logo */}
        {platformLogo && (
          <div className="flex items-center justify-center">
            <Image
              src={platformLogo}
              alt={platformName}
              width={120}
              height={48}
              className="h-12 w-auto object-contain"
              unoptimized
            />
          </div>
        )}

        {/* Success Message */}
        <div className="space-y-2">
          <p className="text-lg font-semibold text-gray-900">
            You're all set!
          </p>
          <p className="text-sm text-gray-600">
            Your store is connected and ready to sync. You can now sync your products, inventory, and orders.
          </p>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleDismiss}
          className="w-full bg-[#F4610B] hover:bg-[#E55A0A] text-white h-12 rounded-xl"
        >
          Get Started
        </Button>
      </div>
    </WideCardModal>
  )
}

