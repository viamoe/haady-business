import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  useProductFetch,
  useProductState,
  useProductDialogs,
  useProductOperations,
} from '../index'
import { supabase } from '@/lib/supabase/client'

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

/**
 * Integration tests to verify hooks work together correctly
 * This tests the best practices: separation of concerns, reusability, etc.
 */
describe('Hooks Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should work together for a complete product management flow', async () => {
    // Setup mocks
    const mockProducts = [
      {
        id: 'product-1',
        name_en: 'Product 1',
        name_ar: null,
        price: 100,
        store_id: 'store-1',
        is_available: true,
        is_active: true,
        is_published: true,
        created_at: '2024-01-01T00:00:00Z',
        status: 'active',
      },
    ]

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'stores') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'store-1', name: 'Test Store' },
            error: null,
          }),
        } as any
      }
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: mockProducts,
            error: null,
            count: 1,
          }),
        } as any
      }
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any
    })

    // Initialize all hooks
    const fetchHook = renderHook(() => useProductFetch())
    const stateHook = renderHook(() => useProductState())
    const dialogsHook = renderHook(() => useProductDialogs())
    const operationsHook = renderHook(() => useProductOperations())

    // 1. Fetch products
    let fetchResult: any
    await act(async () => {
      fetchResult = await fetchHook.result.current.fetchProducts({
        storeId: 'store-1',
      })
    })

    expect(fetchResult.products).toHaveLength(1)

    // 2. Update state with fetched products
    act(() => {
      stateHook.result.current.setAllProducts(fetchResult.products)
    })

    expect(stateHook.result.current.allProducts).toHaveLength(1)

    // 3. Filter products
    act(() => {
      stateHook.result.current.setSelectedStatusTab('active')
      stateHook.result.current.setSearchValue('Product')
    })

    expect(stateHook.result.current.filteredProducts).toHaveLength(1)

    // 4. Open edit dialog
    act(() => {
      dialogsHook.result.current.openForm(fetchResult.products[0])
    })

    expect(dialogsHook.result.current.isFormOpen).toBe(true)
    expect(dialogsHook.result.current.editingProduct).toEqual(fetchResult.products[0])

    // 5. Prepare for delete operation
    act(() => {
      operationsHook.result.current.setDeletingProduct(fetchResult.products[0])
      operationsHook.result.current.setIsDeleting(true)
    })

    expect(operationsHook.result.current.deletingProduct).not.toBeNull()
    expect(operationsHook.result.current.isDeleting).toBe(true)

    // 6. Clear delete state
    act(() => {
      operationsHook.result.current.clearDeleteState()
    })

    expect(operationsHook.result.current.deletingProduct).toBeNull()
    expect(operationsHook.result.current.isDeleting).toBe(false)

    // 7. Close dialog
    act(() => {
      dialogsHook.result.current.closeForm()
    })

    expect(dialogsHook.result.current.isFormOpen).toBe(false)
  })

  it('should demonstrate reusability - multiple instances work independently', () => {
    const hook1 = renderHook(() => useProductState())
    const hook2 = renderHook(() => useProductState())

    act(() => {
      hook1.result.current.setSearchValue('Search 1')
      hook2.result.current.setSearchValue('Search 2')
    })

    expect(hook1.result.current.searchValue).toBe('Search 1')
    expect(hook2.result.current.searchValue).toBe('Search 2')
  })

  it('should demonstrate separation of concerns - hooks don\'t interfere', () => {
    const stateHook = renderHook(() => useProductState())
    const dialogsHook = renderHook(() => useProductDialogs())
    const operationsHook = renderHook(() => useProductOperations())

    // Changing state doesn't affect dialogs
    act(() => {
      stateHook.result.current.setSearchValue('test')
    })

    expect(dialogsHook.result.current.isFormOpen).toBe(false)

    // Opening dialog doesn't affect operations
    act(() => {
      dialogsHook.result.current.openForm()
    })

    expect(operationsHook.result.current.isDeleting).toBe(false)

    // Operations don't affect state
    act(() => {
      operationsHook.result.current.setIsDeleting(true)
    })

    expect(stateHook.result.current.searchValue).toBe('test')
  })
})

