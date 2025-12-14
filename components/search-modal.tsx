'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useLocale } from '@/i18n/context'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { Search, Package, ShoppingCart, User, X, Loader2, Trash2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useStoreConnection } from '@/lib/store-connection-context'

interface SearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const t = useTranslations()
  const { isRTL } = useLocale()
  const { selectedConnectionId } = useStoreConnection()
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isSearching, setIsSearching] = React.useState(false)
  const [searchHistory, setSearchHistory] = React.useState<Array<{ query: string; category: string | null }>>([])
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const [searchResultsByCategory, setSearchResultsByCategory] = React.useState<{
    products?: { items: any[]; count: number }
    orders?: { items: any[]; count: number }
    customers?: { items: any[]; count: number }
  }>({})
  const [searchResultsCount, setSearchResultsCount] = React.useState(0)
  const [currentPage, setCurrentPage] = React.useState(0)
  const [hasMore, setHasMore] = React.useState(false)
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)
  const filterBadgeRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const resultsScrollRef = React.useRef<HTMLDivElement>(null)
  const [filterBadgeWidth, setFilterBadgeWidth] = React.useState(0)

  const SEARCH_HISTORY_KEY = 'search-modal-history'
  const MAX_HISTORY_ITEMS = 10

  const categories = React.useMemo(() => [
    {
      id: 'products',
      label: t('commandMenu.products'),
      icon: Package,
      placeholder: 'Search for products...',
      emptyStateTitle: 'No products found',
      emptyStateDescription: 'Try adjusting your search terms to find products.',
    },
    {
      id: 'orders',
      label: t('commandMenu.orders'),
      icon: ShoppingCart,
      placeholder: 'Search for orders...',
      emptyStateTitle: 'No orders found',
      emptyStateDescription: 'Try adjusting your search terms to find orders.',
    },
    {
      id: 'customers',
      label: t('commandMenu.customers'),
      icon: User,
      placeholder: 'Search for customers...',
      emptyStateTitle: 'No customers found',
      emptyStateDescription: 'Try adjusting your search terms to find customers.',
    },
  ], [t])

  // Load search history from localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(SEARCH_HISTORY_KEY)
        if (stored) {
          const history = JSON.parse(stored)
          // Handle migration from old format (string[]) to new format (object[])
          if (Array.isArray(history)) {
            const migratedHistory = history.map(item => 
              typeof item === 'string' 
                ? { query: item, category: null } 
                : item
            )
            setSearchHistory(migratedHistory)
          } else {
            setSearchHistory([])
          }
        }
      } catch (error) {
        console.error('Error loading search history:', error)
      }
    }
  }, [])

  // Save search history to localStorage
  const saveSearchHistory = React.useCallback((history: Array<{ query: string; category: string | null }>) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history))
        setSearchHistory(history)
      } catch (error) {
        console.error('Error saving search history:', error)
      }
    }
  }, [])

  React.useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setSelectedCategory(null)
      setIsSearching(false)
    }
  }, [open])

  React.useEffect(() => {
    if (selectedCategory && filterBadgeRef.current) {
      // Calculate width using requestAnimationFrame for smoother updates
      const updateWidth = () => {
        if (filterBadgeRef.current) {
          const width = filterBadgeRef.current.offsetWidth
          setFilterBadgeWidth(width)
        }
      }
      
      // Use requestAnimationFrame to ensure DOM is painted
      const rafId = requestAnimationFrame(() => {
        updateWidth()
        
        // Use ResizeObserver to track badge width changes
        const resizeObserver = new ResizeObserver(() => {
          updateWidth()
        })
        resizeObserver.observe(filterBadgeRef.current!)
        
        // Store observer for cleanup
        ;(filterBadgeRef.current as any).__resizeObserver = resizeObserver
      })
      
      return () => {
        cancelAnimationFrame(rafId)
        if (filterBadgeRef.current && (filterBadgeRef.current as any).__resizeObserver) {
          ;(filterBadgeRef.current as any).__resizeObserver.disconnect()
        }
      }
    } else {
      setFilterBadgeWidth(0)
    }
  }, [selectedCategory, categories])

  // Auto focus input when filter is selected
  React.useEffect(() => {
    if (selectedCategory && inputRef.current) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [selectedCategory])

  // Auto-complete search with debounce
  React.useEffect(() => {
    const query = searchQuery.trim()
    
    if (query.length === 0) {
      setIsSearching(false)
      setSearchResults([])
      setSearchResultsCount(0)
      return
    }

    // Debounce the search
    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      setSearchResults([])
      setSearchResultsByCategory({})
      setSearchResultsCount(0)
      setCurrentPage(0)
      setHasMore(false)
      
      // Search based on selected category
      if (selectedCategory === 'products') {
        try {
          const url = `/api/search/products?q=${encodeURIComponent(query)}&limit=20&offset=0${selectedConnectionId ? `&storeConnectionId=${encodeURIComponent(selectedConnectionId)}` : ''}`
          const response = await fetch(url)
          if (response.ok) {
            const data = await response.json()
            setSearchResults(data.products || [])
            setSearchResultsCount(data.count || 0)
            setHasMore((data.products || []).length < (data.count || 0))
            
            // Save to search history when results are found
            setSearchHistory(prevHistory => {
              const historyItem = { query, category: selectedCategory }
              const updatedHistory = [
                historyItem,
                ...prevHistory.filter(item => 
                  item.query.toLowerCase() !== query.toLowerCase() || item.category !== selectedCategory
                )
              ].slice(0, MAX_HISTORY_ITEMS)
              
              // Persist to localStorage
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory))
                } catch (error) {
                  console.error('Error saving search history:', error)
                }
              }
              
              return updatedHistory
            })
          } else {
            const errorData = await response.json().catch(() => ({ error: response.statusText }))
            console.error('Search failed:', response.status, errorData)
            setSearchResults([])
            setSearchResultsCount(0)
          }
        } catch (error) {
          console.error('Error searching products:', error)
          setSearchResults([])
          setSearchResultsCount(0)
        } finally {
          setIsSearching(false)
        }
      } else if (!selectedCategory) {
        // Search all categories when no filter is selected
        try {
          const productsUrl = `/api/search/products?q=${encodeURIComponent(query)}&limit=2&offset=0${selectedConnectionId ? `&storeConnectionId=${encodeURIComponent(selectedConnectionId)}` : ''}`
          const [productsResponse, ordersResponse, customersResponse] = await Promise.all([
            fetch(productsUrl).catch(() => ({ ok: false, json: async () => ({}) } as any)),
            // For now, simulate orders and customers - replace with actual API calls when available
            Promise.resolve({ ok: true, json: async () => ({ items: [], count: 0 }) } as any),
            Promise.resolve({ ok: true, json: async () => ({ items: [], count: 0 }) } as any)
          ])

          const resultsByCategory: {
            products?: { items: any[]; count: number }
            orders?: { items: any[]; count: number }
            customers?: { items: any[]; count: number }
          } = {}

          if (productsResponse.ok) {
            const productsData = await productsResponse.json()
            resultsByCategory.products = {
              items: productsData.products || [],
              count: productsData.count || 0
            }
          }

          if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json()
            resultsByCategory.orders = {
              items: ordersData.items || [],
              count: ordersData.count || 0
            }
          }

          if (customersResponse.ok) {
            const customersData = await customersResponse.json()
            resultsByCategory.customers = {
              items: customersData.items || [],
              count: customersData.count || 0
            }
          }

          setSearchResultsByCategory(resultsByCategory)
          const totalCount = (resultsByCategory.products?.count || 0) + 
                            (resultsByCategory.orders?.count || 0) + 
                            (resultsByCategory.customers?.count || 0)
          setSearchResultsCount(totalCount)

          // Save to search history
          setSearchHistory(prevHistory => {
            const historyItem = { query, category: null }
            const updatedHistory = [
              historyItem,
              ...prevHistory.filter(item => 
                item.query.toLowerCase() !== query.toLowerCase() || item.category !== null
              )
            ].slice(0, MAX_HISTORY_ITEMS)
            
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory))
              } catch (error) {
                console.error('Error saving search history:', error)
              }
            }
            
            return updatedHistory
          })
        } catch (error) {
          console.error('Error searching all categories:', error)
          setSearchResultsByCategory({})
          setSearchResultsCount(0)
        } finally {
          setIsSearching(false)
        }
      } else {
        // For other categories, simulate search for now
        setTimeout(() => {
          setSearchResults([])
          setSearchResultsCount(0)
          setIsSearching(false)
        }, 500)
      }
    }, 300) // 300ms debounce delay

    return () => clearTimeout(timeoutId)
  }, [searchQuery, selectedCategory])

  // Reset search results when category changes
  React.useEffect(() => {
    setSearchResults([])
    setSearchResultsByCategory({})
    setSearchResultsCount(0)
    setCurrentPage(0)
    setHasMore(false)
  }, [selectedCategory])

  // Load more results function
  const loadMoreResults = React.useCallback(async () => {
    if (isLoadingMore || !hasMore || !searchQuery.trim() || selectedCategory !== 'products') {
      return
    }

    setIsLoadingMore(true)
    const nextPage = currentPage + 1
    const offset = nextPage * 20

    try {
      const url = `/api/search/products?q=${encodeURIComponent(searchQuery.trim())}&limit=20&offset=${offset}${selectedConnectionId ? `&storeConnectionId=${encodeURIComponent(selectedConnectionId)}` : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        const newProducts = data.products || []
        setSearchResults(prev => [...prev, ...newProducts])
        setCurrentPage(nextPage)
        setHasMore(newProducts.length === 20 && (searchResults.length + newProducts.length) < (data.count || 0))
      }
    } catch (error) {
      console.error('Error loading more products:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, searchQuery, selectedCategory, currentPage, searchResults.length, selectedConnectionId])

  // Scroll detection for infinite scroll
  React.useEffect(() => {
    const scrollContainer = resultsScrollRef.current
    if (!scrollContainer || !hasMore || isLoadingMore) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      // Load more when user is 200px from bottom
      if (scrollHeight - scrollTop - clientHeight < 200) {
        loadMoreResults()
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [hasMore, isLoadingMore, loadMoreResults])


  // Handle clicking on history item
  const handleHistoryClick = (historyItem: { query: string; category: string | null }) => {
    const { query, category } = historyItem
    // Restore the category filter if it was saved
    if (category) {
      setSelectedCategory(category)
    } else {
      setSelectedCategory(null)
    }
    // Set the query - this will trigger auto-complete search via useEffect
    setSearchQuery(query)
    inputRef.current?.focus()
  }

  // Handle deleting all history
  const handleDeleteHistory = () => {
    saveSearchHistory([])
  }

  // Handle deleting single history item
  const handleDeleteHistoryItem = (e: React.MouseEvent, historyItem: { query: string; category: string | null }) => {
    e.stopPropagation()
    const updatedHistory = searchHistory.filter(item => 
      item.query !== historyItem.query || item.category !== historyItem.category
    )
    saveSearchHistory(updatedHistory)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-4xl w-[90vw] p-0 rounded-4xl overflow-hidden bg-white flex flex-col !left-[50%] !top-2 !translate-x-[-50%] !translate-y-0",
        "transition-[min-height] duration-300 ease-in-out",
        "h-auto max-h-[80vh]",
        searchResults.length > 0 
          ? "" 
          : isSearching 
            ? "min-h-[500px]" 
            : "min-h-[400px]"
      )}>
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="p-6 flex flex-col overflow-hidden">
          {/* Search Input Row */}
          <div className={cn(
            "flex items-center gap-4 flex-shrink-0",
            !selectedCategory && "mb-4",
            isRTL && "flex-row-reverse"
          )}>
            {/* Search Input */}
            <div className="relative w-[75%]">
            <Search className={cn(
              "absolute h-5 w-5 pointer-events-none",
              selectedCategory ? "text-[#F4610B]" : "text-gray-500",
              isRTL ? "right-3" : "left-3",
              "top-1/2 -translate-y-1/2"
            )} />
            {selectedCategory && (() => {
              const selectedCat = categories.find(cat => cat.id === selectedCategory)
              if (!selectedCat) return null
              const CategoryIcon = selectedCat.icon
              return (
                <div 
                  ref={filterBadgeRef}
                  className={cn(
                    "absolute flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F4610B]/10 text-[#F4610B] text-sm font-medium z-10",
                    "animate-in fade-in slide-in-from-left-2 duration-200",
                    isRTL ? "right-12" : "left-12",
                    "top-1/2 -translate-y-1/2 pointer-events-auto"
                  )}
                >
                  <CategoryIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{selectedCat.label}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedCategory(null)
                    }}
                    className="ml-0.5 hover:bg-[#F4610B]/20 rounded p-0.5 transition-colors flex items-center justify-center"
                    aria-label="Remove filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })()}
            <Input
              ref={inputRef}
              type="text"
              placeholder={selectedCategory 
                ? categories.find(cat => cat.id === selectedCategory)?.placeholder || t('header.search.placeholder')
                : t('header.search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                !selectedCategory && (isRTL ? "pr-12 pl-3" : "pl-12 pr-3"),
                "!border-0 focus:!border-0 focus-visible:!border-0",
                "!ring-0 focus:!ring-0 focus-visible:!ring-0",
                "!shadow-none",
                "text-base md:text-base",
                "transition-[padding] duration-200"
              )}
              style={(() => {
                if (selectedCategory) {
                  const leftPadding = filterBadgeWidth > 0 ? `${filterBadgeWidth + 48 + 8}px` : '140px'
                  return isRTL
                    ? { 
                        paddingLeft: '12px', 
                        paddingRight: leftPadding
                      }
                    : { 
                        paddingLeft: leftPadding, 
                        paddingRight: '12px'
                      }
                } else {
                  return isRTL
                    ? { paddingLeft: '12px', paddingRight: '48px' }
                    : { paddingLeft: '48px', paddingRight: '12px' }
                }
              })()}
              autoFocus={!selectedCategory}
            />
            </div>
          </div>

          {/* Filter Buttons */}
          <div className={cn(
            "flex items-center gap-2 transition-opacity duration-200 flex-shrink-0 mb-4",
            isRTL ? "flex-row-reverse mr-4" : "ml-4",
            selectedCategory ? "opacity-0 pointer-events-none mb-0" : "opacity-100"
          )}>
            {categories.map((category) => {
              const Icon = category.icon
              const isActive = selectedCategory === category.id
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(isActive ? null : category.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{category.label}</span>
                </button>
              )
            })}
          </div>

          {/* Search Results Area */}
          <div className="overflow-hidden flex flex-col">
            {(() => {
              // Show loading state when searching
              if (isSearching) {
                const selectedCat = selectedCategory ? categories.find(cat => cat.id === selectedCategory) : null
                return (
                  <div className="flex flex-col items-center justify-center h-full min-h-0 text-center">
                    <Loader2 className="h-16 w-16 text-[#F4610B] mb-4 animate-spin" />
                    <p className="text-lg font-medium text-gray-600 mb-2">
                      Searching for "{searchQuery}"...
                    </p>
                    <p className="text-sm text-gray-400 max-w-md">
                      {selectedCat 
                        ? `Looking through ${selectedCat.label.toLowerCase()}...`
                        : 'Searching across all categories...'}
                    </p>
                  </div>
                )
              }

              const selectedCat = selectedCategory ? categories.find(cat => cat.id === selectedCategory) : null
              const EmptyIcon = selectedCat ? selectedCat.icon : Search
              
              if (!searchQuery && !selectedCategory) {
                return (
                  <div className="flex flex-col items-center justify-center h-full min-h-0 text-center mt-16">
                    <Search className="h-16 w-16 text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-600 mb-2">
                      {t('searchModal.emptyState.title')}
                    </p>
                    <p className="text-sm text-gray-400 max-w-md">
                      {t('searchModal.emptyState.description')}
                    </p>
                  </div>
                )
              } else if (!searchQuery && selectedCategory && selectedCat) {
                return (
                  <div className="flex flex-col items-center justify-center h-full min-h-0 text-center mt-16">
                    <EmptyIcon className="h-16 w-16 text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-600 mb-2">
                      {selectedCat.emptyStateTitle}
                    </p>
                    <p className="text-sm text-gray-400 max-w-md">
                      {selectedCat.emptyStateDescription}
                    </p>
                  </div>
                )
              } else if (searchQuery && (searchResults.length > 0 || Object.keys(searchResultsByCategory).length > 0)) {
                // Show search results - either single category or segmented by category
                const hasSegmentedResults = !selectedCategory && Object.keys(searchResultsByCategory).length > 0
                
                return (
                  <div className="flex flex-col h-fit">
                    <div className="mb-4 flex-shrink-0 space-y-1 h-fit">
                      <h2 className="text-2xl font-semibold text-gray-900">
                        {searchQuery}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Found {searchResultsCount} {selectedCat?.label.toLowerCase() || 'results'}
                      </p>
                    </div>
                    <div 
                      ref={resultsScrollRef}
                      className="overflow-y-auto space-y-6 max-h-[60vh]"
                    >
                      {hasSegmentedResults ? (
                        // Show segmented results by category
                        <>
                          {searchResultsByCategory.products && searchResultsByCategory.products.items.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-gray-600" />
                                  <h3 className="text-sm font-semibold text-gray-900">Products</h3>
                                  <span className="text-xs text-gray-500">({searchResultsByCategory.products.count})</span>
                                </div>
                                {searchResultsByCategory.products.count > 2 && (
                                  <button
                                    onClick={() => setSelectedCategory('products')}
                                    className={cn(
                                      "flex items-center gap-1 text-xs text-[#F4610B] hover:text-[#F4610B]/80 transition-colors",
                                      isRTL && "flex-row-reverse"
                                    )}
                                  >
                                    <span>See more</span>
                                    <ChevronRight className={cn("h-3 w-3", isRTL && "rotate-180")} />
                                  </button>
                                )}
                              </div>
                              {searchResultsByCategory.products.items.map((product) => {
                                const productName = product.name_en || product.name_ar || 'Unnamed Product'
                                const productDescription = product.description_en || product.description_ar
                                return (
                                  <div
                                    key={product.id}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                  >
                                    {product.image_url ? (
                                      <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                                        <img
                                          src={product.image_url}
                                          alt={productName}
                                          className="w-full h-full object-cover"
                                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                                        />
                                      </div>
                                    ) : (
                                      <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                                        <Package className="h-6 w-6 text-gray-400" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">{productName}</p>
                                      {productDescription && (
                                        <p className="text-xs text-gray-500 truncate mt-0.5">{productDescription}</p>
                                      )}
                                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                        <span>Price: ${product.price}</span>
                                        {product.sku && <span>SKU: {product.sku}</span>}
                                        <span className="font-mono text-[10px]">ID: {product.id.slice(0, 8)}...</span>
                                        <span className={cn(product.is_available ? "text-green-600" : "text-gray-400")}>
                                          {product.is_available ? "Available" : "Out of Stock"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          {searchResultsByCategory.orders && searchResultsByCategory.orders.items.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <ShoppingCart className="h-4 w-4 text-gray-600" />
                                  <h3 className="text-sm font-semibold text-gray-900">Orders</h3>
                                  <span className="text-xs text-gray-500">({searchResultsByCategory.orders.count})</span>
                                </div>
                                {searchResultsByCategory.orders.count > 2 && (
                                  <button
                                    onClick={() => setSelectedCategory('orders')}
                                    className={cn(
                                      "flex items-center gap-1 text-xs text-[#F4610B] hover:text-[#F4610B]/80 transition-colors",
                                      isRTL && "flex-row-reverse"
                                    )}
                                  >
                                    <span>See more</span>
                                    <ChevronRight className={cn("h-3 w-3", isRTL && "rotate-180")} />
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">Orders search coming soon...</p>
                            </div>
                          )}
                          {searchResultsByCategory.customers && searchResultsByCategory.customers.items.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-600" />
                                  <h3 className="text-sm font-semibold text-gray-900">Customers</h3>
                                  <span className="text-xs text-gray-500">({searchResultsByCategory.customers.count})</span>
                                </div>
                                {searchResultsByCategory.customers.count > 2 && (
                                  <button
                                    onClick={() => setSelectedCategory('customers')}
                                    className={cn(
                                      "flex items-center gap-1 text-xs text-[#F4610B] hover:text-[#F4610B]/80 transition-colors",
                                      isRTL && "flex-row-reverse"
                                    )}
                                  >
                                    <span>See more</span>
                                    <ChevronRight className={cn("h-3 w-3", isRTL && "rotate-180")} />
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">Customers search coming soon...</p>
                            </div>
                          )}
                        </>
                      ) : (
                        // Show single category results (existing code)
                        <>
                      {searchResults.map((product) => {
                        // Get name and description (prefer English, fallback to Arabic)
                        const productName = product.name_en || product.name_ar || 'Unnamed Product'
                        const productDescription = product.description_en || product.description_ar
                        return (
                          <div
                            key={product.id}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            {/* Product Image */}
                            {product.image_url ? (
                              <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                                <img
                                  src={product.image_url}
                                  alt={productName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Hide image on error
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Package className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {productName}
                              </p>
                              {productDescription && (
                                <p className="text-xs text-gray-500 truncate mt-1">
                                  {productDescription}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                                <span>Price: ${parseFloat(product.price || 0).toFixed(2)}</span>
                                {product.sku && (
                                  <span>SKU: {product.sku}</span>
                                )}
                                <span className="font-mono text-[10px]">ID: {product.id.slice(0, 8)}...</span>
                                <span className={cn(
                                  product.is_available ? "text-green-600" : "text-gray-400"
                                )}>
                                  {product.is_available ? "Available" : "Out of Stock"}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      {isLoadingMore && (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-6 w-6 text-[#F4610B] animate-spin" />
                        </div>
                      )}
                        </>
                      )}
                    </div>
                  </div>
                )
              } else if (searchQuery) {
                // No results found
                return (
                  <div className="flex flex-col items-center justify-center h-full min-h-0 text-center mt-16">
                    <EmptyIcon className="h-16 w-16 text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-600 mb-2">
                      {selectedCat ? selectedCat.emptyStateTitle : t('searchModal.emptyState.noResults')}
                    </p>
                    <p className="text-sm text-gray-400 max-w-md">
                      {selectedCat ? selectedCat.emptyStateDescription : t('searchModal.emptyState.tryAgain')}
                    </p>
                  </div>
                )
              } else {
                return (
                  <div className="flex flex-col items-center justify-center h-full min-h-0 text-center">
                    <EmptyIcon className="h-16 w-16 text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-600 mb-2">
                      {selectedCat ? selectedCat.emptyStateTitle : t('searchModal.emptyState.noResults')}
                    </p>
                    <p className="text-sm text-gray-400 max-w-md">
                      {selectedCat ? selectedCat.emptyStateDescription : t('searchModal.emptyState.tryAgain')}
                    </p>
                  </div>
                )
              }
            })()}
          </div>

          {/* Search History */}
          {searchHistory.length > 0 && !isSearching && searchResults.length === 0 && (
            <div className={cn(
              "pt-4 mt-4 flex-shrink-0",
              isRTL ? "mr-4" : "ml-4"
            )}>
              <div className={cn(
                "flex items-center gap-2 mb-1 justify-center",
                isRTL && "flex-row-reverse"
              )}>
                <div className={cn(
                  "flex flex-wrap gap-2 flex-1 justify-center",
                  isRTL && "flex-row-reverse"
                )}>
                  {searchHistory.slice(0, 5).map((historyItem, index) => {
                    const category = historyItem.category ? categories.find(cat => cat.id === historyItem.category) : null
                    const CategoryIcon = category ? category.icon : Search
                    return (
                      <div
                        key={`${historyItem.query}-${historyItem.category}-${index}`}
                        onClick={() => handleHistoryClick(historyItem)}
                        className={cn(
                          "group flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer",
                          "bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors",
                          isRTL && "flex-row-reverse"
                        )}
                      >
                        <CategoryIcon className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600" />
                        <span>{historyItem.query}</span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteHistoryItem(e, historyItem)}
                          className="ml-1 text-gray-400 hover:text-red-600 transition-colors focus:outline-none"
                          aria-label={`Delete ${historyItem.query} from history`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleDeleteHistory}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm cursor-pointer",
                          "bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors",
                          isRTL && "flex-row-reverse"
                        )}
                        aria-label="Delete all search history"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete History</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clear all search history</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
