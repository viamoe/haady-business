'use client'

import { Label } from '@/components/ui/label'
import { Package, Globe, Store, Truck, Download, MapPin, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProductFormContext } from '../context'
import { ProductType, SellingMethod, FulfillmentType, SalesChannel } from '../types'

export function ClassificationSection() {
  const { formData, updateField, errors, clearError } = useProductFormContext()

  const productTypes: { value: ProductType; label: string; icon: React.ReactNode; description: string; requiresOnline?: boolean }[] = [
    { value: 'physical', label: 'Physical', icon: <Package className="h-5 w-5" />, description: 'Tangible goods' },
    { value: 'digital', label: 'Digital', icon: <Download className="h-5 w-5" />, description: 'Downloadable', requiresOnline: true },
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

  // Pickup is only available if in_store sales channel is enabled
  const isPickupAvailable = formData.salesChannels.includes('in_store')
  // Digital products require online sales channel
  const isOnlineAvailable = formData.salesChannels.includes('online')

  return (
    <div className="space-y-6 p-5 bg-white rounded-2xl border border-gray-200">
      {/* Sales Channels - First because other options depend on it */}
      <div className={cn(
        "space-y-3",
        errors.salesChannels && "text-red-600"
      )}>
        <Label className={cn("text-sm font-semibold", errors.salesChannels ? "text-red-600" : "text-gray-900")}>
          Sales Channels{' '}
          {formData.salesChannels.length === 0 && (
            <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
              required
            </span>
          )}
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {salesChannelOptions
            // Hide In-Store when Digital product type is selected
            .filter(channel => !(channel.value === 'in_store' && formData.productType === 'digital'))
            .map((channel) => {
            const isChecked = formData.salesChannels.includes(channel.value)
            return (
              <button
                key={channel.value}
                type="button"
                onClick={() => {
                  if (isChecked && formData.salesChannels.length > 1) {
                    const newChannels = formData.salesChannels.filter(c => c !== channel.value)
                    updateField('salesChannels', newChannels)
                    // If removing online and product is digital, switch to physical
                    if (channel.value === 'online' && formData.productType === 'digital') {
                      updateField('productType', 'physical')
                      updateField('sellingMethod', 'unit')
                      updateField('fulfillmentTypes', ['pickup'])
                    }
                    // If removing in_store, also remove pickup from fulfillment types
                    if (channel.value === 'in_store' && formData.fulfillmentTypes.includes('pickup')) {
                      const newFulfillment = formData.fulfillmentTypes.filter(f => f !== 'pickup')
                      // Ensure at least one fulfillment type remains for physical/bundle products
                      if (newFulfillment.length === 0 && (formData.productType === 'physical' || formData.productType === 'bundle')) {
                        updateField('fulfillmentTypes', ['delivery'])
                      } else {
                        updateField('fulfillmentTypes', newFulfillment)
                      }
                    }
                  } else if (!isChecked) {
                    updateField('salesChannels', [...formData.salesChannels, channel.value])
                    if (errors.salesChannels) clearError('salesChannels')
                  }
                }}
                className={cn(
                  "relative p-4 rounded-3xl transition-all duration-200 text-left group",
                  "shadow-[0_0_50px_rgba(15,23,42,0.08)]",
                  "bg-white border-0 hover:-translate-y-1"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 bg-white p-2",
                    isChecked ? "bg-[#F4610B]/10" : "bg-gray-100"
                  )}>
                    <div className={cn(
                      "h-full w-full flex items-center justify-center",
                      isChecked ? "text-[#F4610B]" : "text-gray-600"
                    )}>
                      {channel.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-medium text-sm",
                      isChecked ? "text-[#F4610B]" : "text-gray-900"
                    )}>
                      {channel.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {channel.value === 'online' ? 'Website & Apps' : 'POS & Physical'}
                    </div>
                  </div>
                  {isChecked && (
                    <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-[#F4610B] flex items-center justify-center flex-shrink-0">
                      <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
        {formData.productType === 'digital' && (
          <p className="text-xs text-gray-400">Digital products can only be sold online</p>
        )}
        {errors.salesChannels && (
          <p className="text-xs text-red-600">{errors.salesChannels}</p>
        )}
      </div>

      {/* Product Type */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-gray-900">Product Type</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {productTypes.map((type) => {
            const isDisabledDueToChannel = type.requiresOnline && !isOnlineAvailable
            return (
            <button
              key={type.value}
              type="button"
                disabled={isDisabledDueToChannel}
                title={isDisabledDueToChannel ? 'Digital products require Online sales channel' : undefined}
              onClick={() => {
                  if (isDisabledDueToChannel) return
                updateField('productType', type.value)
                // Reset fulfillment types based on product type
                if (type.value === 'digital') {
                  updateField('fulfillmentTypes', ['digital'])
                    // Digital products can only be sold online
                    if (formData.salesChannels.includes('in_store')) {
                      updateField('salesChannels', ['online'])
                    }
                } else if (type.value === 'service') {
                  updateField('fulfillmentTypes', ['onsite'])
                } else {
                    // Physical or Bundle - set fulfillment based on available channels
                    if (formData.salesChannels.includes('in_store')) {
                  updateField('fulfillmentTypes', ['pickup'])
                    } else {
                      updateField('fulfillmentTypes', ['delivery'])
                    }
                }
              }}
              className={cn(
                "p-4 rounded-xl border transition-all text-left",
                  isDisabledDueToChannel
                    ? "bg-gray-50 border-gray-100 cursor-not-allowed opacity-50"
                    : formData.productType === type.value
                  ? "bg-[#F4610B]/5 border-[#F4610B] ring-1 ring-[#F4610B]"
                  : "bg-gray-50 border-gray-200 hover:bg-gray-100"
              )}
            >
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center mb-2",
                  isDisabledDueToChannel
                    ? "bg-gray-100 text-gray-300"
                    : formData.productType === type.value
                  ? "bg-[#F4610B] text-white"
                  : "bg-gray-200 text-gray-600"
              )}>
                {type.icon}
              </div>
                <div className={cn(
                  "font-medium",
                  isDisabledDueToChannel ? "text-gray-300" : "text-gray-900"
                )}>{type.label}</div>
                <div className={cn(
                  "text-xs",
                  isDisabledDueToChannel ? "text-gray-300" : "text-gray-500"
                )}>{type.description}</div>
            </button>
            )
          })}
        </div>
        {!isOnlineAvailable && (
          <p className="text-xs text-gray-400">Digital products require Online sales channel</p>
        )}
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
            // Pickup requires in_store sales channel
            const isDisabled = type.value === 'pickup' && !isPickupAvailable
            return (
              <button
                key={type.value}
                type="button"
                disabled={isDisabled}
                title={isDisabled ? 'Pickup requires In-Store sales channel' : undefined}
                onClick={() => {
                  if (isDisabled) return
                  if (isChecked) {
                    updateField('fulfillmentTypes', formData.fulfillmentTypes.filter(t => t !== type.value))
                  } else {
                    updateField('fulfillmentTypes', [...formData.fulfillmentTypes, type.value])
                  }
                }}
                className={cn(
                  "py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                  isDisabled
                    ? "bg-gray-50 text-gray-300 border-transparent cursor-not-allowed"
                    : isChecked
                    ? "bg-[#F4610B]/5 border-[#F4610B] text-[#F4610B]"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent"
                )}
              >
                {isChecked && !isDisabled && (
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
        {!isPickupAvailable && formData.productType !== 'digital' && formData.productType !== 'service' && (
          <p className="text-xs text-gray-400">Pickup requires In-Store sales channel to be enabled</p>
        )}
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

    </div>
  )
}

