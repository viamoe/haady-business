'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Package, X, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { useLocale } from '@/i18n/context'

interface Product {
  id: string
  platformProductId: string
  name: string
  nameEn?: string
  nameAr?: string
  description?: string
  descriptionAr?: string
  price: number
  sku?: string
  imageUrl?: string
  isActive: boolean
  isAvailable: boolean
  inventory?: number
}

interface ProductsPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectionId: string | null
  platform: string | null
}

const translations = {
  en: {
    title: 'Products from Your Store',
    description: 'These products will be imported into your Haady store',
    loading: 'Loading products...',
    noProducts: 'No products found in your store',
    error: 'Failed to load products',
    close: 'Close',
    price: 'Price',
    sku: 'SKU',
    inventory: 'Inventory',
    active: 'Active',
    inactive: 'Inactive',
    available: 'Available',
    unavailable: 'Unavailable',
    products: 'products',
  },
  ar: {
    title: 'المنتجات من متجرك',
    description: 'سيتم استيراد هذه المنتجات إلى متجر هادي الخاص بك',
    loading: 'جاري تحميل المنتجات...',
    noProducts: 'لم يتم العثور على منتجات في متجرك',
    error: 'فشل تحميل المنتجات',
    close: 'إغلاق',
    price: 'السعر',
    sku: 'رمز المنتج',
    inventory: 'المخزون',
    active: 'نشط',
    inactive: 'غير نشط',
    available: 'متاح',
    unavailable: 'غير متاح',
    products: 'منتجات',
  },
}

export function ProductsPreviewModal({
  open,
  onOpenChange,
  connectionId,
  platform,
}: ProductsPreviewModalProps) {
  const { locale, isRTL } = useLocale()
  const t = translations[locale as keyof typeof translations] || translations.en
  
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && connectionId) {
      fetchProducts()
    } else {
      // Reset state when modal closes
      setProducts([])
      setError(null)
    }
  }, [open, connectionId])

  const fetchProducts = async () => {
    if (!connectionId) {
      setError('Connection ID is missing')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get the connection to verify it exists and get platform info
      const { data: connection, error: connError } = await supabase
        .from('store_connections')
        .select('id, platform, access_token, store_id')
        .eq('id', connectionId)
        .maybeSingle()

      if (connError) {
        console.error('Error fetching connection:', connError)
        throw new Error(`Failed to verify connection: ${connError.message}`)
      }

      if (!connection) {
        console.error('Connection not found for ID:', connectionId)
        throw new Error('Connection not found. Please try refreshing the page.')
      }

      if (!connection.access_token) {
        throw new Error('Access token not found. Please reconnect your store.')
      }

      console.log('Fetching products for connection:', {
        id: connection.id,
        platform: connection.platform,
        hasToken: !!connection.access_token,
        storeId: connection.store_id
      })

      // Call the preview API
      const response = await fetch(`/api/store-connections/${connectionId}/sync/preview`)
      
      // Check content type to ensure we got JSON, not HTML
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('API returned non-JSON response:', text.substring(0, 200))
        throw new Error('API returned invalid response. Please check if the endpoint exists.')
      }

      const data = await response.json()

      if (!response.ok) {
        console.error('API error response:', data)
        throw new Error(data.error || `Failed to fetch products: ${response.status} ${response.statusText}`)
      }

      if (data.success && data.products) {
        setProducts(data.products)
      } else {
        throw new Error(data.error || 'No products found')
      }
    } catch (err: any) {
      console.error('Error fetching products:', err)
      setError(err.message || t.error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(price)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              <span className="ml-3 text-gray-600">{t.loading}</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <X className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600">{t.noProducts}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                {products.length} {t.products} {locale === 'ar' ? 'موجودة' : 'found'}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors"
                  >
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1 truncate">
                          {locale === 'ar' && product.nameAr ? product.nameAr : product.name}
                        </h4>
                        
                        {product.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {locale === 'ar' && product.descriptionAr
                              ? product.descriptionAr
                              : product.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs">
                          <div>
                            <span className="text-gray-500">{t.price}:</span>
                            <span className="ml-1 font-semibold text-gray-900">
                              {formatPrice(product.price)}
                            </span>
                          </div>
                          {product.sku && (
                            <div>
                              <span className="text-gray-500">{t.sku}:</span>
                              <span className="ml-1 text-gray-700">{product.sku}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              product.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {product.isActive ? t.active : t.inactive}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              product.isAvailable
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {product.isAvailable ? t.available : t.unavailable}
                          </span>
                          {product.inventory !== undefined && (
                            <span className="text-xs text-gray-600">
                              {t.inventory}: {product.inventory}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            {t.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

