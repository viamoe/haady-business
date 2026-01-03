/**
 * Base Algorithm Class
 * 
 * Provides common functionality for all algorithms
 */

import type { Algorithm, AlgorithmConfig, AlgorithmResult } from '../types'

export abstract class BaseAlgorithm<TInput, TOutput> implements Algorithm<TInput, TOutput> {
  abstract name: string
  
  abstract execute(input: TInput, config?: AlgorithmConfig): Promise<AlgorithmResult<TOutput>>
  
  /**
   * Validate input before execution
   * Override in subclasses for specific validation
   */
  validate(input: TInput): boolean {
    return true
  }
  
  /**
   * Calculate weighted score from factors
   */
  protected calculateWeightedScore(
    factors: Record<string, number>,
    weights: Record<string, number> = {}
  ): number {
    return Object.entries(factors).reduce((sum, [key, value]) => {
      const weight = weights[key] || 1.0
      return sum + (value * weight)
    }, 0)
  }
  
  /**
   * Normalize score to 0-1 range
   */
  protected normalizeScore(score: number, min: number, max: number): number {
    if (max === min) return 1
    return Math.max(0, Math.min(1, (score - min) / (max - min)))
  }
  
  /**
   * Apply filters to results
   */
  protected applyFilters<T>(
    items: T[],
    filters: Array<(item: T) => boolean>
  ): T[] {
    return items.filter(item => filters.every(filter => filter(item)))
  }
  
  /**
   * Measure execution time
   */
  protected async measureExecutionTime<T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; time: number }> {
    const start = Date.now()
    const result = await fn()
    const time = Date.now() - start
    return { result, time }
  }
  
  /**
   * Get default configuration
   * Override in subclasses
   */
  protected getDefaultConfig(): AlgorithmConfig {
    return {
      weights: {},
      thresholds: {},
      limits: { maxResults: 10 },
      params: {}
    }
  }
  
  /**
   * Merge user config with defaults
   */
  protected mergeConfig(userConfig?: AlgorithmConfig): AlgorithmConfig {
    const defaultConfig = this.getDefaultConfig()
    return {
      weights: { ...defaultConfig.weights, ...userConfig?.weights },
      thresholds: { ...defaultConfig.thresholds, ...userConfig?.thresholds },
      limits: { ...defaultConfig.limits, ...userConfig?.limits },
      params: { ...defaultConfig.params, ...userConfig?.params }
    }
  }
}

