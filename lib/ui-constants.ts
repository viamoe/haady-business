/**
 * UI Constants
 * Reusable styling patterns and constants for consistent UI implementation
 */

/**
 * Default icon button styling for feature icons and button icons
 * Matches the sidebar trigger button pattern:
 * - Button size: size-8 (32px)
 * - Icon size: h-16 (64px) height, w-6 (24px) width
 * - Colors: gray-500 default, gray-700 on hover
 * 
 * @example
 * ```tsx
 * import { ICON_BUTTON_CLASSES, DEFAULT_ICON_SIZE } from '@/lib/ui-constants'
 * import { Bell } from '@/components/animate-ui/icons/bell'
 * import { AnimateIcon } from '@/components/animate-ui/icons/icon'
 * 
 * <Button
 *   variant="ghost"
 *   size="icon"
 *   className={ICON_BUTTON_CLASSES}
 *   aria-label="Notifications"
 * >
 *   <AnimateIcon animateOnHover>
 *     <Bell size={DEFAULT_ICON_SIZE} />
 *   </AnimateIcon>
 * </Button>
 * ```
 */
export const ICON_BUTTON_CLASSES = "size-8 [&_svg]:!h-16 [&_svg]:!w-6 text-gray-500 hover:text-gray-700";

/**
 * Default icon size prop for animated icons
 * Used with AnimateIcon components
 */
export const DEFAULT_ICON_SIZE = 64;

/**
 * Icon button variant configuration
 * Use this for consistent icon button implementation
 * 
 * @example
 * ```tsx
 * import { ICON_BUTTON_CONFIG, DEFAULT_ICON_SIZE } from '@/lib/ui-constants'
 * 
 * <Button {...ICON_BUTTON_CONFIG} aria-label="Action">
 *   <AnimateIcon animateOnHover>
 *     <YourIcon size={DEFAULT_ICON_SIZE} />
 *   </AnimateIcon>
 * </Button>
 * ```
 */
export const ICON_BUTTON_CONFIG = {
  variant: "ghost" as const,
  size: "icon" as const,
  className: ICON_BUTTON_CLASSES,
  iconSize: DEFAULT_ICON_SIZE,
} as const;

