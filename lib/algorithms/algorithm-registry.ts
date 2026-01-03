/**
 * Algorithm Registry
 * 
 * Central registry for managing and executing algorithms
 */

import type { Algorithm, AlgorithmConfig, AlgorithmResult } from './types'

export class AlgorithmRegistry {
  private algorithms = new Map<string, Algorithm<any, any>>()
  
  /**
   * Register an algorithm
   */
  register<TInput, TOutput>(algorithm: Algorithm<TInput, TOutput>): void {
    this.algorithms.set(algorithm.name, algorithm)
  }
  
  /**
   * Get an algorithm by name
   */
  get<TInput, TOutput>(name: string): Algorithm<TInput, TOutput> | undefined {
    return this.algorithms.get(name) as Algorithm<TInput, TOutput> | undefined
  }
  
  /**
   * Execute an algorithm
   */
  async execute<TInput, TOutput>(
    name: string,
    input: TInput,
    config?: AlgorithmConfig
  ): Promise<AlgorithmResult<TOutput>> {
    const algorithm = this.get<TInput, TOutput>(name)
    if (!algorithm) {
      throw new Error(`Algorithm "${name}" not found. Available: ${Array.from(this.algorithms.keys()).join(', ')}`)
    }
    
    if (!algorithm.validate(input)) {
      throw new Error(`Invalid input for algorithm "${name}"`)
    }
    
    return algorithm.execute(input, config)
  }
  
  /**
   * List all registered algorithms
   */
  list(): string[] {
    return Array.from(this.algorithms.keys())
  }
  
  /**
   * Check if algorithm exists
   */
  has(name: string): boolean {
    return this.algorithms.has(name)
  }
}

// Singleton instance
let registryInstance: AlgorithmRegistry | null = null

export function getAlgorithmRegistry(): AlgorithmRegistry {
  if (!registryInstance) {
    registryInstance = new AlgorithmRegistry()
  }
  return registryInstance
}

