'use client'

import { AppSidebar } from '@/components/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const pageName = pathname.split('/').filter(Boolean).pop() || 'Dashboard'
  const capitalizedPageName = pageName.charAt(0).toUpperCase() + pageName.slice(1)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="shadow-none md:shadow-none [&]:!shadow-none">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-100 px-4 relative">
          <SidebarTrigger className="-ml-1" />
          <Breadcrumb className="absolute left-[100px]">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-md font-medium">{capitalizedPageName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pl-[100px]">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
