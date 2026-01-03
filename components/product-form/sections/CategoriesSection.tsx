'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProductFormContext } from '../context'
import { AlertCircle } from 'lucide-react'
import type { Category } from '@/lib/types/categories'
import { ImageWithSkeleton } from '@/components/ui/image-with-skeleton'

type CategoryType = 'joyful_gifting' | 'tastes_treats' | 'digital_surprises' | 'moments_meaning' | 'donation_charity'

const CATEGORY_TYPE_LABELS: Record<CategoryType, { name: string; nameAr: string; icon: string }> = {
  joyful_gifting: { name: 'Joyful Gifting', nameAr: 'الهدايا المبهجة', icon: '🎮' },
  tastes_treats: { name: 'Tastes & Treats', nameAr: 'المذاقات والحلويات', icon: '🍔' },
  digital_surprises: { name: 'Digital Surprises', nameAr: 'المفاجآت الرقمية', icon: '📱' },
  moments_meaning: { name: 'Moments & Meaning', nameAr: 'اللحظات والمعاني', icon: '🌸' },
  donation_charity: { name: 'Donation & Charity', nameAr: 'التبرع والصدقة', icon: '❤️' },
}

export function CategoriesSection() {
  const { formData, updateField, errors, clearError, allCategories, isCategoriesLoading, product } = useProductFormContext()
  const [selectedType, setSelectedType] = useState<CategoryType | null>(null)
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const hasInitializedRef = useRef(false)
  
  // Reset initialization when product changes
  useEffect(() => {
    hasInitializedRef.current = false
    setSelectedType(null)
    setSelectedMainCategory(null)
    setExpandedCategories(new Set())
    // Clear the tracking key
    delete (window as any).__lastCategoryIds
  }, [product?.id])

  // Get category types (Level 0)
  const categoryTypes = useMemo(() => {
    return allCategories.filter(cat => cat.level === 0 && cat.category_type !== null) as Array<Category & { category_type: CategoryType }>
  }, [allCategories])

  // Get main categories (Level 1) filtered by selected type
  const mainCategories = useMemo(() => {
    if (!selectedType) {
      // If no type selected, show all Level 1 categories
      return allCategories.filter(cat => cat.level === 1)
    }
    // Find the category type's ID
    const typeCategory = categoryTypes.find(cat => cat.category_type === selectedType)
    if (!typeCategory) return []
    // Get all Level 1 categories that are children of this type
    return allCategories.filter(cat => cat.level === 1 && cat.parent_id === typeCategory.id)
  }, [allCategories, selectedType, categoryTypes])

  // Get subcategories (Level 2+) filtered by selected main category
  const subCategories = useMemo(() => {
    if (!selectedMainCategory) return []
    return allCategories.filter(cat => cat.level >= 2 && cat.parent_id === selectedMainCategory)
  }, [allCategories, selectedMainCategory])

  // Build category tree for navigation
  const getCategoryPath = (categoryId: string): Category[] => {
    const path: Category[] = []
    let currentId: string | null = categoryId
    
    while (currentId) {
      const category = allCategories.find(cat => cat.id === currentId)
      if (!category) break
      path.unshift(category)
      currentId = category.parent_id
    }
    
    return path
  }

  // Get selected category details
  const selectedCategoryDetails = useMemo(() => {
    return formData.selectedCategoryIds.map(id => {
      const category = allCategories.find(cat => cat.id === id)
      if (!category) return null
      const path = getCategoryPath(id)
      return {
        category,
        path,
        pathString: path.map(cat => cat.name).join(' > ')
      }
    }).filter(Boolean) as Array<{ category: Category; path: Category[]; pathString: string }>
  }, [formData.selectedCategoryIds, allCategories])

  // Get category type that contains selected categories
  const getCategoryTypeForCategory = (categoryId: string): CategoryType | null => {
    const category = allCategories.find(cat => cat.id === categoryId)
    if (!category) return null
    
    // Walk up the tree to find the category type (level 0)
    let current: Category | null = category
    while (current) {
      if (current.level === 0 && current.category_type) {
        return current.category_type as CategoryType
      }
      const parentId: string | null = current.parent_id
      if (parentId) {
        current = allCategories.find(cat => cat.id === parentId) || null
      } else {
        break
      }
    }
    return null
  }

  // Get count of selected categories per type
  const selectedCategoriesByType = useMemo(() => {
    const counts: Record<CategoryType, number> = {
      joyful_gifting: 0,
      tastes_treats: 0,
      digital_surprises: 0,
      moments_meaning: 0,
      donation_charity: 0,
    }
    
    formData.selectedCategoryIds.forEach(id => {
      const type = getCategoryTypeForCategory(id)
      if (type) {
        counts[type]++
      }
    })
    
    return counts
  }, [formData.selectedCategoryIds, allCategories])

  // Auto-select category type and main category if product has categories assigned
  useEffect(() => {
    // Only run when categories are loaded
    if (isCategoriesLoading || allCategories.length === 0) {
      return
    }

    // Clear state if no categories selected
    if (formData.selectedCategoryIds.length === 0) {
      return
    }

    // Check if any selected category exists in allCategories
    const validSelectedIds = formData.selectedCategoryIds.filter(id => 
      allCategories.some(cat => cat.id === id)
    )
    
    if (validSelectedIds.length === 0) {
      return
    }

    // Track which category set we've initialized
    const categoryIdsKey = [...formData.selectedCategoryIds].sort().join(',')
    const lastInitialized = (window as any).__lastCategoryIds
    
    // Skip if we've already initialized this exact set
    if (categoryIdsKey === lastInitialized) {
      return
    }

    // Find category type by walking up the tree from the first selected category
    let typeToSelect: CategoryType | null = null
    let mainCategoryToSelect: string | null = null
    const newExpanded = new Set<string>()
    
    for (const categoryId of validSelectedIds) {
      const path = getCategoryPath(categoryId)
      
      // Find category type (level 0) in path
      const typeCategory = path.find(c => c.level === 0 && c.category_type)
      if (typeCategory && !typeToSelect) {
        typeToSelect = typeCategory.category_type as CategoryType
      }
      
      // Expand all categories in the path
      path.forEach(cat => {
        if (cat.level > 0) {
          newExpanded.add(cat.id)
        }
      })
      
      // Find main category (level 1) in path
      const mainCategory = path.find(c => c.level === 1)
      if (mainCategory && !mainCategoryToSelect) {
        mainCategoryToSelect = mainCategory.id
      }
    }
    
    // Apply all changes
    if (typeToSelect) {
      setSelectedType(typeToSelect)
    }
    
    if (newExpanded.size > 0) {
      setExpandedCategories(prev => new Set([...prev, ...newExpanded]))
    }
    
    if (mainCategoryToSelect) {
      setSelectedMainCategory(mainCategoryToSelect)
    }
    
    // Mark this category set as initialized
    (window as any).__lastCategoryIds = categoryIdsKey
    hasInitializedRef.current = true
  }, [formData.selectedCategoryIds, allCategories, isCategoriesLoading])

  const handleCategorySelect = (categoryId: string) => {
    const currentIds = formData.selectedCategoryIds
    if (currentIds.includes(categoryId)) {
      // Deselect
      updateField('selectedCategoryIds', currentIds.filter(id => id !== categoryId))
    } else {
      // Select
      updateField('selectedCategoryIds', [...currentIds, categoryId])
    }
    if (errors.selectedCategoryIds) clearError('selectedCategoryIds')
  }

  const handleRemoveCategory = (categoryId: string) => {
    updateField('selectedCategoryIds', formData.selectedCategoryIds.filter(id => id !== categoryId))
  }

  const toggleCategoryExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }


  // Get children of a category
  const getCategoryChildren = (parentId: string) => {
    return allCategories.filter(cat => cat.parent_id === parentId)
  }

  // Render category tree recursively
  const renderCategoryTree = (categories: Category[], level: number = 1, maxLevel: number = 3): React.ReactNode => {
    if (categories.length === 0 || level > maxLevel) return null

    return (
      <div className={cn('space-y-1', level > 1 && 'ml-6 border-l-2 border-gray-100 pl-4')}>
        {categories.map(category => {
          const isSelected = formData.selectedCategoryIds.includes(category.id)
          const children = getCategoryChildren(category.id)
          const hasChildren = children.length > 0
          const isExpanded = expandedCategories.has(category.id)

          return (
            <div key={category.id} className="space-y-1">
              <div
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                  'hover:bg-gray-50',
                  isSelected && 'bg-[#F4610B]/10 border border-[#F4610B]/20',
                  !isSelected && 'border border-transparent'
                )}
                onClick={() => handleCategorySelect(category.id)}
              >
                <div className={cn(
                  'flex items-center justify-center w-5 h-5 rounded border-2 transition-colors',
                  isSelected 
                    ? 'bg-[#F4610B] border-[#F4610B]' 
                    : 'border-gray-300 hover:border-[#F4610B]'
                )}>
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
                
                {category.icon && (
                  <span className="text-lg">{category.icon}</span>
                )}
                
                <span className="flex-1 text-sm font-medium text-gray-900">
                  {category.name}
                </span>

                {hasChildren && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleCategoryExpand(category.id)
                    }}
                  >
                    <ChevronRight className={cn(
                      'h-4 w-4 transition-transform',
                      isExpanded && 'rotate-90'
                    )} />
                  </Button>
                )}
              </div>

              {hasChildren && isExpanded && (
                <div className="mt-1">
                  {renderCategoryTree(children, level + 1, maxLevel)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4 p-5 bg-white rounded-2xl border border-gray-200 mb-8">
      <div className="space-y-2">
        <Label 
          className={cn("flex items-center gap-2 text-sm font-semibold", errors.selectedCategoryIds ? 'text-red-600' : 'text-gray-900')}
        >
          Product Category{' '}
          {formData.selectedCategoryIds.length === 0 && (
            <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
              required
            </span>
          )}
        </Label>
      </div>

      {/* Selected Category Path Display */}
      {selectedCategoryDetails.length > 0 && selectedCategoryDetails[0] && (() => {
        const firstSelected = selectedCategoryDetails[0]
        const typeCategory = firstSelected.path.find(c => c.level === 0 && c.category_type)
        const mainCategory = firstSelected.path.find(c => c.level === 1)
        const selectedSubCategory = firstSelected.path.find(c => c.level >= 2)
        
        // Get all subcategories of the main category (not just the selected one)
        const allSubCategories = mainCategory ? getCategoryChildren(mainCategory.id) : []
        
        return (
          <div className="space-y-4">
            {/* Selected Category Type */}
            {typeCategory && (
              <div className="p-4 rounded-xl border-2 border-[#F4610B] bg-[#F4610B]/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{typeCategory.icon || CATEGORY_TYPE_LABELS[typeCategory.category_type as CategoryType]?.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {typeCategory.name || CATEGORY_TYPE_LABELS[typeCategory.category_type as CategoryType]?.name}
                        </span>
                        <Check className="h-4 w-4 text-[#F4610B]" />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {mainCategories.filter(c => c.parent_id === typeCategory.id).length} categories available
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedType(null)
                      setSelectedMainCategory(null)
                    }}
                    className="text-xs font-medium text-[#F4610B] hover:text-[#E5550A]"
                  >
                    Change Type &gt;
                  </button>
                </div>
              </div>
            )}

            {/* Selected Main Category */}
            {mainCategory && (
              <div className="p-4 rounded-xl border-2 border-[#F4610B] bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {mainCategory.image_url ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <ImageWithSkeleton
                          src={mainCategory.image_url}
                          alt={mainCategory.name}
                          className="w-full h-full object-cover"
                          skeletonClassName="w-full h-full"
                          containerClassName="w-full h-full"
                          objectFit="cover"
                        />
                      </div>
                    ) : mainCategory.icon ? (
                      <span className="text-2xl">{mainCategory.icon}</span>
                    ) : null}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">{mainCategory.name}</span>
                        <Check className="h-4 w-4 text-[#F4610B] flex-shrink-0" />
                      </div>
                      {mainCategory.description && (
                        <p className="text-xs text-gray-500">{mainCategory.description}</p>
                      )}
                      
                      {/* Subcategories */}
                      {allSubCategories.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          {allSubCategories.map(subCat => {
                            const isSelected = formData.selectedCategoryIds.includes(subCat.id)
                            return (
                              <div
                                key={subCat.id}
                                className={cn(
                                  'p-3 rounded-lg border-2 cursor-pointer transition-all',
                                  isSelected
                                    ? 'border-[#F4610B] bg-[#F4610B]/5'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                )}
                                onClick={() => handleCategorySelect(subCat.id)}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  {subCat.icon && <span className="text-lg">{subCat.icon}</span>}
                                  <span className="text-xs font-semibold text-gray-900 flex-1">{subCat.name}</span>
                                  {isSelected && <Check className="h-3 w-3 text-[#F4610B]" />}
                                </div>
                                {subCat.description && (
                                  <p className="text-xs text-gray-500 line-clamp-1">{subCat.description}</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMainCategory(null)}
                    className="text-xs font-medium text-[#F4610B] hover:text-[#E5550A] flex-shrink-0"
                  >
                    Change Category &gt;
                  </button>
                </div>
              </div>
            )}

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-sm">
              {firstSelected.path.map((cat, index) => (
                <div key={cat.id} className="flex items-center gap-2">
                  {index > 0 && <span className="text-gray-400">→</span>}
                  <div className="flex items-center gap-1.5">
                    {cat.icon && <span className="text-base">{cat.icon}</span>}
                    <span className={cn(
                      'font-medium',
                      index === firstSelected.path.length - 1 ? 'text-[#F4610B]' : 'text-gray-600'
                    )}>
                      {cat.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Category Type Selection (Level 0) - Only show if no type selected */}
      {!selectedType && (
        <div className="space-y-3">
          <Label className="text-xs font-medium text-gray-700">1. Select Category Type</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categoryTypes.map(typeCategory => {
            const typeInfo = CATEGORY_TYPE_LABELS[typeCategory.category_type!]
            const isSelected = selectedType === typeCategory.category_type
            const selectedCount = selectedCategoriesByType[typeCategory.category_type!]
            const hasSelectedCategories = selectedCount > 0
            
            return (
              <button
                key={typeCategory.id}
                type="button"
                onClick={() => {
                  setSelectedType(isSelected ? null : (typeCategory.category_type as CategoryType))
                  setSelectedMainCategory(null)
                }}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left relative',
                  'hover:border-[#F4610B] hover:shadow-md',
                  isSelected 
                    ? 'border-[#F4610B] bg-[#F4610B]/5 shadow-md' 
                    : hasSelectedCategories
                    ? 'border-[#F4610B]/40 bg-[#F4610B]/5'
                    : 'border-gray-200 bg-white'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{typeInfo.icon}</span>
                  <span className="text-sm font-semibold text-gray-900">{typeInfo.name}</span>
                </div>
                {hasSelectedCategories && (
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {!isSelected && <Check className="h-4 w-4 text-[#F4610B]" />}
                    <div className="h-5 w-5 rounded-full bg-[#F4610B] flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{selectedCount}</span>
                    </div>
                  </div>
                )}
              </button>
            )
          })}
          </div>
        </div>
      )}

      {/* Main Categories (Level 1) - Only show if type selected but no main category selected */}
      {selectedType && !selectedMainCategory && mainCategories.length > 0 && (
        <div className="space-y-3">
          <Label className="text-xs font-medium text-gray-700">2. Select Main Category</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-2">
            {mainCategories.map(category => {
              const isSelected = formData.selectedCategoryIds.includes(category.id)
              const children = getCategoryChildren(category.id)
              const hasChildren = children.length > 0

              return (
                <div
                  key={category.id}
                  className={cn(
                    'p-4 rounded-xl border-2 transition-all cursor-pointer',
                    'hover:border-[#F4610B] hover:shadow-md',
                    isSelected 
                      ? 'border-[#F4610B] bg-[#F4610B]/5 shadow-md' 
                      : 'border-gray-200 bg-white'
                  )}
                  onClick={() => {
                    handleCategorySelect(category.id)
                    if (hasChildren) {
                      setSelectedMainCategory(selectedMainCategory === category.id ? null : category.id)
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {category.image_url ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative">
                        <ImageWithSkeleton
                          src={category.image_url}
                          alt={category.name}
                          hoverImageSrc={category.hover_image_url || undefined}
                          className="w-full h-full object-cover"
                          skeletonClassName="w-full h-full"
                          containerClassName="w-full h-full"
                          objectFit="cover"
                        />
                      </div>
                    ) : category.icon ? (
                      <span className="text-2xl">{category.icon}</span>
                    ) : null}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">{category.name}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-[#F4610B] flex-shrink-0" />
                        )}
                      </div>
                      {category.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">{category.description}</p>
                      )}
                      {hasChildren && (
                        <p className="text-xs text-[#F4610B] mt-1 font-medium">
                          {children.length} subcategor{children.length === 1 ? 'y' : 'ies'} available
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Subcategories (Level 2+) - Show when main category is selected */}
      {selectedMainCategory && subCategories.length > 0 && (
        <div className="space-y-3">
          <Label className="text-xs font-medium text-gray-700">3. Select Sub Categories (Optional)</Label>
          <div className="border border-gray-200 rounded-xl p-4 max-h-96 overflow-y-auto">
            {renderCategoryTree(subCategories, 2, 4)}
          </div>
        </div>
      )}

      {/* Alternative: Show all categories in tree view if no type selected */}
      {!selectedType && mainCategories.length > 0 && (
        <div className="space-y-3">
          <Label className="text-xs font-medium text-gray-700">Or browse all categories:</Label>
          <div className="border border-gray-200 rounded-xl p-4 max-h-96 overflow-y-auto">
            {renderCategoryTree(mainCategories, 1, 4)}
          </div>
        </div>
      )}

      {/* Error Message */}
      {errors.selectedCategoryIds && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {errors.selectedCategoryIds}
        </p>
      )}
    </div>
  )
}

