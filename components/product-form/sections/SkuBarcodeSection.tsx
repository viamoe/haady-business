'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Tag, Barcode, Copy, Check, Wand2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProductFormContext } from '../context'
import { generateSKU, generateBarcode } from '@/lib/utils/sku-barcode-generator'
import { BarcodeDisplay } from '@/components/barcode-display'
import { BarcodeType } from '../types'

export function SkuBarcodeSection() {
  const { formData, updateField, storeId } = useProductFormContext()
  const [isOpen, setIsOpen] = useState(false)
  const [skuCopied, setSkuCopied] = useState(false)
  const [barcodeCopied, setBarcodeCopied] = useState(false)

  const barcodeTypes: { value: BarcodeType; label: string }[] = [
    { value: 'EAN13', label: 'EAN-13' },
    { value: 'UPC', label: 'UPC-A' },
    { value: 'CODE128', label: 'Code 128' },
    { value: 'QR', label: 'QR Code' },
  ]

  const handleGenerateSku = () => {
    const newSku = generateSKU(formData.nameEn || formData.nameAr, { prefix: 'PROD' })
    updateField('sku', newSku)
  }

  const handleGenerateBarcode = () => {
    // Map UI barcode types to generator types
    const typeMap: Record<string, string> = {
      'EAN13': 'EAN13',
      'UPC': 'UPC-A', 
      'CODE128': 'CODE128',
      'QR': 'CODE128', // QR not supported by generator, fallback to CODE128
    }
    const generatorType = typeMap[formData.barcodeType] || 'EAN13'
    const result = generateBarcode({ type: generatorType as any })
    updateField('barcode', result.barcode)
  }

  const copyToClipboard = (text: string, type: 'sku' | 'barcode') => {
    navigator.clipboard.writeText(text)
    if (type === 'sku') {
      setSkuCopied(true)
      setTimeout(() => setSkuCopied(false), 2000)
    } else {
      setBarcodeCopied(true)
      setTimeout(() => setBarcodeCopied(false), 2000)
    }
  }

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
            <Tag className="h-5 w-5 text-[#F4610B]" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">SKU & Barcode</h3>
            <p className="text-sm text-gray-500">Product identification codes</p>
          </div>
        </div>
        <ChevronDown className={cn(
          "h-5 w-5 text-gray-400 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="space-y-6 pl-4 border-l-2 border-gray-100">
          {/* SKU */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sku" className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-gray-500" />
                SKU (Stock Keeping Unit)
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateSku}
                      className="text-[#F4610B] hover:text-[#E5550A] hover:bg-[#F4610B]/5"
                    >
                      <Wand2 className="h-4 w-4 mr-1" />
                      Generate
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Auto-generate a unique SKU</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="relative">
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => updateField('sku', e.target.value.toUpperCase())}
                placeholder="e.g., PROD-001-BLK"
                className="pr-10 uppercase"
              />
              {formData.sku && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(formData.sku, 'sku')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {skuCopied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Barcode Type */}
          <div className="space-y-3">
            <Label className="text-sm text-gray-600">Barcode Type</Label>
            <div className="flex flex-wrap gap-2">
              {barcodeTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    updateField('barcodeType', type.value)
                    // Clear barcode when type changes
                    if (formData.barcode) {
                      updateField('barcode', '')
                    }
                  }}
                  className={cn(
                    "py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                    formData.barcodeType === type.value
                      ? "bg-[#F4610B]/5 border-[#F4610B] text-[#F4610B]"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent"
                  )}
                >
                  {formData.barcodeType === type.value && (
                    <div className="h-4 w-4 rounded-full bg-[#F4610B] flex items-center justify-center flex-shrink-0">
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Barcode */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="barcode" className="flex items-center gap-2">
                <Barcode className="h-4 w-4 text-gray-500" />
                Barcode
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateBarcode}
                      className="text-[#F4610B] hover:text-[#E5550A] hover:bg-[#F4610B]/5"
                    >
                      <Wand2 className="h-4 w-4 mr-1" />
                      Generate
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Auto-generate a barcode</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="relative">
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => updateField('barcode', e.target.value)}
                placeholder={formData.barcodeType === 'EAN13' ? '1234567890123' : 'Enter barcode'}
              />
              {formData.barcode && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(formData.barcode, 'barcode')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {barcodeCopied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Barcode Preview */}
          {formData.barcode && (
            <div className="p-4 bg-white rounded-xl border border-gray-200">
              <Label className="text-xs text-gray-500 mb-2 block">Preview</Label>
              <div className="flex justify-center">
                <BarcodeDisplay
                  barcode={formData.barcode}
                  type={formData.barcodeType === 'UPC' ? 'UPC-A' : formData.barcodeType === 'QR' ? 'QR' : formData.barcodeType as any}
                  size="md"
                  showValue
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

