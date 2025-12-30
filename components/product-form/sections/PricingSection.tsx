'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  DollarSign, 
  Percent, 
  BadgePercent, 
  Calendar, 
  ChevronDown,
  AlertCircle 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProductFormContext } from '../context'
import { DiscountType } from '../types'

export function PricingSection() {
  const { formData, updateField, errors, clearError, currencyIcon } = useProductFormContext()
  const [isOpen, setIsOpen] = useState(false)

  const discountOptions: { value: DiscountType; label: string; icon: React.ReactNode }[] = [
    { value: 'none', label: 'No Discount', icon: null },
    { value: 'percentage', label: 'Percentage', icon: <Percent className="h-4 w-4" /> },
    { value: 'fixed_amount', label: 'Fixed Amount', icon: <DollarSign className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
            <DollarSign className="h-5 w-5 text-[#F4610B]" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Pricing & Discounts</h3>
            <p className="text-sm text-gray-500">Set price and promotional offers</p>
          </div>
        </div>
        <ChevronDown className={cn(
          "h-5 w-5 text-gray-400 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="space-y-6 pl-4 border-l-2 border-gray-100">
          {/* Price */}
          <div className="space-y-2">
            <Label 
              htmlFor="price" 
              className={cn("flex items-center gap-2", errors.price ? 'text-red-600' : '')}
            >
              Price{' '}
              <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                required
              </span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                {currencyIcon || '$'}
              </span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => {
                  updateField('price', e.target.value)
                  if (errors.price) clearError('price')
                }}
                placeholder="0.00"
                className={cn(
                  "pl-8",
                  errors.price ? 'border-red-500 focus-visible:ring-red-500' : ''
                )}
              />
            </div>
            {errors.price && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.price}
              </p>
            )}
          </div>

          {/* Compare at Price */}
          <div className="space-y-2">
            <Label htmlFor="compare_at_price" className="flex items-center gap-2">
              Compare at Price
              <span className="text-xs text-gray-400">(Original price for showing discount)</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                {currencyIcon || '$'}
              </span>
              <Input
                id="compare_at_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.compareAtPrice}
                onChange={(e) => updateField('compareAtPrice', e.target.value)}
                placeholder="0.00"
                className="pl-8"
              />
            </div>
          </div>

          {/* Discount Type */}
          <div className="space-y-3">
            <Label className="text-sm text-gray-600">Discount Type</Label>
            <div className="flex flex-wrap gap-2">
              {discountOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateField('discountType', option.value)}
                  className={cn(
                    "py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                    formData.discountType === option.value
                      ? "bg-[#F4610B]/5 border-[#F4610B] text-[#F4610B]"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent"
                  )}
                >
                  {formData.discountType === option.value && (
                    <div className="h-4 w-4 rounded-full bg-[#F4610B] flex items-center justify-center flex-shrink-0">
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Discount Value */}
          {formData.discountType !== 'none' && (
            <div className="space-y-2">
              <Label htmlFor="discount_value">
                Discount {formData.discountType === 'percentage' ? 'Percentage' : 'Amount'}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {formData.discountType === 'percentage' ? '%' : currencyIcon || '$'}
                </span>
                <Input
                  id="discount_value"
                  type="number"
                  step={formData.discountType === 'percentage' ? '1' : '0.01'}
                  min="0"
                  max={formData.discountType === 'percentage' ? '100' : undefined}
                  value={formData.discountValue}
                  onChange={(e) => updateField('discountValue', e.target.value)}
                  placeholder="0"
                  className="pl-8"
                />
              </div>
            </div>
          )}

          {/* Schedule Discount */}
          {formData.discountType !== 'none' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateField('isScheduleEnabled', !formData.isScheduleEnabled)}
                  className={cn(
                    "h-5 w-9 rounded-full transition-all relative",
                    formData.isScheduleEnabled ? "bg-[#F4610B]" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                    formData.isScheduleEnabled ? "left-4" : "left-0.5"
                  )} />
                </button>
                <span className="text-sm text-gray-700">Schedule discount period</span>
              </div>

              {formData.isScheduleEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.discountStartDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {formData.discountStartDate || "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarPicker
                          mode="single"
                          selected={formData.discountStartDate ? new Date(formData.discountStartDate) : undefined}
                          onSelect={(date) => updateField('discountStartDate', date?.toISOString().split('T')[0] || '')}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* End Date */}
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.discountEndDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {formData.discountEndDate || "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarPicker
                          mode="single"
                          selected={formData.discountEndDate ? new Date(formData.discountEndDate) : undefined}
                          onSelect={(date) => updateField('discountEndDate', date?.toISOString().split('T')[0] || '')}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

