/**
 * Embedding provider abstraction
 * Supports multiple embedding backends (local, remote, etc.)
 * Currently implements local sentence-transformers via Python sidecar
 */

export interface EmbeddingProvider {
    /**
     * Generate embedding for a single text
     */
    embed(text: string): Promise<number[]>;
    
    /**
     * Generate embeddings for multiple texts
     */
    embedBatch(texts: string[]): Promise<number[][]>;
    
    /**
     * Get embedding dimension (384, 768, etc.)
     */
    getDimension(): number;
    
    /**
     * Get model identifier
     */
    getModelId(): string;
    
    /**
     * Check if provider is healthy
     */
    isHealthy(): Promise<boolean>;
}

/**
 * Local embedding provider using Python backend
 * Requires: Python script running as microservice or subprocess
 * 
 * Communication: HTTP to local service or stdio
 */
export class LocalEmbeddingProvider implements EmbeddingProvider {
    private modelId: string;
    private dimension: number;
    private serviceUrl: string;
    private timeout: number;
    
    constructor(
        modelId: string = 'all-MiniLM-L6-v2',
        dimension: number = 384,
        serviceUrl: string = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:8001',
        timeout: number = 30000
    ) {
        this.modelId = modelId;
        this.dimension = dimension;
        this.serviceUrl = serviceUrl;
        this.timeout = timeout;
    }
    
    async embed(text: string): Promise<number[]> {
        const embeddings = await this.embedBatch([text]);
        return embeddings[0] || [];
    }
    
    async embedBatch(texts: string[]): Promise<number[][]> {
        if (texts.length === 0) {
            return [];
        }
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(`${this.serviceUrl}/embed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    texts,
                    model: this.modelId
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Embedding service error: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data.embeddings || [];
        } catch (error: any) {
            console.error('Embedding error:', error.message);
            throw new Error(`Failed to generate embeddings: ${error.message}`);
        }
    }
    
    getDimension(): number {
        return this.dimension;
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
 * Mock/stub embedding provider for development/testing
 * Returns deterministic embeddings based on text hash
 */
export class StubEmbeddingProvider implements EmbeddingProvider {
    private modelId = 'stub-model';
    private dimension = 384;
    
    async embed(text: string): Promise<number[]> {
        return this.generateStubEmbedding(text);
    }
    
    async embedBatch(texts: string[]): Promise<number[][]> {
        return texts.map(text => this.generateStubEmbedding(text));
    }
    
    getDimension(): number {
        return this.dimension;
    }
    
    getModelId(): string {
        return this.modelId;
    }
    
    async isHealthy(): Promise<boolean> {
        return true;
    }
    
    private generateStubEmbedding(text: string): number[] {
        // Deterministic hash-based pseudo-random embedding
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        // Generate embedding based on hash
        const embedding: number[] = [];
        for (let i = 0; i < this.dimension; i++) {
            const value = Math.sin(hash + i) * 0.5 + 0.5; // Normalize to [0, 1]
            embedding.push(value);
        }
        
        return embedding;
    }
}

/**
 * Factory function to get appropriate embedding provider
 */
export function getEmbeddingProvider(): EmbeddingProvider {
    const provider = process.env.EMBEDDING_PROVIDER || 'local';
    
    if (provider === 'stub') {
        return new StubEmbeddingProvider();
    }
    
    // Default to local
    const modelId = process.env.EMBEDDING_MODEL || 'all-MiniLM-L6-v2';
    const dimension = parseInt(process.env.EMBEDDING_DIMENSION || '384', 10);
    const serviceUrl = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:8001';
    
    return new LocalEmbeddingProvider(modelId, dimension, serviceUrl);
}

/**
 * Helper: Generate sample embeddings for testing
 * Returns random vectors in [-1, 1] range
 */
export function generateRandomEmbedding(dimension: number = 384): number[] {
    return Array.from({ length: dimension }, () => Math.random() * 2 - 1);
}

/**
 * Helper: Cosine similarity between two embeddings
 * Used for testing and validation
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error('Embedding dimensions must match');
    }
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        magnitudeA += a[i] * a[i];
        magnitudeB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
    return denominator === 0 ? 0 : dotProduct / denominator;
}
