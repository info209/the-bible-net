#!/usr/bin/env node
/**
 * Enrich verses with themes, emotions, and keywords
 * 
 * Usage:
 *   node scripts/enrich-verses.ts --version KJV
 *   node scripts/enrich-verses.ts --all
 *   node scripts/enrich-verses.ts --version KJV --batch-size 100 --update-existing
 */

import { connectDB } from '@/lib/db';
import { Verse, BibleVersion } from '@/models/Bible';
import { enrichVerse, batchEnrichVerses } from '@/lib/search/enrichment';

interface EnrichmentOptions {
    version?: string;
    all: boolean;
    batchSize: number;
    updateExisting: boolean;
    dryRun: boolean;
    verbose: boolean;
}

class VerseEnricher {
    private stats = {
        processed: 0,
        enriched: 0,
        skipped: 0,
        errors: 0,
        startTime: Date.now()
    };
    
    async run(options: EnrichmentOptions) {
        try {
            await connectDB();
            console.log('Connected to database');
            
            // Determine which versions to process
            let versions: any[] = [];
            if (options.all) {
                versions = await BibleVersion.find({ isActive: true });
                console.log(`Found ${versions.length} active versions`);
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
                await this.processVersion(version, options);
            }
            
            this.printStats();
        } catch (error: any) {
            console.error('Fatal error:', error);
            process.exit(1);
        }
    }
    
    private async processVersion(version: any, options: EnrichmentOptions) {
        console.log(`\nProcessing version: ${version.abbreviation}`);
        
        // Find verses that need enrichment
        const query: any = {
            versionCode: version.abbreviation
        };
        
        if (!options.updateExisting) {
            query.$or = [
                { themes: { $size: 0 } },
                { emotions: { $size: 0 } },
                { themes: { $exists: false } },
                { emotions: { $exists: false } }
            ];
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
                .select('_id reference text bookName')
                .skip(processed)
                .limit(options.batchSize)
                .lean();
            
            if (verses.length === 0) break;
            
            try {
                if (options.verbose) {
                    console.log(`Batch ${batchNumber}: Enriching ${verses.length} verses...`);
                }
                
                // Enrich verses
                const enrichments = batchEnrichVerses(
                    verses.map(v => ({
                        reference: v.reference || `${v.bookName} ${v._id}`,
                        text: v.text,
                        bookName: v.bookName
                    }))
                );
                
                // Update verses with enrichment data
                const bulkOps = verses.map((verse, index) => {
                    const enrichment = enrichments[index];
                    return {
                        updateOne: {
                            filter: { _id: verse._id },
                            update: {
                                $set: {
                                    themes: enrichment.themes,
                                    emotions: enrichment.emotions,
                                    keywords: enrichment.keywords,
                                    searchText: enrichment.searchText,
                                    normalizedText: enrichment.normalizedText,
                                    updatedAt: new Date()
                                }
                            }
                        }
                    };
                });
                
                if (!options.dryRun) {
                    const result = await Verse.bulkWrite(bulkOps);
                    this.stats.enriched += result.modifiedCount || 0;
                    
                    if (options.verbose) {
                        console.log(`✓ Updated ${result.modifiedCount} verses`);
                    }
                } else {
                    this.stats.enriched += verses.length;
                    console.log(`[DRY RUN] Would update ${verses.length} verses`);
                }
                
                this.stats.processed += verses.length;
                
                // Progress log
                const percent = Math.round((this.stats.processed / totalCount) * 100);
                console.log(`Progress: ${this.stats.processed}/${totalCount} (${percent}%)`);
                
            } catch (error: any) {
                console.error(`Batch ${batchNumber} error:`, error.message);
                this.stats.errors += verses.length;
                this.stats.processed += verses.length;
            }
        }
    }
    
    private printStats() {
        const elapsed = (Date.now() - this.stats.startTime) / 1000;
        const rate = Math.round(this.stats.processed / elapsed);
        
        console.log('\n=== Enrichment Summary ===');
        console.log(`Processed: ${this.stats.processed}`);
        console.log(`Enriched: ${this.stats.enriched}`);
        console.log(`Skipped: ${this.stats.skipped}`);
        console.log(`Errors: ${this.stats.errors}`);
        console.log(`Time: ${elapsed.toFixed(1)}s`);
        console.log(`Rate: ${rate} verses/sec`);
    }
}

// Parse CLI arguments
function parseArgs(): EnrichmentOptions {
    const args = process.argv.slice(2);
    const options: EnrichmentOptions = {
        all: false,
        batchSize: 100,
        updateExisting: false,
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
            case '--update-existing':
                options.updateExisting = true;
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
const enricher = new VerseEnricher();

console.log('Bible Verse Enricher (Themes, Emotions, Keywords)');
console.log(`Batch size: ${options.batchSize}`);
console.log(`Update existing: ${options.updateExisting}`);
console.log(`Dry run: ${options.dryRun}`);
console.log('');

enricher.run(options).catch(console.error);
