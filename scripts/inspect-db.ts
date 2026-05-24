import path from 'path';
import dotenv from 'dotenv';

// Load env.local variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const { connectDB } = await import('../src/lib/db');
  const { DailyContent } = await import('../src/models/DailyContent');

  await connectDB();
  const contents = await DailyContent.find({}).sort({ date: -1 }).limit(10).lean();

  console.log('\n=== Raw DailyContent Documents ===');
  contents.forEach((c: any) => {
    console.log(`Date: ${c.date}`);
    console.log(`  - verseBook: ${JSON.stringify(c.verseBook)}`);
    console.log(`  - verseChapter: ${JSON.stringify(c.verseChapter)}`);
    console.log(`  - verseNumber: ${JSON.stringify(c.verseNumber)}`);
    console.log(`  - verseReference: ${JSON.stringify(c.verseReference)}`);
    console.log(`  - devotionalTitle: ${JSON.stringify(c.devotionalTitle)}`);
    console.log(`  - devotionalVerseRef: ${JSON.stringify(c.devotionalVerseRef)}`);
    console.log('-------------------------------------------');
  });

  process.exit(0);
}

run().catch(console.error);
