/**
 * Algorithms Module
 * 
 * Main entry point for algorithms
 */

export * from './types'
export * from './base/algorithm-base'
export * from './algorithm-registry'
export * from './recommendations/gift-suggester'

// Re-export for convenience
export { getAlgorithmRegistry } from './algorithm-registry'

