const mongoose = require('mongoose');

const MONGODB_URI = "mongodb://biblenetdev:Elx24z3gYwZIZtxR@ac-egcbmnk-shard-00-00.2j1ht8j.mongodb.net:27017,ac-egcbmnk-shard-00-01.2j1ht8j.mongodb.net:27017,ac-egcbmnk-shard-00-02.2j1ht8j.mongodb.net:27017/bible-app?ssl=true&replicaSet=atlas-6bu67z-shard-0&authSource=admin&retryWrites=true&w=majority";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Test queries
    const versionId = "తెలుగు IRV";
    const bookId = "Genesis";
    const chapterNum = 1;

    console.log(`Testing query for version: "${versionId}", book: "${bookId}", chapter: ${chapterNum}`);

    const versionDoc = await db.collection('bibleversions').findOne({
      $or: [
        { abbreviation: versionId },
        { name: versionId },
        { abbreviation: new RegExp(`^${versionId}$`, 'i') }
      ]
    });
    console.log('Version doc:', versionDoc ? { id: versionDoc._id.toString(), name: versionDoc.name, abbreviation: versionDoc.abbreviation } : null);

    if (versionDoc) {
      const bookDoc = await db.collection('books').findOne({ version: versionDoc._id, order: 1 });
      console.log('Book doc (order 1):', bookDoc ? { id: bookDoc._id.toString(), name: bookDoc.name, abbreviation: bookDoc.abbreviation } : null);

      if (bookDoc) {
        const chapterDoc = await db.collection('chapters').findOne({ book: bookDoc._id, number: chapterNum });
        console.log('Chapter doc:', chapterDoc ? { id: chapterDoc._id.toString(), number: chapterDoc.number } : null);

        if (chapterDoc) {
          const verses = await db.collection('verses').find({ chapter: chapterDoc._id }).limit(3).toArray();
          console.log('Sample Verses:', JSON.stringify(verses.map(v => ({ number: v.number, text: v.text })), null, 2));
        }
      }
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
