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
  console.log("Successfully parsed .env.local");
} catch (e: any) {
  console.warn("Failed to parse .env.local:", e.message);
}

async function check() {
  // Dynamically import database and models AFTER setting process.env properties
  const { connectDB } = await import('../src/lib/db');
  const { Verse, BibleVersion, Book, Chapter } = await import('../src/models/Bible');

  console.log("Connecting to DB...");
  await connectDB();
  console.log("Connected!");
  
  const vCount = await Verse.countDocuments();
  const verCount = await BibleVersion.countDocuments();
  const bookCount = await Book.countDocuments();
  const chapterCount = await Chapter.countDocuments();

  console.log(`Database collections:`);
  console.log(`- BibleVersion count: ${verCount}`);
  console.log(`- Book count: ${bookCount}`);
  console.log(`- Chapter count: ${chapterCount}`);
  console.log(`- Verse count: ${vCount}`);
  
  // Check count of enriched verses
  const enrichedCount = await Verse.countDocuments({ searchText: { $ne: null } });
  const embeddedCount = await Verse.countDocuments({ embedding: { $exists: true, $ne: [] } });

  console.log(`Unified enrichment metrics:`);
  console.log(`- Enriched verses (searchText): ${enrichedCount} / ${vCount}`);
  console.log(`- Embedded verses (embedding): ${embeddedCount} / ${vCount}`);

  if (embeddedCount > 0) {
    const oneVerse = await Verse.findOne({ embedding: { $exists: true, $ne: [] } });
    console.log(`Enriched Verse sample: ${oneVerse ? "Reference: " + oneVerse.reference + ", Themes: " + (oneVerse.themes || []).join(', ') : "None found!"}`);
  }
  
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
