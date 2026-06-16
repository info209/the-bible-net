import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Prayer } from '@/models/Prayer';

/**
 * @swagger
 * /api/prayers/{id}/intercede:
 *   post:
 *     summary: Intercede (pray) for a specific prayer request
 *     description: Authenticated users can show support by clicking "Pray for this". Increments intercession count.
 *     tags: [Prayers]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: The ID of the prayer request
 *     responses:
 *       200:
 *         description: Success or already interceded
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Prayer' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Prayer not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const userId = (session.user as any).id;
    const prayerId = params.id;

    // Check if user already interceded
    const prayer = await Prayer.findById(prayerId);
    if (!prayer) {
      return NextResponse.json({ error: 'Prayer not found' }, { status: 404 });
    }

    const hasInterceded = prayer.intercessors.includes(userId);

    if (hasInterceded) {
      // Un-intercede (optional logic, but let's stick to simple "Pray for this")
      return NextResponse.json({ message: 'Already praying for this' }, { status: 200 });
    }

    // Add intercessor and increment count
    const updatedPrayer = await Prayer.findByIdAndUpdate(
      prayerId,
      {
        $addToSet: { intercessors: userId },
        $inc: { intercessionCount: 1 }
      },
      { new: true }
    ).populate('userId', 'firstName lastName image');

    return NextResponse.json(updatedPrayer);
  } catch (error) {
    console.error('Error interceding for prayer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
