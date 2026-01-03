'use client'

import { useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { EditHistoryEntry, UserHistoryGroup, Category, Brand } from '../types'

interface UseEditHistoryOptions {
  productId: string | null
}

interface UseEditHistoryReturn {
  history: EditHistoryEntry[]
  groupedHistory: UserHistoryGroup[]
  categories: Category[]
  brands: Brand[]
  isLoading: boolean
  error: Error | null
  expandedUsers: Set<string>
  toggleUserExpanded: (userId: string) => void
  fetchHistory: () => Promise<void>
}

/**
 * Custom hook for managing product edit history
 * Handles fetching history, categories, brands, and expansion state
 */
export function useEditHistory({ productId }: UseEditHistoryOptions): UseEditHistoryReturn {
  const [history, setHistory] = useState<EditHistoryEntry[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())

  // Group history by user
  const groupedHistory = useMemo(() => {
    const grouped = history.reduce((acc, entry) => {
      const userId = entry.editedBy?.id || 'unknown'
      if (!acc[userId]) {
        acc[userId] = {
          user: entry.editedBy,
          entries: []
        }
      }
      acc[userId].entries.push(entry)
      return acc
    }, {} as Record<string, UserHistoryGroup>)

    return Object.values(grouped)
  }, [history])

  const toggleUserExpanded = useCallback((userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }, [])

  const fetchHistory = useCallback(async () => {
    if (!productId) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch categories, brands, and history in parallel
      const [categoriesResult, brandsResult, historyResponse] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name')
          .eq('is_active', true),
        supabase
          .from('brands')
          .select('id, name')
          .eq('is_active', true),
        fetch(`/api/products/${productId}/history`)
      ])

      // Set categories
      if (categoriesResult.data) {
        setCategories(categoriesResult.data)
      }

      // Set brands
      if (brandsResult.data) {
        setBrands(brandsResult.data)
      }

      // Set history
      if (historyResponse.ok) {
        const data = await historyResponse.json()
        setHistory(data.history || [])
        
        // Auto-expand first user
        if (data.history?.length > 0) {
          const firstUserId = data.history[0]?.editedBy?.id || 'unknown'
          setExpandedUsers(new Set([firstUserId]))
        }
      } else {
        setHistory([])
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch history')
      setError(error)
      console.error('Error fetching edit history:', error)
      setHistory([])
    } finally {
      setIsLoading(false)
    }
  }, [productId])

  return {
    history,
    groupedHistory,
    categories,
    brands,
    isLoading,
    error,
    expandedUsers,
    toggleUserExpanded,
    fetchHistory,
  }
}

