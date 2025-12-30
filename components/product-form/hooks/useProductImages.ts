'use client'

import { useCallback } from 'react'
import { useProductFormContext } from '../context'

export function useProductImages() {
  const {
    imageFiles,
    setImageFiles,
    imagePreviews,
    setImagePreviews,
    existingImages,
    setExistingImages,
    deletedImageIds,
    setDeletedImageIds,
    featuredNewImageIndex,
    setFeaturedNewImageIndex,
  } = useProductFormContext()

  // Handle file selection
  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newFiles = Array.from(files)
    
    // Create preview URLs
    const newPreviews = newFiles.map(file => URL.createObjectURL(file))
    
    setImageFiles(prev => [...prev, ...newFiles])
    setImagePreviews(prev => [...prev, ...newPreviews])
    
    // Reset input
    e.target.value = ''
  }, [setImageFiles, setImagePreviews])

  // Remove a new (not yet uploaded) image
  const removeNewImage = useCallback((index: number) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(imagePreviews[index])
    
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
    
    // Adjust featured index if needed
    if (index === featuredNewImageIndex) {
      setFeaturedNewImageIndex(0)
    } else if (index < featuredNewImageIndex) {
      setFeaturedNewImageIndex(prev => Math.max(0, prev - 1))
    }
  }, [imagePreviews, featuredNewImageIndex, setImageFiles, setImagePreviews, setFeaturedNewImageIndex])

  // Remove an existing (already uploaded) image
  const removeExistingImage = useCallback((imageId: string) => {
    setExistingImages(prev => prev.filter(img => img.id !== imageId))
    // Track this image for deletion when form is saved
    setDeletedImageIds(prev => [...prev, imageId])
  }, [setExistingImages, setDeletedImageIds])

  // Set an existing image as primary
  const setPrimaryImage = useCallback((imageId: string) => {
    setExistingImages(prev =>
      prev.map(img => ({ ...img, is_primary: img.id === imageId }))
    )
    // Clear featured status from new images when selecting an existing image as primary
    setFeaturedNewImageIndex(-1)
  }, [setExistingImages, setFeaturedNewImageIndex])

  // Set a new (not yet uploaded) image as featured
  const setFeaturedNewImage = useCallback((index: number) => {
    setFeaturedNewImageIndex(index)
    // Clear primary status from existing images
    setExistingImages(prev =>
      prev.map(img => ({ ...img, is_primary: false }))
    )
  }, [setFeaturedNewImageIndex, setExistingImages])

  // Get the primary/featured image URL for display
  const getPrimaryImageUrl = useCallback((): string | null => {
    // Check for primary existing image first
    const primaryExisting = existingImages.find(img => img.is_primary)
    if (primaryExisting) {
      return primaryExisting.url
    }
    
    // Use featured new image
    if (imagePreviews.length > 0 && featuredNewImageIndex >= 0 && featuredNewImageIndex < imagePreviews.length) {
      return imagePreviews[featuredNewImageIndex]
    }
    
    // Fallback to first new image
    if (imagePreviews.length > 0) {
      return imagePreviews[0]
    }
    
    return null
  }, [existingImages, imagePreviews, featuredNewImageIndex])

  // Check if there are any images
  const hasImages = existingImages.length > 0 || imagePreviews.length > 0

  // Get total image count
  const totalImageCount = existingImages.length + imagePreviews.length

  return {
    imageFiles,
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
    getPrimaryImageUrl,
  }
}

