import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Default Input component with platform-standard styling.
 * 
 * Default styles include:
 * - Height: h-11 (44px)
 * - Border: standard border with rounded-md corners
 * - Shadow: shadow-xs
 * - Focus: primary color border with ring
 * - Background: transparent
 * - Padding: px-3 py-1
 * 
 * All future input fields should use this component to maintain consistency.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
        // Base styles - platform standard
        "h-11 w-full min-w-0 rounded-md border border-border bg-transparent px-3 py-1",
        "text-base md:text-sm",
        "shadow-xs",
        "transition-[color,box-shadow]",
        "outline-none",
        
        // Text and placeholder
        "file:text-foreground placeholder:text-muted-foreground",
        "selection:bg-primary selection:text-primary-foreground",
        
        // Focus states - primary color
        "focus-visible:border-primary focus-visible:ring-primary/50 focus-visible:ring-[3px]",
        "focus:placeholder:text-gray-400 focus-visible:placeholder:text-gray-400",
        
        // Error states
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        
        // Dark mode
        "dark:bg-input/30",
        
        // File input styles
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        
        // Disabled states
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        
        // Allow overrides via className prop
        className
      )}
        {...props}
      />
    )
  }
)

Input.displayName = "Input"

export { Input }
