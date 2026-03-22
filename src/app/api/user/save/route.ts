import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-helpers';
import { SavedItemRepository } from '@/repositories/savedItemRepository';
import { connectDB } from '@/lib/db';
import { z } from 'zod';

const saveSchema = z.object({
  type: z.enum(['bible', 'journal', 'reading_plan']),
  refId: z.string().min(1, 'refId is required'),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const saved = await SavedItemRepository.saveItem(
      session.user.id as string,
      parsed.data as Parameters<typeof SavedItemRepository.saveItem>[1]
    );

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error: unknown) {
    // MongoDB duplicate key — already saved, treat as success
    if ((error as { code?: number })?.code === 11000) {
      return NextResponse.json(
        { success: true, message: 'Already saved' },
        { status: 200 }
      );
    }
    console.error('[POST /api/user/save] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
