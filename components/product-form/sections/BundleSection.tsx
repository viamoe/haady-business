'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { 
  Gift, 
  Package, 
  Plus, 
  Minus, 
  GripVertical, 
  Trash2, 
  Search,
  ArrowRightLeft,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { useProductFormContext } from '../context'
import { BundleItem, Product } from '../types'

export function BundleSection() {
  const { 
    formData, 
    updateField, 
    errors, 
    clearError,
    storeId,
    availableProducts,
    setAvailableProducts,
    product,
  } = useProductFormContext()

  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showProductSearch, setShowProductSearch] = useState(false)

  // Only show for bundle products
  if (formData.productType !== 'bundle') {
    return null
  }

  // Load available products
  const loadProducts = useCallback(async () => {
    if (!storeId) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name_en, name_ar, sku, price, image_url')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .neq('product_type', 'bundle') // Can't add bundles to bundles
        .order('name_en')

      if (error) throw error
      
      // Filter out the current product if editing
      const filteredProducts = product 
        ? data?.filter(p => p.id !== product.id) || []
        : data || []
      
      setAvailableProducts(filteredProducts as Product[])
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setIsLoading(false)
    }
  }, [storeId, product, setAvailableProducts])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Filter products based on search
  const filteredProducts = availableProducts.filter(p => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      p.name_en?.toLowerCase().includes(query) ||
      p.name_ar?.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query)
    )
  })

  // Add product to bundle
  const addToBundleHandler = (productToAdd: Product) => {
    // Check if already in bundle
    if (formData.bundleItems.some(item => item.product_id === productToAdd.id)) {
      return
    }

    const newItem: BundleItem = {
      product_id: productToAdd.id,
      product: productToAdd,
      quantity: 1,
      is_required: true,
      sort_order: formData.bundleItems.length,
    }

    updateField('bundleItems', [...formData.bundleItems, newItem])
    if (errors.bundleItems) clearError('bundleItems')
    setShowProductSearch(false)
    setSearchQuery('')
  }

  // Remove product from bundle
  const removeFromBundle = (productId: string) => {
    updateField(
      'bundleItems', 
      formData.bundleItems.filter(item => item.product_id !== productId)
    )
  }

  // Update quantity
  const updateQuantity = (productId: string, delta: number) => {
    updateField(
      'bundleItems',
      formData.bundleItems.map(item => {
        if (item.product_id === productId) {
          const newQuantity = Math.max(1, item.quantity + delta)
          return { ...item, quantity: newQuantity }
        }
        return item
      })
    )
  }

  // Toggle required status
  const toggleRequired = (productId: string) => {
    updateField(
      'bundleItems',
      formData.bundleItems.map(item => {
        if (item.product_id === productId) {
          return { ...item, is_required: !item.is_required }
        }
        return item
      })
    )
  }

  return (
    <div className={cn(
      "space-y-4 p-5 bg-white rounded-2xl border",
      errors.bundleItems ? "border-red-300" : "border-gray-200"
    )}>
      <div className="flex items-center justify-between">
        <h4 className={cn(
          "text-sm font-semibold flex items-center gap-2",
          errors.bundleItems ? "text-red-600" : "text-gray-900"
        )}>
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center",
            errors.bundleItems ? "bg-red-100" : "bg-gray-100"
          )}>
            <Gift className={cn(
              "h-4 w-4",
              errors.bundleItems ? "text-red-600" : "text-gray-600"
            )} />
          </div>
          Bundle Contents
          {formData.bundleItems.length === 0 && (
            <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
              required
            </span>
          )}
        </h4>
        {formData.bundleItems.length > 0 && (
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {formData.bundleItems.length} {formData.bundleItems.length === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      {errors.bundleItems && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {errors.bundleItems}
        </p>
      )}

      {/* Bundle Items List */}
      {formData.bundleItems.length > 0 && (
        <div className="space-y-2">
          {formData.bundleItems.map((item, index) => (
            <div
              key={item.product_id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-400 cursor-grab">
                <GripVertical className="h-4 w-4" />
              </div>
              
              {/* Product Image */}
              <div className="h-12 w-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {item.product?.image_url ? (
                  <img src={item.product.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-5 w-5 text-gray-300" />
                )}
              </div>
              
              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.product?.name_en || 'Unknown Product'}
                </p>
                <p className="text-xs text-gray-500">
                  {item.product?.sku || 'No SKU'}
                </p>
              </div>

              {/* Required Toggle */}
              <button
                type="button"
                onClick={() => toggleRequired(item.product_id)}
                className={cn(
                  "text-xs px-2 py-1 rounded-md font-medium transition-colors",
                  item.is_required
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                )}
              >
                {item.is_required ? 'Required' : 'Optional'}
              </button>
              
              {/* Quantity Controls */}
              <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.product_id, -1)}
                  disabled={item.quantity <= 1}
                  className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 disabled:opacity-50"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.product_id, 1)}
                  className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeFromBundle(item.product_id)}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Section */}
      {showProductSearch ? (
        <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name or SKU..."
              className="pl-10"
              autoFocus
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {searchQuery ? 'No products found' : 'No products available'}
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredProducts.map((p) => {
                const isInBundle = formData.bundleItems.some(item => item.product_id === p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToBundleHandler(p)}
                    disabled={isInBundle}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors",
                      isInBundle
                        ? "bg-gray-100 opacity-50 cursor-not-allowed"
                        : "hover:bg-white"
                    )}
                  >
                    <div className="h-10 w-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-4 w-4 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name_en}</p>
                      <p className="text-xs text-gray-500">{p.sku || 'No SKU'}</p>
                    </div>
                    {isInBundle && (
                      <span className="text-xs text-gray-400">Added</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowProductSearch(false)
              setSearchQuery('')
            }}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowProductSearch(true)}
          className="w-full border-dashed"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Product to Bundle
        </Button>
      )}
    </div>
  )
}

