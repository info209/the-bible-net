# Bible Semantic Search - API Reference

## Overview

The Bible semantic search API provides unified access to:
- **Exact reference** lookups (John 3:16)
- **Keyword/phrase** search (fear not)
- **Semantic/emotion** search (anxiety, hope)

## Base URL

```
http://localhost:3000/api/v1/bible
```

## Authentication

Currently no authentication required. Add authentication based on your app's auth strategy.

## Endpoints

### 1. Hybrid Search (GET/POST)

**Endpoint:** `GET /search-hybrid`

**Description:** Unified search with automatic mode detection

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| q | string | Yes | - | Search query |
| mode | string | No | auto | Search mode: auto, exact, keyword, semantic |
| limit | integer | No | 30 | Results per page (max 100) |
| page | integer | No | 1 | Page number |
| rerank | boolean | No | false | Apply cross-encoder reranking |

**Example Requests:**

```bash
# Exact reference
GET /search-hybrid?q=John+3:16

# Keyword search
GET /search-hybrid?q=fear+not&limit=10

# Semantic search
GET /search-hybrid?q=anxiety

# With filters
GET /search-hybrid?q=hope+in+Psalms+KJV

# Force semantic mode
GET /search-hybrid?q=comfort&mode=semantic&limit=20

# With reranking
GET /search-hybrid?q=anxiety&mode=semantic&rerank=true
```

**POST Request Body:**

```json
{
  "q": "verses for anxiety in Psalms KJV",
  "mode": "semantic",
  "limit": 30,
  "page": 1,
  "rerank": false
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "query": "John 3:16",
  "mode": "exact",
  "parsed": {
    "raw": "John 3:16",
    "query": "",
    "bookName": "John",
    "bookAbbr": "JHN",
    "chapter": 3,
    "verse": 16,
    "isExactReference": true,
    "hasVersionFilter": false,
    "hasBookFilter": true,
    "hasChapterFilter": true,
    "hasVerseFilter": true,
    "detectMode": "exact"
  },
  "filters": {
    "bookName": "John",
    "chapter": 3
  },
  "pagination": {
    "limit": 30,
    "page": 1,
    "total": 1
  },
  "results": [
    {
      "verseId": "507f1f77bcf86cd799439011",
      "reference": "John 3:16",
      "text": "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life:",
      "version": {
        "code": "KJV",
        "name": "King James Version"
      },
      "book": {
        "name": "John",
        "abbreviation": "JHN"
      },
      "chapter": 3,
      "verse": 16,
      "themes": ["salvation", "love", "redemption"],
      "emotions": ["hope", "love"],
      "score": {
        "vector": null,
        "rerank": null,
        "lexical": null,
        "final": 1.0
      }
    }
  ],
  "processingTimeMs": 45
}
```

**Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Query parameter \"q\" is required and must be non-empty"
}
```

**Response (500 Server Error):**

```json
{
  "success": false,
  "error": "Search failed: Connection to embedding service failed"
}
```

---

## Search Modes

### Mode: auto (default)

Automatically detects search intent:

| Input Pattern | Detected Mode | Example |
|--------------|--------------|---------|
| Book + Chapter + Verse | exact | "John 3:16" |
| Book + Chapter | keyword | "John 3" |
| Short phrase | keyword | "fear not" |
| Emotion/nature words | semantic | "anxiety", "comfort" |
| Mixed query | semantic | "hope in suffering" |

### Mode: exact

Fast single-verse lookup by reference

**Input:** Book name/abbr + chapter + verse (+ optional version)

**Examples:**
- "John 3:16"
- "KJV John 3:16"
- "PSA 23:4"

**Performance:** ~1ms

### Mode: keyword

Lexical/text-based search using indexes

**Input:** Phrase or keywords (+ optional version/book filter)

**Examples:**
- "fear not"
- "kingdom of God"
- "fear not KJV"
- "comfort in Psalms"

**Performance:** 10-50ms

### Mode: semantic

Embedding-based search for meanings, emotions, themes

**Input:** Natural language query about feelings, situations, themes

**Examples:**
- "anxiety"
- "hope in suffering"
- "healing scriptures in Psalms"
- "verses for grief NIV"

**Performance:** 50-200ms (depends on reranking)

---

## Response Fields

### Top-Level Fields

```typescript
{
  success: boolean;                    // Always present
  query: string;                       // User's input query
  mode: 'exact' | 'keyword' | 'semantic';  // Determined mode
  parsed: ParsedQuery;                 // Parsed query components
  filters: SearchFilters;              // Applied filters
  pagination: PaginationInfo;          // Pagination metadata
  results: VerseSearchResult[];        // Matching verses
  processingTimeMs: number;            // Query execution time
  error?: string;                      // Only on error
}
```

### ParsedQuery

```typescript
{
  raw: string;                         // Original input
  query: string;                       // Residual search text
  versionCode?: string;                // e.g., "KJV"
  bookName?: string;                   // e.g., "Psalms"
  bookAbbr?: string;                   // e.g., "PSA"
  chapter?: number;
  verse?: number;
  isExactReference: boolean;           // Full verse specified
  hasVersionFilter: boolean;
  hasBookFilter: boolean;
  hasChapterFilter: boolean;
  hasVerseFilter: boolean;
  detectMode: 'exact' | 'keyword' | 'semantic';
}
```

### VerseSearchResult

```typescript
{
  verseId: string;                     // MongoDB ObjectId
  reference: string;                   // e.g., "Psalms 23:4"
  text: string;                        // Full verse text
  version: {
    code: string;                      // e.g., "KJV"
    name: string;                      // e.g., "King James Version"
  };
  book: {
    name: string;                      // e.g., "Psalms"
    abbreviation: string;              // e.g., "PSA"
  };
  chapter: number;                     // Chapter number
  verse: number;                       // Verse number
  themes: string[];                    // e.g., ["comfort", "protection"]
  emotions: string[];                  // e.g., ["fear", "hope"]
  score: {
    vector?: number;                   // Semantic score [0, 1]
    rerank?: number;                   // Reranker score [0, 1]
    lexical?: number;                  // Text match score [0, 1]
    final: number;                     // Combined final score [0, 1]
  };
}
```

---

## Example Queries and Expected Results

### Example 1: Exact Reference

**Query:** `John 3:16`

**Expected Response:**
- Mode: exact
- Results: 1 verse
- Processing: ~1-5ms

### Example 2: Keyword Search

**Query:** `fear not`

**Expected Response:**
- Mode: keyword
- Results: 10-50 verses
- Contains phrases like "fear not", "be not afraid"
- Processing: 10-50ms

### Example 3: Emotion/Semantic Search

**Query:** `anxiety`

**Expected Response:**
- Mode: semantic
- Results: 30 verses (by default)
- Contains verses about worry, fear, anxiety (based on semantic similarity)
- Processing: 50-200ms

### Example 4: Filtered Semantic Search

**Query:** `hope in Psalms KJV`

**Expected Response:**
- Mode: semantic
- Filters: Book=Psalms, Version=KJV
- Results: Verses from Psalms in KJV about hope
- Processing: 50-200ms

### Example 5: With Reranking

**Query:** `comfort&rerank=true`

**Expected Response:**
- Mode: semantic
- Reranking applied: rerank score visible
- Results sorted by merged vector + rerank scores
- Processing: 100-300ms (slower due to reranking)

---

## Pagination

Results are paginated using `limit` and `page`:

```bash
# First page
GET /search-hybrid?q=faith&limit=10&page=1

# Second page
GET /search-hybrid?q=faith&limit=10&page=2
```

**Note:** Currently using offset-based pagination. Cursor-based pagination coming soon.

---

## Filtering

Filters are automatically extracted from query:

```bash
# Version filter (automatic)
GET /search-hybrid?q=KJV+John+3:16

# Book filter (automatic)
GET /search-hybrid?q=Psalms+comfort

# Combined
GET /search-hybrid?q=hope+in+Romans+NIV
```

**Supported Filters:**
- Version: e.g., KJV, NIV, ESV, ASV, NASB
- Book: Any Bible book name or abbreviation
- Testament: OT or NT (can be extended)
- Chapter: When specified with exact reference

---

## Error Handling

### Common Errors

| Error | Status | Meaning | Solution |
|-------|--------|---------|----------|
| Query parameter required | 400 | No search query provided | Include `q` parameter |
| Invalid version | 404 | Version not found in database | Check version code |
| Search failed | 500 | Server error or service unavailable | Check logs, retry |
| Embedding service unavailable | 500 | Embedding service not responding | Start embedding service |

### Error Response Format

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

---

## Performance & Optimization

### Typical Performance

| Mode | Latency | Notes |
|------|---------|-------|
| exact | 1-5ms | Direct DB lookup |
| keyword | 10-50ms | Text index search |
| semantic | 50-200ms | Embedding + vector search |
| semantic+rerank | 100-300ms | Additional cross-encoder pass |

### Optimization Tips

1. **Use exact mode** for known references (fastest)
2. **Disable reranking** unless accuracy is critical
3. **Limit results** to reasonable number (10-30)
4. **Cache queries** on frontend for common searches
5. **Batch embed** verses during non-peak hours

### Scaling

- **Large datasets:** Increase batch size in backfill scripts
- **High QPS:** Cache with Redis or similar
- **Global:** Use MongoDB Atlas multi-region replication

---

## Frontend Integration Examples

### React Hook

```tsx
import { useState } from 'react';

function BibleSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const search = async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/bible/search-hybrid?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      setResults(data.results || []);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <input 
        onSearch={(e) => search(e.currentTarget.value)}
        placeholder="Search Bible..."
      />
      {results.map(verse => (
        <div key={verse.verseId}>
          <h3>{verse.reference}</h3>
          <p>{verse.text}</p>
          <tags>{verse.themes.join(', ')}</tags>
        </div>
      ))}
    </div>
  );
}
```

### Query String Building

```javascript
// Build dynamic query
const params = new URLSearchParams({
  q: 'hope',
  limit: '10',
  mode: 'semantic'
});

fetch(`/api/v1/bible/search-hybrid?${params}`);
```

---

## Deprecated Endpoints

The original regex-based search endpoint is replaced:

**Old:**
```bash
GET /api/v1/bible/search?q=John&versionId=KJV
```

**New:**
```bash
GET /api/v1/bible/search-hybrid?q=John+3:16+KJV
```

---

## Future Enhancements

- [ ] Cursor-based pagination
- [ ] Advanced filters UI
- [ ] Search history
- [ ] Saved searches
- [ ] Related verses
- [ ] Verse cross-references
- [ ] Multiple languages
- [ ] Audio playback
