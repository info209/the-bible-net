/**
 * Reranker abstraction for semantic search results
 * Uses cross-encoder models to rerank top-K results for improved relevance
 * Optional component - search works fine without it
 */

export interface RerankerResult {
    index: number; // Original index in input array
    score: number; // Rerank score [0, 1]
}

export interface Reranker {
    /**
     * Rerank a list of (query, document) pairs
     * Returns scores for each document
     */
    rerank(query: string, documents: string[]): Promise<RerankerResult[]>;
    
    /**
     * Get model identifier
     */
    getModelId(): string;
    
    /**
     * Check if reranker is healthy
     */
    isHealthy(): Promise<boolean>;
}

/**
 * Local cross-encoder reranker
 * Requires: Python service or sidecar running cross-encoder model
 */
export class LocalCrossEncoderReranker implements Reranker {
    private modelId: string;
    private serviceUrl: string;
    private timeout: number;
    
    constructor(
        modelId: string = 'cross-encoder/ms-marco-MiniLM-L-12-v2',
        serviceUrl: string = process.env.RERANKER_SERVICE_URL || 'http://localhost:8002',
        timeout: number = 30000
    ) {
        this.modelId = modelId;
        this.serviceUrl = serviceUrl;
        this.timeout = timeout;
    }
    
    async rerank(query: string, documents: string[]): Promise<RerankerResult[]> {
        if (documents.length === 0) {
            return [];
        }
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(`${this.serviceUrl}/rerank`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    documents,
                    model: this.modelId
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Reranker service error: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data.results || [];
        } catch (error: any) {
            console.error('Reranker error:', error.message);
            throw new Error(`Failed to rerank results: ${error.message}`);
        }
    }
    
    getModelId(): string {
        return this.modelId;
    }
    
    async isHealthy(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(`${this.serviceUrl}/health`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response.ok;
        } catch {
            return false;
        }
    }
}

/**
 * Stub reranker for testing/development
 * Returns identity reranking (no actual reranking)
 */
export class StubReranker implements Reranker {
    private modelId = 'stub-reranker';
    
    async rerank(query: string, documents: string[]): Promise<RerankerResult[]> {
        // Return same order with score based on document position
        return documents.map((_, index) => ({
            index,
            score: 1 - (index * 0.05) // Slight decay
        }));
    }
    
    getModelId(): string {
        return this.modelId;
    }
    
    async isHealthy(): Promise<boolean> {
        return true;
    }
}

/**
 * No-op reranker that just returns original order with uniform scores
 * Used when reranking is disabled
 */
export class NoOpReranker implements Reranker {
    private modelId = 'noop';
    
    async rerank(query: string, documents: string[]): Promise<RerankerResult[]> {
        return documents.map((_, index) => ({
            index,
            score: 0.5 // Neutral score
        }));
    }
    
    getModelId(): string {
        return this.modelId;
    }
    
    async isHealthy(): Promise<boolean> {
        return true;
    }
}

/**
 * Factory function to get appropriate reranker
 */
export function getReranker(): Reranker {
    const enabled = process.env.RERANKER_ENABLED === 'true';
    
    if (!enabled) {
        return new NoOpReranker();
    }
    
    const rerankerType = process.env.RERANKER_TYPE || 'local';
    
    if (rerankerType === 'stub') {
        return new StubReranker();
    }
    
    // Default to local
    const modelId = process.env.RERANKER_MODEL || 'cross-encoder/ms-marco-MiniLM-L-12-v2';
    const serviceUrl = process.env.RERANKER_SERVICE_URL || 'http://localhost:8002';
    
    return new LocalCrossEncoderReranker(modelId, serviceUrl);
}

/**
 * Merge vector search score and reranker score
 * Configurable weighting strategy
 */
export function mergeScores(
    vectorScore: number,
    rerankScore?: number,
    vectorWeight: number = 0.6,
    rerankWeight: number = 0.4
): number {
    if (rerankScore === undefined) {
        return vectorScore;
    }
    
    return vectorScore * vectorWeight + rerankScore * rerankWeight;
}
