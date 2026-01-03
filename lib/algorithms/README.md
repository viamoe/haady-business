# Algorithm Architecture Guide

This guide explains how to implement algorithms in the Haady platform.

## Directory Structure

```
lib/algorithms/
├── README.md (this file)
├── types.ts (Algorithm interfaces and types)
├── base/
│   └── algorithm-base.ts (Base algorithm class/interface)
├── recommendations/
│   ├── product-recommender.ts
│   ├── gift-suggester.ts
│   └── personalization-engine.ts
├── matching/
│   ├── product-matcher.ts
│   ├── user-preference-matcher.ts
│   └── category-matcher.ts
├── ranking/
│   ├── product-ranker.ts
│   └── search-ranker.ts
└── utils/
    ├── scoring.ts (Scoring utilities)
    └── filters.ts (Filter utilities)
```

## Algorithm Types for Gifting Platform

### 1. **Recommendation Algorithms**
- Product recommendations based on user preferences
- Gift suggestions based on recipient profile
- Similar products (content-based)
- Collaborative filtering (user-based, item-based)
- Hybrid recommendations

### 2. **Matching Algorithms**
- Product-to-user preference matching
- Category-to-brand matching
- Price range matching
- Availability matching

### 3. **Ranking Algorithms**
- Search result ranking
- Product listing ranking
- Trending products
- Personalized ranking

### 4. **Personalization Algorithms**
- User preference learning
- Behavior-based personalization
- Context-aware recommendations

## Implementation Pattern

### Step 1: Define Algorithm Interface

```typescript
// lib/algorithms/types.ts
export interface AlgorithmConfig {
  weights?: Record<string, number>
  thresholds?: Record<string, number>
  limits?: Record<string, number>
}

export interface AlgorithmResult<T> {
  items: T[]
  scores: Map<string, number>
  metadata: {
    algorithm: string
    executionTime: number
    totalCandidates: number
  }
}

export interface Algorithm<TInput, TOutput> {
  name: string
  execute(input: TInput, config?: AlgorithmConfig): Promise<AlgorithmResult<TOutput>>
  validate(input: TInput): boolean
}
```

### Step 2: Create Base Algorithm Class

```typescript
// lib/algorithms/base/algorithm-base.ts
export abstract class BaseAlgorithm<TInput, TOutput> implements Algorithm<TInput, TOutput> {
  abstract name: string
  
  abstract execute(input: TInput, config?: AlgorithmConfig): Promise<AlgorithmResult<TOutput>>
  
  validate(input: TInput): boolean {
    return true // Override in subclasses
  }
  
  protected calculateScore(item: TOutput, factors: Record<string, number>): number {
    // Weighted scoring logic
    return Object.entries(factors).reduce((sum, [key, value]) => {
      return sum + (value * (factors[key] || 0))
    }, 0)
  }
}
```

### Step 3: Implement Specific Algorithm

```typescript
// lib/algorithms/recommendations/product-recommender.ts
export class ProductRecommender extends BaseAlgorithm<RecommendationInput, Product> {
  name = 'product-recommender'
  
  async execute(input: RecommendationInput, config?: AlgorithmConfig): Promise<AlgorithmResult<Product>> {
    const startTime = Date.now()
    
    // 1. Fetch candidate products
    const candidates = await this.fetchCandidates(input)
    
    // 2. Score each candidate
    const scored = candidates.map(product => ({
      product,
      score: this.scoreProduct(product, input, config)
    }))
    
    // 3. Sort by score
    scored.sort((a, b) => b.score - a.score)
    
    // 4. Apply filters and limits
    const results = scored
      .filter(item => item.score >= (config?.thresholds?.minScore || 0))
      .slice(0, config?.limits?.maxResults || 10)
      .map(item => item.product)
    
    return {
      items: results,
      scores: new Map(scored.map(item => [item.product.id, item.score])),
      metadata: {
        algorithm: this.name,
        executionTime: Date.now() - startTime,
        totalCandidates: candidates.length
      }
    }
  }
  
  private scoreProduct(product: Product, input: RecommendationInput, config?: AlgorithmConfig): number {
    const weights = config?.weights || this.getDefaultWeights()
    const factors = {
      preferenceMatch: this.calculatePreferenceMatch(product, input),
      categoryMatch: this.calculateCategoryMatch(product, input),
      priceMatch: this.calculatePriceMatch(product, input),
      popularity: this.calculatePopularity(product),
      recency: this.calculateRecency(product)
    }
    
    return this.calculateScore(product, {
      preferenceMatch: factors.preferenceMatch * weights.preferenceMatch,
      categoryMatch: factors.categoryMatch * weights.categoryMatch,
      priceMatch: factors.priceMatch * weights.priceMatch,
      popularity: factors.popularity * weights.popularity,
      recency: factors.recency * weights.recency
    })
  }
}
```

### Step 4: Create Algorithm Factory/Registry

```typescript
// lib/algorithms/algorithm-registry.ts
export class AlgorithmRegistry {
  private algorithms = new Map<string, Algorithm<any, any>>()
  
  register<TInput, TOutput>(algorithm: Algorithm<TInput, TOutput>) {
    this.algorithms.set(algorithm.name, algorithm)
  }
  
  get<TInput, TOutput>(name: string): Algorithm<TInput, TOutput> | undefined {
    return this.algorithms.get(name) as Algorithm<TInput, TOutput>
  }
  
  async execute<TInput, TOutput>(
    name: string,
    input: TInput,
    config?: AlgorithmConfig
  ): Promise<AlgorithmResult<TOutput>> {
    const algorithm = this.get<TInput, TOutput>(name)
    if (!algorithm) {
      throw new Error(`Algorithm ${name} not found`)
    }
    return algorithm.execute(input, config)
  }
}
```

### Step 5: Use in API Endpoints

```typescript
// app/api/recommendations/route.ts
import { AlgorithmRegistry } from '@/lib/algorithms/algorithm-registry'
import { ProductRecommender } from '@/lib/algorithms/recommendations/product-recommender'

const registry = new AlgorithmRegistry()
registry.register(new ProductRecommender())

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  const strategy = searchParams.get('strategy') || 'product-recommender'
  
  const result = await registry.execute(strategy, {
    userId,
    preferences: await getUserPreferences(userId),
    context: { category: searchParams.get('category') }
  }, {
    weights: {
      preferenceMatch: 0.4,
      categoryMatch: 0.3,
      priceMatch: 0.1,
      popularity: 0.15,
      recency: 0.05
    },
    limits: { maxResults: 20 }
  })
  
  return NextResponse.json({
    recommendations: result.items,
    scores: Object.fromEntries(result.scores),
    metadata: result.metadata
  })
}
```

## Best Practices

1. **Separation of Concerns**: Keep algorithm logic separate from API/business logic
2. **Configurability**: Make algorithms configurable via weights, thresholds, limits
3. **Performance**: Cache results, use database indexes, batch operations
4. **Testing**: Unit test each algorithm independently
5. **Monitoring**: Log execution times, track algorithm performance
6. **A/B Testing**: Support multiple algorithm versions for comparison

## Common Algorithms for Gifting Platform

### 1. Gift Suggestion Algorithm
- Input: Recipient profile (traits, brands, colors, categories)
- Output: Ranked list of products
- Factors: Preference match, category relevance, price range, availability

### 2. Product Similarity Algorithm
- Input: Product ID
- Output: Similar products
- Factors: Category, brand, price range, attributes

### 3. Personalized Ranking Algorithm
- Input: User preferences, product list
- Output: Re-ranked product list
- Factors: User history, preferences, context

### 4. Search Ranking Algorithm
- Input: Search query, products
- Output: Ranked search results
- Factors: Text match, relevance, popularity, recency

