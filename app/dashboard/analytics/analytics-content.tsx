'use client'

import * as React from 'react'
import { BarChart3 } from 'lucide-react'
import { useStoreConnection } from '@/lib/store-connection-context'
import { Skeleton } from '@/components/ui/skeleton'

export function AnalyticsContent() {
  const { storeId } = useStoreConnection()
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasInitialized, setHasInitialized] = React.useState(false)

  // Listen for navigation start event to show skeleton immediately
  React.useEffect(() => {
    const handleNavigationStart = (event: CustomEvent) => {
      const url = event.detail?.url
      // Only trigger if navigating to analytics page
      if (url && url.startsWith('/dashboard/analytics')) {
        setIsLoading(true)
      }
    }

    window.addEventListener('dashboard-navigation-start', handleNavigationStart as EventListener)
    return () => {
      window.removeEventListener('dashboard-navigation-start', handleNavigationStart as EventListener)
    }
  }, [])

  // Initialize on mount
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setHasInitialized(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  // Fetch analytics data
  React.useEffect(() => {
    if (!hasInitialized || !storeId) {
      return
    }

    const fetchAnalytics = async () => {
      setIsLoading(true)
      try {
        // TODO: Implement analytics data fetching
        // This will include metrics like:
        // - Sales trends over time
        // - Product performance
        // - Customer behavior
        // - Conversion rates
        // - Revenue by period
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching analytics:', error)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [storeId, hasInitialized])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Track your store performance and insights
        </p>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Analytics Coming Soon</h3>
        <p className="text-sm text-muted-foreground">
          We're building comprehensive analytics to help you understand your store performance.
        </p>
      </div>
    </div>
  )
}

