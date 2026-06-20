#!/usr/bin/env node
/**
 * In-place Database Denormalization and enrichment for Bible search
 * 
 * This script:
 * 1. Reads from Verse/Book/Chapter/BibleVersion collections
 * 2. Populates denormalized metadata (e.g. versionCode, bookName, reference)
 * 3. Enriches verses with themes, emotions, keywords, searchText, normalizedText
 * 4. Saves the results directly back to the original documents in-place
 * 
 * Usage:
 *   npx tsx scripts/migrate-to-enhanced.ts --version KJV
 *   npx tsx scripts/migrate-to-enhanced.ts --all
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

interface MigrationOptions {
    version?: string;
    all: boolean;
    batchSize: number;
    enrich: boolean;
    dryRun: boolean;
    verbose: boolean;
}

class VerseMigrator {
    private stats = {
        processed: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        startTime: Date.now()
    };
    
    async run(options: MigrationOptions) {
        try {
            // Dynamically import database and models AFTER setting process.env properties
            const { connectDB } = await import('@/lib/db');
            const { Verse, Book, Chapter, BibleVersion } = await import('@/models/Bible');
            
            console.log('Connecting to database...');
            await connectDB();
            console.log('Connected to database!');
            
            // 1. Process versions in-place
            console.log('\nProcessing BibleVersion documents in-place...');
            await this.processVersions(options, BibleVersion, Verse);
            
            // 2. Process book documents in-place
            console.log('\nProcessing Book documents in-place...');
            await this.processBooks(options, BibleVersion, Book, Chapter, Verse);
            
            // 3. Process chapter documents in-place
            console.log('\nProcessing Chapter documents in-place...');
            await this.processChapters(options, BibleVersion, Chapter, Verse);
            
            // 4. Process verse documents in-place
            console.log('\nProcessing Verse documents in-place...');
            await this.processVerses(options, BibleVersion, Verse);
            
            this.printStats();
            process.exit(0);
        } catch (error: any) {
            console.error('Fatal error:', error);
            process.exit(1);
        }
    }
    
    private async processVersions(options: MigrationOptions, BibleVersion: any, Verse: any) {
        let versions: any[] = [];
        if (options.all) {
            versions = await BibleVersion.find();
        } else if (options.version) {
            const ver = await BibleVersion.findOne({
                abbreviation: options.version.toUpperCase()
            });
            if (ver) versions = [ver];
        } else {
            versions = await BibleVersion.find().limit(1);
        }
        
        for (const ver of versions) {
            if (options.dryRun) {
                console.log(`[DRY RUN] Would update version properties: ${ver.abbreviation}`);
                continue;
            }
            
            // Count verses for this version
            const versesCount = await Verse.countDocuments({ version: ver._id });
            
            const licenseType = ver.licenseType || 'public-domain';
            await BibleVersion.updateOne(
                { _id: ver._id },
                { $set: { licenseType, versesCount } }
            );
            console.log(`✓ Updated version ${ver.abbreviation} (verses: ${versesCount})`);
        }
    }
    
    private async processBooks(options: MigrationOptions, BibleVersion: any, Book: any, Chapter: any, Verse: any) {
        let versions: any[] = [];
        if (options.all) {
            versions = await BibleVersion.find();
        } else if (options.version) {
            const ver = await BibleVersion.findOne({
                abbreviation: options.version.toUpperCase()
            });
            if (ver) versions = [ver];
        } else {
            versions = await BibleVersion.find().limit(1);
        }
        
        for (const ver of versions) {
            const books = await Book.find({ version: ver._id });
            for (const book of books) {
                if (options.dryRun) {
                    continue;
                }
                const chaptersCount = await Chapter.countDocuments({ book: book._id });
                const versesCount = await Verse.countDocuments({ book: book._id });
                
                await Book.updateOne(
                    { _id: book._id },
                    { $set: { chaptersCount, versesCount } }
                );
            }
            console.log(`✓ Updated books for version ${ver.abbreviation}`);
        }
    }
    
    private async processChapters(options: MigrationOptions, BibleVersion: any, Chapter: any, Verse: any) {
        let versions: any[] = [];
        if (options.all) {
            versions = await BibleVersion.find();
        } else if (options.version) {
            const ver = await BibleVersion.findOne({
                abbreviation: options.version.toUpperCase()
            });
            if (ver) versions = [ver];
        } else {
            versions = await BibleVersion.find().limit(1);
        }
        
        for (const ver of versions) {
            const chapters = await Chapter.find({ version: ver._id });
            for (const chap of chapters) {
                if (options.dryRun) {
                    continue;
                }
                const versesCount = await Verse.countDocuments({ chapter: chap._id });
                await Chapter.updateOne(
                    { _id: chap._id },
                    { $set: { versesCount } }
                );
            }
            console.log(`✓ Updated chapters for version ${ver.abbreviation}`);
        }
    }
    
    private async processVerses(options: MigrationOptions, BibleVersion: any, Verse: any) {
        // Dynamically import enrichment function to prevent top-level hoist errors
        const { enrichVerse } = await import('@/lib/search/enrichment');
        
        let versions: any[] = [];
        if (options.all) {
            versions = await BibleVersion.find();
        } else if (options.version) {
            const ver = await BibleVersion.findOne({
                abbreviation: options.version.toUpperCase()
            });
            if (ver) versions = [ver];
        } else {
            versions = await BibleVersion.find().limit(1);
        }
        
        for (const ver of versions) {
            console.log(`Denormalizing/enriching verses for ${ver.abbreviation}...`);
            
            const totalCount = await Verse.countDocuments({ version: ver._id });
            console.log(`Total verses in ${ver.abbreviation}: ${totalCount}`);
            
            let processed = 0;
            
            while (processed < totalCount) {
                const oldVerses = await Verse.find({ version: ver._id })
                    .populate('book')
                    .populate('chapter')
                    .skip(processed)
                    .limit(options.batchSize);
                
                if (oldVerses.length === 0) break;
                
                const bulkOps = [];
                for (const oldVerse of oldVerses) {
                    const book = oldVerse.book as any;
                    const chapter = oldVerse.chapter as any;
                    
                    if (!book || !chapter) {
                        this.stats.skipped++;
                        continue;
                    }
                    
                    const reference = `${book.name} ${chapter.number}:${oldVerse.number}`;
                    
                    let enrichment = {
                        themes: oldVerse.themes || [],
                        emotions: oldVerse.emotions || [],
                        keywords: oldVerse.keywords || [],
                        searchText: oldVerse.searchText || `${reference} ${oldVerse.text}`,
                        normalizedText: oldVerse.normalizedText || oldVerse.text.toLowerCase()
                    };
                    
                    if (options.enrich) {
                        enrichment = enrichVerse({
                            reference,
                            text: oldVerse.text,
                            bookName: book.name
                        });
                    }
                    
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: oldVerse._id },
                            update: {
                                $set: {
                                    versionCode: ver.abbreviation,
                                    versionName: ver.name,
                                    bookName: book.name,
                                    bookAbbr: book.abbreviation,
                                    testamentName: book.testament,
                                    chapterNumber: chapter.number,
                                    reference,
                                    ...enrichment
                                }
                            }
                        }
                    });
                }
                
                if (bulkOps.length > 0 && !options.dryRun) {
                    const result = await Verse.bulkWrite(bulkOps);
                    this.stats.updated += result.modifiedCount || 0;
                } else {
                    this.stats.updated += bulkOps.length;
                }
                
                processed += oldVerses.length;
                this.stats.processed += oldVerses.length;
                const percent = Math.round((processed / totalCount) * 100);
                console.log(`Progress (${ver.abbreviation}): ${processed}/${totalCount} (${percent}%)`);
            }
        }
    }
    
    private printStats() {
        const elapsed = (Date.now() - this.stats.startTime) / 1000;
        console.log('\n=== In-place Upgrade Summary ===');
        console.log(`Processed: ${this.stats.processed}`);
        console.log(`Updated: ${this.stats.updated}`);
        console.log(`Skipped: ${this.stats.skipped}`);
        console.log(`Errors: ${this.stats.errors}`);
        console.log(`Time: ${elapsed.toFixed(1)}s`);
    }
}

// Parse CLI arguments
function parseArgs(): MigrationOptions {
    const args = process.argv.slice(2);
    const options: MigrationOptions = {
        all: false,
        batchSize: 500,
        enrich: true,
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
            case '--no-enrich':
                options.enrich = false;
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
const migrator = new VerseMigrator();

console.log('Bible In-place Database Upgrader');
console.log(`Batch size: ${options.batchSize}`);
console.log(`Enrich: ${options.enrich}`);
console.log(`Dry run: ${options.dryRun}`);
console.log('');

migrator.run(options).catch(console.error);
