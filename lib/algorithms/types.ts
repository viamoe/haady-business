/**
 * Algorithm Types and Interfaces
 * 
 * Core types for implementing algorithms in the Haady platform
 */

/**
 * Configuration for algorithm execution
 */
export interface AlgorithmConfig {
  /** Weight factors for different scoring components (0-1) */
  weights?: Record<string, number>
  /** Threshold values for filtering results */
  thresholds?: Record<string, number>
  /** Limit values for result sets */
  limits?: Record<string, number>
  /** Additional algorithm-specific parameters */
  params?: Record<string, any>
}

/**
 * Result from algorithm execution
 */
export interface AlgorithmResult<T> {
  /** The ranked/selected items */
  items: T[]
  /** Score map: item ID -> score */
  scores: Map<string, number>
  /** Execution metadata */
  metadata: {
    algorithm: string
    executionTime: number
    totalCandidates: number
    filtersApplied?: string[]
  }
}

/**
 * Base algorithm interface
 */
export interface Algorithm<TInput, TOutput> {
  /** Unique algorithm name */
  name: string
  /** Execute the algorithm */
  execute(input: TInput, config?: AlgorithmConfig): Promise<AlgorithmResult<TOutput>>
  /** Validate input before execution */
  validate(input: TInput): boolean
}

/**
 * Recommendation input
 */
export interface RecommendationInput {
  userId?: string
  recipientId?: string
  preferences?: {
    traits?: string[]
    brands?: string[]
    colors?: string[]
    categories?: string[]
    priceRange?: { min: number; max: number }
  }
  context?: {
    category?: string
    brand?: string
    event?: string
    budget?: number
  }
  excludeProductIds?: string[]
}

/**
 * Matching input
 */
export interface MatchingInput {
  source: any // Product, User, Category, etc.
  target: any
  criteria?: Record<string, any>
}

/**
 * Ranking input
 */
export interface RankingInput {
  items: any[]
  userPreferences?: Record<string, any>
  context?: Record<string, any>
}

