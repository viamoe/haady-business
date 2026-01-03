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
import { QrCode, Copy, Check, Wand2, Download, RefreshCw, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProductFormContext } from '../context'
import { generateQRCodeURL } from '@/lib/utils/sku-barcode-generator'
import { BarcodeDisplay } from '@/components/barcode-display'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'

export function ProductQRSection() {
  const { formData, updateField, storeId, product } = useProductFormContext()
  const [isOpen, setIsOpen] = useState(false)
  const [qrCodeCopied, setQrCodeCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateQR = async () => {
    if (!product?.id) {
      // Product doesn't exist yet, QR will be generated on save
      return
    }

    setIsGenerating(true)
    try {
      const qrUrl = generateQRCodeURL(product.id, storeId || undefined)
      updateField('qrCode', qrUrl)
      
      // Update product in database
      await supabase
        .from('products')
        .update({
          qr_code: qrUrl,
          qr_code_auto_generated: true,
        })
        .eq('id', product.id)
    } catch (error) {
      console.error('Error generating QR code:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setQrCodeCopied(true)
    setTimeout(() => setQrCodeCopied(false), 2000)
  }

  const downloadQRCode = async () => {
    if (!formData.qrCode) return

    try {
      // Generate QR code image
      const response = await fetch('/api/barcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: formData.qrCode,
          type: 'QR',
          format: 'png',
          scale: 10,
          height: 200,
          includeText: false,
          returnDataUrl: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate QR code image')
      }

      const data = await response.json()
      const dataUrl = data.dataUrl

      // Create download link
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `product-qr-${product?.id || 'new'}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading QR code:', error)
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
            <QrCode className="h-5 w-5 text-[#F4610B]" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Product QR Code</h3>
            <p className="text-sm text-gray-500">
              {formData.qrCode 
                ? 'QR code for in-store gifting and mobile app'
                : 'Generate QR code for product scanning'}
            </p>
          </div>
        </div>
        <ChevronDown className={cn(
          "h-5 w-5 text-gray-400 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="space-y-6 pl-4 border-l-2 border-gray-100">
          {/* QR Code URL Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="qrCode" className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-gray-500" />
                QR Code URL
              </Label>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerateQR}
                        disabled={!product?.id || isGenerating}
                        className="text-[#F4610B] hover:text-[#E5550A] hover:bg-[#F4610B]/5"
                      >
                        {isGenerating ? (
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Wand2 className="h-4 w-4 mr-1" />
                        )}
                        {product?.id ? 'Regenerate' : 'Generate'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {product?.id 
                          ? 'Generate or regenerate QR code for this product'
                          : 'QR code will be generated automatically when product is saved'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="relative">
              <Input
                id="qrCode"
                value={formData.qrCode}
                onChange={(e) => updateField('qrCode', e.target.value)}
                placeholder={product?.id 
                  ? "Click Generate to create QR code"
                  : "QR code will be generated after product is saved"}
                className="pr-20"
                readOnly={!product?.id}
              />
              {formData.qrCode && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(formData.qrCode)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title="Copy QR code URL"
                  >
                    {qrCodeCopied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={downloadQRCode}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title="Download QR code image"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            {!product?.id && (
              <p className="text-xs text-gray-500">
                Save the product first to generate a QR code
              </p>
            )}
          </div>

          {/* QR Code Preview */}
          {formData.qrCode && (
            <div className="space-y-4">
              <div className="p-6 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-sm font-medium text-gray-900">QR Code Preview</Label>
                  <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                    <QrCode className="h-3 w-3 mr-1" />
                    QR Code
                  </Badge>
                </div>
                <div className="flex flex-col items-center gap-4 py-2">
                  {/* QR Code Display */}
                  <BarcodeDisplay
                    barcode={formData.qrCode}
                    type="QR"
                    size="md"
                    showValue={false}
                    showTypeBadge={false}
                    showCopyButton={false}
                  />
                  
                  {/* Usage Information */}
                  <div className="w-full space-y-3">
                    <p className="text-sm font-medium text-gray-900 text-center">Scan this QR code to:</p>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#F4610B]"></div>
                        <span>Open product in mobile app</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#F4610B]"></div>
                        <span>View product on website</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#F4610B]"></div>
                        <span>Send as gift in-store</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* QR Code Information */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-start gap-3">
                  <QrCode className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-blue-900">How it works</p>
                    <p className="text-xs text-blue-700">
                      Customers can scan this QR code with their phone camera to instantly open the product 
                      in the Haady app or website. Perfect for in-store gifting and seamless shopping experiences.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!formData.qrCode && product?.id && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Click "Generate" to create a QR code for this product
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

