/**
 * Bible search service
 * Re-exports the new high-performance vectorless hybrid semantic-like pipeline
 */

import { BibleSearchService } from './pipeline/searchPipeline';

// Re-export everything from searchPipeline for backward compatibility
export * from './pipeline/searchPipeline';

/**
 * Factory function to create search service
 * Accepting optional arguments for backward-compatibility with vector-based callers
 */
export function createBibleSearchService(
    embeddingProvider?: any,
    reranker?: any
): BibleSearchService {
    return new BibleSearchService();
}
