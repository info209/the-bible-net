# MongoDB Indexes for Bible Semantic Search

This document defines all required indexes for optimal query performance.

## Vector Search Index (Required)

This index is used for semantic search queries. Must be created via MongoDB Atlas console or Atlas API.

### Using MongoDB Atlas Console

1. Go to your cluster in MongoDB Atlas
2. Click **Search** tab
3. Click **Create Search Index**
4. Choose **JSON Editor**
5. Copy the definition below
6. Create the index

### Index Definition

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "similarity": "cosine",
      "dimensions": 384
    },
    {
      "type": "filter",
      "path": "versionCode"
    },
    {
      "type": "filter",
      "path": "bookName"
    },
    {
      "type": "filter",
      "path": "testamentName"
    },
    {
      "type": "filter",
      "path": "chapterNumber"
    }
  ]
}
```

### Using Atlas API

```bash
#!/bin/bash

PROJECT_ID="your-project-id"
CLUSTER_NAME="your-cluster-name"
INDEX_NAME="verse-semantic-search"

curl --request POST \
  --header 'Content-Type: application/ejson' \
  --header 'Accept: application/json' \
  --digest \
  --user "username:password" \
  "https://data.mongodb-api.com/app/data-xxxxx/endpoint/data/v1/action/insertOne" \
  --data '{
    "database": "your-database",
    "collection": "versenhanceds",
    "document": {
      "index_name": "'$INDEX_NAME'",
      "type": "vectorSearch",
      "fields": [
        {
          "type": "vector",
          "path": "embedding",
          "similarity": "cosine",
          "dimensions": 384
        },
        {
          "type": "filter",
          "path": "versionCode"
        },
        {
          "type": "filter",
          "path": "bookName"
        }
      ]
    }
  }'
```

## Standard MongoDB Indexes

These indexes should be automatically created by Mongoose based on BibleEnhanced schema, but can be manually created for verification:

### VerseEnhanced Indexes

```javascript
// Created by Mongoose via schema
// Reference lookups
db.versehanceds.createIndex({ reference: 1, versionCode: 1 }, { name: "reference_version" })
db.versehanceds.createIndex({ versionCode: 1 })
db.versehanceds.createIndex({ bookName: 1 })
db.versehanceds.createIndex({ testamentName: 1 })
db.versehanceds.createIndex({ chapterNumber: 1 })

// Exact verse lookup
db.versehanceds.createIndex({ versionCode: 1, bookName: 1, chapterNumber: 1, number: 1 }, { unique: true })

// Text search (fallback if not using Atlas Search)
db.versehanceds.createIndex({ searchText: "text" })

// Enrichment metadata
db.versehanceds.createIndex({ themes: 1 })
db.versehanceds.createIndex({ emotions: 1 })
db.versehanceds.createIndex({ embeddingModel: 1 })

// Verse reference
db.versehanceds.createIndex({ chapter: 1, number: 1 }, { unique: true })
```

### BookEnhanced Indexes

```javascript
db.bookhanceds.createIndex({ version: 1, order: 1 })
db.bookhanceds.createIndex({ version: 1, abbreviation: 1 })
db.bookhanceds.createIndex({ name: 1, version: 1 })
```

### ChapterEnhanced Indexes

```javascript
db.chapterhanceds.createIndex({ book: 1, number: 1 }, { unique: true })
db.chapterhanceds.createIndex({ version: 1, book: 1 })
```

### BibleVersionEnhanced Indexes

```javascript
db.bibleversionhanceds.createIndex({ abbreviation: 1 }, { unique: true })
db.bibleversionhanceds.createIndex({ isActive: 1 })
db.bibleversionhanceds.createIndex({ licenseType: 1 })
```

## Creating Indexes via MongoDB Shell

```bash
# Connect to MongoDB
mongosh "mongodb+srv://[user]:[password]@[cluster]/[database]"

# Run index creation script
db.versehanceds.createIndex({ reference: 1, versionCode: 1 })
db.versehanceds.createIndex({ versionCode: 1, bookName: 1, chapterNumber: 1, number: 1 }, { unique: true })
db.versehanceds.createIndex({ searchText: "text" })
db.versehanceds.createIndex({ themes: 1 })
db.versehanceds.createIndex({ emotions: 1 })

db.bookhanceds.createIndex({ version: 1, abbreviation: 1 })
db.chapterhanceds.createIndex({ book: 1, number: 1 }, { unique: true })
```

## Creating Indexes from Node.js

```typescript
import { connectDB } from '@/lib/db';
import { VerseEnhanced, BookEnhanced, ChapterEnhanced, BibleVersionEnhanced } from '@/models/BibleEnhanced';

async function createAllIndexes() {
    await connectDB();
    
    console.log('Creating VerseEnhanced indexes...');
    await VerseEnhanced.collection.createIndex({ reference: 1, versionCode: 1 });
    await VerseEnhanced.collection.createIndex({ searchText: 'text' });
    await VerseEnhanced.collection.createIndex({ themes: 1 });
    await VerseEnhanced.collection.createIndex({ emotions: 1 });
    
    console.log('Creating BookEnhanced indexes...');
    await BookEnhanced.collection.createIndex({ version: 1, abbreviation: 1 });
    
    console.log('Creating ChapterEnhanced indexes...');
    await ChapterEnhanced.collection.createIndex({ version: 1, book: 1 });
    
    console.log('All indexes created successfully!');
}

createAllIndexes().catch(console.error);
```

## Verifying Indexes

### Check Existing Indexes

```bash
# MongoDB shell
db.versehanceds.getIndexes()

# Mongoose in Node.js
const indexes = await VerseEnhanced.collection.getIndexes();
console.log(indexes);
```

### Expected Output

```javascript
{
  "v" : 2,
  "key" : { "_id" : 1 }
},
{
  "v" : 2,
  "key" : { "reference" : 1, "versionCode" : 1 },
  "name" : "reference_version"
},
{
  "v" : 2,
  "key" : { "searchText" : "text" }
},
...
```

## Performance Tuning

### Index Statistics

```bash
# Get index statistics
db.versehanceds.aggregate([
  { $indexStats: { } }
])

# Get detailed stats
db.versehanceds.stats()
```

### Monitoring

Monitor index usage and rebuild if necessary:

```typescript
// Rebuild indexes if corrupted
await VerseEnhanced.collection.reIndex();

// Remove unused indexes
await VerseEnhanced.collection.dropIndex('index_name');
```

## Atlas Vector Search Specific Configuration

### Advanced Vector Search Settings

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "similarity": "cosine",
      "dimensions": 384
    },
    {
      "type": "filter",
      "path": "versionCode"
    },
    {
      "type": "filter",
      "path": "bookName"
    },
    {
      "type": "filter",
      "path": "themes"
    },
    {
      "type": "filter",
      "path": "emotions"
    }
  ],
  "analyzer": {
    "name": "lucene.standard"
  }
}
```

### Testing Vector Search

```javascript
// Aggregate with $search
db.versehanceds.aggregate([
  {
    $search: {
      cosmosSearch: true,
      vector: [0.1, 0.2, -0.1, ...], // 384-dim embedding
      k: 10,
      path: "embedding",
      efSearch: 40
    }
  },
  {
    $project: {
      vectorScore: { $meta: "searchScore" },
      _id: 1,
      reference: 1,
      text: 1,
      themes: 1
    }
  },
  {
    $limit: 10
  }
])
```

## Troubleshooting

### Vector Search Not Returning Results

1. Verify vector index exists: `db.versehanceds.getIndexes()`
2. Verify embeddings exist: `db.versehanceds.countDocuments({ embedding: { $exists: true } })`
3. Check embedding dimension matches index (384)
4. Verify cosine similarity is configured (not dot_product)

### Slow Queries

1. Analyze query with `.explain()`
2. Check index statistics
3. Increase `efSearch` parameter in $search
4. Increase `k` in numCandidates

### Index Build Failure

1. Check MongoDB logs
2. Verify embedding array structure (all same dimension)
3. Drop and recreate index
4. Check for disk space
