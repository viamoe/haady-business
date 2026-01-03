'use client'

import * as React from 'react'
import { Heart, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { Skeleton } from '@/components/ui/skeleton'

interface Lovability {
  id: string
  rating: number // Still using rating in DB, but represents lovability level
  review_text: string | null
  is_verified_purchase: boolean
  helpful_count: number
  created_at: string
  updated_at: string
  user_id: string
}

interface LovabilityStats {
  average_rating: number
  total_ratings: number
  rating_distribution: {
    '5': number
    '4': number
    '3': number
    '2': number
    '1': number
  }
}

interface ProductRatingsProps {
  productId: string
  currentUserId?: string
  onRatingSubmit?: () => void
}

export function ProductRatings({ productId, currentUserId, onRatingSubmit }: ProductRatingsProps) {
  const [lovabilities, setLovabilities] = React.useState<Lovability[]>([])
  const [stats, setStats] = React.useState<LovabilityStats | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [userLovability, setUserLovability] = React.useState<Lovability | null>(null)
  const [showLovabilityForm, setShowLovabilityForm] = React.useState(false)
  const [selectedLovability, setSelectedLovability] = React.useState(0)

  // Fetch lovabilities
  React.useEffect(() => {
    if (!productId) return

    const fetchLovabilities = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/products/${productId}/ratings?stats=true&limit=10`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch lovability data')
        }

        const data = await response.json()
        setLovabilities(data.ratings || [])
        setStats(data.stats || null)

        // Check if current user has a lovability rating
        if (currentUserId) {
          const userLovability = data.ratings?.find((r: Lovability) => r.user_id === currentUserId)
          if (userLovability) {
            setUserLovability(userLovability)
            setSelectedLovability(userLovability.rating)
          }
        }
      } catch (error) {
        console.error('Error fetching lovabilities:', error)
        toast.error('Failed to load lovability data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchLovabilities()
  }, [productId, currentUserId])

  const handleSubmitLovability = async () => {
    if (selectedLovability === 0) {
      toast.error('Please select a lovability level')
      return
    }

    try {
      setIsSubmitting(true)
      const url = `/api/products/${productId}/ratings`
      const method = userLovability ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: selectedLovability,
          is_verified_purchase: false
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit lovability')
      }

      toast.success(userLovability ? 'Lovability updated successfully' : 'Lovability submitted successfully')
      setShowLovabilityForm(false)
      onRatingSubmit?.()
      
      // Refresh lovabilities
      const refreshResponse = await fetch(`/api/products/${productId}/ratings?stats=true&limit=10`)
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setLovabilities(data.ratings || [])
        setStats(data.stats || null)
        const updatedUserLovability = data.ratings?.find((r: Lovability) => r.user_id === currentUserId)
        if (updatedUserLovability) {
          setUserLovability(updatedUserLovability)
        }
      }
    } catch (error: any) {
      console.error('Error submitting lovability:', error)
      toast.error(error.message || 'Failed to submit lovability')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteLovability = async () => {
    if (!userLovability) return

    try {
      const response = await fetch(`/api/products/${productId}/ratings`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete lovability')
      }

      toast.success('Lovability removed successfully')
      setUserLovability(null)
      setSelectedLovability(0)
      setShowLovabilityForm(false)
      onRatingSubmit?.()
      
      // Refresh lovabilities
      const refreshResponse = await fetch(`/api/products/${productId}/ratings?stats=true&limit=10`)
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setLovabilities(data.ratings || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Error deleting lovability:', error)
      toast.error('Failed to delete lovability')
    }
  }

  const LovabilityHearts = ({ lovability, size = 'md', interactive = false, onLovabilityChange }: { 
    lovability: number
    size?: 'sm' | 'md' | 'lg'
    interactive?: boolean
    onLovabilityChange?: (lovability: number) => void
  }) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6'
    }

    const getLovabilityLabel = (level: number) => {
      const labels = {
        1: 'Not for me',
        2: 'Okay',
        3: 'Like it',
        4: 'Love it',
        5: 'Absolutely love it!'
      }
      return labels[level as keyof typeof labels] || ''
    }

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onLovabilityChange && onLovabilityChange(level)}
            className={cn(
              interactive && 'cursor-pointer hover:scale-110 transition-all duration-200',
              !interactive && 'cursor-default',
              'relative group'
            )}
            title={interactive ? getLovabilityLabel(level) : ''}
          >
            <Heart
              className={cn(
                sizeClasses[size],
                'transition-all duration-200',
                level <= lovability
                  ? 'fill-rose-500 text-rose-500'
                  : 'fill-gray-200 text-gray-200'
              )}
            />
            {interactive && level <= lovability && (
              <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold pointer-events-none">
                {level}
              </span>
            )}
          </button>
        ))}
        {interactive && selectedLovability > 0 && (
          <span className="ml-2 text-sm text-gray-600 font-medium">
            {getLovabilityLabel(selectedLovability)}
          </span>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Lovability Summary */}
      {stats && (
        <div className="flex items-start gap-6 p-6 bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl border border-rose-100">
          <div className="text-center">
            <div className="text-5xl font-bold text-rose-600 mb-2">{stats.average_rating.toFixed(1)}</div>
            <LovabilityHearts lovability={Math.round(stats.average_rating)} size="md" />
            <div className="text-sm text-gray-600 mt-2 font-medium">
              {stats.total_ratings} {stats.total_ratings === 1 ? 'person loves this' : 'people love this'}
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((level) => {
              const count = stats.rating_distribution[String(level) as keyof typeof stats.rating_distribution] || 0
              const percentage = stats.total_ratings > 0 ? (count / stats.total_ratings) * 100 : 0
              const labels = {
                5: 'Absolutely love it!',
                4: 'Love it',
                3: 'Like it',
                2: 'Okay',
                1: 'Not for me'
              }
              return (
                <div key={level} className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-32">
                    <span className="text-sm font-medium text-gray-700 w-6">{level}</span>
                    <Heart className="h-3.5 w-3.5 fill-rose-400 text-rose-400" />
                  </div>
                  <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-rose-400 to-pink-400 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-12 text-right font-medium">{count}</span>
                  <span className="text-xs text-gray-500 w-24 text-left">{labels[level as keyof typeof labels]}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Submit Lovability Form */}
      {currentUserId && (
        <div className="p-6 bg-white border-2 border-rose-100 rounded-xl shadow-sm">
          {!showLovabilityForm && !userLovability ? (
            <Button
              onClick={() => setShowLovabilityForm(true)}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-semibold h-12 text-base"
            >
              <Heart className="h-5 w-5 mr-2 fill-white" />
              Show Your Love
            </Button>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="text-base font-semibold text-gray-900 mb-4 block">
                  How much do you love this product?
                </label>
                <LovabilityHearts
                  lovability={selectedLovability}
                  size="lg"
                  interactive={true}
                  onLovabilityChange={setSelectedLovability}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSubmitLovability}
                  disabled={isSubmitting || selectedLovability === 0}
                  className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-semibold"
                >
                  {isSubmitting ? 'Submitting...' : userLovability ? 'Update Love' : 'Submit Love'}
                </Button>
                {userLovability && (
                  <Button
                    variant="outline"
                    onClick={handleDeleteLovability}
                    disabled={isSubmitting}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Remove
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowLovabilityForm(false)
                    if (!userLovability) {
                      setSelectedLovability(0)
                    }
                  }}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lovability List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
          People Who Love This ({lovabilities.length})
        </h3>
        {lovabilities.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Heart className="h-12 w-12 mx-auto mb-3 text-gray-300 fill-gray-100" />
            <p className="text-base">No one has shown love yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lovabilities.map((lovability) => (
              <div key={lovability.id} className="flex items-center justify-between p-4 bg-white border border-rose-100 rounded-lg hover:border-rose-200 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center flex-shrink-0 border border-rose-200">
                    <User className="h-5 w-5 text-rose-600" />
                  </div>
                  <div className="flex items-center gap-3">
                    <LovabilityHearts lovability={lovability.rating} size="sm" />
                    {lovability.is_verified_purchase && (
                      <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">Verified</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(lovability.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

