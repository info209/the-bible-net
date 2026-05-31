import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { UserFolder } from '@/models/UserFolder';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const userId = (session.user as any).id;

    // List all folders for the authenticated user, sorted by name
    const folders = await UserFolder.find({ userId }).sort({ name: 1 });

    return NextResponse.json({ success: true, data: folders });
  } catch (error: any) {
    console.error('[GET /api/folders] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const userId = (session.user as any).id;

    const body = await req.json();
    const { name } = body;

    // Required field validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Folder name is required' }, { status: 400 });
    }

    const folderName = name.trim();

    // Length validation: Max 50 chars
    if (folderName.length > 50) {
      return NextResponse.json({ success: false, error: 'Folder name must be at most 50 characters long' }, { status: 400 });
    }

    // Uniqueness validation per user (case-insensitive checks)
    const existingFolder = await UserFolder.findOne({
      userId,
      name: { $regex: new RegExp(`^${folderName}$`, 'i') },
    });

    if (existingFolder) {
      return NextResponse.json({ success: false, error: 'A folder with this name already exists' }, { status: 400 });
    }

    const newFolder = await UserFolder.create({
      userId,
      name: folderName,
    });

    return NextResponse.json({ success: true, data: newFolder }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/folders] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', message: error.message }, { status: 500 });
  }
}
