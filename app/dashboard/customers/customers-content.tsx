'use client'

import * as React from 'react'
import { Users } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { useStoreConnection } from '@/lib/store-connection-context'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'

interface Customer {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  total_orders: number
  total_spent: number
  last_order_date: string | null
  created_at: string
}

export function CustomersContent() {
  const { storeId } = useStoreConnection()
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasInitialized, setHasInitialized] = React.useState(false)

  // Listen for navigation start event to show skeleton immediately
  React.useEffect(() => {
    const handleNavigationStart = (event: CustomEvent) => {
      const url = event.detail?.url
      // Only trigger if navigating to customers page
      if (url && url.startsWith('/dashboard/customers')) {
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

  // Fetch customers
  React.useEffect(() => {
    if (!hasInitialized || !storeId) {
      return
    }

    const fetchCustomers = async () => {
      setIsLoading(true)
      try {
        // TODO: Replace with actual customers query when orders/customers table is available
        // For now, return empty array
        setCustomers([])
        setTotalCount(0)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching customers:', error)
        }
        setCustomers([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCustomers()
  }, [storeId, hasInitialized])

  const columns: ColumnDef<Customer>[] = React.useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const name = row.getValue('name') as string | null
        return (
          <div className="font-medium">
            {name || 'N/A'}
          </div>
        )
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => {
        const email = row.getValue('email') as string | null
        return (
          <div className="text-muted-foreground">
            {email || 'N/A'}
          </div>
        )
      },
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => {
        const phone = row.getValue('phone') as string | null
        return (
          <div className="text-muted-foreground">
            {phone || 'N/A'}
          </div>
        )
      },
    },
    {
      accessorKey: 'total_orders',
      header: 'Orders',
      cell: ({ row }) => {
        const orders = row.getValue('total_orders') as number
        return (
          <div className="text-center">
            {orders}
          </div>
        )
      },
    },
    {
      accessorKey: 'total_spent',
      header: 'Total Spent',
      cell: ({ row }) => {
        const spent = row.getValue('total_spent') as number
        return (
          <div className="font-medium">
            {spent.toLocaleString()} SAR
          </div>
        )
      },
    },
    {
      accessorKey: 'last_order_date',
      header: 'Last Order',
      cell: ({ row }) => {
        const date = row.getValue('last_order_date') as string | null
        if (!date) return <div className="text-muted-foreground">N/A</div>
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
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} {totalCount === 1 ? 'customer' : 'customers'} total
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 rounded-lg flex-1">
          <Users className="h-12 w-12 text-gray-300 mb-4 animate-pulse" />
          <p className="text-muted-foreground font-medium">Loading customers...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 rounded-lg flex-1">
          <Users className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-muted-foreground font-medium">No customers found</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Customers will appear here once orders are placed
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden pb-8">
          <DataTable
            columns={columns}
            data={customers}
            searchKey="name"
            searchPlaceholder="Search customers..."
          />
        </div>
      )}
    </div>
  )
}

