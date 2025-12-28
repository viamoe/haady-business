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
  Users,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Plus,
  Heart,
  Gift,
  BarChart3,
  TrendingUp,
  Bell,
  Shield,
  Globe,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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
    title: t("sidebar.menu.customers"),
    url: "/dashboard/customers",
    icon: Users,
  },
  {
    title: t("sidebar.menu.analytics"),
    url: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    title: t("sidebar.menu.growth"),
    url: "/dashboard/growth",
    icon: TrendingUp,
  },
  {
    title: t("sidebar.menu.settings"),
    url: "/dashboard/settings",
    icon: Settings,
    hasSubMenu: true,
  },
]

// Settings sub-menu items
const getSettingsSubItems = (locale: string) => [
  {
    title: locale === 'ar' ? 'إعدادات المتجر' : 'Store Settings',
    url: "/dashboard/settings/store",
    icon: Store,
  },
  {
    title: locale === 'ar' ? 'إعدادات الحساب' : 'Account Settings',
    url: "/dashboard/settings/account",
    icon: User,
  },
  {
    title: locale === 'ar' ? 'الإشعارات' : 'Notifications',
    url: "/dashboard/settings/notifications",
    icon: Bell,
  },
  {
    title: locale === 'ar' ? 'الأمان' : 'Security',
    url: "/dashboard/settings/security",
    icon: Shield,
  },
  {
    title: locale === 'ar' ? 'اللغة' : 'Language & Region',
    url: "/dashboard/settings/language",
    icon: Globe,
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
  store_logo_url: string | null
  logo_zoom: number | null
  connection_status?: string
  sync_status?: string
}

// Platform logos mapping
const PLATFORM_LOGOS: Record<string, string> = {
  salla: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce/salla-icon.png',
  zid: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce/zid.svg',
  shopify: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce/shopify-icon.png',
  haady: 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg',
}

// Get platform display name
function getPlatformName(platform: string): string {
  const names: Record<string, string> = {
    salla: 'Salla',
    zid: 'Zid',
    shopify: 'Shopify',
    haady: 'Haady',
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
      // First get business profile
      const { data: businessProfile } = await supabase
        .from('business_profile')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!businessProfile) {
        setIsLoading(false)
        return
      }

      // Fetch stores with their connections (stores is now the source of truth)
      // Only fetch active stores (is_active = true) that have connections
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select(`
          id,
          name,
          logo_url,
          platform,
          is_active,
          store_connections!inner (
            id,
            store_external_id,
            store_domain
          )
        `)
        .eq('business_id', businessProfile.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (!storesError && storesData) {
        // Transform stores data to match the StoreConnection interface
        // store_connections is an array from the join, get the first one
        const connectionsData = storesData
          .map(store => {
            const connection = Array.isArray(store.store_connections) 
              ? store.store_connections[0] 
              : store.store_connections
            return {
              id: connection.id, // Use connection ID for selection
              platform: store.platform,
              store_external_id: connection.store_external_id,
              store_name: store.name, // From stores table
              store_domain: connection.store_domain,
              store_logo_url: store.logo_url, // From stores table
              logo_zoom: null, // Can be added to stores table if needed
            }
          })
        
        setConnections(connectionsData)
        
        // Check if currently selected connection is still active
        if (selectedConnectionId) {
          const connectionExists = connectionsData.find(c => c.id === selectedConnectionId)
          if (!connectionExists) {
            // Selected connection is no longer active, clear selection
            setSelectedConnectionId(null)
            localStorage.removeItem('selectedStoreConnectionId')
            window.dispatchEvent(new CustomEvent('storeConnectionChanged', { detail: null }))
          }
        }
        
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

  // Listen for store logo updates to refresh connections
  React.useEffect(() => {
    const handleStoreLogoUpdate = (event: CustomEvent) => {
      // Also update the logo URL and zoom in the connections array if we have the detail
      if (event.detail?.connectionId) {
        setConnections(prev => 
          prev.map(conn => 
            conn.id === event.detail.connectionId 
              ? { ...conn, store_logo_url: event.detail.logoUrl || null, logo_zoom: event.detail.logoZoom || 100 }
              : conn
          )
        )
      }
    }

    // Listen for store connection refresh events (e.g., when store is paused/resumed)
    const handleRefreshConnections = () => {
      // Force refresh by calling fetchConnections
      fetchConnections()
    }
    
    window.addEventListener('storeLogoUpdated', handleStoreLogoUpdate as EventListener)
    window.addEventListener('refreshStoreConnections', handleRefreshConnections)
    
    return () => {
      window.removeEventListener('storeLogoUpdated', handleStoreLogoUpdate as EventListener)
      window.removeEventListener('refreshStoreConnections', handleRefreshConnections)
    }
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
                    selectedConnection?.store_logo_url 
                      ? '' 
                      : 'bg-[#F4610B]/10'
                  }`}>
                    {selectedConnection?.store_logo_url ? (
                      <img 
                        src={selectedConnection.store_logo_url} 
                        alt="Store logo"
                        className="absolute inset-0 size-full object-cover rounded-lg"
                        style={{
                          transform: `scale(${(selectedConnection.logo_zoom || 100) / 100})`,
                          transition: 'transform 0.2s ease-out'
                        }}
                      />
                    ) : (
                      <Store className="size-4 relative z-10 text-[#F4610B]" />
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
                    const logoUrl = connection.store_logo_url
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
                          logoUrl ? '' : 'bg-[#F4610B]/10'
                        }`}>
                          {logoUrl ? (
                            <img 
                              key={logoUrl}
                              src={logoUrl} 
                              alt="Store logo"
                              className="absolute inset-0 size-full object-cover"
                              style={{
                                transform: `scale(${(connection.logo_zoom || 100) / 100})`,
                                transition: 'transform 0.2s ease-out'
                              }}
                            />
                          ) : (
                            <Store className="size-4 relative z-10 text-[#F4610B]" />
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
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      // Open the onboarding modal with the choice between Connect or Create
                      window.dispatchEvent(new CustomEvent('openOnboardingModal', { bubbles: true }))
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

  // Fetch full name from business_profile table
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
          .from('business_profile')
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
          "w-[--radix-dropdown-menu-trigger-width] min-w-[15rem] mb-2 rounded-2xl overflow-hidden p-2 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)] border-0",
          isRTL ? "mr-2" : "ml-2"
        )}
      >
        <div className="px-3 py-3 mb-4 flex items-center gap-3 bg-gray-50 rounded-xl">
          <Avatar className="h-10 w-10 !border-0 !shadow-none shrink-0">
            <AvatarImage 
              src={user.user_metadata?.avatar_url || user.user_metadata?.picture} 
              alt={fullName || user.email?.split('@')[0] || 'User'}
            />
            <AvatarFallback 
              identifier={fullName || user.email || 'user'}
              className="text-sm font-medium"
            >
              {fullName 
                ? fullName.split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : getUserInitials(user.email)
              }
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {fullName || user.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
        <DropdownMenuItem
          onClick={() => {
            router.push('/dashboard/settings/account')
            setIsOpen(false)
          }}
          className={cn(
            "cursor-pointer rounded-xl text-sm font-normal text-gray-900 hover:bg-gray-100 flex items-center gap-2 py-2",
            isRTL && "flex-row-reverse"
          )}
        >
          <User className="h-4 w-4 text-gray-400" />
          {t('sidebar.user.profile')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            router.push('/dashboard/settings/account')
            setIsOpen(false)
          }}
          className={cn(
            "cursor-pointer rounded-xl text-sm font-normal text-gray-900 hover:bg-gray-100 flex items-center gap-2 py-2",
            isRTL && "flex-row-reverse"
          )}
        >
          <Settings className="h-4 w-4 text-gray-400" />
          {t('sidebar.user.accountSettings')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            handleSignOut()
            setIsOpen(false)
          }}
          className={cn(
            "cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50 rounded-xl text-sm font-normal flex items-center gap-2 py-2",
            isRTL && "flex-row-reverse"
          )}
        >
          <LogOut className="h-4 w-4" />
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
  const { locale } = useLocale()
  const [isLoading, setIsLoading] = React.useState(true)
  const hasLoadedRef = React.useRef(false)
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)
  
  const navItems = React.useMemo(() => getNavItems(t), [t])
  const settingsSubItems = React.useMemo(() => getSettingsSubItems(locale), [locale])

  // Auto-expand settings if on a settings page
  React.useEffect(() => {
    if (pathname.startsWith('/dashboard/settings')) {
      setIsSettingsOpen(true)
    }
  }, [pathname])

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
      <SidebarHeader className="px-2 py-6 min-h-[80px]">
        <div className="flex items-center ml-4 group-data-[collapsible=icon]:ml-0">
          <div className="heart-spread-container">
            <Image
              src={HAADY_LOGO_URL}
              alt="Haady"
              width={42}
              height={42}
              className="h-12 w-auto hover:animate-heartbeat transition-transform cursor-pointer relative z-20"
              unoptimized
            />
            <Heart className="heart-particle fill-[#F4610B] text-[#F4610B]" size={12} />
            <Gift className="heart-particle text-[#F4610B]" size={12} />
            <Heart className="heart-particle fill-[#F4610B] text-[#F4610B]" size={12} />
            <Gift className="heart-particle text-[#F4610B]" size={12} />
            <Heart className="heart-particle fill-[#F4610B] text-[#F4610B]" size={12} />
            <Gift className="heart-particle text-[#F4610B]" size={12} />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {isLoading || isChangingStore ? (
            <Skeleton className="h-4 w-20 mb-2 bg-gray-200" />
          ) : (
            <SidebarGroupLabel>{t('sidebar.navigation')}</SidebarGroupLabel>
          )}
          <SidebarGroupContent className="px-1">
            <SidebarMenu>
              {isLoading || isChangingStore ? (
                // Skeleton
                navItems.map((item) => (
                  <SidebarMenuItem key={`skeleton-${item.title}`} className="mb-1">
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
                    const activeItem =
                      sortedItems.find(item => {
                        if (pathname === item.url) return true
                        if (pathname.startsWith(item.url + '/')) return true
                        return false
                      }) ?? navItems.find(item => item.url === '/dashboard')
                    
                    return navItems.map((item) => {
                      const isActive = activeItem?.url === item.url
                      const isSettingsItem = item.hasSubMenu
                      const isSettingsPage = pathname.startsWith('/dashboard/settings')
                      
                      if (isSettingsItem) {
                        return (
                          <SidebarMenuItem key={item.title} className="mb-1">
                            <div className="flex items-center">
                              <SidebarMenuButton
                                asChild
                                isActive={pathname === item.url}
                                tooltip={item.title}
                                className="flex-1"
                              >
                                <Link href={item.url}>
                                  <item.icon />
                                  <span>{item.title}</span>
                                </Link>
                              </SidebarMenuButton>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setIsSettingsOpen(!isSettingsOpen)
                                }}
                                className={cn(
                                  "ml-1 p-1 rounded-md hover:bg-sidebar-accent transition-colors",
                                  "group-data-[collapsible=icon]:hidden"
                                )}
                                aria-label={isSettingsOpen ? "Collapse settings" : "Expand settings"}
                              >
                                <ChevronRight 
                                  className={cn(
                                    "size-4 transition-transform text-muted-foreground",
                                    isSettingsOpen && "rotate-90"
                                  )}
                                />
                              </button>
                            </div>
                            {isSettingsOpen && (
                              <SidebarMenuSub>
                                {settingsSubItems.map((subItem) => {
                                  const isSubActive = pathname === subItem.url || 
                                    (subItem.url !== '/dashboard/settings' && pathname.startsWith(subItem.url))
                                  
                                  return (
                                    <SidebarMenuSubItem key={subItem.title}>
                                      <SidebarMenuSubButton
                                        asChild
                                        isActive={isSubActive}
                                      >
                                        <Link href={subItem.url}>
                                          <span>{subItem.title}</span>
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  )
                                })}
                              </SidebarMenuSub>
                            )}
                          </SidebarMenuItem>
                        )
                      }
                      
                      return (
                        <SidebarMenuItem key={item.title} className="mb-1">
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.title}
                          >
                            <Link href={item.url} aria-current={isActive ? 'page' : undefined}>
                              <item.icon />
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
