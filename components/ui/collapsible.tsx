"use client"

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import * as React from "react"

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  )
}

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ className, children, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const internalRef = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    const node = internalRef.current
    if (!node) return

    const checkState = () => {
      const state = node.getAttribute('data-state')
      setIsOpen(state === 'open')
    }

    // Check initial state
    checkState()

    // Set up observer
    const observer = new MutationObserver(checkState)
    observer.observe(node, {
      attributes: true,
      attributeFilter: ['data-state'],
    })

    return () => observer.disconnect()
  }, [])

  return (
    <CollapsiblePrimitive.CollapsibleContent
      ref={(node) => {
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
        internalRef.current = node
      }}
      data-slot="collapsible-content"
      className={cn("overflow-hidden", className)}
      suppressHydrationWarning
      {...props}
    >
      <motion.div
        initial={false}
        animate={isOpen ? "open" : "closed"}
        variants={{
          open: {
            height: "auto",
            opacity: 1,
            transition: {
              height: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
              opacity: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
            },
          },
          closed: {
            height: 0,
            opacity: 0,
            transition: {
              height: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
              opacity: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
            },
          },
        }}
      >
        {children}
      </motion.div>
    </CollapsiblePrimitive.CollapsibleContent>
  )
})
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
