'use client'

import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface LoadingBarProps {
  isLoading: boolean
  duration?: number // Expected duration in milliseconds
}

export function LoadingBar({ isLoading, duration = 2000 }: LoadingBarProps) {
  const [progress, setProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isLoadingRef = useRef(isLoading)

  // Keep ref in sync with prop
  useEffect(() => {
    isLoadingRef.current = isLoading
  }, [isLoading])

  useEffect(() => {
    if (isLoading) {
      // Clear any pending hide timer
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
      
      // Immediately show and start progress
      setIsVisible(true)
      setProgress(5) // Start at 5% for immediate visibility
      startTimeRef.current = Date.now()

      // Animate progress bar based on actual elapsed time
      const updateProgress = () => {
        if (startTimeRef.current && isLoadingRef.current) {
          const elapsed = Date.now() - startTimeRef.current
          
          // If duration is provided, use it as a guide but don't cap strictly
          // Otherwise, use a smooth progress that accelerates then slows
          let newProgress: number
          
          if (duration > 0) {
            // Use duration as a guide, but allow it to go beyond if action takes longer
            // Start from 5%, target 90% at expected duration
            const baseProgress = 5 + (elapsed / duration) * 85 // 5% to 90%
            // Add a slow increment for actions that take longer than expected
            const extraProgress = elapsed > duration ? Math.min((elapsed - duration) / (duration * 2) * 10, 5) : 0
            newProgress = Math.min(baseProgress + extraProgress, 95) // Cap at 95% until loading completes
          } else {
            // No duration provided - use a smooth logarithmic curve, starting from 5%
            newProgress = Math.min(5 + 85 * (1 - Math.exp(-elapsed / 1000)), 95)
          }
          
          setProgress(newProgress)
          animationFrameRef.current = requestAnimationFrame(updateProgress)
        }
      }

      animationFrameRef.current = requestAnimationFrame(updateProgress)
    } else {
      // Complete the progress bar when loading finishes
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      
      setProgress(100)
      // Hide after animation completes
      hideTimerRef.current = setTimeout(() => {
        setIsVisible(false)
        setProgress(0)
        startTimeRef.current = null
      }, 300)
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
      }
    }
  }, [isLoading, duration])

  if (!isVisible && progress === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-[9999] h-[5px] bg-transparent transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0'
      )}
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="h-full bg-gradient-to-r from-[#F4610B] via-[#FF8C42] to-[#F4610B] shadow-lg relative overflow-hidden"
        style={{
          width: `${progress}%`,
          transition: isLoading
            ? 'width 0.1s linear'
            : 'width 0.3s ease-out',
        }}
      >
        <div 
          className="absolute inset-0 h-full w-full loading-bar-shimmer"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
          }}
        />
      </div>
    </div>
  )
}

