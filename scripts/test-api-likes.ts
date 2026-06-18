import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('Error: MONGODB_URI not found in env');
    process.exit(1);
}

async function run() {
    // Dynamically import models to ensure env is loaded first
    const { Like } = await import('../src/models/Like');
    const { DailyContent } = await import('../src/models/DailyContent');
    const { Content } = await import('../src/models/Content');
    const { DailyContentService } = await import('../src/services/dailyContentService');

    await mongoose.connect(uri!);
    console.log('✅ Connected!');
    
    const targetUserId = "6a30dc7902c9645d65a1e7fa";
    const preferredVersion = 'KJV';

    // Fetch all likes for the user
    const likes = await Like.find({ userId: targetUserId })
        .sort({ createdAt: -1 })
        .lean();

    console.log(`Found ${likes.length} raw likes for user ${targetUserId}`);

    // Populate content details (copied exact logic from route.ts GET)
    const enrichedLikes = await Promise.all(
        likes.map(async (like: any) => {
            try {
                if (like.contentType === 'daily-verse') {
                    const daily = await DailyContent.findById(like.contentId).lean();
                    if (!daily) {
                        console.log(`  daily-verse: doc with id ${like.contentId} not found in DailyContent`);
                        return null;
                    }
                    
                    const enriched = await DailyContentService.enrichWithVerseText(daily as any, preferredVersion);
                    return {
                        _id: like._id,
                        contentId: like.contentId,
                        contentType: like.contentType,
                        createdAt: like.createdAt,
                        reference: enriched.verseReference,
                        text: enriched.verse,
                        date: enriched.date,
                        version: preferredVersion,
                    };
                } else if (like.contentType === 'daily-devotion') {
                    const daily = await DailyContent.findById(like.contentId).lean();
                    if (!daily) {
                        console.log(`  daily-devotion: doc with id ${like.contentId} not found in DailyContent`);
                        return null;
                    }

                    const enriched = await DailyContentService.enrichWithVerseText(daily as any, preferredVersion);
                    return {
                        _id: like._id,
                        contentId: like.contentId,
                        contentType: like.contentType,
                        createdAt: like.createdAt,
                        title: enriched.devotionalTitle,
                        text: enriched.devotionalContent,
                        verseRef: enriched.devotionalVerseRef,
                        date: enriched.date,
                        backgroundImage: enriched.backgroundImage,
                        devotionalBackgroundImage: enriched.devotionalBackgroundImage,
                    };
                } else if (like.contentType === 'verse' || like.contentType === 'devotion') {
                    const content = await Content.findById(like.contentId).lean();
                    if (!content) {
                        console.log(`  ${like.contentType}: doc with id ${like.contentId} not found in Content`);
                        return null;
                    }
                    return {
                        _id: like._id,
                        contentId: like.contentId,
                        contentType: like.contentType,
                        createdAt: like.createdAt,
                        title: (content as any).title,
                        reference: (content as any).reference,
                        text: (content as any).text,
                    };
                }
                return null;
            } catch (err) {
                console.error('Error enriching like:', like, err);
                return null;
            }
        })
    );

    const data = enrichedLikes.filter(item => item !== null);
    console.log('\n--- ENRICHED LIKES RETURNED BY API ---');
    console.log(JSON.stringify(data, null, 2));

    process.exit(0);
}

run().catch(err => {
    console.error('Execution failed:', err);
    process.exit(1);
});
