'use client'

import * as React from 'react'
import { useState, useEffect, useMemo } from 'react'
import { Check, ChevronDown, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface Brand {
  id: string
  name: string
  name_ar: string | null
  slug: string
  description: string | null
  description_ar: string | null
  logo_url: string | null
  is_active: boolean
  is_featured: boolean
  is_verified: boolean
  sort_order: number
  meta_title: string | null
  meta_description: string | null
  tags: string[]
  brand_categories?: Array<{
    category_id: string
    categories: {
      id: string
      name: string
      slug: string
    }
  }>
}

interface BrandSelectorProps {
  value?: string | null
  onChange: (brandId: string | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  categoryId?: string | null // Category ID to filter brands by
}

export function BrandSelector({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  categoryId = null
}: BrandSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [brands, setBrands] = useState<Brand[]>([])
  const [totalBrands, setTotalBrands] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [categoryName, setCategoryName] = useState<string | null>(null)

  // Fetch category name when categoryId changes
  useEffect(() => {
    const fetchCategoryName = async () => {
      if (!categoryId) {
        setCategoryName(null)
        return
      }

      try {
        const response = await fetch(`/api/categories/${categoryId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.category) {
            setCategoryName(data.category.name)
          }
        }
      } catch (error) {
        console.error('Error fetching category name:', error)
      }
    }

    fetchCategoryName()
  }, [categoryId])

  // Dynamic placeholder based on category selection
  const dynamicPlaceholder = placeholder || 
    (categoryName 
      ? `Search brands for ${categoryName}...` 
      : 'Search and select a brand...')

  // Fetch brands
  useEffect(() => {
    const fetchBrands = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          is_active: 'true',
          limit: searchQuery ? '100' : '5', // Show 5 initially, 100 when searching
          sort_by: 'sort_order',
          order: 'asc'
        })
        
        if (searchQuery) {
          params.append('search', searchQuery)
          params.set('limit', '100') // Increase limit when searching
        }

        // Add category filter if provided
        if (categoryId) {
          params.append('category_id', categoryId)
        }

        const response = await fetch(`/api/brands?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          setBrands(data.brands || [])
          setTotalBrands(data.total || 0)
        }
      } catch (error) {
        console.error('Error fetching brands:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBrands()
  }, [searchQuery, categoryId])

  // Fetch selected brand when value changes
  useEffect(() => {
    const fetchSelectedBrand = async () => {
      if (!value) {
        setSelectedBrand(null)
        return
      }

      try {
        const response = await fetch(`/api/brands/${value}`)
        if (response.ok) {
          const data = await response.json()
          setSelectedBrand(data.brand)
        }
      } catch (error) {
        console.error('Error fetching selected brand:', error)
      }
    }

    fetchSelectedBrand()
  }, [value])

  const handleSelect = (brandId: string) => {
    const brand = brands.find(b => b.id === brandId)
    if (brand) {
      setSelectedBrand(brand)
      onChange(brandId)
      setOpen(false)
      setSearchQuery('')
    }
  }

  const handleClear = () => {
    setSelectedBrand(null)
    onChange(null)
    setSearchQuery('')
  }

  return (
    <div className={cn('w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between h-12 border-2 border-gray-200 rounded-xl focus:border-[#F4610B] focus:ring-2 focus:ring-[#F4610B]/20 relative',
              !selectedBrand && 'text-muted-foreground'
            )}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {selectedBrand?.logo_url ? (
                <img
                  src={selectedBrand.logo_url}
                  alt={selectedBrand.name}
                  className="w-6 h-6 rounded object-cover flex-shrink-0 border border-gray-200"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : selectedBrand ? (
                <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-gray-400">{selectedBrand.name.charAt(0).toUpperCase()}</span>
                </div>
              ) : null}
              <span className="truncate text-left flex-1">
                {selectedBrand ? selectedBrand.name : dynamicPlaceholder}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <ChevronDown className={cn('h-4 w-4 shrink-0 opacity-50', open && 'rotate-180')} />
            </div>
            {selectedBrand && (
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  handleClear()
                }}
                className="absolute right-8 top-1/2 -translate-y-1/2 h-5 w-5 rounded-sm opacity-70 hover:opacity-100 hover:bg-accent flex items-center justify-center cursor-pointer z-10"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                    e.preventDefault()
                    handleClear()
                  }
                }}
                aria-label="Clear selection"
              >
                <X className="h-3 w-3" />
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <div className="border-b px-3 pt-3 pb-2">
              <CommandInput
                placeholder={categoryName ? `Search brands for ${categoryName}...` : "Search brands..."}
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="h-10 border border-gray-200 rounded-lg px-3 bg-white focus:border-[#F4610B] focus:ring-[#F4610B]/30 focus:ring-2 transition-all"
              />
            </div>
            {categoryName && totalBrands > 0 && (
              <div className="px-3 py-2 text-xs text-gray-500 border-b">
                {totalBrands} {totalBrands === 1 ? 'brand' : 'brands'} available for {categoryName}
              </div>
            )}
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : brands.length === 0 ? (
                <CommandEmpty>
                  {searchQuery ? 'No brands found.' : 'No brands available.'}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {brands.map((brand) => (
                    <CommandItem
                      key={brand.id}
                      value={brand.id}
                      onSelect={() => handleSelect(brand.id)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {brand.logo_url ? (
                          <img
                            src={brand.logo_url}
                            alt={brand.name}
                            className="w-8 h-8 rounded object-cover flex-shrink-0 border border-gray-200"
                            onError={(e) => {
                              // Replace with fallback on error
                              const img = e.currentTarget
                              const fallback = document.createElement('div')
                              fallback.className = 'w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0'
                              fallback.innerHTML = `<span class="text-xs text-gray-400">${brand.name.charAt(0).toUpperCase()}</span>`
                              img.replaceWith(fallback)
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-gray-400">{brand.name.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{brand.name}</span>
                            {brand.is_featured && (
                              <span className="text-xs bg-[#F4610B]/10 text-[#F4610B] px-1.5 py-0.5 rounded flex-shrink-0">
                                Featured
                              </span>
                            )}
                          </div>
                          {brand.description && (
                            <span className="text-xs text-muted-foreground truncate">
                              {brand.description}
                            </span>
                          )}
                        </div>
                      </div>
                      <Check
                        className={cn(
                          'h-4 w-4 flex-shrink-0',
                          selectedBrand?.id === brand.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

