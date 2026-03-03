import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';

/**
 * @swagger
 * /api/books/{version}:
 *   get:
 *     summary: Get books by version
 *     description: Retrieve all books for a specific Bible version with optional pagination
 *     tags:
 *       - Bible
 *     parameters:
 *       - in: path
 *         name: version
 *         required: true
 *         schema:
 *           type: string
 *         description: Bible version abbreviation (e.g., KJV)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of books (paginated)
 *       404:
 *         description: Version not found
 *       500:
 *         description: Server error
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { version: string } }
) {
    try {
        const { searchParams } = new URL(request.url);
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined;
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

        const versionAbbr = params.version;

        // Get version
        const version = await BibleService.getVersionByAbbreviation(versionAbbr);
        if (!version) {
            return NextResponse.json(
                { success: false, error: 'Version not found' },
                { status: 404 }
            );
        }

        // Get books
        const data = await BibleService.getBooksByVersion(version._id.toString(), page, limit);

        return NextResponse.json(
            {
                success: true,
                version: {
                    name: version.name,
                    abbreviation: version.abbreviation,
                },
                data
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Get books error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch books' },
            { status: 500 }
        );
    }
}
