'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import type { Product } from '../types'

interface UseProductOptions {
  productId: string | null
}

interface UseProductReturn {
  product: Product | null
  isLoading: boolean
  error: Error | null
  reload: () => Promise<void>
  updateProduct: (data: Partial<Product>) => void
}

/**
 * Custom hook for loading and managing a single product
 * Handles fetching, error states, and reloading
 */
export function useProduct({ productId }: UseProductOptions): UseProductReturn {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadProduct = useCallback(async () => {
    if (!productId) {
      setProduct(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      if (data) {
        setProduct(data as Product)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load product')
      setError(error)
      console.error('Error loading product:', error)
      toast.error('Failed to load product')
      router.push('/dashboard/products')
    } finally {
      setIsLoading(false)
    }
  }, [productId, router])

  // Load product on mount and when productId changes
  useEffect(() => {
    loadProduct()
  }, [loadProduct])

  const reload = useCallback(async () => {
    await loadProduct()
  }, [loadProduct])

  const updateProduct = useCallback((data: Partial<Product>) => {
    setProduct(prev => prev ? { ...prev, ...data } : null)
  }, [])

  return {
    product,
    isLoading,
    error,
    reload,
    updateProduct,
  }
}

