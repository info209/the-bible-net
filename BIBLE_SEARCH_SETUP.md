# Bible Semantic Search - Setup & Configuration

## Overview

This document covers setup, configuration, and running the complete Bible semantic search system.

## Prerequisites

- Node.js 18+
- MongoDB Atlas (with Vector Search support)
- Python 3.9+ (for embedding generation)
- 4GB+ RAM for local embeddings

## Environment Variables

Create a `.env.local` file in your project root with the following:

```env
# Database
MONGODB_URI=mongodb+srv://[user]:[password]@cluster.mongodb.net/[database]?retryWrites=true&w=majority

# Embedding Service Configuration
EMBEDDING_PROVIDER=local                          # Options: local, stub
EMBEDDING_MODEL=all-MiniLM-L6-v2                 # Sentence-transformers model
EMBEDDING_DIMENSION=384                          # 384 or 768 depending on model
EMBEDDING_SERVICE_URL=http://localhost:8001      # Local embedding microservice

# Reranker Configuration
RERANKER_ENABLED=true                            # Enable cross-encoder reranking
RERANKER_TYPE=local                              # Options: local, stub, noop
RERANKER_MODEL=cross-encoder/ms-marco-MiniLM-L-12-v2
RERANKER_SERVICE_URL=http://localhost:8002

# Search Configuration
SEARCH_DEFAULT_LIMIT=30
SEARCH_MAX_LIMIT=100
SEARCH_TIMEOUT_MS=30000

# Logging
LOG_LEVEL=info                                   # debug, info, warn, error
VERBOSE_SEARCH_LOGS=false
```

## Phase 1: Start Embedding Service (Local Python Microservice)

The embedding service generates verse embeddings using sentence-transformers.

Create `embedding-service/embedding_service.py`:

```python
#!/usr/bin/env python3
"""
Local embedding service using sentence-transformers
"""

import logging
from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

# Cache model in memory
model = None
MODEL_ID = "all-MiniLM-L6-v2"  # Fast, 384-dim
BATCH_SIZE = 32

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok"})

@app.route('/embed', methods=['POST'])
def embed():
    """
    Generate embeddings for texts
    
    Request:
    {
        "texts": ["text1", "text2", ...],
        "model": "all-MiniLM-L6-v2"  # optional
    }
    
    Response:
    {
        "embeddings": [[...], [...], ...],
        "model": "all-MiniLM-L6-v2",
        "dimension": 384
    }
    """
    global model
    
    data = request.get_json()
    texts = data.get('texts', [])
    model_id = data.get('model', MODEL_ID)
    
    if not texts:
        return jsonify({"error": "No texts provided"}), 400
    
    try:
        # Load model if needed
        if model is None:
            logging.info(f"Loading model: {model_id}")
            model = SentenceTransformer(model_id)
        
        # Generate embeddings in batches
        embeddings = []
        for i in range(0, len(texts), BATCH_SIZE):
            batch = texts[i:i + BATCH_SIZE]
            batch_embeddings = model.encode(batch, convert_to_numpy=True)
            embeddings.extend(batch_embeddings.tolist())
        
        return jsonify({
            "embeddings": embeddings,
            "model": model_id,
            "dimension": len(embeddings[0]) if embeddings else 0,
            "count": len(embeddings)
        })
    except Exception as e:
        logging.error(f"Embedding error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/model', methods=['GET'])
def get_model_info():
    """Get current model information"""
    return jsonify({
        "model": MODEL_ID,
        "dimension": 384
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8001, debug=False)
```

Run the service:

```bash
cd embedding-service
pip install flask sentence-transformers torch
python embedding_service.py
```

### Option B: Alternative - Use Local Node Implementation

If you prefer not to run Python, create a lightweight wrapper using `@xenova/transformers`:

```typescript
// Not recommended for production - Python is faster
// This is a fallback option for environments without Python support
```

## Phase 2: Start Reranker Service (Optional)

The reranker improves semantic search relevance. This is optional - search works fine without it.

Create `reranker-service/reranker_service.py`:

```python
#!/usr/bin/env python3
"""
Cross-encoder reranker service
"""

from flask import Flask, request, jsonify
from sentence_transformers import CrossEncoder
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

model = None
MODEL_ID = "cross-encoder/ms-marco-MiniLM-L-12-v2"

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/rerank', methods=['POST'])
def rerank():
    """
    Rerank documents for a query
    
    Request:
    {
        "query": "user query",
        "documents": ["doc1", "doc2", ...],
        "model": "cross-encoder/ms-marco-MiniLM-L-12-v2"
    }
    
    Response:
    {
        "results": [
            {"index": 0, "score": 0.95},
            {"index": 1, "score": 0.87},
            ...
        ]
    }
    """
    global model
    
    data = request.get_json()
    query = data.get('query')
    documents = data.get('documents', [])
    model_id = data.get('model', MODEL_ID)
    
    if not query or not documents:
        return jsonify({"error": "Query and documents required"}), 400
    
    try:
        if model is None:
            logging.info(f"Loading model: {model_id}")
            model = CrossEncoder(model_id)
        
        # Prepare pairs: [(query, doc1), (query, doc2), ...]
        pairs = [[query, doc] for doc in documents]
        
        # Score all pairs
        scores = model.predict(pairs)
        
        # Normalize scores to [0, 1]
        min_score = float(min(scores))
        max_score = float(max(scores))
        score_range = max_score - min_score if max_score > min_score else 1
        
        results = [
            {
                "index": i,
                "score": float((scores[i] - min_score) / score_range)
            }
            for i in range(len(scores))
        ]
        
        return jsonify({"results": results})
    except Exception as e:
        logging.error(f"Reranking error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8002, debug=False)
```

Run with:

```bash
pip install flask sentence-transformers torch
python reranker-service/reranker_service.py
```

## Phase 3: MongoDB Atlas Configuration

### Step 1: Enable Vector Search on Atlas

1. Go to MongoDB Atlas console
2. Select your cluster
3. Go to **Search** → **Create Search Index**
4. Choose **JSON Editor**
5. Copy the vector index definition (see `MONGODB_INDEXES.md`)
6. Create the index

### Step 2: Create Required Indexes

See `MONGODB_INDEXES.md` for complete index definitions and creation commands.

## Phase 4: Data Ingestion

See `INGESTION.md` for detailed data ingestion instructions including:
- Adding new Bible translations
- Licensing considerations
- Handling different source formats
- Data validation

## Phase 5: Generate Embeddings for Existing Verses

Run the embedding backfill script:

```bash
# Generate embeddings for all verses
node scripts/backfill-embeddings.ts --version KJV

# Or with npm
npm run backfill:embeddings -- --version KJV

# For all versions
node scripts/backfill-embeddings.ts --all

# With options
node scripts/backfill-embeddings.ts --version KJV --batch-size 64 --workers 4
```

See `scripts/backfill-embeddings.ts` for full options.

## Phase 6: Enrich Verses with Themes/Emotions

Run enrichment script to tag verses with themes and emotions:

```bash
# Enrich all verses
node scripts/enrich-verses.ts --all

# Enrich specific version
node scripts/enrich-verses.ts --version KJV

# Options
node scripts/enrich-verses.ts --version KJV --batch-size 100 --update-existing
```

See `scripts/enrich-verses.ts` for full options.

## Phase 7: Verify Setup

Run verification script:

```bash
npm run verify:setup
```

This checks:
- Database connectivity
- Embedding service health
- Reranker service health (if enabled)
- Vector search index existence
- Sample verse count

## Testing

### Manual API Tests

```bash
# Exact reference
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=John+3:16"

# Keyword search
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=fear+not&limit=10"

# Semantic search
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=anxiety"

# With version filter
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=hope+in+Psalms+KJV"

# With reranking
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=comfort&rerank=true"
```

### Running Test Suite

```bash
npm test -- search/

# Or specific tests
npm test -- queryParser.test.ts
npm test -- enrichment.test.ts
```

## Production Deployment

## Production Deployment

This implementation is designed to run locally without Docker. Start the Python embedding service and your Next.js app directly.

### Local Deployment

```bash
# Start embedding service
cd embedding-service
pip install flask sentence-transformers torch
python embedding_service.py &

# Start reranker service (optional)
cd ../reranker-service
pip install flask sentence-transformers torch
python reranker_service.py &

# Start Next.js app
cd ../
npm run dev
```

## Troubleshooting

### Embedding Service Not Responding

```bash
# Check service is running
curl http://localhost:8001/health

# Check Python service output/logs if available

# Test embedding
curl -X POST http://localhost:8001/embed \
  -H "Content-Type: application/json" \
  -d '{"texts": ["test text"]}'
```

### Search Returns No Results

- Verify embeddings were generated: check `VerseEnhanced.embeddingGeneratedAt`
- Verify verses are enriched: check `themes` and `emotions` fields
- Check MongoDB Vector Search index exists
- Verify version code matches (case-sensitive)

### Slow Search Performance

- Increase embedding batch size: `--batch-size 128`
- Enable query caching (if available)
- Verify MongoDB indexes are created
- Check if reranker is necessary (disable if not needed)

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBEDDING_PROVIDER` | `local` | Provider: local, stub |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Sentence-transformers model ID |
| `EMBEDDING_DIMENSION` | `384` | Vector dimension |
| `EMBEDDING_SERVICE_URL` | `http://localhost:8001` | Service endpoint |
| `RERANKER_ENABLED` | `true` | Enable reranking |
| `RERANKER_TYPE` | `local` | Provider: local, stub, noop |
| `RERANKER_MODEL` | `cross-encoder/ms-marco-MiniLM-L-12-v2` | Model ID |
| `RERANKER_SERVICE_URL` | `http://localhost:8002` | Service endpoint |

## Next Steps

1. See `INGESTION.md` for adding Bible translations
2. See `API_REFERENCE.md` for complete API documentation
3. See `TUNING.md` for performance optimization
