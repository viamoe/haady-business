import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Default Textarea component with platform-standard styling.
 * 
 * Default styles match the Input component for consistency.
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        // Base styles - platform standard
        "flex min-h-[80px] w-full rounded-md border border-border bg-transparent px-3 py-2",
        "text-base md:text-sm",
        "shadow-xs",
        "transition-all duration-200",
        "outline-none",
        
        // Text and placeholder
        "placeholder:text-muted-foreground",
        "selection:bg-primary selection:text-primary-foreground",
        
        // Hover and Focus states - Haady orange
        "hover:border-orange-500/50",
        "focus:border-orange-500 focus:ring-orange-500/30 focus:ring-[3px]",
        "focus-visible:border-orange-500 focus-visible:ring-orange-500/30 focus-visible:ring-[3px]",
        "focus:placeholder:text-gray-400 focus-visible:placeholder:text-gray-400",
        
        // Error states
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        
        // Dark mode
        "dark:bg-input/30",
        
        // Disabled states
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        
        // Resize
        "resize-none",
        
        // Allow overrides via className prop
        className
      )}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }

