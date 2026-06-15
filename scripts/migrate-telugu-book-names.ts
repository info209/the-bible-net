/**
 * migrate-telugu-book-names.ts
 *
 * One-shot DB migration: updates the `name` field of every Book document
 * belonging to a Telugu Bible version to use the canonical Telugu names
 * from TELUGU_BOOK_NAMES (keyed by BIBLE_BOOKS canonical English order).
 *
 * Run:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/migrate-telugu-book-names.ts
 *
 * Safe to run multiple times (idempotent).
 */

import fs from 'fs';
import path from 'path';

// ── Load .env.local ──────────────────────────────────────────────────────────
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = (match[2] || '').trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
  console.log('✅ Loaded .env.local');
} catch (e: any) {
  console.warn('⚠️  Could not load .env.local:', e.message);
}

// ── Telugu book name map (all 66 books) ─────────────────────────────────────
const BIBLE_BOOKS_ORDER: { order: number; name: string }[] = [
  { order: 1,  name: 'Genesis' },
  { order: 2,  name: 'Exodus' },
  { order: 3,  name: 'Leviticus' },
  { order: 4,  name: 'Numbers' },
  { order: 5,  name: 'Deuteronomy' },
  { order: 6,  name: 'Joshua' },
  { order: 7,  name: 'Judges' },
  { order: 8,  name: 'Ruth' },
  { order: 9,  name: '1 Samuel' },
  { order: 10, name: '2 Samuel' },
  { order: 11, name: '1 Kings' },
  { order: 12, name: '2 Kings' },
  { order: 13, name: '1 Chronicles' },
  { order: 14, name: '2 Chronicles' },
  { order: 15, name: 'Ezra' },
  { order: 16, name: 'Nehemiah' },
  { order: 17, name: 'Esther' },
  { order: 18, name: 'Job' },
  { order: 19, name: 'Psalms' },
  { order: 20, name: 'Proverbs' },
  { order: 21, name: 'Ecclesiastes' },
  { order: 22, name: 'Song of Solomon' },
  { order: 23, name: 'Isaiah' },
  { order: 24, name: 'Jeremiah' },
  { order: 25, name: 'Lamentations' },
  { order: 26, name: 'Ezekiel' },
  { order: 27, name: 'Daniel' },
  { order: 28, name: 'Hosea' },
  { order: 29, name: 'Joel' },
  { order: 30, name: 'Amos' },
  { order: 31, name: 'Obadiah' },
  { order: 32, name: 'Jonah' },
  { order: 33, name: 'Micah' },
  { order: 34, name: 'Nahum' },
  { order: 35, name: 'Habakkuk' },
  { order: 36, name: 'Zephaniah' },
  { order: 37, name: 'Haggai' },
  { order: 38, name: 'Zechariah' },
  { order: 39, name: 'Malachi' },
  { order: 40, name: 'Matthew' },
  { order: 41, name: 'Mark' },
  { order: 42, name: 'Luke' },
  { order: 43, name: 'John' },
  { order: 44, name: 'Acts' },
  { order: 45, name: 'Romans' },
  { order: 46, name: '1 Corinthians' },
  { order: 47, name: '2 Corinthians' },
  { order: 48, name: 'Galatians' },
  { order: 49, name: 'Ephesians' },
  { order: 50, name: 'Philippians' },
  { order: 51, name: 'Colossians' },
  { order: 52, name: '1 Thessalonians' },
  { order: 53, name: '2 Thessalonians' },
  { order: 54, name: '1 Timothy' },
  { order: 55, name: '2 Timothy' },
  { order: 56, name: 'Titus' },
  { order: 57, name: 'Philemon' },
  { order: 58, name: 'Hebrews' },
  { order: 59, name: 'James' },
  { order: 60, name: '1 Peter' },
  { order: 61, name: '2 Peter' },
  { order: 62, name: '1 John' },
  { order: 63, name: '2 John' },
  { order: 64, name: '3 John' },
  { order: 65, name: 'Jude' },
  { order: 66, name: 'Revelation' },
];

const TELUGU_BOOK_NAMES: Record<string, string> = {
  'Genesis':          'ఆదికాండము',
  'Exodus':           'నిర్గమకాండము',
  'Leviticus':        'లేవీయకాండము',
  'Numbers':          'సంఖ్యాకాండము',
  'Deuteronomy':      'ద్వితీయోపదేశకాండము',
  'Joshua':           'యెహోషువ',
  'Judges':           'న్యాయాధిపతులు',
  'Ruth':             'రూతు',
  '1 Samuel':         '1 సమూయేలు',
  '2 Samuel':         '2 సమూయేలు',
  '1 Kings':          '1 రాజులు',
  '2 Kings':          '2 రాజులు',
  '1 Chronicles':     '1 దినవృత్తాంతములు',
  '2 Chronicles':     '2 దినవృత్తాంతములు',
  'Ezra':             'ఎజ్రా',
  'Nehemiah':         'నెహెమ్యా',
  'Esther':           'ఎస్తేరు',
  'Job':              'యోబు',
  'Psalms':           'కీర్తనల గ్రంథము',
  'Proverbs':         'సామెతలు',
  'Ecclesiastes':     'ప్రసంగి',
  'Song of Solomon':  'పరమగీతము',
  'Isaiah':           'యెషయా',
  'Jeremiah':         'యిర్మీయా',
  'Lamentations':     'విలాపవాక్యములు',
  'Ezekiel':          'యెహెజ్కేలు',
  'Daniel':           'దానియేలు',
  'Hosea':            'హోషేయ',
  'Joel':             'యోవేలు',
  'Amos':             'ఆమోసు',
  'Obadiah':          'ఓబద్యా',
  'Jonah':            'యోనా',
  'Micah':            'మీకా',
  'Nahum':            'నహూము',
  'Habakkuk':         'హబక్కూకు',
  'Zephaniah':        'జెఫన్యా',
  'Haggai':           'హగ్గయి',
  'Zechariah':        'జెకర్యా',
  'Malachi':          'మలాకీ',
  'Matthew':          'మత్తయి',
  'Mark':             'మార్కు',
  'Luke':             'లూకా',
  'John':             'యోహాను',
  'Acts':             'అపొస్తలుల కార్యములు',
  'Romans':           'రోమీయులకు',
  '1 Corinthians':    '1 కొరింథీయులకు',
  '2 Corinthians':    '2 కొరింథీయులకు',
  'Galatians':        'గలతీయులకు',
  'Ephesians':        'ఎఫెసీయులకు',
  'Philippians':      'ఫిలిప్పీయులకు',
  'Colossians':       'కొలొస్సయులకు',
  '1 Thessalonians':  '1 థెస్సలొనీకయులకు',
  '2 Thessalonians':  '2 థెస్సలొనీకయులకు',
  '1 Timothy':        '1 తిమోతికి',
  '2 Timothy':        '2 తిమోతికి',
  'Titus':            'తీతుకు',
  'Philemon':         'ఫిలేమోనుకు',
  'Hebrews':          'హెబ్రీయులకు',
  'James':            'యాకోబు',
  '1 Peter':          '1 పేతురు',
  '2 Peter':          '2 పేతురు',
  '1 John':           '1 యోహాను',
  '2 John':           '2 యోహాను',
  '3 John':           '3 యోహాను',
  'Jude':             'యూదా',
  'Revelation':       'ప్రకటన గ్రంథము',
};

// ── Build order → Telugu name lookup ─────────────────────────────────────────
const ORDER_TO_TELUGU: Map<number, string> = new Map(
  BIBLE_BOOKS_ORDER
    .filter(b => TELUGU_BOOK_NAMES[b.name])
    .map(b => [b.order, TELUGU_BOOK_NAMES[b.name]])
);

// ── Migration ────────────────────────────────────────────────────────────────
async function migrate() {
  const { default: connectDB } = await import('../src/lib/db');
  const { BibleVersion, Book } = await import('../src/models/Bible');

  console.log('\n🔌 Connecting to MongoDB…');
  await connectDB();
  console.log('✅ Connected\n');

  // 1. Find all Telugu Bible versions
  const teluguVersions = await BibleVersion.find({
    $or: [
      { language: 'te' },
      { language: 'Telugu' },
      { language: { $regex: /telugu/i } },
    ]
  }).lean();

  if (teluguVersions.length === 0) {
    console.log('⚠️  No Telugu Bible versions found in the database. Nothing to migrate.');
    process.exit(0);
  }

  console.log(`📖 Found ${teluguVersions.length} Telugu version(s):`);
  teluguVersions.forEach(v => console.log(`   • ${v.abbreviation} — "${v.name}" (lang: ${v.language})`));
  console.log('');

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalNotMapped = 0;

  for (const version of teluguVersions) {
    console.log(`\n── Processing version: ${version.abbreviation} ──────────`);

    // 2. Fetch all books for this version, sorted by order
    const books = await Book.find({ version: version._id }).sort({ order: 1 }).lean();
    console.log(`   Books found: ${books.length}`);

    for (const book of books) {
      const teluguName = ORDER_TO_TELUGU.get(book.order);

      if (!teluguName) {
        console.warn(`   ⚠️  Order ${book.order} — no Telugu mapping found for "${book.name}"`);
        totalNotMapped++;
        continue;
      }

      if (book.name === teluguName) {
        // Already correct — skip
        totalSkipped++;
        continue;
      }

      // 3. Update name in DB
      await Book.findByIdAndUpdate(book._id, { name: teluguName });
      console.log(`   ✏️  Order ${String(book.order).padStart(2, '0')} | "${book.name}" → "${teluguName}"`);
      totalUpdated++;
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════');
  console.log('Migration complete!');
  console.log(`  ✅ Updated:    ${totalUpdated} book(s)`);
  console.log(`  ⏭  Skipped:    ${totalSkipped} already correct`);
  console.log(`  ⚠️  Not mapped: ${totalNotMapped} without a Telugu name`);
  console.log('══════════════════════════════════════════════\n');

  // 4. Invalidate Redis cache for all affected versions (if redis is available)
  try {
    const redis = (await import('../src/lib/redis')).default;
    if (redis) {
      for (const version of teluguVersions) {
        const key = `bible:books:${version._id}`;
        await redis.del(key);
        console.log(`🗑  Cleared Redis cache key: ${key}`);
      }
    }
  } catch {
    console.log('ℹ️  Redis not available — no cache to clear.');
  }

  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
