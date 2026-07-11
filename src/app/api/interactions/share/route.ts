import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ContentEngagement } from '@/models/ContentEngagement';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { date, type } = await request.json();

    if (!date || !type) {
      return NextResponse.json({ error: 'Missing date or type' }, { status: 400 });
    }

    // Map the UI type to the database type
    let dbType = '';
    if (type === 'daily-verse') {
      dbType = 'dailyVerse';
    } else if (type === 'daily-devotion') {
      dbType = 'dailyDevotional';
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Perform atomic upsert with increment
    const engagement = await ContentEngagement.findOneAndUpdate(
      { date, type: dbType },
      { $inc: { shareCount: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, shareCount: engagement.shareCount });

  } catch (error) {
    console.error('Error tracking share:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
