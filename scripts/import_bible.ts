
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables BEFORE importing db
dotenv.config({ path: '.env.local' });

// Dynamic imports to ensure env is loaded first
async function run() {
    const { connectDB } = await import('../src/lib/db');
    const { BibleVersion, Book, Chapter, Verse } = await import('../src/models/Bible');
    const { getBookDetails } = await import('../src/utils/bibleBooks');

    // --- Configuration ---
    const ASSETS_DIR = path.join(process.cwd(), 'assets');
    const BATCH_SIZE = 1000; // Batch size for verse insertion

    // --- Types ---
    interface JSONVerse {
        book_name: string;
        book: number;
        chapter: number;
        verse: number;
        text: string;
    }

    interface JSONMetadata {
        name: string;
        shortname: string;
        lang: string;
        lang_short: string;
        copyright_statement?: string;
        year?: string;
    }

    interface JSONBible {
        metadata: JSONMetadata;
        verses: JSONVerse[];
    }

    async function main() {
        try {
            console.log('Connecting to database...');
            await connectDB();
            console.log('Connected to database.');

            if (!fs.existsSync(ASSETS_DIR)) {
                console.error(`Assets directory not found at ${ASSETS_DIR}`);
                process.exit(1);
            }

            const languageDirs = fs.readdirSync(ASSETS_DIR).filter(file => {
                return fs.statSync(path.join(ASSETS_DIR, file)).isDirectory();
            });

            for (const langDir of languageDirs) {
                console.log(`\nProcessing language directory: ${langDir}`);
                const langPath = path.join(ASSETS_DIR, langDir);
                const files = fs.readdirSync(langPath).filter(file => file.endsWith('.json'));

                for (const file of files) {
                    console.log(`  Processing file: ${file}`);
                    const filePath = path.join(langPath, file);

                    try {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const bibleData: JSONBible = JSON.parse(content);

                        await importBibleVersion(bibleData);
                    } catch (err) {
                        console.error(`  Error processing file ${file}:`, err);
                    }
                }
            }

            console.log('\nImport completed successfully.');
            process.exit(0);
        } catch (err) {
            console.error('Script failed:', err);
            process.exit(1);
        }
    }

    async function importBibleVersion(data: JSONBible) {
        const { metadata, verses } = data;

        // 1. Upsert BibleVersion
        console.log(`    Importing Version: ${metadata.name} (${metadata.shortname})`);

        const versionDoc = await BibleVersion.findOneAndUpdate(
            { abbreviation: metadata.shortname },
            {
                name: metadata.name,
                abbreviation: metadata.shortname,
                language: metadata.lang_short,
                copyright: metadata.copyright_statement || `Copyright ${metadata.year || ''}`
            },
            { upsert: true, new: true }
        );

        const versionId = versionDoc._id;

        // 2. Process Verses
        const versesByBook = new Map<number, JSONVerse[]>();
        for (const v of verses) {
            if (!versesByBook.has(v.book)) {
                versesByBook.set(v.book, []);
            }
            versesByBook.get(v.book)!.push(v);
        }

        const bookNumbers = Array.from(versesByBook.keys()).sort((a, b) => a - b);

        for (const bookNum of bookNumbers) {
            const bookVerses = versesByBook.get(bookNum)!;
            const bookDetails = getBookDetails(bookNum);

            const localizedName = bookVerses[0].book_name;
            const bookName = localizedName || bookDetails?.name || `Book ${bookNum}`;
            const bookAbbr = bookDetails?.abbreviation || bookName.substring(0, 3).toUpperCase();
            const testament = bookDetails?.testament || (bookNum <= 39 ? 'OT' : 'NT');

            // Upsert Book
            const bookDoc = await Book.findOneAndUpdate(
                { version: versionId, order: bookNum },
                {
                    name: bookName,
                    abbreviation: bookAbbr,
                    testament: testament,
                    version: versionId,
                    order: bookNum
                },
                { upsert: true, new: true }
            );

            const bookId = bookDoc._id;

            // Group by chapter
            const versesByChapter = new Map<number, JSONVerse[]>();
            for (const v of bookVerses) {
                if (!versesByChapter.has(v.chapter)) {
                    versesByChapter.set(v.chapter, []);
                }
                versesByChapter.get(v.chapter)!.push(v);
            }

            const chapterNumbers = Array.from(versesByChapter.keys()).sort((a, b) => a - b);

            for (const chapNum of chapterNumbers) {
                const chapVerses = versesByChapter.get(chapNum)!;

                // Upsert Chapter
                const chapterDoc = await Chapter.findOneAndUpdate(
                    { book: bookId, number: chapNum },
                    {
                        number: chapNum,
                        book: bookId,
                        version: versionId
                    },
                    { upsert: true, new: true }
                );

                const chapterId = chapterDoc._id;

                await Verse.deleteMany({ chapter: chapterId });

                const verseDocs = chapVerses.map(v => ({
                    number: v.verse,
                    text: v.text,
                    chapter: chapterId,
                    book: bookId,
                    version: versionId
                }));

                for (let i = 0; i < verseDocs.length; i += BATCH_SIZE) {
                    const chunk = verseDocs.slice(i, i + BATCH_SIZE);
                    await Verse.insertMany(chunk);
                }
            }
        }
    }

    await main();
}

run().catch(console.error);
