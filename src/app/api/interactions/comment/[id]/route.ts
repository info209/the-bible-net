import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { CommentRepository } from '@/repositories/commentRepository';

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const commentId = params.id;
        const result = await CommentRepository.deleteComment(commentId, session.user.id as string);

        if (!result.success) {
            return NextResponse.json({ error: 'Comment not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            contentId: result.contentId,
            contentType: result.contentType,
        });
    } catch (error: any) {
        console.error('Error deleting comment:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
