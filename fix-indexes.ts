import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function fixIndexes() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI!);
        
        console.log('Dropping old indexes on likes collection...');
        const db = mongoose.connection.db;
        
        if (!db) {
            console.error('db is null');
            process.exit(1);
        }

        try {
            await db.collection('likes').dropIndex('contentId_1_userId_1');
            console.log('Dropped contentId_1_userId_1');
        } catch (e: any) {
            console.log('contentId_1_userId_1 did not exist or drop failed', e.message);
        }

        try {
            await db.collection('likes').dropIndex('contentId_1_guestIdentifier_1');
            console.log('Dropped contentId_1_guestIdentifier_1');
        } catch (e: any) {
            console.log('contentId_1_guestIdentifier_1 did not exist or drop failed', e.message);
        }

        try {
            // Drop any old name as well just in case
            await db.collection('likes').dropIndex('userId_verseId');
        } catch (e) {}

        console.log('Rebuilding indexes with partialFilterExpression...');
        await db.collection('likes').createIndex(
            { contentId: 1, userId: 1 },
            { unique: true, partialFilterExpression: { userId: { $exists: true } } }
        );
        await db.collection('likes').createIndex(
            { contentId: 1, guestIdentifier: 1 },
            { unique: true, partialFilterExpression: { guestIdentifier: { $exists: true } } }
        );

        console.log('Indexes fixed properly!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixIndexes();
