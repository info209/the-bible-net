import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Prayer } from '@/models/Prayer';

/**
 * @swagger
 * /api/prayers:
 *   get:
 *     summary: Fetch public prayer requests
 *     description: Retrieve a list of public prayer requests with filtering and sorting options.
 *     tags: [Prayers]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *         description: Number of prayers to return
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [newest, trending] }
 *         description: Sort order (newest or most prayed for)
 *     responses:
 *       200:
 *         description: List of prayers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Prayer' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   post:
 *     summary: Create a new prayer request
 *     description: Authenticated users can post a new prayer request.
 *     tags: [Prayers]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text: { type: string, description: The prayer request content }
 *               isPublic: { type: boolean, default: true, description: Whether the prayer is visible on the wall }
 *               anonymous: { type: boolean, default: false, description: Whether to hide the user's name }
 *     responses:
 *       201:
 *         description: Prayer created successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Prayer' }
 *       400:
 *         description: Missing text or invalid input
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const sort = searchParams.get('sort') || 'newest';

    const sortOption: any = {};
    if (sort === 'trending') {
      sortOption.intercessionCount = -1;
      sortOption.createdAt = -1;
    } else {
      sortOption.createdAt = -1;
    }

    const prayers = await Prayer.find({ isPublic: true })
      .sort(sortOption)
      .limit(limit)
      .populate('userId', 'firstName lastName image');

    return NextResponse.json(prayers);
  } catch (error) {
    console.error('Error fetching prayers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { text, isPublic, anonymous } = body;

    if (!text) {
      return NextResponse.json({ error: 'Prayer text is required' }, { status: 400 });
    }

    const newPrayer = await Prayer.create({
      userId: (session.user as any).id,
      text,
      isPublic: isPublic ?? true,
      anonymous: anonymous ?? false,
    });

    return NextResponse.json(newPrayer, { status: 201 });
  } catch (error) {
    console.error('Error creating prayer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
