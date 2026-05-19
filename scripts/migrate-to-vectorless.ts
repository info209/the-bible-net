#!/usr/bin/env node
/**
 * Bible Database Vectorless Optimizer & Index Refactoring Migration Script
 * 
 * This script:
 * 1. Connects to MongoDB database.
 * 2. Drops all indexes on the 'verses' collection.
 * 3. Removes deprecated fields (embedding, searchText, embeddingModel, etc.) in a highly memory-efficient database-level operation.
 * 4. Normalizes text in batches for any missing records.
 * 5. Creates exactly the 3 approved indexes.
 * 
 * Usage:
 *   npx tsx scripts/migrate-to-vectorless.ts
 */

import fs from 'fs';
import path from 'path';

// Parse .env.local manually first to ensure environment variables are present during module-level evaluation
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = (match[2] || '').trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
  console.log("Successfully parsed .env.local");
} catch (e: any) {
  console.warn("Failed to parse .env.local:", e.message);
}

async function runMigration() {
    const startTime = Date.now();
    try {
        // Dynamically import database and models after parsing process.env
        const { connectDB } = await import('@/lib/db');
        const { Verse } = await import('@/models/Bible');
        
        console.log('Connecting to database...');
        await connectDB();
        console.log('Connected to database successfully!');

        // 1. Audit and drop unapproved indexes
        console.log('\n--- 1. Index Audit & Cleanup ---');
        const indexes = await Verse.collection.indexes();
        console.log(`Current indexes count: ${indexes.length}`);
        
        for (const idx of indexes) {
            if (idx.name && idx.name !== '_id_') {
                console.log(`Dropping index: ${idx.name}`);
                try {
                    await Verse.collection.dropIndex(idx.name);
                    console.log(`✓ Dropped: ${idx.name}`);
                } catch (err: any) {
                    console.error(`Failed to drop index ${idx.name}:`, err.message);
                }
            }
        }

        // 2. Perform native unset of deprecated fields in database (0 RAM overhead)
        console.log('\n--- 2. Database Field Cleanup ---');
        console.log('Clearing deprecated fields: embedding, searchText, embeddingModel, embeddingGeneratedAt, versionName, testamentName, bookAbbr, __v...');
        const cleanResult = await Verse.collection.updateMany({}, {
            $unset: {
                embedding: "",
                searchText: "",
                embeddingModel: "",
                embeddingGeneratedAt: "",
                versionName: "",
                testamentName: "",
                bookAbbr: "",
                __v: ""
            }
        });
        console.log(`✓ Cleaned fields from ${cleanResult.modifiedCount} verse documents!`);

        // 3. Batch process normalizedText for any unpopulated records
        console.log('\n--- 3. Verse Text Normalization & Initialization ---');
        const totalCount = await Verse.countDocuments();
        console.log(`Total verses in collection: ${totalCount}`);

        const unnormalizedCount = await Verse.countDocuments({ normalizedText: { $exists: false } });
        console.log(`Verses requiring normalizedText: ${unnormalizedCount}`);

        if (unnormalizedCount > 0) {
            let processed = 0;
            const batchSize = 1000;
            
            while (true) {
                const verses = await Verse.find({ normalizedText: { $exists: false } })
                    .limit(batchSize)
                    .select('_id text keywords emotions themes')
                    .lean();
                
                if (verses.length === 0) break;

                const bulkOps = verses.map((v: any) => {
                    const cleanNorm = v.text
                        .toLowerCase()
                        .replace(/[^\w\s\-\']/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    
                    return {
                        updateOne: {
                            filter: { _id: v._id },
                            update: {
                                $set: {
                                    normalizedText: cleanNorm,
                                    keywords: v.keywords || [],
                                    emotions: v.emotions || [],
                                    themes: v.themes || []
                                }
                            }
                        }
                    };
                });

                const writeResult = await Verse.bulkWrite(bulkOps);
                processed += verses.length;
                console.log(`Progress: ${processed}/${unnormalizedCount} (modified: ${writeResult.modifiedCount})`);
            }
            console.log('✓ Text normalization and fields initialization complete!');
        } else {
            // Even if already normalized, let's ensure keywords, emotions, themes are array fields if they are missing
            console.log('All verses have normalizedText. Running a quick check for array initializations...');
            await Verse.updateMany({ keywords: { $exists: false } }, { $set: { keywords: [] } });
            await Verse.updateMany({ emotions: { $exists: false } }, { $set: { emotions: [] } });
            await Verse.updateMany({ themes: { $exists: false } }, { $set: { themes: [] } });
            console.log('✓ Array fields check complete!');
        }

        // 4. Recreate exactly the 3 approved indexes
        console.log('\n--- 4. Index Recreation ---');
        
        console.log('Creating primary verse lookup compound index: { versionCode: 1, bookName: 1, chapterNumber: 1, number: 1 }...');
        await Verse.collection.createIndex({ versionCode: 1, bookName: 1, chapterNumber: 1, number: 1 });
        console.log('✓ Created Primary Lookup Index.');

        console.log('Creating full-text search compound index: { normalizedText: "text", keywords: "text", emotions: "text", themes: "text" }...');
        await Verse.collection.createIndex({ normalizedText: 'text', keywords: 'text', emotions: 'text', themes: 'text' });
        console.log('✓ Created Full-Text Search Index.');

        console.log('Creating reference lookup index: { reference: 1 }...');
        await Verse.collection.createIndex({ reference: 1 });
        console.log('✓ Created Reference Index.');

        // 5. Audit final state
        console.log('\n--- 5. Final Index Audit ---');
        const finalIndexes = await Verse.collection.indexes();
        console.log('Active indexes on collection:');
        finalIndexes.forEach((idx: any) => {
            console.log(`- Name: ${idx.name}, Keys: ${JSON.stringify(idx.key)}`);
        });

        const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n=== Migration Successful! Elapsed time: ${elapsedSeconds}s ===`);
        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ Fatal Migration Error:', error);
        process.exit(1);
    }
}

runMigration();
