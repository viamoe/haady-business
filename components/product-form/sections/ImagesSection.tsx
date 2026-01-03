'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Image as ImageIcon, X, Star, Upload, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProductImages } from '../hooks/useProductImages'
import { useProductFormContext } from '../context'

export function ImagesSection() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const { uploadProgress, isUploadingImage } = useProductFormContext()
  const {
    imagePreviews,
    existingImages,
    featuredNewImageIndex,
    hasImages,
    totalImageCount,
    handleImageChange,
    removeNewImage,
    removeExistingImage,
    setPrimaryImage,
    setFeaturedNewImage,
  } = useProductImages()

  const handleImageError = (imageId: string) => {
    setFailedImages(prev => new Set([...prev, imageId]))
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  // Calculate overall progress (current file progress + completed files)
  const overallProgress = uploadProgress.totalFiles > 0
    ? Math.round(
        ((uploadProgress.currentIndex - 1) * 100 + uploadProgress.currentFileProgress) / 
        uploadProgress.totalFiles
      )
    : 0

  if (!hasImages) {
    // Empty State
    return (
      <div className="rounded-2xl bg-gray-100/50 overflow-hidden">
        <div className="py-16 px-8 flex flex-col items-center justify-center">
          {/* Stacked Image Placeholders */}
          <div className="relative h-32 w-48 mb-8">
            {/* Left card */}
            <div className="absolute left-0 top-4 w-20 h-28 bg-white rounded-xl shadow-lg transform -rotate-12 overflow-hidden border border-gray-200">
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-gray-300" />
              </div>
            </div>
            {/* Center card */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-20 h-28 bg-white rounded-xl shadow-xl z-10 overflow-hidden border border-gray-200">
              <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-150 flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            {/* Right card */}
            <div className="absolute right-0 top-4 w-20 h-28 bg-white rounded-xl shadow-lg transform rotate-12 overflow-hidden border border-gray-200">
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-gray-300" />
              </div>
            </div>
          </div>
          
          {/* Text Content */}
          <h3 className="text-xl font-bold text-gray-900 text-center mb-3">
            Upload product images
          </h3>
          <p className="text-sm text-gray-500 text-center max-w-md mb-6">
            Add multiple images to showcase your product from different angles. High-quality images help increase sales.
          </p>
          
          {/* Upload Button */}
          <Button
            type="button"
            onClick={triggerFileInput}
            className="bg-[#F4610B] hover:bg-[#E5550A] text-white px-8 py-3 h-auto text-base font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <ImageIcon className="h-5 w-5 mr-2" />
            Upload images
          </Button>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="hidden"
          />
        </div>
      </div>
    )
  }

  // Images Grid - When images exist
  return (
    <div className="rounded-2xl bg-gray-100/50 overflow-hidden p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-gray-600" />
          Product Images
          <span className="text-xs font-medium text-white bg-[#F4610B] px-2.5 py-1 rounded-full">
            {totalImageCount}
          </span>
        </h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={triggerFileInput}
          disabled={isUploadingImage}
          className="text-[#F4610B] border-[#F4610B] hover:bg-[#F4610B]/5 disabled:opacity-50"
        >
          {isUploadingImage ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {isUploadingImage ? 'Uploading...' : 'Add more'}
        </Button>
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          className="hidden"
          disabled={isUploadingImage}
        />
      </div>
      
      {/* Upload Progress Bar */}
      {isUploadingImage && uploadProgress.isUploading && (
        <div className="mb-4 p-4 bg-white rounded-xl border border-[#F4610B]/20 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Loader2 className="h-5 w-5 text-[#F4610B] animate-spin" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                Uploading image {uploadProgress.currentIndex} of {uploadProgress.totalFiles}
              </span>
            </div>
            <span className="text-sm font-bold text-[#F4610B]">
              {overallProgress}%
            </span>
          </div>
          {/* Custom Progress Bar with Orange Color */}
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div 
              className="h-full bg-gradient-to-r from-[#F4610B] to-[#FF8A4C] transition-all duration-300 ease-out rounded-full"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500 truncate flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            {uploadProgress.currentFileName}
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* Existing Images - Primary is always first (sorted in state) */}
        {existingImages.map((img, index) => (
          <div key={img.id} className="relative group pt-2 pr-2">
            {/* Remove Button */}
            <button
              type="button"
              onClick={() => removeExistingImage(img.id)}
              className="absolute top-0 right-0 h-6 w-6 bg-[#F4610B] rounded-full shadow-md flex items-center justify-center hover:bg-[#E5550A] transition-colors z-10"
              title="Remove image"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
            <div className={cn(
              "relative aspect-square rounded-xl overflow-hidden bg-white transition-all duration-200",
              img.is_primary && "ring-2 ring-[#F4610B] ring-offset-2"
            )}>
              {failedImages.has(img.id) ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-500">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <span className="text-xs text-center px-2">Failed to load</span>
                </div>
              ) : (
                <Image
                  src={img.url}
                  alt={`Product image ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover"
                  onError={() => handleImageError(img.id)}
                />
              )}
              {img.is_primary && (
                <div className="absolute top-2 left-2 bg-[#F4610B] text-white text-[10px] px-2 py-1 rounded-md font-semibold flex items-center gap-1 shadow-lg">
                  <Star className="h-2.5 w-2.5 fill-white" />
                  Primary
                </div>
              )}
              {/* Hover Actions */}
              <div className="absolute inset-0 bg-[#F4610B]/0 group-hover:bg-[#F4610B]/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {!img.is_primary && !failedImages.has(img.id) && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => setPrimaryImage(img.id)}
                    className="h-8 w-8 bg-white hover:bg-white shadow-lg"
                    title="Set as primary"
                  >
                    <Star className="h-4 w-4 text-[#F4610B]" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* New Image Previews */}
        {imagePreviews.map((preview, index) => {
          const isFeatured = index === featuredNewImageIndex && !existingImages.some(img => img.is_primary)
          return (
            <div key={`new-${index}`} className="relative group pt-2 pr-2">
              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeNewImage(index)}
                className="absolute top-0 right-0 h-6 w-6 bg-[#F4610B] rounded-full shadow-md flex items-center justify-center hover:bg-[#E5550A] transition-colors z-10"
                title="Remove image"
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
              <div className={cn(
                "relative aspect-square rounded-xl overflow-hidden bg-white transition-all duration-200",
                isFeatured && "ring-2 ring-[#F4610B] ring-offset-2"
              )}>
                <Image
                  src={preview}
                  alt={`New image ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover"
                />
                {isFeatured && (
                  <div className="absolute top-2 left-2 bg-[#F4610B] text-white text-[10px] px-2 py-1 rounded-md font-semibold flex items-center gap-1 shadow-lg">
                    <Star className="h-2.5 w-2.5 fill-white" />
                    Featured
                  </div>
                )}
                {/* New badge */}
                <div className="absolute bottom-2 right-2 bg-green-500 text-white text-[10px] px-2 py-1 rounded-md font-semibold">
                  New
                </div>
                {/* Hover Actions */}
                <div className="absolute inset-0 bg-[#F4610B]/0 group-hover:bg-[#F4610B]/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {!isFeatured && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      onClick={() => setFeaturedNewImage(index)}
                      className="h-8 w-8 bg-white hover:bg-white shadow-lg"
                      title="Set as featured"
                    >
                      <Star className="h-4 w-4 text-[#F4610B]" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

