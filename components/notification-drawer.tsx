'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X, Newspaper, MessageSquare } from 'lucide-react'
import { Bell } from '@/components/animate-ui/icons/bell'
import { Button } from '@/components/ui/button'
import { AnimateIcon } from '@/components/animate-ui/icons/icon'
import { ICON_BUTTON_CLASSES, DEFAULT_ICON_SIZE } from '@/lib/ui-constants'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useLocale } from '@/i18n/context'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerPortal,
  DrawerOverlay,
} from '@/components/ui/drawer'
import { Drawer as DrawerPrimitive } from 'vaul'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface Notification {
  id: string
  title: string
  description: string
  time: string
  icon: React.ComponentType<{ className?: string }>
  iconColor?: string
  iconBg?: string
  isRead: boolean
}

interface NotificationDrawerProps {
  updates: Notification[]
  messages?: Notification[]
  onUpdateRead?: (id: string) => void
  onMarkAllAsRead?: () => void
}

export function NotificationDrawer({
  updates,
  messages = [],
  onUpdateRead,
  onMarkAllAsRead,
}: NotificationDrawerProps) {
  const { isRTL } = useLocale()
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null)
  const [localUpdates, setLocalUpdates] = useState(updates)
  const [localMessages, setLocalMessages] = useState(messages)
  
  // Sync local updates and messages when props change
  useEffect(() => {
    setLocalUpdates(updates)
  }, [updates])
  
  useEffect(() => {
    setLocalMessages(messages)
  }, [messages])
  
  // Helper function to get hover color from icon background
  const getHoverColor = (iconBg: string | undefined) => {
    if (!iconBg) return "hover:bg-accent"
    // Convert bg-blue-50 to hover:bg-blue-100, etc.
    const hoverClass = iconBg.replace('bg-', 'hover:bg-').replace('-50', '-100')
    return hoverClass
  }
  
  // Helper function to get selected color from icon background
  const getSelectedColor = (iconBg: string | undefined) => {
    if (!iconBg) return "bg-accent"
    // Convert bg-blue-50 to bg-blue-100 for selected state
    return iconBg.replace('-50', '-100')
  }

  // Helper function to get dot color from icon background
  const getDotColor = (iconBg: string | undefined) => {
    if (!iconBg) return "bg-primary"
    // Convert bg-blue-50 to bg-blue-500, bg-green-50 to bg-green-500, etc.
    return iconBg.replace('-50', '-500')
  }

  // Calculate unread counts
  const t = useTranslations()
  const newsCount = localUpdates.filter(update => !update.isRead).length
  const messagesCount = localMessages.filter(msg => !msg.isRead).length
  const totalUnreadCount = newsCount + messagesCount

  // Mark all updates and messages as read
  const handleMarkAllAsRead = () => {
    setLocalUpdates(prev => prev.map(update => ({ ...update, isRead: true })))
    setLocalMessages(prev => prev.map(message => ({ ...message, isRead: true })))
    onMarkAllAsRead?.()
    toast.success(t('toast.success.allNotificationsRead'))
  }

  // Mark single update or message as read
  const handleMarkAsRead = (id: string) => {
    setLocalUpdates(prev => prev.map(update => 
      update.id === id ? { ...update, isRead: true } : update
    ))
    setLocalMessages(prev => prev.map(message => 
      message.id === id ? { ...message, isRead: true } : message
    ))
    onUpdateRead?.(id)
  }

  // Handle notification click - expand drawer to show details
  const handleNotificationClick = (id: string) => {
    if (selectedNotification === id) {
      // If clicking the same notification, collapse
      setSelectedNotification(null)
    } else {
      // Expand drawer and show details instantly
      setSelectedNotification(id)
      handleMarkAsRead(id)
    }
  }
  
  // Handle closing details
  const handleCloseDetails = () => {
    setSelectedNotification(null)
  }

  // Get selected notification data
  const selectedNotificationData = localUpdates.find(update => update.id === selectedNotification) ||
    localMessages.find(msg => msg.id === selectedNotification)
  
  const isExpanded = selectedNotification !== null

  return (
    <>
      <Drawer 
        open={isNotificationDrawerOpen} 
        onOpenChange={setIsNotificationDrawerOpen}
        direction={isRTL ? "left" : "right"}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 [&_svg]:!h-5 [&_svg]:!w-5 text-gray-500 hover:text-gray-700 flex items-center justify-center relative [&_svg]:pointer-events-auto"
                aria-label={t('notifications.title')}
              >
                <Bell animateOnHover loop={false} size={20} />
                {totalUnreadCount > 0 && (
                  <span className={cn(
                    "absolute -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white z-10 min-w-[16px] px-0.5",
                    isRTL ? "-left-0.5" : "-right-0.5"
                  )}>
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </span>
                )}
              </Button>
            </DrawerTrigger>
          </TooltipTrigger>
          <TooltipContent 
            side="bottom" 
            sideOffset={16} 
            className="text-xs px-2 py-1.5"
          >
            {t('notifications.title')}
          </TooltipContent>
        </Tooltip>
        <DrawerPortal>
          <DrawerOverlay />
          <DrawerPrimitive.Content
            className={cn(
              "fixed z-50 flex h-auto flex-col bg-background h-full flex flex-col",
              isRTL 
                ? "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0"
                : "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0",
              "transition-[width] duration-500 ease-in-out",
              isExpanded ? "w-[1024px]" : "w-[480px]"
            )}
            direction={isRTL ? "left" : "right"}
            style={{
              width: isExpanded ? '1024px' : '480px',
            }}
          >
            <DrawerHeader className="flex flex-row items-center justify-between">
              <DrawerTitle>{t('notifications.title')}</DrawerTitle>
              <div className="flex items-center gap-2">
                {totalUnreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs h-8"
                  >
                    {t('notifications.markAllAsRead')}
                  </Button>
                )}
                {isExpanded && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCloseDetails}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </DrawerHeader>
            <div className="flex flex-1 overflow-hidden">
              {/* Notifications List */}
              <div className={cn(
                "flex flex-col border-r border-border w-[480px] flex-shrink-0"
              )}>
                <div 
                  className="px-4 pb-4 flex-1 overflow-y-auto"
                  style={isRTL ? { direction: 'rtl' } : undefined}
                >
              <Tabs defaultValue="updates" className="w-full h-full flex flex-col">
                <TabsList className={cn("w-full", isRTL && "flex-row-reverse")}>
                  <TabsTrigger value="updates" className="flex-1" badge={newsCount}>
                    {t('notifications.updates')}
                  </TabsTrigger>
                  <TabsTrigger value="messages" className="flex-1" badge={messagesCount}>
                    {t('notifications.messages')}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="updates" className="mt-4 flex-1 overflow-y-auto">
                  <div className="space-y-2 pb-4">
                    {localUpdates.length > 0 ? (
                      localUpdates.map((update) => {
                        const Icon = update.icon
                        const isRead = update.isRead
                        return (
                          <div
                            key={update.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleNotificationClick(update.id)
                            }}
                            className={cn(
                              "flex gap-4 py-4 px-4 mt-2 me-4 bg-white rounded-2xl transition-colors cursor-pointer",
                              isRTL && "flex-row-reverse",
                              isRead && "opacity-60",
                              selectedNotification === update.id && isExpanded && getSelectedColor(update.iconBg),
                              // Hover colors - only colorful for unread, grayscale for read
                              isRead && "hover:bg-gray-100",
                              !isRead && update.iconBg === 'bg-blue-50' && "hover:bg-blue-100",
                              !isRead && update.iconBg === 'bg-green-50' && "hover:bg-green-100",
                              !isRead && update.iconBg === 'bg-purple-50' && "hover:bg-purple-100",
                              !isRead && update.iconBg === 'bg-yellow-50' && "hover:bg-yellow-100",
                              !isRead && update.iconBg === 'bg-emerald-50' && "hover:bg-emerald-100",
                              !isRead && update.iconBg === 'bg-indigo-50' && "hover:bg-indigo-100",
                              !isRead && update.iconBg === 'bg-cyan-50' && "hover:bg-cyan-100",
                              !isRead && update.iconBg === 'bg-pink-50' && "hover:bg-pink-100",
                              !isRead && update.iconBg === 'bg-teal-50' && "hover:bg-teal-100",
                              !isRead && update.iconBg === 'bg-orange-50' && "hover:bg-orange-100",
                              !isRead && update.iconBg === 'bg-violet-50' && "hover:bg-violet-100",
                              !isRead && update.iconBg === 'bg-rose-50' && "hover:bg-rose-100",
                              !isRead && update.iconBg === 'bg-sky-50' && "hover:bg-sky-100",
                              !isRead && update.iconBg === 'bg-red-50' && "hover:bg-red-100",
                              !isRead && update.iconBg === 'bg-amber-50' && "hover:bg-amber-100",
                              !isRead && !update.iconBg && "hover:bg-accent"
                            )}
                          >
                            <div className={cn(
                              "flex-shrink-0 mt-0.5 p-2 rounded-lg w-10 h-10 flex items-center justify-center",
                              isRead ? "bg-gray-100" : (update.iconBg || "bg-muted")
                            )}>
                              <Icon className={cn(
                                "h-5 w-5",
                                isRead ? "text-gray-400 grayscale" : (update.iconColor || "text-foreground")
                              )} />
                            </div>
                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                              <div className={cn(
                                "flex items-start gap-2",
                                isRTL ? "flex-row-reverse justify-between" : "justify-between"
                              )}>
                                <h4 className={cn(
                                  "text-sm font-semibold leading-none",
                                  isRTL ? "flex-1 text-end" : "flex-1 text-start",
                                  isRead && "text-muted-foreground font-normal"
                                )}>
                                  {update.title}
                                </h4>
                                <div className={cn(
                                  "flex items-center gap-1.5",
                                  isRTL ? "flex-row-reverse flex-shrink-0" : "flex-shrink-0"
                                )}>
                                  {!isRead && (
                                    <span className={cn(
                                      "h-2 w-2 rounded-full flex-shrink-0 mt-0.5",
                                      getDotColor(update.iconBg)
                                    )} />
                                  )}
                                  <span className={cn(
                                    "text-[10px] whitespace-nowrap",
                                    isRTL ? "text-start" : "text-start",
                                    isRead ? "text-muted-foreground" : "text-foreground"
                                  )}>
                                    {update.time}
                                  </span>
                                </div>
                              </div>
                              <p className={cn(
                                "text-xs text-muted-foreground line-clamp-2",
                                isRTL ? "text-end" : "text-start"
                              )}>
                                {update.description}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="flex flex-col items-center gap-3 text-center">
                          <Newspaper className="h-12 w-12 text-gray-200" />
                          <p className="text-sm text-muted-foreground">
                            {t('notifications.noUpdates')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="messages" className="mt-4 flex-1 overflow-y-auto">
                  <div className="space-y-2 pb-4">
                    {messages.length > 0 ? (
                      messages.map((message) => {
                        const Icon = message.icon
                        const isRead = message.isRead
                        return (
                          <div
                            key={message.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleNotificationClick(message.id)
                            }}
                            className={cn(
                              "flex gap-4 py-4 px-4 mt-2 me-4 bg-white rounded-2xl transition-colors cursor-pointer",
                              isRTL && "flex-row-reverse",
                              isRead && "opacity-60",
                              selectedNotification === message.id && isExpanded && getSelectedColor(message.iconBg),
                              // Hover colors - only colorful for unread, grayscale for read
                              isRead && "hover:bg-gray-100",
                              !isRead && message.iconBg === 'bg-blue-50' && "hover:bg-blue-100",
                              !isRead && message.iconBg === 'bg-green-50' && "hover:bg-green-100",
                              !isRead && message.iconBg === 'bg-purple-50' && "hover:bg-purple-100",
                              !isRead && message.iconBg === 'bg-yellow-50' && "hover:bg-yellow-100",
                              !isRead && message.iconBg === 'bg-emerald-50' && "hover:bg-emerald-100",
                              !isRead && message.iconBg === 'bg-indigo-50' && "hover:bg-indigo-100",
                              !isRead && message.iconBg === 'bg-cyan-50' && "hover:bg-cyan-100",
                              !isRead && message.iconBg === 'bg-pink-50' && "hover:bg-pink-100",
                              !isRead && message.iconBg === 'bg-teal-50' && "hover:bg-teal-100",
                              !isRead && message.iconBg === 'bg-orange-50' && "hover:bg-orange-100",
                              !isRead && message.iconBg === 'bg-violet-50' && "hover:bg-violet-100",
                              !isRead && message.iconBg === 'bg-rose-50' && "hover:bg-rose-100",
                              !isRead && message.iconBg === 'bg-sky-50' && "hover:bg-sky-100",
                              !isRead && message.iconBg === 'bg-red-50' && "hover:bg-red-100",
                              !isRead && message.iconBg === 'bg-amber-50' && "hover:bg-amber-100",
                              !isRead && !message.iconBg && "hover:bg-accent"
                            )}
                          >
                            <div className={cn(
                              "flex-shrink-0 mt-0.5 p-2 rounded-lg w-10 h-10 flex items-center justify-center",
                              isRead ? "bg-gray-100" : (message.iconBg || "bg-muted")
                            )}>
                              <Icon className={cn(
                                "h-5 w-5",
                                isRead ? "text-gray-400 grayscale" : (message.iconColor || "text-foreground")
                              )} />
                            </div>
                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                              <div className={cn(
                                "flex items-start gap-2",
                                isRTL ? "flex-row-reverse justify-between" : "justify-between"
                              )}>
                                <h4 className={cn(
                                  "text-sm font-semibold leading-none",
                                  isRTL ? "flex-1 text-end" : "flex-1 text-start",
                                  isRead && "text-muted-foreground font-normal"
                                )}>
                                  {message.title}
                                </h4>
                                <div className={cn(
                                  "flex items-center gap-1.5",
                                  isRTL ? "flex-row-reverse flex-shrink-0" : "flex-shrink-0"
                                )}>
                                  {!isRead && (
                                    <span className={cn(
                                      "h-2 w-2 rounded-full flex-shrink-0 mt-0.5",
                                      getDotColor(message.iconBg)
                                    )} />
                                  )}
                                  <span className={cn(
                                    "text-[10px] whitespace-nowrap",
                                    isRTL ? "text-start" : "text-start",
                                    isRead ? "text-muted-foreground" : "text-foreground"
                                  )}>
                                    {message.time}
                                  </span>
                                </div>
                              </div>
                              <p className={cn(
                                "text-xs text-muted-foreground line-clamp-2",
                                isRTL ? "text-end" : "text-start"
                              )}>
                                {message.description}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="flex flex-col items-center gap-3 text-center">
                          <MessageSquare className="h-12 w-12 text-gray-200" />
                          <p className="text-sm text-muted-foreground">
                            {t('notifications.noMessages')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                  </Tabs>
                </div>
              </div>
              
              {/* Notification Details Panel */}
              {isExpanded && selectedNotificationData && (() => {
                const SelectedIcon = selectedNotificationData.icon
                return (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="flex flex-col gap-6">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "flex-shrink-0 p-3 rounded-lg",
                            selectedNotificationData.iconBg || "bg-muted"
                          )}>
                            <SelectedIcon className={cn(
                              "h-8 w-8",
                              selectedNotificationData.iconColor || "text-foreground"
                            )} />
                          </div>
                          <div className="flex-1">
                            <h2 className="text-2xl font-semibold mb-2">{selectedNotificationData.title}</h2>
                            <p className="text-sm text-muted-foreground">{selectedNotificationData.time}</p>
                          </div>
                        </div>
                        <div className="border-t pt-6">
                          <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                            {selectedNotificationData.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </DrawerPrimitive.Content>
        </DrawerPortal>
      </Drawer>
    </>
  )
}

