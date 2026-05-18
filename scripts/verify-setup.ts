#!/usr/bin/env node
/**
 * Verify Bible search system setup
 * Checks all prerequisites and configurations
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

interface VerificationResult {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
}

class SetupVerifier {
    private results: VerificationResult[] = [];
    
    async run() {
        console.log('=== Bible Search System Verification ===\n');
        
        // Dynamically import Mongoose models, DB connections, and providers after env variables are loaded
        const { connectDB } = await import('@/lib/db');
        const { Verse, BibleVersion } = await import('@/models/Bible');
        const { getEmbeddingProvider } = await import('@/lib/search/embeddingProvider');
        const { getReranker } = await import('@/lib/search/reranker');
        
        await this.checkDatabase(connectDB, BibleVersion, Verse);
        await this.checkEmbeddings(getEmbeddingProvider);
        await this.checkReranker(getReranker);
        await this.checkVectorSearch(connectDB, Verse);
        await this.checkData(connectDB, Verse);
        
        this.printResults();
    }
    
    private async checkDatabase(connectDB: any, BibleVersion: any, Verse: any) {
        console.log('Checking database...');
        
        try {
            await connectDB();
            
            const versionCount = await BibleVersion.countDocuments();
            const verseCount = await Verse.countDocuments();
            
            this.results.push({
                name: 'Database Connection',
                status: 'pass',
                message: `Connected. Versions: ${versionCount}, Verses: ${verseCount}`
            });
        } catch (error: any) {
            this.results.push({
                name: 'Database Connection',
                status: 'fail',
                message: error.message
            });
        }
    }
    
    private async checkEmbeddings(getEmbeddingProvider: any) {
        console.log('Checking embedding service...');
        
        try {
            const provider = getEmbeddingProvider();
            const isHealthy = await provider.isHealthy();
            
            if (isHealthy) {
                const dim = provider.getDimension();
                const model = provider.getModelId();
                
                this.results.push({
                    name: 'Embedding Service',
                    status: 'pass',
                    message: `Healthy. Model: ${model}, Dimension: ${dim}`
                });
            } else {
                this.results.push({
                    name: 'Embedding Service',
                    status: 'fail',
                    message: 'Service not responding'
                });
            }
        } catch (error: any) {
            this.results.push({
                name: 'Embedding Service',
                status: 'fail',
                message: error.message
            });
        }
    }
    
    private async checkReranker(getReranker: any) {
        console.log('Checking reranker service...');
        
        try {
            const reranker = getReranker();
            const isHealthy = await reranker.isHealthy();
            
            if (isHealthy) {
                const model = reranker.getModelId();
                const enabled = process.env.RERANKER_ENABLED !== 'false';
                
                this.results.push({
                    name: 'Reranker Service',
                    status: enabled ? 'pass' : 'warn',
                    message: `${enabled ? 'Enabled' : 'Disabled'}. Model: ${model}`
                });
            } else {
                this.results.push({
                    name: 'Reranker Service',
                    status: process.env.RERANKER_ENABLED === 'true' ? 'fail' : 'warn',
                    message: 'Service not responding'
                });
            }
        } catch (error: any) {
            this.results.push({
                name: 'Reranker Service',
                status: process.env.RERANKER_ENABLED === 'true' ? 'fail' : 'warn',
                message: error.message
            });
        }
    }
    
    private async checkVectorSearch(connectDB: any, Verse: any) {
        console.log('Checking vector search index...');
        
        try {
            await connectDB();
            
            // Check if embeddings exist
            const embeddedVerses = await Verse.countDocuments({
                embedding: { $exists: true }
            });
            
            if (embeddedVerses > 0) {
                this.results.push({
                    name: 'Vector Embeddings',
                    status: 'pass',
                    message: `${embeddedVerses} verses have embeddings`
                });
            } else {
                this.results.push({
                    name: 'Vector Embeddings',
                    status: 'warn',
                    message: 'No embeddings found - run backfill-embeddings.ts'
                });
            }
            
            // Note: MongoDB Atlas Vector Search index can't be checked directly from Node.js
            // Must be verified via Atlas console
            this.results.push({
                name: 'Atlas Vector Search Index',
                status: 'warn',
                message: 'Must be verified in MongoDB Atlas console'
            });
        } catch (error: any) {
            this.results.push({
                name: 'Vector Embeddings',
                status: 'fail',
                message: error.message
            });
        }
    }
    
    private async checkData(connectDB: any, Verse: any) {
        console.log('Checking data enrichment...');
        
        try {
            await connectDB();
            
            // Check enrichment
            const enrichedVerses = await Verse.countDocuments({
                $or: [
                    { themes: { $exists: true, $ne: [] } },
                    { emotions: { $exists: true, $ne: [] } }
                ]
            });
            
            const totalVerses = await Verse.countDocuments();
            
            if (enrichedVerses > 0) {
                const percent = Math.round((enrichedVerses / totalVerses) * 100);
                this.results.push({
                    name: 'Verse Enrichment',
                    status: enrichedVerses === totalVerses ? 'pass' : 'warn',
                    message: `${enrichedVerses}/${totalVerses} verses enriched (${percent}%)`
                });
            } else {
                this.results.push({
                    name: 'Verse Enrichment',
                    status: 'warn',
                    message: 'No enrichment found - run enrich-verses.ts'
                });
            }
            
            // Check MongoDB indexes
            const indexes = await Verse.collection.getIndexes();
            const hasReferenceIndex = Object.values(indexes).some((idx: any) =>
                idx.key?.reference === 1
            );
            
            this.results.push({
                name: 'Database Indexes',
                status: hasReferenceIndex ? 'pass' : 'warn',
                message: `${Object.keys(indexes).length} indexes found`
            });
        } catch (error: any) {
            this.results.push({
                name: 'Data Enrichment',
                status: 'fail',
                message: error.message
            });
        }
    }
    
    private printResults() {
        console.log('\n=== Verification Results ===\n');
        
        let passCount = 0;
        let failCount = 0;
        let warnCount = 0;
        
        for (const result of this.results) {
            const icon = result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '⚠';
            console.log(`${icon} ${result.name}`);
            console.log(`  ${result.message}`);
            
            if (result.status === 'pass') passCount++;
            else if (result.status === 'fail') failCount++;
            else warnCount++;
        }
        
        console.log(`\nSummary: ${passCount} passed, ${failCount} failed, ${warnCount} warnings`);
        
        if (failCount > 0) {
            console.log('\nSetup incomplete. See messages above for details.');
            process.exit(1);
        } else if (warnCount > 0) {
            console.log('\nSetup OK with some optional steps pending.');
            process.exit(0);
        } else {
            console.log('\n✓ All checks passed! Ready for production.');
            process.exit(0);
        }
    }
}

// Main
const verifier = new SetupVerifier();
verifier.run().catch(console.error);
