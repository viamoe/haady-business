'use client'

import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Copy, Check, Download, RefreshCw, QrCode, Barcode as BarcodeIcon } from 'lucide-react'

interface BarcodeDisplayProps {
  /** The barcode value to display */
  barcode: string
  /** The barcode type/format */
  type?: 'EAN13' | 'EAN8' | 'UPC-A' | 'CODE128' | 'QR'
  /** Display size */
  size?: 'sm' | 'md' | 'lg'
  /** Show the barcode value below */
  showValue?: boolean
  /** Show copy button */
  showCopyButton?: boolean
  /** Show download button */
  showDownloadButton?: boolean
  /** Show type badge */
  showTypeBadge?: boolean
  /** Custom class name */
  className?: string
  /** Product name for download filename */
  productName?: string
  /** Error callback */
  onError?: (error: Error) => void
}

const SIZE_CONFIG = {
  sm: { scale: 1, qrScale: 1, maxQrSize: 100, fontSize: 'text-xs' },
  md: { scale: 2, qrScale: 2, maxQrSize: 180, fontSize: 'text-sm' },
  lg: { scale: 2, qrScale: 2, maxQrSize: 220, fontSize: 'text-base' },
}

const TYPE_DISPLAY = {
  'EAN13': 'EAN-13',
  'EAN8': 'EAN-8',
  'UPC-A': 'UPC-A',
  'CODE128': 'Code 128',
  'QR': 'QR Code',
}

export function BarcodeDisplay({
  barcode,
  type = 'EAN13',
  size = 'md',
  showValue = true,
  showCopyButton = true,
  showDownloadButton = false,
  showTypeBadge = true,
  className,
  productName,
  onError,
}: BarcodeDisplayProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  const config = SIZE_CONFIG[size]
  const isQR = type === 'QR'

  const generateBarcode = useCallback(async () => {
    if (!barcode) {
      setError('No barcode value provided')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use the API endpoint to get PNG barcode
      const scale = isQR ? config.qrScale : config.scale
      const queryParams = new URLSearchParams({
        value: barcode,
        type: type,
        format: 'png',
        scale: scale.toString(),
        includeText: (!isQR).toString(),
      })
      
      // For linear barcodes, add height parameter
      if (!isQR) {
        queryParams.append('height', '12')
      }
      
      const response = await fetch(`/api/barcode?${queryParams.toString()}`)
      
      if (!response.ok) {
        // Try to parse error as JSON
        try {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to generate barcode')
        } catch {
          throw new Error('Failed to generate barcode')
        }
      }
      
      // Convert PNG to base64 data URL
      const blob = await response.blob()
      const reader = new FileReader()
      reader.onloadend = () => {
        setSvgContent(reader.result as string)
        setIsLoading(false)
      }
      reader.onerror = () => {
        setError('Failed to process barcode image')
        setIsLoading(false)
      }
      reader.readAsDataURL(blob)
    } catch (err: any) {
      console.error('Error generating barcode:', err)
      setError(err.message || 'Failed to generate barcode')
      setIsLoading(false)
      onError?.(err)
    }
  }, [barcode, type, config.scale, config.qrScale, isQR, onError])

  useEffect(() => {
    generateBarcode()
  }, [generateBarcode])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(barcode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = async () => {
    if (!svgContent) return

    try {
      // svgContent is now a data URL (base64 PNG)
      const link = document.createElement('a')
      link.download = `${productName || 'barcode'}-${barcode}.png`
      link.href = svgContent
      link.click()
    } catch (err) {
      console.error('Failed to download:', err)
    }
  }

  if (error) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200",
        className
      )}>
        <BarcodeIcon className="h-8 w-8 text-gray-300 mb-2" />
        <p className="text-xs text-gray-500 text-center">{error}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={generateBarcode}
          className="mt-2"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Type Badge */}
      {showTypeBadge && (
        <Badge 
          variant="secondary" 
          className="mb-2 text-xs font-mono bg-gray-100 text-gray-600 border-0"
        >
          {isQR ? <QrCode className="h-3 w-3 mr-1" /> : <BarcodeIcon className="h-3 w-3 mr-1" />}
          {TYPE_DISPLAY[type] || type}
        </Badge>
      )}

      {/* Barcode Image */}
      <div 
        className={cn(
          "bg-white rounded-lg border border-gray-100 flex items-center justify-center p-2",
          isLoading && "animate-pulse"
        )}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            {isQR ? (
              <div className="w-16 h-16 bg-gray-200 rounded animate-pulse" />
            ) : (
              <div className="w-24 h-8 bg-gray-200 rounded animate-pulse" />
            )}
          </div>
        ) : svgContent ? (
          <img 
            src={svgContent}
            alt={`Barcode: ${barcode}`}
            style={isQR ? { maxWidth: `${config.maxQrSize}px`, maxHeight: `${config.maxQrSize}px` } : undefined}
          />
        ) : null}
      </div>

      {/* Barcode Value */}
      {showValue && !isQR && (
        <div className={cn("mt-2 font-mono", config.fontSize, "text-gray-700 tracking-wider")}>
          {barcode}
        </div>
      )}

      {/* Action Buttons */}
      {(showCopyButton || showDownloadButton) && (
        <div className="flex items-center gap-2 mt-3">
          {showCopyButton && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 px-3"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1.5 text-xs">
                      {copied ? 'Copied!' : 'Copy'}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  Copy barcode value
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {showDownloadButton && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    disabled={!svgContent}
                    className="h-8 px-3"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="ml-1.5 text-xs">Download</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  Download as PNG
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Inline barcode display for table cells or compact views
 */
export function BarcodeInline({
  barcode,
  type = 'EAN13',
  className,
}: {
  barcode: string
  type?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(barcode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleCopy}
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-md",
              "bg-gray-50 hover:bg-gray-100 transition-colors",
              "text-xs font-mono text-gray-600",
              "border border-transparent hover:border-gray-200",
              className
            )}
          >
            <BarcodeIcon className="h-3 w-3 text-gray-400" />
            <span>{barcode}</span>
            {copied && <Check className="h-3 w-3 text-green-500" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          <div className="text-xs">
            <div className="font-medium">{TYPE_DISPLAY[type as keyof typeof TYPE_DISPLAY] || type}</div>
            <div className="text-gray-400">Click to copy</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

