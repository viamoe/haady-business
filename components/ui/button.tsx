import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "gap-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative inline-flex items-center cursor-pointer font-medium select-none justify-center ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap transition-opacity duration-100",
  {
      variants: {
        variant: {
          default: "bg-primary text-white hover:opacity-75 border-0",
          destructive:
            "bg-destructive text-white hover:opacity-85 border-0 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
          outline:
            "border-0 bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:hover:bg-input/50",
          secondary:
            "bg-secondary text-secondary-foreground hover:opacity-85 border-0",
          ghost:
            "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 border-0",
          link: "text-primary underline-offset-4 hover:underline border-0",
        },
      size: {
        default: "h-10 px-4 py-1 rounded-lg text-sm w-full",
        sm: "h-8 rounded-lg gap-1.5 px-3 text-sm",
        lg: "h-12 rounded-lg px-6 text-base",
        icon: "size-10 rounded-lg",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-12 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
