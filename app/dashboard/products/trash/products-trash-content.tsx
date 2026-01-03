'use client'

import * as React from 'react'
import { Trash2, RotateCcw, ArrowLeft, Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useStoreConnection } from '@/lib/store-connection-context'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from '@/lib/toast'
import { Skeleton } from '@/components/ui/skeleton'

interface Product {
  id: string
  name_en: string | null
  name_ar: string | null
  price: number | null
  sku: string | null
  image_url: string | null
  deleted_at: string
  store_id: string
  status?: 'draft' | 'active' | 'archived' | 'scheduled'
}

export function ProductsTrashContent() {
  const router = useRouter()
  const { selectedConnectionId, storeId } = useStoreConnection()
  const [products, setProducts] = React.useState<Product[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [restoringProduct, setRestoringProduct] = React.useState<Product | null>(null)
  const [isRestoring, setIsRestoring] = React.useState(false)
  const [deletingProduct, setDeletingProduct] = React.useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const getProductName = (product: Product) => {
    return product.name_en || product.name_ar || 'Unnamed Product'
  }

  const fetchDeletedProducts = React.useCallback(async () => {
    setIsLoading(true)
    try {
      // Get user's business profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setProducts([])
        setIsLoading(false)
        return
      }

      const { data: businessProfile } = await supabase
        .from('business_profile')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!businessProfile) {
        setProducts([])
        setIsLoading(false)
        return
      }

      // Get all stores for the user's business
      const { data: stores } = await supabase
        .from('stores')
        .select('id')
        .eq('business_id', businessProfile.id)

      const storeIds = selectedConnectionId 
        ? [selectedConnectionId]
        : stores?.map(s => s.id) || (storeId ? [storeId] : [])

      if (storeIds.length === 0) {
        setProducts([])
        setIsLoading(false)
        return
      }

      // Fetch only deleted products (deleted_at IS NOT NULL)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name_en, name_ar, price, sku, image_url, deleted_at, store_id, status')
        .in('store_id', storeIds)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(100)

      if (productsError) {
        console.error('Error fetching deleted products:', productsError)
        setProducts([])
      } else {
        setProducts(productsData || [])
      }
    } catch (error) {
      console.error('Error fetching deleted products:', error)
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedConnectionId, storeId])

  React.useEffect(() => {
    fetchDeletedProducts()
  }, [fetchDeletedProducts])

  const handleRestore = async (product: Product) => {
    setRestoringProduct(product)
    setIsRestoring(true)
    try {
      const response = await fetch(`/api/products/${product.id}/restore`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to restore product')
      }

      const productName = getProductName(product)
      toast.success('restored successfully', {
        productImage: product.image_url,
        productName: productName
      })
      
      // Remove from list
      setProducts(prev => prev.filter(p => p.id !== product.id))
      setRestoringProduct(null)
    } catch (error: any) {
      console.error('Error restoring product:', error)
      toast.error(error.message || 'Failed to restore product')
    } finally {
      setIsRestoring(false)
    }
  }

  const handlePermanentDelete = async () => {
    if (!deletingProduct) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/products/${deletingProduct.id}?permanent=true`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to permanently delete product')
      }

      const productName = getProductName(deletingProduct)
      toast.success('permanently deleted', {
        productImage: deletingProduct.image_url,
        productName: productName
      })
      
      // Remove from list
      setProducts(prev => prev.filter(p => p.id !== deletingProduct.id))
      setDeletingProduct(null)
    } catch (error: any) {
      console.error('Error permanently deleting product:', error)
      toast.error(error.message || 'Failed to permanently delete product')
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'product',
      size: 250,
      minSize: 200,
      header: 'Product',
      cell: ({ row }) => {
        const product = row.original
        return (
          <div className="px-4 flex items-center gap-3 w-full max-w-full overflow-hidden">
            <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={getProductName(product)}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    const parent = e.currentTarget.parentElement
                    if (parent) {
                      parent.innerHTML = '<div class="w-12 h-12 rounded-md bg-muted flex items-center justify-center"><svg class="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>'
                    }
                  }}
                />
              ) : (
                <Package className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="font-medium line-clamp-2 break-words cursor-default">
                      {getProductName(product)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getProductName(product)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {product.sku && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                  {product.sku}
                </p>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'deleted_at',
      size: 90,
      minSize: 75,
      header: 'Deleted',
      cell: ({ row }) => {
        const deletedAt = new Date(row.original.deleted_at)
        return (
          <div className="text-sm text-gray-600">
            <p>{deletedAt.toLocaleDateString()}</p>
            <p className="text-xs text-gray-400">{deletedAt.toLocaleTimeString()}</p>
          </div>
        )
      },
    },
    {
      id: 'actions',
      size: 100,
      minSize: 100,
      maxSize: 100,
      cell: ({ row }) => {
        const product = row.original
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRestore(product)}
              disabled={isRestoring && restoringProduct?.id === product.id}
              className="gap-2"
            >
              {isRestoring && restoringProduct?.id === product.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Restore
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingProduct(product)}
              disabled={isDeleting}
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )
      },
      enableHiding: false,
    },
  ]

  return (
    <div className="space-y-6 h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/products')}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trash</h1>
            <p className="text-sm text-gray-500 mt-1">
              Deleted products can be restored or permanently deleted
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 min-h-0">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Trash2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Trash is empty</h3>
            <p className="text-sm text-gray-500">
              Deleted products will appear here
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <DataTable
            columns={columns}
            data={products}
          />
        </div>
      )}

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Product?</AlertDialogTitle>
            <div className="space-y-4">
              {deletingProduct && (
                <div className="flex items-center gap-4 py-2 w-full">
                  {deletingProduct.image_url && (
                    <div className="h-16 w-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img 
                        src={deletingProduct.image_url} 
                        alt={getProductName(deletingProduct)} 
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 w-0 max-w-[200px]">
                    <p className="font-semibold text-gray-900 truncate" title={getProductName(deletingProduct)}>
                      {getProductName(deletingProduct)}
                    </p>
                    {deletingProduct.sku && (
                      <p className="text-xs text-gray-500 font-mono mt-1 truncate">
                        {deletingProduct.sku}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <AlertDialogDescription>
                This action cannot be undone. The product and all associated data (images, inventory, categories, ratings) will be permanently removed from the database. If you're not sure, you can restore this product instead.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} onClick={() => setDeletingProduct(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Permanently Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

