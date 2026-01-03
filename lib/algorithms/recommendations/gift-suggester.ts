/**
 * Gift Suggestion Algorithm
 * 
 * Recommends products as gifts based on recipient preferences
 */

import { BaseAlgorithm } from '../base/algorithm-base'
import type { AlgorithmConfig, AlgorithmResult, RecommendationInput } from '../types'
import { createServerSupabase } from '@/lib/supabase/server'

interface Product {
  id: string
  name_en: string | null
  name_ar: string | null
  price: number | null
  image_url: string | null
  brand_id: string | null
  categories?: Array<{ category_id: string }>
}

interface ScoredProduct extends Product {
  score: number
  factors: {
    traitMatch: number
    brandMatch: number
    colorMatch: number
    categoryMatch: number
    priceMatch: number
    popularity: number
  }
}

export class GiftSuggester extends BaseAlgorithm<RecommendationInput, Product> {
  name = 'gift-suggester'
  
  protected getDefaultConfig(): AlgorithmConfig {
    return {
      weights: {
        traitMatch: 0.25,
        brandMatch: 0.20,
        colorMatch: 0.15,
        categoryMatch: 0.20,
        priceMatch: 0.10,
        popularity: 0.10
      },
      thresholds: {
        minScore: 0.3,
        minPriceMatch: 0.5
      },
      limits: {
        maxResults: 20,
        maxCandidates: 100
      },
      params: {}
    }
  }
  
  validate(input: RecommendationInput): boolean {
    return !!(input.preferences || input.recipientId || input.userId)
  }
  
  async execute(
    input: RecommendationInput,
    config?: AlgorithmConfig
  ): Promise<AlgorithmResult<Product>> {
    const startTime = Date.now()
    const mergedConfig = this.mergeConfig(config)
    const supabase = await createServerSupabase()
    
    // 1. Fetch recipient preferences if recipientId provided
    const preferences = await this.fetchPreferences(input, supabase)
    
    // 2. Fetch candidate products
    const candidates = await this.fetchCandidates(input, preferences, supabase, mergedConfig)
    
    // 3. Score each candidate
    const scored = await this.scoreProducts(candidates, preferences, input, mergedConfig, supabase)
    
    // 4. Sort by score
    scored.sort((a, b) => b.score - a.score)
    
    // 5. Apply filters
    const filtered = this.applyFilters(scored, [
      item => item.score >= (mergedConfig.thresholds?.minScore || 0),
      item => item.factors.priceMatch >= (mergedConfig.thresholds?.minPriceMatch || 0)
    ])
    
    // 6. Apply limits
    const results = filtered.slice(0, mergedConfig.limits?.maxResults || 20)
    
    const executionTime = Date.now() - startTime
    
    const result = {
      items: results.map(r => ({
        id: r.id,
        name_en: r.name_en,
        name_ar: r.name_ar,
        price: r.price,
        image_url: r.image_url,
        brand_id: r.brand_id,
        categories: r.categories
      })),
      scores: new Map(results.map(r => [r.id, r.score])),
      metadata: {
        algorithm: this.name,
        executionTime,
        totalCandidates: candidates.length,
        filtersApplied: ['minScore', 'minPriceMatch']
      }
    }
    
    return result
  }
  
  private async fetchPreferences(
    input: RecommendationInput,
    supabase: any
  ): Promise<RecommendationInput['preferences']> {
    if (input.preferences) {
      return input.preferences
    }
    
    if (input.recipientId) {
      // Fetch user preferences from database
      const { data: user } = await supabase
        .from('users')
        .select(`
          user_traits (trait_id),
          user_brands (brand_id),
          user_colors (color_id)
        `)
        .eq('id', input.recipientId)
        .single()
      
      if (user) {
        return {
          traits: user.user_traits?.map((ut: any) => ut.trait_id) || [],
          brands: user.user_brands?.map((ub: any) => ub.brand_id) || [],
          colors: user.user_colors?.map((uc: any) => uc.color_id) || []
        }
      }
    }
    
    return {}
  }
  
  private async fetchCandidates(
    input: RecommendationInput,
    preferences: RecommendationInput['preferences'],
    supabase: any,
    config: AlgorithmConfig
  ): Promise<Product[]> {
    let query = supabase
      .from('products')
      .select(`
        id,
        name_en,
        name_ar,
        price,
        image_url,
        brand_id,
        product_categories (category_id)
      `)
      .eq('is_active', true)
      .eq('is_published', true)
      .limit(config.limits?.maxCandidates || 100)
    
    // Filter by category if provided
    if (input.context?.category) {
      query = query.contains('product_categories', [{ category_id: input.context.category }])
    }
    
    // Filter by brand if provided
    if (input.context?.brand) {
      query = query.eq('brand_id', input.context.brand)
    }
    
    // Exclude products
    if (input.excludeProductIds && input.excludeProductIds.length > 0) {
      query = query.not('id', 'in', `(${input.excludeProductIds.join(',')})`)
    }
    
    // Filter by price range if provided
    if (preferences?.priceRange) {
      if (preferences.priceRange.min) {
        query = query.gte('price', preferences.priceRange.min)
      }
      if (preferences.priceRange.max) {
        query = query.lte('price', preferences.priceRange.max)
      }
    } else if (input.context?.budget) {
      query = query.lte('price', input.context.budget)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching candidates:', error)
      return []
    }
    
    return (data || []).map((p: any) => ({
      ...p,
      categories: p.product_categories || []
    }))
  }
  
  private async scoreProducts(
    products: Product[],
    preferences: RecommendationInput['preferences'],
    input: RecommendationInput,
    config: AlgorithmConfig,
    supabase: any
  ): Promise<ScoredProduct[]> {
    const weights = config.weights || {}
    
    // Fetch additional data for scoring
    const [brandData, categoryData, popularityData] = await Promise.all([
      this.fetchBrandData(products, supabase),
      this.fetchCategoryData(products, supabase),
      this.fetchPopularityData(products, supabase)
    ])
    
    return products.map(product => {
      const factors = {
        traitMatch: this.calculateTraitMatch(product, preferences),
        brandMatch: this.calculateBrandMatch(product, preferences, brandData),
        colorMatch: this.calculateColorMatch(product, preferences),
        categoryMatch: this.calculateCategoryMatch(product, preferences, categoryData),
        priceMatch: this.calculatePriceMatch(product, preferences, input.context),
        popularity: popularityData.get(product.id) || 0
      }
      
      const score = this.calculateWeightedScore(factors, weights)
      
      return {
        ...product,
        score,
        factors
      }
    })
  }
  
  private calculateTraitMatch(
    product: Product,
    preferences?: RecommendationInput['preferences']
  ): number {
    if (!preferences?.traits || preferences.traits.length === 0) return 0.5
    
    // For now, return neutral score
    // TODO: Implement trait matching logic based on product attributes
    return 0.5
  }
  
  private calculateBrandMatch(
    product: Product,
    preferences?: RecommendationInput['preferences'],
    brandData?: Map<string, any>
  ): number {
    if (!preferences?.brands || preferences.brands.length === 0) return 0.5
    if (!product.brand_id) return 0.3
    
    return preferences.brands.includes(product.brand_id) ? 1.0 : 0.0
  }
  
  private calculateColorMatch(
    product: Product,
    preferences?: RecommendationInput['preferences']
  ): number {
    if (!preferences?.colors || preferences.colors.length === 0) return 0.5
    
    // TODO: Extract colors from product images/attributes and match
    return 0.5
  }
  
  private calculateCategoryMatch(
    product: Product,
    preferences?: RecommendationInput['preferences'],
    categoryData?: Map<string, any>
  ): number {
    if (!preferences?.categories || preferences.categories.length === 0) return 0.5
    if (!product.categories || product.categories.length === 0) return 0.3
    
    const productCategoryIds = product.categories.map(c => c.category_id)
    const matchingCategories = preferences.categories.filter(catId =>
      productCategoryIds.includes(catId)
    )
    
    if (matchingCategories.length === 0) return 0.0
    return Math.min(1.0, matchingCategories.length / preferences.categories.length)
  }
  
  private calculatePriceMatch(
    product: Product,
    preferences?: RecommendationInput['preferences'],
    context?: RecommendationInput['context']
  ): number {
    const price = product.price || 0
    const budget = context?.budget || preferences?.priceRange?.max
    
    if (!budget) return 0.5
    
    // Perfect match if within 10% of budget
    if (price <= budget && price >= budget * 0.9) return 1.0
    
    // Good match if within 20%
    if (price <= budget && price >= budget * 0.8) return 0.8
    
    // Acceptable if within budget
    if (price <= budget) return 0.6
    
    // Penalize if over budget
    return Math.max(0, 1 - (price - budget) / budget)
  }
  
  private async fetchBrandData(
    products: Product[],
    supabase: any
  ): Promise<Map<string, any>> {
    const brandIds = [...new Set(products.map(p => p.brand_id).filter(Boolean))]
    if (brandIds.length === 0) return new Map()
    
    const { data } = await supabase
      .from('brands')
      .select('id, name, is_featured, is_verified')
      .in('id', brandIds)
    
    const map = new Map()
    data?.forEach((brand: any) => {
      map.set(brand.id, brand)
    })
    
    return map
  }
  
  private async fetchCategoryData(
    products: Product[],
    supabase: any
  ): Promise<Map<string, any>> {
    const categoryIds = new Set<string>()
    products.forEach(p => {
      p.categories?.forEach(c => categoryIds.add(c.category_id))
    })
    
    if (categoryIds.size === 0) return new Map()
    
    const { data } = await supabase
      .from('categories')
      .select('id, name, level')
      .in('id', Array.from(categoryIds))
    
    const map = new Map()
    data?.forEach((cat: any) => {
      map.set(cat.id, cat)
    })
    
    return map
  }
  
  private async fetchPopularityData(
    products: Product[],
    supabase: any
  ): Promise<Map<string, number>> {
    const productIds = products.map(p => p.id)
    if (productIds.length === 0) return new Map()
    
    // Get view counts, order counts, or rating counts
    // For now, return neutral scores
    // TODO: Implement actual popularity calculation
    const map = new Map<string, number>()
    productIds.forEach(id => {
      map.set(id, 0.5)
    })
    
    return map
  }
}

