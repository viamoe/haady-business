'use client'

import { AppSidebar } from '@/components/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/lib/auth/auth-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  User, 
  LogOut, 
  ChevronDown, 
  Search,
  Settings,
  CreditCard,
} from 'lucide-react'
import { BellIcon } from '@/components/BellIcon'
import { useRouter, usePathname } from 'next/navigation'
import { useLoading } from '@/lib/loading-context'
import { Input } from '@/components/ui/input'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

// Get breadcrumb items from pathname
function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: { label: string; href: string; isLast: boolean }[] = []
  
  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const label = segment.charAt(0).toUpperCase() + segment.slice(1)
    breadcrumbs.push({
      label,
      href: currentPath,
      isLast: index === segments.length - 1,
    })
  })
  
  return breadcrumbs
}

// Get user initials
function getUserInitials(email: string | undefined) {
  if (!email) return 'U'
  const parts = email.split('@')[0].split('.')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return email.substring(0, 2).toUpperCase()
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { setLoading } = useLoading()
  const breadcrumbs = getBreadcrumbs(pathname)

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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-screen bg-gray-50/50">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-white/95 backdrop-blur-sm px-4">
            {/* Left section */}
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
              <Separator orientation="vertical" className="h-5" />
              
              {/* Breadcrumbs */}
              <Breadcrumb className="hidden md:flex">
                <BreadcrumbList>
                  {breadcrumbs.map((crumb) => (
                    <BreadcrumbItem key={crumb.href}>
                      {crumb.isLast ? (
                        <BreadcrumbPage className="font-medium text-sm">{crumb.label}</BreadcrumbPage>
                      ) : (
                        <>
                          <BreadcrumbLink href={crumb.href} className="text-muted-foreground hover:text-foreground text-sm">
                            {crumb.label}
                          </BreadcrumbLink>
                          <BreadcrumbSeparator />
                        </>
                      )}
                    </BreadcrumbItem>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            
            {/* Spacer */}
            <div className="flex-1" />
            
            {/* Right section */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative hidden lg:block">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="w-56 pl-8 h-8 text-sm bg-gray-50/80 border-gray-200 focus:bg-white transition-colors"
                />
              </div>
              
              {/* Notifications */}
              <Button 
                variant="ghost" 
                className="relative h-12 w-12 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 flex items-center justify-center"
              >
                <BellIcon className="h-8 w-8 text-muted-foreground" />
                <span className="absolute top-2.5 right-2.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-white" />
              </Button>
              
              <Separator orientation="vertical" className="h-5 hidden sm:block" />
              
              {/* User menu */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 h-9 px-2 hover:bg-gray-100">
                      <Avatar className="h-9 w-9">
                        <AvatarImage 
                          src={user.user_metadata?.avatar_url || user.user_metadata?.picture} 
                          alt={user.email?.split('@')[0] || 'User'}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                          {getUserInitials(user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium hidden sm:inline-block max-w-[100px] truncate">
                        {user.email?.split('@')[0]}
                      </span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.email?.split('@')[0]}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => router.push('/dashboard/settings')}
                      className="cursor-pointer"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push('/dashboard/settings')}
                      className="cursor-pointer"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push('/dashboard/billing')}
                      className="cursor-pointer"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Billing
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </header>
          
          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <div className="p-6 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
