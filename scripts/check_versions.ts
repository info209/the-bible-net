import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    const { connectDB } = await import('../src/lib/db');
    const { BibleVersion } = await import('../src/models/Bible');

    await connectDB();
    const versions = await BibleVersion.find({});
    console.log('Found versions:', versions.length);
    versions.forEach(v => {
        console.log(`- ${v.name} (${v.abbreviation}) - Language: ${v.language}`);
    });
    process.exit(0);
}

run().catch(console.error);
