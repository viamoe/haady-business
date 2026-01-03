"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, ImageIcon, ChevronRight, Package } from "lucide-react"
import { useHeader } from "@/lib/header-context"
import { useRouter } from "next/navigation"
import { useStoreConnection } from "@/lib/store-connection-context"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"
import Image from "next/image"

interface Category {
  id: string
  name: string
  name_ar: string | null
  slug: string
  parent_id: string | null
  level: number
  category_type: 'joyful_gifting' | 'tastes_treats' | 'digital_surprises' | 'moments_meaning' | 'donation_charity' | null
  icon: string | null
  image_url: string | null
  description: string | null
  description_ar: string | null
  is_active: boolean
  is_system: boolean
  is_enabled: boolean
  is_custom: boolean
  sort_order: number
}

export function CategoriesContent() {
  const t = useTranslations()
  const router = useRouter()
  const { setHeaderContent } = useHeader()
  const { storeId } = useStoreConnection()
  const [isLoading, setIsLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [updatingCategories, setUpdatingCategories] = useState<Set<string>>(new Set())

  // Fetch categories
  useEffect(() => {
    if (!storeId) {
      setIsLoading(false)
      return
    }

    const fetchCategories = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/stores/${storeId}/categories`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch categories')
        }

        const data = await response.json()
        setCategories(data.categories || [])
      } catch (error) {
        console.error('Error fetching categories:', error)
        toast.error('Failed to load categories')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [storeId])

  // Set header content
  useEffect(() => {
    setHeaderContent({
      title: 'Categories',
      count: categories.filter(c => c.is_enabled).length,
      searchPlaceholder: 'Search categories...',
      searchValue: searchQuery,
      onSearch: (value) => setSearchQuery(value),
      rightActions: (
        <Button 
          onClick={() => {
            // TODO: Open add category dialog
            toast.info('Add custom category feature coming soon')
          }} 
          size="sm"
          className="bg-[#F4610B] hover:bg-[#E55A0A] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      ),
    })

    return () => {
      setHeaderContent(null)
    }
  }, [categories, searchQuery, setHeaderContent])

  // Toggle category enabled status
  const handleToggleCategory = async (categoryId: string, currentStatus: boolean) => {
    if (!storeId) {
      toast.error('No store selected')
      return
    }

    setUpdatingCategories(prev => new Set(prev).add(categoryId))

    try {
      const response = await fetch(`/api/stores/${storeId}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryId,
          isEnabled: !currentStatus,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update category')
      }

      // Update local state
      setCategories(prev => 
        prev.map(cat => 
          cat.id === categoryId 
            ? { ...cat, is_enabled: !currentStatus }
            : cat
        )
      )

      toast.success(
        !currentStatus 
          ? 'Category enabled successfully' 
          : 'Category disabled successfully'
      )
    } catch (error) {
      console.error('Error toggling category:', error)
      toast.error('Failed to update category')
    } finally {
      setUpdatingCategories(prev => {
        const next = new Set(prev)
        next.delete(categoryId)
        return next
      })
    }
  }

  // Filter categories based on search
  const filteredCategories = categories.filter(category => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    return (
      category.name.toLowerCase().includes(query) ||
      category.name_ar?.toLowerCase().includes(query) ||
      category.description?.toLowerCase().includes(query) ||
      category.description_ar?.toLowerCase().includes(query)
    )
  })

  // Group categories by parent (top-level and subcategories)
  const topLevelCategories = filteredCategories.filter(c => c.level === 0)
  const subcategories = filteredCategories.filter(c => c.level > 0)
  
  // Group subcategories by parent
  const subcategoriesByParent = subcategories.reduce((acc, sub) => {
    const parentId = sub.parent_id || 'none'
    if (!acc[parentId]) acc[parentId] = []
    acc[parentId].push(sub)
    return acc
  }, {} as Record<string, Category[]>)

  if (isLoading) {
    return (
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] border-0">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <Skeleton className="h-32 w-full rounded-lg" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Card className="rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] border-0">
              <CardHeader>
                <CardTitle>Categories</CardTitle>
                <CardDescription>
                  Organize your products into categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-muted-foreground">No categories available</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Categories will appear here once they are loaded
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Default Categories
            </h2>
            <p className="text-sm text-gray-500">
              Enable or disable categories to use with your products. Default categories come with images and descriptions.
            </p>
          </div>

          {filteredCategories.length === 0 ? (
            <Card className="rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] border-0">
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">No categories found matching your search</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topLevelCategories.map((category) => {
                const categorySubcategories = subcategoriesByParent[category.id] || []
                const isUpdating = updatingCategories.has(category.id)

                return (
                  <Card
                    key={category.id}
                    className={cn(
                      "rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] border-0 transition-all hover:shadow-[0_0_80px_rgba(15,23,42,0.12)]",
                      category.is_enabled && "ring-2 ring-[#F4610B]/20"
                    )}
                  >
                    <CardContent className="p-6">
                      {/* Category Image */}
                      <div className="relative h-32 w-full rounded-lg overflow-hidden bg-gray-100 mb-4">
                        {category.image_url ? (
                          <Image
                            src={category.image_url}
                            alt={category.name}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              // Fallback to icon if image fails
                              const target = e.currentTarget
                              target.style.display = 'none'
                              const parent = target.parentElement
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="w-full h-full flex items-center justify-center text-4xl">
                                    ${category.icon || '📦'}
                                  </div>
                                `
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-gray-100 to-gray-200">
                            {category.icon || '📦'}
                          </div>
                        )}
                        {category.is_system && (
                          <Badge className="absolute top-2 right-2 bg-blue-500 text-white text-xs">
                            Default
                          </Badge>
                        )}
                      </div>

                      {/* Category Info */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {category.name}
                            </h3>
                            {category.name_ar && (
                              <p className="text-sm text-gray-500 truncate">
                                {category.name_ar}
                              </p>
                            )}
                          </div>
                          <Switch
                            checked={category.is_enabled}
                            onCheckedChange={() => handleToggleCategory(category.id, category.is_enabled)}
                            disabled={isUpdating}
                            className={cn(
                              "flex-shrink-0",
                              category.is_enabled && "!bg-[#F4610B]"
                            )}
                          />
                        </div>

                        {category.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {category.description}
                          </p>
                        )}

                        {categorySubcategories.length > 0 && (
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-2">
                              {categorySubcategories.length} subcategor{categorySubcategories.length !== 1 ? 'ies' : 'y'}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {categorySubcategories.slice(0, 3).map((sub) => (
                                <Badge
                                  key={sub.id}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {sub.name}
                                </Badge>
                              ))}
                              {categorySubcategories.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{categorySubcategories.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
