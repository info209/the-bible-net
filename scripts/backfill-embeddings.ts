#!/usr/bin/env node
/**
 * Backfill embeddings for Bible verses
 * 
 * Usage:
 *   node scripts/backfill-embeddings.ts --version KJV
 *   node scripts/backfill-embeddings.ts --all
 *   node scripts/backfill-embeddings.ts --version KJV --batch-size 64 --workers 4
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

interface BackfillOptions {
    version?: string;
    all: boolean;
    batchSize: number;
    workers: number;
    skipExisting: boolean;
    dryRun: boolean;
    verbose: boolean;
}

class EmbeddingBackfiller {
    private stats = {
        processed: 0,
        generated: 0,
        skipped: 0,
        errors: 0,
        startTime: Date.now()
    };
    
    async run(options: BackfillOptions) {
        try {
            // Dynamically import Mongoose models, DB connections, and embedding provider after environment variables are loaded
            const { connectDB } = await import('@/lib/db');
            const { Verse, BibleVersion } = await import('@/models/Bible');
            const { getEmbeddingProvider } = await import('@/lib/search/embeddingProvider');
            
            console.log('Connecting to database...');
            await connectDB();
            console.log('Connected to database!');
            
            const embeddingProvider = getEmbeddingProvider();
            console.log(`Using Embedding Provider: ${embeddingProvider.getModelId()}`);
            
            // Determine which versions to process
            let versions: any[] = [];
            if (options.all) {
                versions = await BibleVersion.find();
                console.log(`Found ${versions.length} versions in the database`);
            } else if (options.version) {
                const ver = await BibleVersion.findOne({
                    abbreviation: options.version.toUpperCase()
                });
                if (!ver) {
                    console.error(`Version not found: ${options.version}`);
                    process.exit(1);
                }
                versions = [ver];
                console.log(`Processing version: ${ver.abbreviation}`);
            } else {
                console.error('Please specify --version or --all');
                process.exit(1);
            }
            
            // Process each version
            for (const version of versions) {
                await this.processVersion(version, options, Verse, BibleVersion, embeddingProvider);
            }
            
            this.printStats();
            process.exit(0);
        } catch (error: any) {
            console.error('Fatal error:', error);
            process.exit(1);
        }
    }
    
    private async processVersion(version: any, options: BackfillOptions, Verse: any, BibleVersion: any, embeddingProvider: any) {
        console.log(`\nProcessing version: ${version.abbreviation}`);
        
        // Find verses that need embeddings
        const query: any = {
            versionCode: version.abbreviation
        };
        
        if (options.skipExisting) {
            query.embedding = { $exists: false };
        }
        
        const totalCount = await Verse.countDocuments(query);
        console.log(`Total verses to process: ${totalCount}`);
        
        if (totalCount === 0) {
            console.log('No verses to process');
            return;
        }
        
        // Process in batches
        let processed = 0;
        let batchNumber = 0;
        
        while (processed < totalCount) {
            batchNumber++;
            const verses = await Verse.find(query)
                .select('_id reference text searchText embeddingModel')
                .skip(processed)
                .limit(options.batchSize)
                .lean();
            
            if (verses.length === 0) break;
            
            // Generate embeddings for batch
            try {
                const texts = verses.map((v: any) => v.searchText || v.text);
                
                if (options.verbose) {
                    console.log(`Batch ${batchNumber}: Generating ${texts.length} embeddings...`);
                }
                
                const embeddings = await embeddingProvider.embedBatch(texts);
                
                if (embeddings.length !== verses.length) {
                    throw new Error(`Expected ${verses.length} embeddings, got ${embeddings.length}`);
                }
                
                // Update verses with embeddings
                const bulkOps = verses.map((verse: any, index: number) => ({
                    updateOne: {
                        filter: { _id: verse._id },
                        update: {
                            $set: {
                                embedding: embeddings[index],
                                embeddingModel: embeddingProvider.getModelId(),
                                embeddingGeneratedAt: new Date(),
                                updatedAt: new Date()
                            }
                        }
                    }
                }));
                
                if (!options.dryRun) {
                    const result = await Verse.bulkWrite(bulkOps);
                    this.stats.generated += result.modifiedCount || 0;
                    
                    if (options.verbose) {
                        console.log(`✓ Updated ${result.modifiedCount} verses`);
                    }
                } else {
                    this.stats.generated += verses.length;
                    console.log(`[DRY RUN] Would update ${verses.length} verses`);
                }
                
                this.stats.processed += verses.length;
                
                // Progress log
                const percent = Math.round((this.stats.processed / totalCount) * 100);
                console.log(`Progress (${version.abbreviation}): ${this.stats.processed}/${totalCount} (${percent}%)`);
                
            } catch (error: any) {
                console.error(`Batch ${batchNumber} error:`, error.message);
                this.stats.errors += verses.length;
                this.stats.processed += verses.length;
            }
            
            // Add small delay between batches to avoid overload
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Mark version as embedded
        if (!options.dryRun) {
            await BibleVersion.updateOne(
                { _id: version._id },
                {
                    $set: {
                        embeddingsGenerated: true,
                        embeddingsGeneratedAt: new Date()
                    }
                }
            );
        }
    }
    
    private printStats() {
        const elapsed = (Date.now() - this.stats.startTime) / 1000;
        const rate = Math.round(this.stats.processed / elapsed);
        
        console.log('\n=== Backfill Summary ===');
        console.log(`Processed: ${this.stats.processed}`);
        console.log(`Generated: ${this.stats.generated}`);
        console.log(`Skipped: ${this.stats.skipped}`);
        console.log(`Errors: ${this.stats.errors}`);
        console.log(`Time: ${elapsed.toFixed(1)}s`);
        console.log(`Rate: ${rate} verses/sec`);
    }
}

// Parse CLI arguments
function parseArgs(): BackfillOptions {
    const args = process.argv.slice(2);
    const options: BackfillOptions = {
        all: false,
        batchSize: 500, // Safe, large batch size for high-speed backfills
        workers: 1,
        skipExisting: true,
        dryRun: false,
        verbose: false
    };
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--version':
                options.version = args[++i];
                break;
            case '--all':
                options.all = true;
                break;
            case '--batch-size':
                options.batchSize = parseInt(args[++i], 10);
                break;
            case '--workers':
                options.workers = parseInt(args[++i], 10);
                break;
            case '--update-existing':
                options.skipExisting = false;
                break;
            case '--dry-run':
                options.dryRun = true;
                break;
            case '--verbose':
                options.verbose = true;
                break;
        }
    }
    
    return options;
}

// Main
const options = parseArgs();
const backfiller = new EmbeddingBackfiller();

console.log('Bible Verse Embedding Backfiller');
console.log(`Batch size: ${options.batchSize}`);
console.log(`Dry run: ${options.dryRun}`);
console.log('');

backfiller.run(options).catch(console.error);
