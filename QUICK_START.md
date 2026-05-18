# Bible Semantic Search - Quick Start (5 Minutes)

## Prerequisites

- Node.js 18+
- Python 3.9+ (for embedding service)
- MongoDB Atlas account (free tier OK)
- Existing Bible verses in MongoDB

## Step 1: Setup Environment (2 min)

```bash
# Copy config template
cp .env.local.example .env.local

# Edit .env.local with your MongoDB URI
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/bible
```

## Step 2: Start Embedding Service (1 min)

```bash
cd embedding-service
pip install flask sentence-transformers torch
python embedding_service.py &

# Test it
curl http://localhost:8001/health
# Should return: {"status":"ok"}
```

## Step 3: Install Dependencies & Build (1 min)

```bash
npm install
npm run build
```

## Step 4: Migrate Data (automatic if you have existing Verse collection)

```bash
# If you have existing Verse collection, migrate it
npm run migrate:enhanced -- --all --enrich

# If starting fresh, ensure you have VerseEnhanced collection with data
```

## Step 5: Backfill Embeddings (1 min setup, runs in background)

```bash
# Start embedding backfill for all verses
npm run backfill:embeddings -- --all

# Runs in background, progress logged
# ~5-50 verses/sec depending on CPU
```

## Step 6: Test

```bash
# Start dev server in another terminal
npm run dev

# Test exact reference (should be instant)
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=John+3:16"

# Test keyword search (should be fast)
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=fear+not"

# Test semantic search (works once embeddings done)
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=anxiety"
```

✅ **Done! You have a working Bible semantic search system.**

---

## What Just Happened?

Your system now supports:

| Query | Response Time | Use Case |
|-------|----------------|----------|
| `John 3:16` | 1-5ms | Direct verse lookup |
| `fear not` | 10-50ms | Keyword search |
| `anxiety` | 50-200ms | Emotion-based search |
| `hope in Psalms` | 50-200ms | Filtered semantic |

---

## Next: (Optional) Enhanced Ranking

For better semantic relevance (slower but better quality):

```bash
# Start reranker service if available
cd reranker-service
pip install flask sentence-transformers torch
python reranker_service.py &

# Enable in .env.local
# RERANKER_ENABLED=true

# Test
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=comfort&rerank=true"
```

---

## Troubleshooting

### "Embedding service not responding"

```bash
# Check if service is running
curl http://localhost:8001/health

# Restart if needed
# Stop the Python process and start it again
```
### "No results for semantic search"

```bash
# Wait for embeddings to complete
# Check progress
npm run verify:setup

# All verses should have embeddings before semantic search works
```

### "Database connection failed"

```bash
# Check MongoDB URI in .env.local
# Verify connection
npm run verify:setup
```

---

## Full Documentation

- **Setup Guide:** `BIBLE_SEARCH_SETUP.md`
- **API Reference:** `API_REFERENCE.md`
- **Testing:** `TEST_SCENARIOS.md`
- **Database:** `MONGODB_INDEXES.md`
- **Summary:** `IMPLEMENTATION_SUMMARY.md`

---

## Architecture

```
User Query (e.g., "anxiety")
    ↓
API Route (/search-hybrid)
    ↓
Query Parser (extract intent)
    ↓
Smart Router:
  - If exact reference → DB lookup (1-5ms)
  - If keyword → Text search (10-50ms)
  - If semantic → Generate embedding + vector search (50-200ms)
    ↓
Enrich Results:
  - Add themes (comfort, protection, hope)
  - Add emotions (fear, hope, peace)
  - Add scores
    ↓
Return Results:
  {
    "reference": "Psalm 23:4",
    "text": "Yea, though I walk...",
    "themes": ["comfort", "protection"],
    "emotions": ["fear", "hope"],
    "score": 0.92
  }
```

---

## Key Features

✓ **Zero paid services** - Everything self-hosted  
✓ **Fast exact search** - 1-5ms for known references  
✓ **Keyword search** - 10-50ms phrase matching  
✓ **Semantic search** - 50-200ms emotion/meaning-based  
✓ **Smart filters** - Auto-detect version, book, chapter  
✓ **Enriched metadata** - Themes, emotions, keywords per verse  
✓ **Optional reranking** - Improve quality with cross-encoder  
✓ **Production ready** - Indexes, caching, error handling  

---

## Performance

| Component | Time | Notes |
|-----------|------|-------|
| Exact lookup | 1-5ms | Direct DB query |
| Keyword search | 10-50ms | Text index |
| Query embedding | 5-30ms | Local model |
| Vector search | 20-100ms | Atlas Vector Search |
| Reranking | 50-150ms | Optional |
| **Total semantic** | **50-200ms** | With or without rerank |

---

## What's Included

- ✅ Updated MongoDB schemas with embeddings
- ✅ Query parser (extracts book, version, chapter)
- ✅ Three search modes (exact, keyword, semantic)
- ✅ Embedding provider (local Python service)
- ✅ Reranker (optional cross-encoder)
- ✅ Enrichment (themes, emotions, keywords)
- ✅ API endpoint (GET/POST)
- ✅ Backfill scripts (embeddings, enrichment)
- ✅ Migration script (old data → new schema)
- ✅ Verification script (health checks)
- ✅ Complete documentation
- ✅ Test scenarios
- ✅ Local Python service setup

---

### One-Command Startup

```bash
# After .env.local setup, this starts everything:

# Terminal 1: Embedding service
cd embedding-service
python embedding_service.py &

# Terminal 2: Dev server
npm run dev

# Terminal 3: Backfill embeddings (background)
npm run backfill:embeddings -- --all

# Terminal 4: Enrich verses (background)
npm run enrich:verses -- --all

# Then test in Terminal 5:
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=hope"
```

---

## Questions

Refer to full documentation or check test scenarios for expected behavior.

**Ready? Start with Step 1 above!** 🚀
