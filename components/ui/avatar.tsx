"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Avatar color palette - predefined colors for consistent avatar backgrounds
const avatarColors = [
  { bg: "bg-blue-500", text: "text-white" },
  { bg: "bg-purple-500", text: "text-white" },
  { bg: "bg-pink-500", text: "text-white" },
  { bg: "bg-red-500", text: "text-white" },
  { bg: "bg-orange-500", text: "text-white" },
  { bg: "bg-amber-500", text: "text-white" },
  { bg: "bg-yellow-500", text: "text-gray-900" },
  { bg: "bg-lime-500", text: "text-gray-900" },
  { bg: "bg-green-500", text: "text-white" },
  { bg: "bg-emerald-500", text: "text-white" },
  { bg: "bg-teal-500", text: "text-white" },
  { bg: "bg-cyan-500", text: "text-white" },
  { bg: "bg-sky-500", text: "text-white" },
  { bg: "bg-indigo-500", text: "text-white" },
  { bg: "bg-violet-500", text: "text-white" },
  { bg: "bg-fuchsia-500", text: "text-white" },
] as const

/**
 * Generates a consistent color index from a string (name or email)
 * This ensures the same string always gets the same color
 */
function getColorIndex(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % avatarColors.length
}

/**
 * Gets avatar colors based on a string identifier (name or email)
 */
export function getAvatarColors(identifier: string) {
  const index = getColorIndex(identifier)
  return avatarColors[index]
}

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden border border-white/10 shadow-sm",
  {
    variants: {
      size: {
        default: "size-8",
        sm: "size-6",
        lg: "size-12",
        xl: "size-16",
        "2xl": "size-24",
      },
      shape: {
        circle: "rounded-full",
        square: "rounded-xl",
      },
    },
    defaultVariants: {
      size: "default",
      shape: "circle",
    },
  }
)

interface AvatarProps
  extends React.ComponentProps<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

function Avatar({
  className,
  size,
  shape,
  ...props
}: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(avatarVariants({ size, shape }), className)}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  )
}

interface AvatarFallbackProps
  extends React.ComponentProps<typeof AvatarPrimitive.Fallback> {
  /**
   * Identifier used to generate consistent colors (name, email, or id)
   * If not provided, uses default primary colors
   */
  identifier?: string
}

function AvatarFallback({
  className,
  identifier,
  ...props
}: AvatarFallbackProps) {
  const colors = identifier ? getAvatarColors(identifier) : null

  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center font-medium",
        colors
          ? `${colors.bg} ${colors.text}`
          : "bg-primary text-primary-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback, avatarVariants }
