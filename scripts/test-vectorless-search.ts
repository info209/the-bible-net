#!/usr/bin/env node
/**
 * Bible Vectorless Search Verification & Benchmark Script
 * 
 * Usage:
 *   npx tsx scripts/test-vectorless-search.ts
 */

import fs from 'fs';
import path from 'path';

// Parse .env.local manually first
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
} catch (e: any) {
  console.warn("Failed to parse .env.local:", e.message);
}

async function runTests() {
    console.log('Bible Vectorless Search Verification');
    console.log('====================================');
    
    try {
        const { connectDB } = await import('@/lib/db');
        const { createBibleSearchService } = await import('@/lib/search/bibleSearchService');
        
        console.log('Connecting to database...');
        await connectDB();
        
        const searchService = createBibleSearchService();
        
        const testQueries = [
            'John 3:16',          // Exact Reference
            'fear not',           // Phrase & stem match
            'feeling scared',     // Synonym expansion (scared -> fear/afraid/anxiety)
            'Gods love',          // Theme and emotion match (love -> compassion/lovingkindness)
            'hopelessness'        // Stem and despair match
        ];
        
        for (const query of testQueries) {
            console.log(`\n🔍 Searching: "${query}"`);
            console.log('------------------------------------');
            
            const response = await searchService.search(query, { limit: 3 });
            
            if (!response.success) {
                console.error('❌ Search failed:', response.error);
                continue;
            }
            
            console.log(`Mode detected: ${response.mode}`);
            console.log(`Processing time: ${response.processingTimeMs}ms`);
            console.log(`Results found: ${response.results.length}`);
            
            response.results.slice(0, 3).forEach((r, idx) => {
                console.log(`\n${idx + 1}. [${r.reference}] (Score: ${r.score.final})`);
                console.log(`   Text: ${r.text}`);
                if (r.highlightedText) {
                    console.log(`   Highlighted: ${r.highlightedText}`);
                }
                console.log(`   Themes: ${r.themes.join(', ')} | Emotions: ${r.emotions.join(', ')}`);
                console.log(`   Score Details: Exact=${r.score.exactPhrase}, Keyword=${r.score.keyword}, Emotion=${r.score.emotion}, Theme=${r.score.theme}, Fuzzy=${r.score.fuzzy}, Partial=${r.score.partial}`);
            });
        }
        
        console.log('\n====================================');
        console.log('✅ Search verification tests complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Testing error:', error);
        process.exit(1);
    }
}

runTests();
