'use client'

import * as React from 'react'
import { ShoppingBag } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { useStoreConnection } from '@/lib/store-connection-context'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

interface Order {
  id: string
  order_number: string | null
  customer_name: string | null
  customer_email: string | null
  total_amount: number
  status: string | null
  created_at: string
  updated_at: string | null
}

export function OrdersContent() {
  const { storeId } = useStoreConnection()
  const [orders, setOrders] = React.useState<Order[]>([])
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasInitialized, setHasInitialized] = React.useState(false)

  // Listen for navigation start event to show skeleton immediately
  React.useEffect(() => {
    const handleNavigationStart = (event: CustomEvent) => {
      const url = event.detail?.url
      // Only trigger if navigating to orders page
      if (url && url.startsWith('/dashboard/orders')) {
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

  // Fetch orders
  React.useEffect(() => {
    if (!hasInitialized || !storeId) {
      return
    }

    const fetchOrders = async () => {
      setIsLoading(true)
      try {
        // TODO: Replace with actual orders query when orders table is available
        // For now, return empty array
        setOrders([])
        setTotalCount(0)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching orders:', error)
        }
        setOrders([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [storeId, hasInitialized])

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="secondary">Unknown</Badge>
    
    const statusLower = status.toLowerCase()
    if (statusLower === 'pending' || statusLower === 'processing') {
      return <Badge variant="default" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
    }
    if (statusLower === 'completed' || statusLower === 'fulfilled') {
      return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>
    }
    if (statusLower === 'cancelled' || statusLower === 'canceled') {
      return <Badge variant="destructive">Cancelled</Badge>
    }
    return <Badge variant="secondary">{status}</Badge>
  }

  const columns: ColumnDef<Order>[] = React.useMemo(() => [
    {
      accessorKey: 'order_number',
      header: 'Order #',
      cell: ({ row }) => {
        const orderNumber = row.getValue('order_number') as string | null
        return (
          <div className="font-medium">
            {orderNumber || row.original.id.slice(0, 8)}
          </div>
        )
      },
    },
    {
      accessorKey: 'customer_name',
      header: 'Customer',
      cell: ({ row }) => {
        const name = row.getValue('customer_name') as string | null
        const email = row.original.customer_email
        return (
          <div>
            <div className="font-medium">
              {name || 'Guest'}
            </div>
            {email && (
              <div className="text-sm text-muted-foreground">
                {email}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'total_amount',
      header: 'Total',
      cell: ({ row }) => {
        const amount = row.getValue('total_amount') as number
        return (
          <div className="font-medium">
            {amount.toLocaleString()} SAR
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string | null
        return getStatusBadge(status)
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: ({ row }) => {
        const date = row.getValue('created_at') as string
        return (
          <div className="text-muted-foreground">
            {new Date(date).toLocaleDateString()}
          </div>
        )
      },
    },
  ], [])

  return (
    <div className="space-y-6 h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} {totalCount === 1 ? 'order' : 'orders'} total
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 rounded-lg flex-1">
          <ShoppingBag className="h-12 w-12 text-gray-300 mb-4 animate-pulse" />
          <p className="text-muted-foreground font-medium">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 rounded-lg flex-1">
          <ShoppingBag className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-muted-foreground font-medium">No orders found</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Orders will appear here once customers place them
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden pb-8">
          <DataTable
            columns={columns}
            data={orders}
            searchKey="order_number"
            searchPlaceholder="Search orders..."
          />
        </div>
      )}
    </div>
  )
}

