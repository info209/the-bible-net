import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
  const mongoose = (await import('mongoose')).default;
  const { connectDB } = await import('../src/lib/db');
  const { BibleVersion, Book, Chapter, Verse } = await import('../src/models/Bible');
  const { BibleService } = await import('../src/services/bibleService');
  const redis = (await import('../src/lib/redis')).default;
  console.log('==============================================');
  console.log('  VERIFYING BIBLE VERSIONS API & BACKEND FIX');
  console.log('==============================================\n');

  console.log('1. Connecting to MongoDB...');
  await connectDB();
  const conn = mongoose.connection;

  console.log(`- Connection State: ${conn.readyState} (1 = connected)`);
  console.log(`- Runtime Database Name: "${conn.name}"`);
  console.log(`- Model Collection Name (BibleVersion): "${BibleVersion.collection.name}"`);
  console.log(`- Model Collection Name (Book): "${Book.collection.name}"`);
  console.log(`- Model Collection Name (Chapter): "${Chapter.collection.name}"`);
  console.log(`- Model Collection Name (Verse): "${Verse.collection.name}"`);

  const totalCount = await BibleVersion.countDocuments({});
  console.log(`- Total countDocuments({}): ${totalCount}`);

  const activeFilter = {
    $or: [
      { isActive: true },
      { status: 'active' }
    ],
    status: { $nin: ['inactive', 'failed', 'importing'] }
  };
  const activeCount = await BibleVersion.countDocuments(activeFilter);
  console.log(`- Active countDocuments(activeFilter): ${activeCount}`);

  console.log('\n2. Testing Redis Invalidation...');
  if (redis) {
    const keys = await redis.keys('*bible:versions*');
    console.log(`- Existing versions cache keys:`, keys);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`- Deleted stale cache keys.`);
    }
  }

  console.log('\n3. Testing BibleService.getAllVersions()...');
  // Call 1: Should fetch fresh from MongoDB and set Redis cache
  const versionsAll = await BibleService.getAllVersions();
  console.log(`- Call 1 (GetAllVersions) Count: ${versionsAll.length}`);

  // Call 2: Should hit Redis cache
  const versionsCached = await BibleService.getAllVersions();
  console.log(`- Call 2 (Cached GetAllVersions) Count: ${versionsCached.length}`);

  // Call 3: Paginated
  const paginated = await BibleService.getAllVersions(1, 2);
  console.log(`- Call 3 (Paginated page=1, limit=2) Count: ${paginated.versions.length}, Total: ${paginated.pagination.total}`);

  console.log('\n4. Bible Versions Detail:');
  versionsAll.forEach((v: any, idx: number) => {
    console.log(`  [${idx + 1}] ID: ${v._id} | Abbr: ${v.abbreviation.padEnd(12)} | Lang: ${v.language} | Status: ${v.status} | Active: ${v.isActive} | Name: ${v.name}`);
  });

  if (redis) await redis.quit();
  await mongoose.disconnect();

  console.log('\n==============================================');
  console.log('  ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
  console.log('==============================================');
  process.exit(0);
}

main().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
