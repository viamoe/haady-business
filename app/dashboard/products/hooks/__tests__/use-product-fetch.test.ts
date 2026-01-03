import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProductFetch } from '../use-product-fetch'
import { supabase } from '@/lib/supabase/client'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}))

describe('useProductFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchProducts', () => {
    it('should fetch products successfully with connection ID', async () => {
      const mockConnection = { store_id: 'store-123' }
      const mockStore = { id: 'store-123', name: 'Test Store' }
      const mockProducts = [
        {
          id: 'product-1',
          name_en: 'Test Product',
          name_ar: 'منتج تجريبي',
          price: 100,
          store_id: 'store-123',
        },
      ]
      const mockInventory = [
        {
          product_id: 'product-1',
          quantity: 10,
          available_quantity: 8,
          low_stock_threshold: 5,
        },
      ]

      // Mock connection fetch
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: mockConnection,
        error: null,
      })

      // Mock store fetch
      const mockStoreSelect = vi.fn().mockReturnThis()
      const mockStoreEq = vi.fn().mockReturnThis()
      const mockStoreMaybeSingle = vi.fn().mockResolvedValue({
        data: mockStore,
        error: null,
      })

      // Mock products fetch
      const mockProductsSelect = vi.fn().mockReturnThis()
      const mockProductsIn = vi.fn().mockReturnThis()
      const mockProductsOrder = vi.fn().mockReturnThis()
      const mockProductsLimit = vi.fn().mockResolvedValue({
        data: mockProducts,
        error: null,
        count: 1,
      })

      // Mock inventory fetch
      const mockInventorySelect = vi.fn().mockReturnThis()
      const mockInventoryIn = vi.fn().mockResolvedValue({
        data: mockInventory,
        error: null,
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'store_connections') {
          return {
            select: mockSelect,
            eq: mockEq,
            maybeSingle: mockMaybeSingle,
          } as any
        }
        if (table === 'stores') {
          return {
            select: mockStoreSelect,
            eq: mockStoreEq,
            maybeSingle: mockStoreMaybeSingle,
          } as any
        }
        if (table === 'products') {
          return {
            select: mockProductsSelect,
            in: mockProductsIn,
            eq: mockEq,
            is: vi.fn().mockReturnThis(),
            order: mockProductsOrder,
            limit: mockProductsLimit,
          } as any
        }
        if (table === 'inventory') {
          return {
            select: mockInventorySelect,
            in: mockInventoryIn,
          } as any
        }
        return {} as any
      })

      const { result } = renderHook(() => useProductFetch())

      const fetchResult = await result.current.fetchProducts({
        selectedConnectionId: 'connection-123',
        storeId: null,
      })

      expect(fetchResult.products).toHaveLength(1)
      expect(fetchResult.products[0].id).toBe('product-1')
      expect(fetchResult.totalCount).toBe(1)
      expect(fetchResult.storeMap.get('store-123')).toBe('Test Store')
      expect(fetchResult.inventoryMap.get('product-1')).toBeDefined()
    })

    it('should handle empty store IDs gracefully', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      })) as any

      const { result } = renderHook(() => useProductFetch())

      let fetchResult: any
      await act(async () => {
        fetchResult = await result.current.fetchProducts({
          selectedConnectionId: null,
          storeId: null,
        })
      })

      expect(fetchResult.products).toHaveLength(0)
      expect(fetchResult.totalCount).toBe(0)
      expect(fetchResult.storeMap.size).toBe(0)
    })

    it('should handle errors gracefully', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockMaybeSingle = vi.fn().mockRejectedValue(
        new Error('Database error')
      )

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      })) as any

      const { result } = renderHook(() => useProductFetch())

      let fetchResult: any
      await act(async () => {
        fetchResult = await result.current.fetchProducts({
          selectedConnectionId: 'connection-123',
          storeId: null,
        })
      })

      expect(fetchResult.products).toHaveLength(0)
      expect(fetchResult.totalCount).toBe(0)
      expect(fetchResult.storeMap.size).toBe(0)
      // Error is caught and handled, returns empty result instead of throwing
    })

    it('should retry without deleted_at filter on error', async () => {
      const mockConnection = { store_id: 'store-123' }
      const mockStore = { id: 'store-123', name: 'Test Store' }
      const mockProducts = [{ 
        id: 'product-1', 
        name_en: 'Test', 
        name_ar: null,
        description_en: null,
        description_ar: null,
        price: 100,
        sku: null,
        barcode: null,
        barcode_type: null,
        image_url: null,
        is_available: true,
        is_active: true,
        is_published: true,
        created_at: '2024-01-01T00:00:00Z',
        store_id: 'store-123',
      }]

      let productsCallCount = 0
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'store_connections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
          } as any
        }
        if (table === 'stores') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockStore, error: null }),
          } as any
        }
        if (table === 'products') {
          productsCallCount++
          const mockSelect = vi.fn().mockReturnThis()
          const mockIn = vi.fn().mockReturnThis()
          const mockEq = vi.fn().mockReturnThis()
          const mockIs = vi.fn().mockReturnThis()
          const mockOrder = vi.fn().mockReturnThis()
          
          if (productsCallCount === 1) {
            // First call fails with deleted_at error
            const mockLimit = vi.fn().mockResolvedValue({
              data: null,
              error: {
                message: 'column deleted_at does not exist',
                code: '42703',
              },
              count: null,
            })
            return {
              select: mockSelect,
              in: mockIn,
              eq: mockEq,
              is: mockIs,
              order: mockOrder,
              limit: mockLimit,
            } as any
          }
          // Second call succeeds (without deleted_at in select)
          const mockLimit = vi.fn().mockResolvedValue({
            data: mockProducts,
            error: null,
            count: 1,
          })
          return {
            select: mockSelect,
            in: mockIn,
            eq: mockEq,
            order: mockOrder,
            limit: mockLimit,
          } as any
        }
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as any
      })

      const { result } = renderHook(() => useProductFetch())

      let fetchResult: any
      await act(async () => {
        fetchResult = await result.current.fetchProducts({
          selectedConnectionId: 'connection-123',
          storeId: null,
        })
      })

      expect(fetchResult.products).toHaveLength(1)
      expect(productsCallCount).toBe(2) // Should retry once
    })
  })

  describe('loading state', () => {
    it('should not set loading state when silent is true', async () => {
      const { result } = renderHook(() => useProductFetch())

      await act(async () => {
        await result.current.fetchProducts({
          selectedConnectionId: null,
          storeId: null,
          silent: true,
        })
      })

      expect(result.current.isLoading).toBe(false)
    })
  })
})

