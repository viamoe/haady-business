'use client'

import * as React from 'react'
import { useState, useEffect, useMemo } from 'react'
import { Check, ChevronDown, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { useLocale } from '@/i18n/context'
import type { Category } from '@/lib/types/categories'

interface CategorySelectorProps {
  value: string[]
  onChange: (value: string[]) => void
  multiple?: boolean
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function CategorySelector({
  value = [],
  onChange,
  multiple = true,
  placeholder = 'Select categories...',
  className,
  disabled = false
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const { locale, isRTL } = useLocale()

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/categories?hierarchical=true')
        if (!response.ok) {
          throw new Error('Failed to fetch categories')
        }
        const data = await response.json()
        setCategories(data.categories || [])
      } catch (error) {
        console.error('Error fetching categories:', error)
        setCategories([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [])

  // Flatten categories for search
  const flattenedCategories = useMemo(() => {
    const flatten = (cats: Category[], level = 0): Category[] => {
      const result: Category[] = []
      cats.forEach(cat => {
        result.push({ ...cat, level })
        if (cat.children && cat.children.length > 0) {
          result.push(...flatten(cat.children, level + 1))
        }
      })
      return result
    }
    return flatten(categories)
  }, [categories])

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return categories
    }

    const query = searchQuery.toLowerCase()
    const matching = flattenedCategories.filter(cat => {
      const name = (locale === 'ar' && cat.name_ar ? cat.name_ar : cat.name).toLowerCase()
      return name.includes(query)
    })

    // Return flat list when searching (not hierarchical)
    return matching
  }, [searchQuery, flattenedCategories, categories, locale])

  // Get selected category names
  const selectedCategories = useMemo(() => {
    return flattenedCategories.filter(cat => value.includes(cat.id))
  }, [value, flattenedCategories])

  // Get display name for category
  const getCategoryName = (category: Category): string => {
    return locale === 'ar' && category.name_ar ? category.name_ar : category.name
  }

  // Get category path
  const getCategoryPath = (category: Category): string => {
    if (category.path) {
      return category.path
    }
    return getCategoryName(category)
  }

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    if (multiple) {
      const newValue = value.includes(categoryId)
        ? value.filter(id => id !== categoryId)
        : [...value, categoryId]
      onChange(newValue)
    } else {
      onChange(value.includes(categoryId) ? [] : [categoryId])
      setOpen(false)
    }
  }

  // Remove category
  const removeCategory = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter(id => id !== categoryId))
  }

  // Render category item
  const renderCategoryItem = (category: Category, level: number = 0) => {
    const isSelected = value.includes(category.id)
    const displayName = getCategoryName(category)
    const indent = level * 16

    return (
      <CommandItem
        key={category.id}
        value={`${category.id}-${displayName}`}
        onSelect={() => toggleCategory(category.id)}
        className={cn(
          'flex items-center gap-2',
          isRTL && 'flex-row-reverse'
        )}
        style={{ paddingLeft: `${indent + 12}px` }}
      >
        <div
          className={cn(
            'flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
            isSelected && 'bg-primary text-primary-foreground'
          )}
        >
          {isSelected && <Check className="h-3 w-3" />}
        </div>
        {category.icon && (
          <span className="text-base" aria-hidden="true">
            {category.icon}
          </span>
        )}
        <span className="flex-1">{displayName}</span>
        {category.path && category.path !== displayName && (
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            {category.path}
          </span>
        )}
      </CommandItem>
    )
  }

  // Render category tree
  const renderCategoryTree = (cats: Category[], level: number = 0) => {
    return cats.map(category => (
      <React.Fragment key={category.id}>
        {renderCategoryItem(category, level)}
        {category.children && category.children.length > 0 && (
          renderCategoryTree(category.children, level + 1)
        )}
      </React.Fragment>
    ))
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Display selected categories outside the trigger */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedCategories.map(category => (
            <Badge
              key={category.id}
              variant="secondary"
              className="mr-1"
            >
              {getCategoryName(category)}
              {multiple && (
                <button
                  type="button"
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-destructive/20"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      removeCategory(category.id, e as any)
                    }
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    removeCategory(category.id, e)
                  }}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between',
              !value.length && 'text-muted-foreground',
              isRTL && 'flex-row-reverse'
            )}
            disabled={disabled}
          >
            <span className="flex-1 text-left truncate">
              {selectedCategories.length > 0 
                ? `${selectedCategories.length} categor${selectedCategories.length === 1 ? 'y' : 'ies'} selected`
                : placeholder
              }
            </span>
            <ChevronDown className={cn('h-4 w-4 shrink-0 opacity-50 ml-2', open && 'rotate-180')} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn('w-full p-0', isRTL ? 'text-right' : 'text-left')}
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search categories..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading categories...
                </div>
              ) : filteredCategories.length === 0 ? (
                <CommandEmpty>No categories found.</CommandEmpty>
              ) : searchQuery ? (
                <CommandGroup>
                  {filteredCategories.map(category => renderCategoryItem(category, category.level || 0))}
                </CommandGroup>
              ) : (
                <CommandGroup>
                  {renderCategoryTree(categories)}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

