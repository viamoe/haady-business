'use client'

import * as React from 'react'
import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface ImageWithSkeletonProps {
  src: string
  alt: string
  className?: string
  skeletonClassName?: string
  containerClassName?: string
  hoverImageSrc?: string
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
  objectFit?: 'contain' | 'cover'
}

export function ImageWithSkeleton({
  src,
  alt,
  className = '',
  skeletonClassName = '',
  containerClassName = '',
  hoverImageSrc,
  onError,
  objectFit = 'contain',
}: ImageWithSkeletonProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [hoverImageLoading, setHoverImageLoading] = useState(hoverImageSrc ? true : false)
  const [hoverImageError, setHoverImageError] = useState(false)

  const handleImageLoad = () => {
    setIsLoading(false)
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false)
    setHasError(true)
    if (onError) {
      onError(e)
    }
  }

  const handleHoverImageLoad = () => {
    setHoverImageLoading(false)
  }

  const handleHoverImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHoverImageLoading(false)
    setHoverImageError(true)
  }

  return (
    <div className={cn('relative', containerClassName)}>
      {/* Skeleton loader - shown while main image is loading */}
      {isLoading && !hasError && (
        <Skeleton className={cn('absolute inset-0', skeletonClassName)} />
      )}
      
      {/* Main image */}
      {!hasError && (
        <img
          src={src}
          alt={alt}
          className={cn(
            className,
            isLoading ? 'opacity-0' : 'opacity-100',
            hoverImageSrc && !hoverImageError ? 'group-hover:opacity-0' : '',
            'transition-opacity duration-300'
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}

      {/* Hover image */}
      {hoverImageSrc && !hoverImageError && (
        <>
          {/* Skeleton for hover image if it's still loading - only show on hover */}
          {hoverImageLoading && (
            <Skeleton className={cn('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300', skeletonClassName)} />
          )}
          <img
            src={hoverImageSrc}
            alt={alt}
            className={cn(
              'absolute inset-0',
              className,
              hoverImageLoading ? 'opacity-0' : 'opacity-0 group-hover:opacity-100',
              'transition-opacity duration-300'
            )}
            onLoad={handleHoverImageLoad}
            onError={handleHoverImageError}
          />
        </>
      )}
    </div>
  )
}

