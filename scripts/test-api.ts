import path from 'path';
import dotenv from 'dotenv';

// Load env.local variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const { default: connectDB } = await import('../src/lib/db');
  const { DailyContentService } = await import('../src/services/dailyContentService');
  
  await connectDB();
  console.log('Testing DailyContentService.getRecentDailyContent(7, "KJV")...');
  const enriched = await DailyContentService.getRecentDailyContent(7, "KJV");
  
  console.log('\n=== Enriched Contents ===');
  enriched.forEach((item, index) => {
    console.log(`Item #${index + 1} - Date: ${item.date}`);
    console.log(`  - verseBook: "${item.verseBook}"`);
    console.log(`  - verseReference: "${item.verseReference}"`);
    console.log(`  - verseText: "${item.verse}"`);
    console.log(`  - devotionalTitle: "${item.devotionalTitle}"`);
    console.log(`  - devotionalVerseRef: "${item.devotionalVerseRef}"`);
    console.log(`  - devotionalVerseText: "${item.devotionalVerseText}"`);
    console.log('-------------------------------------------');
  });

  process.exit(0);
}

run().catch(console.error);
