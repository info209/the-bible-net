# Bible Semantic Search - Test Scenarios & Examples

## Setup for Testing

Before running tests, ensure:

1. Database is running and contains verses
2. Embedding service is running on port 8001
3. Reranker service (optional) running on port 8002
4. Embeddings have been backfilled
5. Verses are enriched with themes/emotions

```bash
# Start embedding service
dd embedding-service
pip install flask sentence-transformers torch
python embedding_service.py &

# Verify setup
npm run verify:setup

# Backfill embeddings
npm run backfill:embeddings -- --all

# Enrich verses
npm run enrich:verses -- --all
```

## Test Scenarios

### Test 1: Exact Reference Lookup

**Objective:** Verify exact reference matching works

**Test Cases:**

```bash
# Case 1.1: John 3:16
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=John+3:16"

# Expected: 
# - mode: "exact"
# - results.length: 1
# - results[0].reference: "John 3:16"
# - processingTimeMs: < 10

# Case 1.2: With version
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=KJV+John+3:16"

# Expected:
# - version.code: "KJV"
# - results[0].reference: "John 3:16"

# Case 1.3: Book abbreviation
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=PSA+23:4"

# Expected:
# - book.abbreviation: "PSA"
# - chapter: 23
# - verse: 4

# Case 1.4: Non-existent verse
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=John+99:99"

# Expected:
# - results.length: 0 (no error, just empty)
```

**Validation Script:**

```typescript
import { parseQuery } from '@/lib/search/queryParser';

test('Exact reference parsing', () => {
  const parsed = parseQuery('John 3:16');
  expect(parsed.bookName).toBe('John');
  expect(parsed.chapter).toBe(3);
  expect(parsed.verse).toBe(16);
  expect(parsed.isExactReference).toBe(true);
  expect(parsed.detectMode).toBe('exact');
});

test('Exact reference with version', () => {
  const parsed = parseQuery('KJV John 3:16');
  expect(parsed.versionCode).toBe('KJV');
  expect(parsed.bookName).toBe('John');
  expect(parsed.verse).toBe(16);
});
```

---

### Test 2: Keyword/Phrase Search

**Objective:** Verify text-based search returns relevant verses

**Test Cases:**

```bash
# Case 2.1: Common phrase
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=fear+not"

# Expected:
# - mode: "keyword"
# - results.length: >= 5
# - All results contain "fear" or "not" in text or themes
# - processingTimeMs: 10-50

# Case 2.2: With limit
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=faith&limit=5"

# Expected:
# - results.length: 5
# - All contain word "faith" or theme "faith"

# Case 2.3: Version filter
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=hope+KJV"

# Expected:
# - All results have version.code: "KJV"

# Case 2.4: Book filter
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=wisdom+Proverbs"

# Expected:
# - All results have book.name: "Proverbs"
# - Contains "wisdom" or related themes

# Case 2.5: Pagination
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=love&limit=10&page=2"

# Expected:
# - pagination.page: 2
# - results.length: up to 10
# - Results differ from page 1
```

**Validation Script:**

```typescript
test('Keyword search returns results', async () => {
  const response = await search('fear not', { mode: 'keyword' });
  expect(response.results.length).toBeGreaterThan(0);
  expect(response.mode).toBe('keyword');
});

test('Version filtering works', async () => {
  const response = await search('hope KJV', { mode: 'keyword' });
  expect(response.results.every(r => r.version.code === 'KJV')).toBe(true);
});

test('Book filtering works', async () => {
  const response = await search('Psalms comfort', { mode: 'keyword' });
  expect(response.results.every(r => r.book.name === 'Psalms')).toBe(true);
});
```

---

### Test 3: Semantic/Emotion Search

**Objective:** Verify emotion-based search finds semantically relevant verses

**Test Cases:**

```bash
# Case 3.1: Simple emotion word
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=anxiety"

# Expected:
# - mode: "semantic"
# - results.length: 30 (default)
# - processingTimeMs: 50-200
# - Results have emotions/themes related to anxiety: fear, worry, peace
# - score.vector present

# Case 3.2: Natural language
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=feeling+lonely+and+abandoned"

# Expected:
# - Results about loneliness, abandonment, God's presence
# - Themes include "comfort", "protection", "fellowship"

# Case 3.3: Complex query
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=hope+in+suffering&limit=20"

# Expected:
# - Results about suffering transformed by hope
# - Verses from Job, Psalms, Romans, 2 Corinthians likely

# Case 3.4: Semantic + book filter
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=grief+in+Psalms"

# Expected:
# - All results from book "Psalms"
# - Semantic scoring on grief-related content

# Case 3.5: Semantic + version filter
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=healing+NIV"

# Expected:
# - All results version.code: "NIV"
# - Semantically related to healing

# Case 3.6: With reranking
curl "http://localhost:3000/api/v1/bible/search-hybrid?q=peace&mode=semantic&rerank=true"

# Expected:
# - score.rerank populated
# - score.final higher quality (combined with vector score)
# - processingTimeMs: 100-300 (slower due to reranking)
```

**Validation Script:**

```typescript
test('Semantic search with emotion', async () => {
  const response = await search('anxiety', { mode: 'semantic' });
  expect(response.results.length).toBeGreaterThan(0);
  expect(response.mode).toBe('semantic');
  expect(response.results[0].score.vector).toBeDefined();
  expect(response.results[0].score.vector).toBeGreaterThan(0.5);
});

test('Semantic search respects book filter', async () => {
  const response = await search('grief in Psalms', { mode: 'semantic' });
  expect(response.results.every(r => r.book.name === 'Psalms')).toBe(true);
});

test('Reranking improves scores', async () => {
  const noRerank = await search('peace', { mode: 'semantic', rerank: false });
  const withRerank = await search('peace', { mode: 'semantic', rerank: true });
  
  // Reranked results should have better top result
  expect(withRerank.results[0].score.final).toBeGreaterThanOrEqual(
    noRerank.results[0].score.final
  );
});
```

---

### Test 4: Query Parsing Edge Cases

**Objective:** Verify query parser handles unusual inputs

**Test Cases:**

```typescript
import { parseQuery } from '@/lib/search/queryParser';

describe('Query Parser Edge Cases', () => {
  test('Empty query', () => {
    const result = parseQuery('');
    expect(result.query).toBe('');
  });

  test('Only whitespace', () => {
    const result = parseQuery('   ');
    expect(result.query).toBe('');
  });

  test('Multiple versions (first wins)', () => {
    const result = parseQuery('KJV NIV John 3:16');
    expect(result.versionCode).toBe('KJV');
  });

  test('Malformed reference (no verse)', () => {
    const result = parseQuery('John 3');
    expect(result.chapter).toBe(3);
    expect(result.verse).toBeUndefined();
  });

  test('Mixed case versions', () => {
    const result1 = parseQuery('kjv test');
    const result2 = parseQuery('KJV test');
    expect(result1.versionCode).toBe('KJV');
    expect(result2.versionCode).toBe('KJV');
  });

  test('Book with unicode', () => {
    const result = parseQuery('हिंदी बाइबल');
    // Should gracefully handle or skip
  });

  test('Special characters', () => {
    const result = parseQuery('faith & hope! "love" (grace)');
    expect(result.query).toBeDefined();
  });

  test('Very long query', () => {
    const longQuery = 'a'.repeat(5000);
    const result = parseQuery(longQuery);
    expect(result.raw.length).toBe(5000);
  });

  test('Multiple books', () => {
    const result = parseQuery('John and Romans');
    // Should extract first book
    expect(result.bookName).toBe('John');
  });
});
```

---

### Test 5: Performance & Load Tests

**Objective:** Verify system performance under load

```bash
# Single request timing
time curl "http://localhost:3000/api/v1/bible/search-hybrid?q=faith"

# Expected: < 500ms total

# Concurrent requests (10 simultaneous)
for i in {1..10}; do
  curl "http://localhost:3000/api/v1/bible/search-hybrid?q=hope" &
done
wait

# Load test with wrk
wrk -t4 -c100 -d30s \
  "http://localhost:3000/api/v1/bible/search-hybrid?q=peace"

# Expected:
# - Requests/sec: > 100
# - Latency p99: < 500ms
# - Errors: 0
```

**Load Test Script (TypeScript):**

```typescript
import fetch from 'node-fetch';

async function loadTest() {
  const queries = ['faith', 'hope', 'love', 'peace', 'strength'];
  const concurrency = 50;
  const iterations = 100;
  const startTime = Date.now();
  
  let successCount = 0;
  let errorCount = 0;
  const latencies: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const promises = [];
    for (let j = 0; j < concurrency; j++) {
      const query = queries[Math.floor(Math.random() * queries.length)];
      promises.push(
        (async () => {
          const t0 = Date.now();
          try {
            const response = await fetch(
              `/api/v1/bible/search-hybrid?q=${query}`
            );
            if (response.ok) {
              successCount++;
              latencies.push(Date.now() - t0);
            } else {
              errorCount++;
            }
          } catch {
            errorCount++;
          }
        })()
      );
    }
    await Promise.all(promises);
  }
  
  const totalTime = Date.now() - startTime;
  latencies.sort((a, b) => a - b);
  
  console.log(`
    Results:
    - Total requests: ${successCount + errorCount}
    - Successful: ${successCount}
    - Errors: ${errorCount}
    - Total time: ${totalTime}ms
    - Throughput: ${(successCount / (totalTime / 1000)).toFixed(0)} req/sec
    - Latency p50: ${latencies[Math.floor(latencies.length * 0.5)]}ms
    - Latency p99: ${latencies[Math.floor(latencies.length * 0.99)]}ms
    - Latency max: ${latencies[latencies.length - 1]}ms
  `);
}
```

---

### Test 6: Data Quality Tests

**Objective:** Verify enrichment and embedding quality

```typescript
import { VerseEnhanced } from '@/models/BibleEnhanced';

describe('Data Quality', () => {
  test('All verses have reference', async () => {
    const count = await VerseEnhanced.countDocuments({
      reference: { $exists: false }
    });
    expect(count).toBe(0);
  });

  test('Embeddings have correct dimension', async () => {
    const verse = await VerseEnhanced.findOne({
      embedding: { $exists: true }
    }).lean();
    
    if (verse) {
      expect(verse.embedding.length).toBe(384); // or configured dim
    }
  });

  test('All enriched verses have themes or emotions', async () => {
    const count = await VerseEnhanced.countDocuments({
      $and: [
        { $or: [{ themes: { $size: 0 } }, { themes: { $exists: false } }] },
        { $or: [{ emotions: { $size: 0 } }, { emotions: { $exists: false } }] }
      ]
    });
    
    // Allow some verses to not be enriched
    expect(count).toBeLessThan(VerseEnhanced.collection.countDocuments() * 0.1);
  });

  test('Duplicate verses are flagged', async () => {
    const duplicates = await VerseEnhanced.aggregate([
      {
        $group: {
          _id: { reference: '$reference', versionCode: '$versionCode' },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    expect(duplicates.length).toBe(0);
  });
});
```

---

## Real-World Test Scenarios

### Scenario A: Daily Devotional User

User searches for morning encouragement:

```
Query: "hope and strength"
Expected: Verses about courage, faith, and God's presence
Books: Likely Psalms, Proverbs, Romans, Ephesians
Processing: 50-150ms
```

### Scenario B: Grief Counselor

Counselor helping someone with loss:

```
Query: "comfort in grief"
Expected: Verses about mourning, comfort, eternal life
Books: Psalms, Romans, 2 Corinthians, 1 Thessalonians
Processing: 50-150ms
```

### Scenario C: Pastor Preparing Sermon

Pastor needs specific verse:

```
Query: "1 Corinthians 13:4"
Expected: Single verse with full context
Mode: exact
Processing: 1-5ms
```

### Scenario D: Deep Study

Scholar exploring theme:

```
Query: "redemption across the Old Testament"
Expected: Many verses from OT about redemption
Processing: Multiple pages needed
```

---

## Troubleshooting Tests

If tests fail, check:

1. **No results returned:**
   - Verify verses exist: `db.versehanceds.count()`
   - Verify embeddings: `db.versehanceds.countDocuments({embedding:{$exists:true}})`
   - Check version code matches exactly

2. **Slow queries (>500ms):**
   - Check indexes: `db.versehanceds.getIndexes()`
   - Check if embeddings are computed
   - Reduce reranking if enabled

3. **Wrong mode selected:**
   - Check query parser output in logs
   - Verify book names are recognized
   - Check version aliases are correct

4. **No enrichment showing:**
   - Run: `npm run enrich:verses -- --all`
   - Check themes and emotions arrays are populated

5. **Service not responding:**
   - Verify embedding service: `curl localhost:8001/health`
   - Verify reranker: `curl localhost:8002/health`
- Check Python service output/logs for the embedding service
