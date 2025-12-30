'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Package, ChevronDown, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProductFormContext } from '../context'

export function InventorySection() {
  const { formData, updateField } = useProductFormContext()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
            <Package className="h-5 w-5 text-[#F4610B]" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Inventory</h3>
            <p className="text-sm text-gray-500">Track stock and availability</p>
          </div>
        </div>
        <ChevronDown className={cn(
          "h-5 w-5 text-gray-400 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="space-y-6 pl-4 border-l-2 border-gray-100">
          {/* Track Inventory Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-gray-900">Track Inventory</Label>
              <p className="text-xs text-gray-500">Enable stock tracking for this product</p>
            </div>
            <button
              type="button"
              onClick={() => updateField('trackInventory', !formData.trackInventory)}
              className={cn(
                "h-6 w-11 rounded-full transition-all relative",
                formData.trackInventory ? "bg-[#F4610B]" : "bg-gray-300"
              )}
            >
              <div className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                formData.trackInventory ? "left-5" : "left-0.5"
              )} />
            </button>
          </div>

          {formData.trackInventory && (
            <>
              {/* Stock Quantity */}
              <div className="space-y-2">
                <Label htmlFor="stock_quantity">Stock Quantity</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  min="0"
                  value={formData.stockQuantity}
                  onChange={(e) => updateField('stockQuantity', e.target.value)}
                  placeholder="0"
                />
              </div>

              {/* Low Stock Threshold */}
              <div className="space-y-2">
                <Label htmlFor="low_stock_threshold" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Low Stock Alert Threshold
                </Label>
                <Input
                  id="low_stock_threshold"
                  type="number"
                  min="0"
                  value={formData.lowStockThreshold}
                  onChange={(e) => updateField('lowStockThreshold', e.target.value)}
                  placeholder="10"
                />
                <p className="text-xs text-gray-500">
                  You'll be notified when stock falls below this level
                </p>
              </div>

              {/* Allow Backorders */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-900">Allow Backorders</Label>
                  <p className="text-xs text-gray-500">Accept orders when out of stock</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateField('allowBackorders', !formData.allowBackorders)}
                  className={cn(
                    "h-6 w-11 rounded-full transition-all relative",
                    formData.allowBackorders ? "bg-[#F4610B]" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                    formData.allowBackorders ? "left-5" : "left-0.5"
                  )} />
                </button>
              </div>

              {/* Continue Selling Out of Stock */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-900">Continue Selling When Out of Stock</Label>
                  <p className="text-xs text-gray-500">Keep the product visible and purchasable</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateField('continueSellingOutOfStock', !formData.continueSellingOutOfStock)}
                  className={cn(
                    "h-6 w-11 rounded-full transition-all relative",
                    formData.continueSellingOutOfStock ? "bg-[#F4610B]" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                    formData.continueSellingOutOfStock ? "left-5" : "left-0.5"
                  )} />
                </button>
              </div>
            </>
          )}

          {/* Availability Toggle */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div>
              <Label className="text-sm font-medium text-gray-900">Available for Sale</Label>
              <p className="text-xs text-gray-500">Product is visible and can be purchased</p>
            </div>
            <button
              type="button"
              onClick={() => updateField('isAvailable', !formData.isAvailable)}
              className={cn(
                "h-6 w-11 rounded-full transition-all relative",
                formData.isAvailable ? "bg-green-500" : "bg-gray-300"
              )}
            >
              <div className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                formData.isAvailable ? "left-5" : "left-0.5"
              )} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

