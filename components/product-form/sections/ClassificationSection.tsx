'use client'

import { Label } from '@/components/ui/label'
import { Package, Globe, Store, Truck, Download, MapPin, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProductFormContext } from '../context'
import { ProductType, SellingMethod, FulfillmentType, SalesChannel } from '../types'

export function ClassificationSection() {
  const { formData, updateField, errors, clearError } = useProductFormContext()

  const productTypes: { value: ProductType; label: string; icon: React.ReactNode; description: string }[] = [
    { value: 'physical', label: 'Physical', icon: <Package className="h-5 w-5" />, description: 'Tangible goods' },
    { value: 'digital', label: 'Digital', icon: <Download className="h-5 w-5" />, description: 'Downloadable' },
    { value: 'service', label: 'Service', icon: <Clock className="h-5 w-5" />, description: 'Bookable' },
    { value: 'bundle', label: 'Bundle', icon: <Package className="h-5 w-5" />, description: 'Multiple items' },
  ]

  const sellingMethods: { value: SellingMethod; label: string }[] = [
    { value: 'unit', label: 'Per Unit' },
    { value: 'weight', label: 'By Weight' },
    { value: 'length', label: 'By Length' },
    { value: 'time', label: 'By Time' },
    { value: 'subscription', label: 'Subscription' },
  ]

  const sellingUnits: Record<SellingMethod, string[]> = {
    unit: [],
    weight: ['kg', 'g', 'lb', 'oz'],
    length: ['m', 'cm', 'ft', 'in'],
    time: ['hour', 'day', 'week', 'month'],
    subscription: [],
  }

  const subscriptionIntervals = ['daily', 'weekly', 'monthly', 'yearly']

  const fulfillmentOptions: { value: FulfillmentType; label: string; icon: React.ReactNode; forTypes: ProductType[] }[] = [
    { value: 'pickup', label: 'Pickup', icon: <MapPin className="h-4 w-4" />, forTypes: ['physical', 'bundle'] },
    { value: 'delivery', label: 'Delivery', icon: <Truck className="h-4 w-4" />, forTypes: ['physical', 'bundle'] },
    { value: 'digital', label: 'Digital', icon: <Download className="h-4 w-4" />, forTypes: ['digital'] },
    { value: 'onsite', label: 'On-Site', icon: <MapPin className="h-4 w-4" />, forTypes: ['service'] },
  ]

  const salesChannelOptions: { value: SalesChannel; label: string; icon: React.ReactNode }[] = [
    { value: 'online', label: 'Online', icon: <Globe className="h-4 w-4" /> },
    { value: 'in_store', label: 'In-Store', icon: <Store className="h-4 w-4" /> },
  ]

  const availableFulfillmentOptions = fulfillmentOptions.filter(opt => opt.forTypes.includes(formData.productType))

  return (
    <div className="space-y-6 p-5 bg-white rounded-2xl border border-gray-200">
      {/* Product Type */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-gray-900">Product Type</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {productTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => {
                updateField('productType', type.value)
                // Reset fulfillment types based on product type
                if (type.value === 'digital') {
                  updateField('fulfillmentTypes', ['digital'])
                } else if (type.value === 'service') {
                  updateField('fulfillmentTypes', ['onsite'])
                } else {
                  updateField('fulfillmentTypes', ['pickup'])
                }
              }}
              className={cn(
                "p-4 rounded-xl border transition-all text-left",
                formData.productType === type.value
                  ? "bg-[#F4610B]/5 border-[#F4610B] ring-1 ring-[#F4610B]"
                  : "bg-gray-50 border-gray-200 hover:bg-gray-100"
              )}
            >
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center mb-2",
                formData.productType === type.value
                  ? "bg-[#F4610B] text-white"
                  : "bg-gray-200 text-gray-600"
              )}>
                {type.icon}
              </div>
              <div className="font-medium text-gray-900">{type.label}</div>
              <div className="text-xs text-gray-500">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Selling Method */}
      <div className="space-y-3">
        <Label className="text-sm text-gray-600">Selling Method</Label>
        <div className="flex flex-wrap gap-2">
          {sellingMethods.map((method) => (
            <button
              key={method.value}
              type="button"
              onClick={() => {
                updateField('sellingMethod', method.value)
                updateField('sellingUnit', '')
              }}
              className={cn(
                "py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                formData.sellingMethod === method.value
                  ? "bg-[#F4610B]/5 border-[#F4610B] text-[#F4610B]"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent"
              )}
            >
              {formData.sellingMethod === method.value && (
                <div className="h-4 w-4 rounded-full bg-[#F4610B] flex items-center justify-center flex-shrink-0">
                  <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {method.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selling Unit - For weight, length, time */}
      {sellingUnits[formData.sellingMethod]?.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm text-gray-600">Unit</Label>
          <div className="flex flex-wrap gap-2">
            {sellingUnits[formData.sellingMethod].map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => updateField('sellingUnit', unit)}
                className={cn(
                  "py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                  formData.sellingUnit === unit
                    ? "bg-[#F4610B]/5 border-[#F4610B] text-[#F4610B]"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent"
                )}
              >
                {formData.sellingUnit === unit && (
                  <div className="h-4 w-4 rounded-full bg-[#F4610B] flex items-center justify-center flex-shrink-0">
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {unit}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Subscription Interval */}
      {formData.sellingMethod === 'subscription' && (
        <div className="space-y-3">
          <Label className="text-sm text-gray-600">Billing Cycle</Label>
          <div className="flex flex-wrap gap-2">
            {subscriptionIntervals.map((interval) => (
              <button
                key={interval}
                type="button"
                onClick={() => updateField('subscriptionInterval', interval)}
                className={cn(
                  "py-2 px-4 rounded-lg text-sm font-medium transition-all capitalize flex items-center gap-2 border",
                  formData.subscriptionInterval === interval
                    ? "bg-[#F4610B]/5 border-[#F4610B] text-[#F4610B]"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent"
                )}
              >
                {formData.subscriptionInterval === interval && (
                  <div className="h-4 w-4 rounded-full bg-[#F4610B] flex items-center justify-center flex-shrink-0">
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {interval}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fulfillment Types */}
      <div className="space-y-3">
        <Label className="text-sm text-gray-600">Fulfillment</Label>
        <div className="flex flex-wrap gap-2">
          {availableFulfillmentOptions.map((type) => {
            const isChecked = formData.fulfillmentTypes.includes(type.value)
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => {
                  if (isChecked) {
                    updateField('fulfillmentTypes', formData.fulfillmentTypes.filter(t => t !== type.value))
                  } else {
                    updateField('fulfillmentTypes', [...formData.fulfillmentTypes, type.value])
                  }
                }}
                className={cn(
                  "py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                  isChecked
                    ? "bg-[#F4610B]/5 border-[#F4610B] text-[#F4610B]"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent"
                )}
              >
                {isChecked && (
                  <div className="h-4 w-4 rounded-full bg-[#F4610B] flex items-center justify-center flex-shrink-0">
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {type.icon}
                {type.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Requires Scheduling - For services */}
      {formData.productType === 'service' && (
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => updateField('requiresScheduling', !formData.requiresScheduling)}
            className={cn(
              "h-5 w-9 rounded-full transition-all relative",
              formData.requiresScheduling ? "bg-[#F4610B]" : "bg-gray-300"
            )}
          >
            <div className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
              formData.requiresScheduling ? "left-4" : "left-0.5"
            )} />
          </button>
          <span className="text-sm text-gray-700">Requires appointment scheduling</span>
        </div>
      )}

      {/* Sales Channels */}
      <div className={cn(
        "space-y-3 pt-4 border-t border-gray-100",
        errors.salesChannels && "text-red-600"
      )}>
        <Label className={cn("text-sm", errors.salesChannels ? "text-red-600" : "text-gray-600")}>
          Sales Channels{' '}
          <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
            required
          </span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {salesChannelOptions.map((channel) => {
            const isChecked = formData.salesChannels.includes(channel.value)
            return (
              <button
                key={channel.value}
                type="button"
                onClick={() => {
                  if (isChecked && formData.salesChannels.length > 1) {
                    updateField('salesChannels', formData.salesChannels.filter(c => c !== channel.value))
                  } else if (!isChecked) {
                    updateField('salesChannels', [...formData.salesChannels, channel.value])
                    if (errors.salesChannels) clearError('salesChannels')
                  }
                }}
                className={cn(
                  "py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                  isChecked
                    ? "bg-[#F4610B]/5 border-[#F4610B] text-[#F4610B]"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent"
                )}
              >
                {isChecked && (
                  <div className="h-4 w-4 rounded-full bg-[#F4610B] flex items-center justify-center flex-shrink-0">
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {channel.icon}
                {channel.label}
              </button>
            )
          })}
        </div>
        {errors.salesChannels && (
          <p className="text-xs text-red-600">{errors.salesChannels}</p>
        )}
      </div>
    </div>
  )
}

