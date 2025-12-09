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
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { useLoading } from "@/lib/loading-context"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Navigation items for business dashboard
const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Stores",
    url: "/dashboard/stores",
    icon: Store,
  },
  {
    title: "Products",
    url: "/dashboard/products",
    icon: Package,
  },
  {
    title: "Orders",
    url: "/dashboard/orders",
    icon: ShoppingBag,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
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

interface Store {
  id: string
  name: string
  slug: string
}

function ProjectSelector() {
  const { user } = useAuth()
  const router = useRouter()
  const [stores, setStores] = React.useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isMounted, setIsMounted] = React.useState(false)
  const hasLoadedRef = React.useRef(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const fetchStores = React.useCallback(async () => {
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
      const { data: merchantUser } = await supabase
        .from('merchant_users')
        .select('merchant_id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (merchantUser?.merchant_id) {
        // Fetch stores
        const { data: storesData, error: storesError } = await supabase
          .from('stores')
          .select('id, name, slug')
          .eq('merchant_id', merchantUser.merchant_id)
          .order('name', { ascending: true })

        if (!storesError && storesData) {
          setStores(storesData)
          // Set first store as selected if available and no store is currently selected
          if (storesData.length > 0) {
            setSelectedStoreId(prev => prev || storesData[0].id)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching stores:', error)
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
    fetchStores()
  }, [fetchStores])

  const selectedStore = stores.find(s => s.id === selectedStoreId)

  if (!isMounted) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="text-foreground opacity-100 !opacity-100" disabled>
            <Skeleton className="size-8 rounded-lg" />
            <div className="grid flex-1 text-left text-sm leading-tight gap-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="ml-auto size-4 rounded" />
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
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent text-foreground opacity-100 !opacity-100" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Skeleton className="size-8 rounded-lg" />
                  <div className="grid flex-1 text-left text-sm leading-tight gap-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="ml-auto size-4 rounded" />
                </>
              ) : (
                <div className="flex items-center gap-2 w-full fade-in-content">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Store className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-foreground">{selectedStore?.name || 'Select Store'}</span>
                    <span className="truncate text-xs text-foreground">Store</span>
                  </div>
                  <ChevronDown className="ml-auto size-4 text-foreground" />
                </div>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            {/* Stores */}
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <DropdownMenuItem key={i} disabled className="gap-2">
                  <Skeleton className="size-6 rounded-md" />
                  <div className="flex flex-col gap-1 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="fade-in-content">
                {stores.length > 0 ? (
                  stores.map((store) => {
                    const isSelected = store.id === selectedStoreId
                    return (
                      <DropdownMenuItem
                        key={store.id}
                        className={`gap-2 ${isSelected ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'cursor-pointer'}`}
                        onClick={() => {
                          if (!isSelected) {
                            setSelectedStoreId(store.id)
                            router.push(`/dashboard/stores/${store.id}`)
                          }
                        }}
                      >
                        <div className="flex size-6 items-center justify-center rounded-md border">
                          <Store className="size-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className={isSelected ? 'font-semibold' : ''}>{store.name}</span>
                          <span className={`text-xs ${isSelected ? 'text-sidebar-accent-foreground/70' : 'text-muted-foreground'}`}>
                            {isSelected ? 'Current store' : 'Store'}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="ml-auto size-2 rounded-full bg-sidebar-primary" />
                        )}
                      </DropdownMenuItem>
                    )
                  })
                ) : (
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    No stores yet
                  </DropdownMenuItem>
                )}
                
                {/* Add Store Button */}
                <DropdownMenuItem
                  className="gap-2 cursor-pointer mt-2"
                  onClick={() => router.push('/dashboard/stores/new')}
                >
                  <div className="flex size-6 items-center justify-center rounded-md border border-dashed">
                    <Plus className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span>Add Store</span>
                    <span className="text-xs text-muted-foreground">Create a new store</span>
                  </div>
                </DropdownMenuItem>
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
  const { setLoading } = useLoading()
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
      <div className="text-xs text-muted-foreground px-2 py-1">
        © 2024 Haady
      </div>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors group">
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-4 rounded" />
            </>
          ) : (
            <div className="flex items-center gap-3 w-full fade-in-content">
              <Avatar className="h-8 w-8 !border-0 !shadow-none">
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
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">
                  {fullName || user.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56 mb-2">
        <DropdownMenuItem
          onClick={() => {
            router.push('/dashboard/settings')
            setIsOpen(false)
          }}
          className="cursor-pointer"
        >
          <User className="h-4 w-4 mr-2" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            router.push('/dashboard/settings')
            setIsOpen(false)
          }}
          className="cursor-pointer"
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            handleSignOut()
            setIsOpen(false)
          }}
          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = React.useState(true)
  const hasLoadedRef = React.useRef(false)

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
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <ProjectSelector />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                // Skeleton
                navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton disabled>
                      <Skeleton className="size-4 rounded" />
                      <Skeleton className="h-4 w-20" />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              ) : (
                // Content with fade-in animation
                <div className="fade-in-content">
                  {navItems.map((item) => {
                    const isActive = pathname === item.url || pathname.startsWith(item.url + '/')
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                        >
                          <Link href={item.url}>
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <UserFooter />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
