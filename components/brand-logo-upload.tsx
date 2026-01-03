'use client'

import { useRef, useState } from 'react'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface BrandLogoUploadProps {
  brandId: string
  currentLogoUrl?: string | null
  onUploadSuccess?: (logoUrl: string) => void
  onRemove?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function BrandLogoUpload({
  brandId,
  currentLogoUrl,
  onUploadSuccess,
  onRemove,
  className,
  size = 'md'
}: BrandLogoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null)
  const [error, setError] = useState<string | null>(null)

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      setError('File must be an image (JPEG, PNG, WebP, GIF, or SVG)')
      toast.error('Invalid file type. Please select an image file.')
      return
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      setError('File size must be less than 2MB')
      toast.error('File size must be less than 2MB')
      return
    }

    setError(null)
    
    // Create preview
    const preview = URL.createObjectURL(file)
    setPreviewUrl(preview)

    // Upload file
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/brands/${brandId}/upload-logo`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to upload logo')
      }

      const data = await response.json()
      setPreviewUrl(data.logo_url)
      onUploadSuccess?.(data.logo_url)
      toast.success('Logo uploaded successfully')
    } catch (err: any) {
      console.error('Error uploading logo:', err)
      setError(err.message || 'Failed to upload logo')
      setPreviewUrl(currentLogoUrl || null) // Revert to previous logo
      toast.error(err.message || 'Failed to upload logo')
    } finally {
      setIsUploading(false)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = async () => {
    if (!currentLogoUrl) return

    // TODO: Implement logo removal API endpoint
    // For now, just clear the preview
    setPreviewUrl(null)
    onRemove?.()
    toast.success('Logo removed')
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center gap-4">
        {/* Logo Preview/Upload Area */}
        <div className="relative">
          {previewUrl ? (
            <div className="relative group">
              <img
                src={previewUrl}
                alt="Brand logo"
                className={cn(
                  'rounded-lg object-cover border-2 border-gray-200',
                  sizeClasses[size]
                )}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  setError('Failed to load image')
                }}
              />
              {isUploading && (
                <div className={cn(
                  'absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center',
                  sizeClasses[size]
                )}>
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
              {!isUploading && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  aria-label="Remove logo"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ) : (
            <div
              className={cn(
                'border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#F4610B] hover:bg-[#F4610B]/5 transition-colors',
                sizeClasses[size]
              )}
              onClick={triggerFileInput}
            >
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-[#F4610B]" />
              ) : (
                <>
                  <ImageIcon className="h-6 w-6 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Upload</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Upload Button */}
        {!previewUrl && (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={triggerFileInput}
              disabled={isUploading}
              className="text-[#F4610B] border-[#F4610B] hover:bg-[#F4610B]/5"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500">
              Max 2MB • JPEG, PNG, WebP, GIF, SVG
            </p>
          </div>
        )}

        {/* Replace Button (when logo exists) */}
        {previewUrl && !isUploading && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerFileInput}
            className="text-[#F4610B] border-[#F4610B] hover:bg-[#F4610B]/5"
          >
            <Upload className="h-4 w-4 mr-2" />
            Replace
          </Button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Hidden File Input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />
    </div>
  )
}

