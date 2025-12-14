"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingBag,
  Settings,
  LogOut,
  User,
  ChevronUp,
  ChevronDown,
  Plus,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useAuth } from "@/lib/auth/auth-context"
import { useLoading } from "@/lib/loading-context"
import { useStoreConnection } from "@/lib/store-connection-context"
import { useLocale } from "@/i18n/context"
import { supabase } from "@/lib/supabase/client"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg';

// Navigation items for business dashboard - will be translated in component
const getNavItems = (t: any) => [
  {
    title: t("sidebar.menu.dashboard"),
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: t("sidebar.menu.stores"),
    url: "/dashboard/stores",
    icon: Store,
  },
  {
    title: t("sidebar.menu.products"),
    url: "/dashboard/products",
    icon: Package,
  },
  {
    title: t("sidebar.menu.orders"),
    url: "/dashboard/orders",
    icon: ShoppingBag,
  },
  {
    title: t("sidebar.menu.settings"),
    url: "/dashboard/settings/store",
    icon: Settings,
  },
]

// Get user initials
function getUserInitials(email: string | undefined) {
  if (!email) return 'U'
  const parts = email.split('@')[0].split('.')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return email.substring(0, 2).toUpperCase()
}

interface StoreConnection {
  id: string
  platform: string
  store_external_id: string | null
  store_name: string | null
  store_domain: string | null
  connection_status?: string
  sync_status?: string
}

// Platform logos mapping
const PLATFORM_LOGOS: Record<string, string> = {
  salla: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce/salla-icon.png',
  zid: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce/zid.svg',
  shopify: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce/shopify-icon.png',
}

// Get platform display name
function getPlatformName(platform: string): string {
  const names: Record<string, string> = {
    salla: 'Salla',
    zid: 'Zid',
    shopify: 'Shopify',
  }
  return names[platform] || platform.charAt(0).toUpperCase() + platform.slice(1)
}

// Helper function to detect if text contains Arabic characters
function containsArabic(text: string): boolean {
  const arabicPattern = /[\u0600-\u06FF]/
  return arabicPattern.test(text)
}

function ProjectSelector() {
  const { user } = useAuth()
  const router = useRouter()
  const t = useTranslations()
  const { isAnyStoreSyncing, setSelectedConnectionId: setSelectedConnectionIdFromContext, selectedConnectionId: contextSelectedConnectionId, isChangingStore } = useStoreConnection()
  const { isRTL } = useLocale()
  const [connections, setConnections] = React.useState<StoreConnection[]>([])
  const [selectedConnectionId, setSelectedConnectionId] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isMounted, setIsMounted] = React.useState(false)
  const hasLoadedRef = React.useRef(false)

  React.useEffect(() => {
    setIsMounted(true)
    
    // Load selected connection from localStorage
    const savedConnectionId = localStorage.getItem('selectedStoreConnectionId')
    if (savedConnectionId) {
      setSelectedConnectionId(savedConnectionId)
    }
  }, [])

  const fetchConnections = React.useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    // Only show loading state on initial load
    if (!hasLoadedRef.current) {
      setIsLoading(true)
    }
    
    const startTime = Date.now()
    const minLoadingTime = hasLoadedRef.current ? 0 : 800 // Only delay on initial load

    try {
      // Fetch store connections
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('store_connections')
        .select('id, platform, store_external_id, store_name, store_domain')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!connectionsError && connectionsData) {
        setConnections(connectionsData)
        
        // Only auto-select on the very first load (when hasLoadedRef.current is false)
        // After that, respect user's selection/deselection choices
        if (connectionsData.length > 0 && !hasLoadedRef.current) {
          const savedConnectionId = localStorage.getItem('selectedStoreConnectionId')
          if (savedConnectionId && connectionsData.find(c => c.id === savedConnectionId)) {
            // Restore saved selection from localStorage
            setSelectedConnectionId(savedConnectionId)
            window.dispatchEvent(new CustomEvent('storeConnectionChanged', { detail: savedConnectionId }))
          } else {
            // No saved selection or saved selection doesn't exist, auto-select latest (first) connection
            const connectionToSelect = connectionsData[0].id
            setSelectedConnectionId(connectionToSelect)
            localStorage.setItem('selectedStoreConnectionId', connectionToSelect)
            window.dispatchEvent(new CustomEvent('storeConnectionChanged', { detail: connectionToSelect }))
          }
        } else if (connectionsData.length > 0 && selectedConnectionId) {
          // On subsequent fetches, verify selected connection still exists
          const connectionExists = connectionsData.find(c => c.id === selectedConnectionId)
          if (!connectionExists) {
            // Selected connection no longer exists, clear selection
            setSelectedConnectionId(null)
            localStorage.removeItem('selectedStoreConnectionId')
          }
        }
        // If selectedConnectionId is null and hasLoadedRef.current is true, 
        // it means user explicitly deselected - don't auto-select
      }
    } catch (error) {
      console.error('Error fetching store connections:', error)
    } finally {
      // Ensure minimum loading time to prevent glitchy blinking
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime)
      
      setTimeout(() => {
        setIsLoading(false)
        hasLoadedRef.current = true
      }, remainingTime)
    }
  }, [user?.id])

  React.useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  const selectedConnection = connections.find(c => c.id === selectedConnectionId)

  if (!isMounted) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="text-foreground opacity-100 !opacity-100 rounded-2xl" disabled>
            <Skeleton className="size-8 rounded-lg shrink-0 bg-gray-200" />
            <div className="grid flex-1 text-start text-sm leading-tight gap-1 group-data-[collapsible=icon]:hidden">
              <Skeleton className="h-4 w-24 bg-gray-200" />
              <Skeleton className="h-3 w-16 bg-gray-200" />
            </div>
            <Skeleton className="ms-auto size-4 rounded group-data-[collapsible=icon]:hidden bg-gray-200" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent text-foreground opacity-100 !opacity-100 rounded-2xl"
              disabled={isLoading || isAnyStoreSyncing || isChangingStore}
            >
              {isLoading || isChangingStore ? (
                <>
                  <Skeleton className="size-8 rounded-lg shrink-0 bg-gray-200" />
                  <div className="grid flex-1 text-start text-sm leading-tight gap-1 group-data-[collapsible=icon]:hidden">
                    <Skeleton className="h-4 w-24 bg-gray-200" />
                    <Skeleton className="h-3 w-16 bg-gray-200" />
                  </div>
                  <Skeleton className="ms-auto size-4 rounded group-data-[collapsible=icon]:hidden bg-gray-200" />
                </>
              ) : (
                <>
                  <div className={`flex aspect-square size-8 items-center justify-center rounded-lg shrink-0 overflow-hidden relative border border-gray-200 ${
                    selectedConnection && PLATFORM_LOGOS[selectedConnection.platform?.toLowerCase()] 
                      ? '' 
                      : 'bg-white'
                  }`}>
                    {selectedConnection && PLATFORM_LOGOS[selectedConnection.platform?.toLowerCase()] ? (
                      <img 
                        src={PLATFORM_LOGOS[selectedConnection.platform?.toLowerCase()]} 
                        alt={selectedConnection.platform}
                        className="absolute inset-0 size-full object-cover rounded-lg"
                      />
                    ) : (
                      <Store className="size-4 relative z-10 text-gray-400" />
                    )}
                  </div>
                  <div className="grid flex-1 text-start text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span 
                      className="truncate font-semibold text-foreground"
                      style={selectedConnection?.store_name && containsArabic(selectedConnection.store_name)
                        ? { fontFamily: 'var(--font-ibm-plex-arabic), sans-serif' }
                        : undefined}
                    >
                      {selectedConnection 
                        ? (selectedConnection.store_name || `${getPlatformName(selectedConnection.platform)} ${t('sidebar.store.store')}`)
                        : t('sidebar.store.selectStore')}
                    </span>
                    <span className="truncate text-xs text-gray-500">
                      {selectedConnection 
                        ? getPlatformName(selectedConnection.platform)
                        : connections.length > 0 ? `${connections.length} ${t('sidebar.store.connected')}` : t('sidebar.store.noStores')}
                    </span>
                  </div>
                  <ChevronDown className="ms-auto size-4 text-foreground group-data-[collapsible=icon]:hidden" />
                </>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={cn(
              "w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl overflow-hidden p-1",
              isRTL ? "mr-2" : "ml-2"
            )}
            align={isRTL ? "end" : "start"}
            side="bottom"
            sideOffset={4}
          >
            {/* Stores */}
            {isLoading ? (
              <div className="space-y-1">
                {[1, 2, 3].map((i) => (
                  <DropdownMenuItem key={i} disabled className="gap-2 rounded-lg pointer-events-none">
                    <Skeleton className="size-6 rounded-md shrink-0 bg-gray-200" />
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <Skeleton className="h-4 w-32 bg-gray-200" />
                      <Skeleton className="h-3 w-16 bg-gray-200" />
                    </div>
                  </DropdownMenuItem>
                ))}
                {/* Add Store Button Skeleton */}
                <DropdownMenuItem disabled className="gap-2 mt-2 rounded-lg pointer-events-none">
                  <Skeleton className="size-6 rounded-md shrink-0 bg-gray-200" />
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <Skeleton className="h-4 w-24 bg-gray-200" />
                    <Skeleton className="h-3 w-32 bg-gray-200" />
                  </div>
                </DropdownMenuItem>
              </div>
            ) : (
              <div className="fade-in-content space-y-1">
                {connections.length > 0 ? (
                  connections.map((connection) => {
                    const isSelected = connection.id === selectedConnectionId
                    const platformLogo = PLATFORM_LOGOS[connection.platform?.toLowerCase()]
                    return (
                      <DropdownMenuItem
                        key={connection.id}
                        className={cn(
                          "group gap-2 rounded-lg transition-colors",
                          isSelected 
                            ? 'bg-[#F4610B] text-white cursor-default' 
                            : 'cursor-pointer hover:bg-[#F4610B]/10 hover:text-[#F4610B]',
                          isRTL && "flex-row-reverse"
                        )}
                        onClick={() => {
                          // Prevent selection change while syncing
                          if (isAnyStoreSyncing) {
                            return
                          }
                          
                          if (!isSelected) {
                            // Select if not selected - use context function to trigger loading screen
                            setSelectedConnectionIdFromContext(connection.id)
                            // Also update local state for immediate UI update
                            setSelectedConnectionId(connection.id)
                          }
                        }}
                        disabled={isAnyStoreSyncing}
                      >
                        <div className={`flex size-6 items-center justify-center rounded-md border overflow-hidden relative ${
                          platformLogo ? '' : 'bg-white'
                        }`}>
                          {platformLogo ? (
                            <img 
                              src={platformLogo} 
                              alt={connection.platform}
                              className="absolute inset-0 size-full object-cover"
                            />
                          ) : (
                            <Store className="size-4 relative z-10 text-gray-400" />
                          )}
                        </div>
                        <div className={cn(
                          "flex flex-col flex-1 min-w-0",
                          isRTL && "text-end"
                        )}>
                          <span 
                            className={`truncate transition-colors ${
                              isSelected 
                                ? 'font-semibold text-white' 
                                : 'group-hover:text-[#F4610B]'
                            }`}
                            style={connection.store_name && containsArabic(connection.store_name)
                              ? { fontFamily: 'var(--font-ibm-plex-arabic), sans-serif' }
                              : undefined}
                          >
                            {connection.store_name || `${getPlatformName(connection.platform)} ${t('sidebar.store.store')}`}
                          </span>
                          <span className={`text-xs truncate transition-colors ${
                            isSelected 
                              ? 'text-white/70' 
                              : 'text-muted-foreground group-hover:text-[#F4610B]/70'
                          }`}>
                            {getPlatformName(connection.platform)}
                          </span>
                        </div>
                        {isSelected && (
                          <div className={cn(
                            "size-2 rounded-full bg-white shrink-0",
                            isRTL ? "mr-auto" : "ml-auto"
                          )} />
                        )}
                      </DropdownMenuItem>
                    )
                  })
                ) : (
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground rounded-lg">
                    {t('sidebar.store.noConnectedStores')}
                  </DropdownMenuItem>
                )}
                
                {/* Add Store Button */}
                {!isLoading && (
                  <DropdownMenuItem
                    className={cn(
                      "gap-2 cursor-pointer mt-2 rounded-lg transition-colors hover:bg-[#F4610B]/10 hover:text-[#F4610B]",
                      isRTL && "flex-row-reverse"
                    )}
                    onClick={() => {
                      // Open the onboarding modal
                      window.dispatchEvent(new CustomEvent('openOnboardingModal'))
                    }}
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border border-dashed">
                      <Plus className="size-4" />
                    </div>
                    <div className={cn(
                      "flex flex-col",
                      isRTL && "text-end"
                    )}>
                      <span>{t('sidebar.store.addStore')}</span>
                      <span className="text-xs text-muted-foreground">{t('sidebar.store.createOrConnect')}</span>
                    </div>
                  </DropdownMenuItem>
                )}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function UserFooter() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const t = useTranslations()
  const { setLoading } = useLoading()
  const { isRTL } = useLocale()
  const [isOpen, setIsOpen] = React.useState(false)
  const [fullName, setFullName] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const hasLoadedRef = React.useRef(false)

  // Fetch full name from merchant_users table
  React.useEffect(() => {
    const fetchFullName = async () => {
      if (!user?.id) {
        setIsLoading(false)
        return
      }

      // Only show loading state on initial load
      if (!hasLoadedRef.current) {
        setIsLoading(true)
      }
      
      const startTime = Date.now()
      const minLoadingTime = hasLoadedRef.current ? 0 : 800

      try {
        const { data, error } = await supabase
          .from('merchant_users')
          .select('full_name')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        if (!error && data?.full_name) {
          setFullName(data.full_name)
        }
      } catch (error) {
        console.error('Error fetching full name:', error)
      } finally {
        const elapsedTime = Date.now() - startTime
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime)
        
        setTimeout(() => {
          setIsLoading(false)
          hasLoadedRef.current = true
        }, remainingTime)
      }
    }

    fetchFullName()
  }, [user?.id])

  const handleSignOut = async () => {
    setLoading(true, 'Signing out...')
    try {
      await signOut()
      setLoading(true, 'Redirecting...')
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="text-xs text-muted-foreground px-2 py-1 group-data-[collapsible=icon]:hidden">
        © 2024 Haady
      </div>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 w-full min-w-0 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors group overflow-hidden group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5 group-data-[collapsible=icon]:hidden">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-4 rounded group-data-[collapsible=icon]:hidden" />
            </>
          ) : (
            <>
              <Avatar className="h-8 w-8 !border-0 !shadow-none shrink-0">
                <AvatarImage 
                  src={user.user_metadata?.avatar_url || user.user_metadata?.picture} 
                  alt={fullName || user.email?.split('@')[0] || 'User'}
                />
                <AvatarFallback 
                  identifier={fullName || user.email || 'user'}
                  className="text-xs font-medium"
                >
                  {fullName 
                    ? fullName.split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    : getUserInitials(user.email)
                  }
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-start group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium truncate">
                  {fullName || user.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 group-data-[collapsible=icon]:hidden" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={isRTL ? "end" : "start"} 
        side="top" 
        className={cn(
          "w-[--radix-dropdown-menu-trigger-width] min-w-[13rem] mb-2 rounded-xl overflow-hidden p-1",
          isRTL ? "mr-2" : "ml-2"
        )}
      >
        <DropdownMenuItem
          onClick={() => {
            router.push('/dashboard/settings/account')
            setIsOpen(false)
          }}
          className={cn(
            "cursor-pointer rounded-lg",
            isRTL && "flex-row-reverse"
          )}
        >
          <User className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
          {t('sidebar.user.profile')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            router.push('/dashboard/settings/account')
            setIsOpen(false)
          }}
          className={cn(
            "cursor-pointer rounded-lg",
            isRTL && "flex-row-reverse"
          )}
        >
          <Settings className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
          {t('sidebar.user.accountSettings')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            handleSignOut()
            setIsOpen(false)
          }}
          className={cn(
            "cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg",
            isRTL && "flex-row-reverse"
          )}
        >
          <LogOut className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
          {t('sidebar.user.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const t = useTranslations()
  const { user } = useAuth()
  const { isChangingStore } = useStoreConnection()
  const [isLoading, setIsLoading] = React.useState(true)
  const hasLoadedRef = React.useRef(false)
  
  const navItems = React.useMemo(() => getNavItems(t), [t])

  React.useEffect(() => {
    // Only show skeleton on initial mount, not on subsequent renders
    if (hasLoadedRef.current) {
      setIsLoading(false)
      return
    }

    // Show skeleton for minimum time on initial load
    const timer = setTimeout(() => {
      setIsLoading(false)
      hasLoadedRef.current = true
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader className="px-2">
        <div className="flex items-center ml-4 group-data-[collapsible=icon]:ml-0">
          <Image
            src={HAADY_LOGO_URL}
            alt="Haady"
            width={42}
            height={42}
            className="h-12 w-auto"
            unoptimized
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {isLoading || isChangingStore ? (
            <Skeleton className="h-4 w-20 mb-2 bg-gray-200" />
          ) : (
            <SidebarGroupLabel>{t('sidebar.navigation')}</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading || isChangingStore ? (
                // Skeleton
                navItems.map((item) => (
                  <SidebarMenuItem key={`skeleton-${item.title}`}>
                    <SidebarMenuButton disabled>
                      <Skeleton className="size-[18px] rounded bg-gray-200" />
                      <Skeleton className="h-4 w-20 bg-gray-200" />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              ) : (
                // Content with fade-in animation
                <div className="fade-in-content">
                  {(() => {
                    // Find the most specific matching item
                    // Sort by URL length (longest first) to prioritize more specific routes
                    const sortedItems = [...navItems].sort((a, b) => b.url.length - a.url.length)
                    
                    // Find the first (most specific) item that matches
                    const activeItem = sortedItems.find(item => {
                      if (pathname === item.url) {
                        return true // Exact match
                      }
                      if (pathname.startsWith(item.url + '/')) {
                        return true // Pathname is a child of this item
                      }
                      return false
                    })
                    
                    return navItems.map((item) => {
                      const isActive = activeItem?.url === item.url
                      
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.title}
                          >
                            <Link href={item.url} aria-current={isActive ? 'page' : undefined}>
                              <item.icon className="w-[18px] h-[18px]" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })
                  })()}
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 pb-2">
        <UserFooter />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
