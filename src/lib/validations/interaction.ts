import { z } from 'zod';

export const likeSchema = z.object({
    contentId: z.string().min(1, 'Content ID is required'),
    type: z.enum(['verse', 'devotion', 'daily-verse', 'daily-devotion'], {
        message: 'Type must be "verse", "devotion", "daily-verse", or "daily-devotion"',
    }),
});

export const commentSchema = z.object({
    contentId: z.string().min(1, 'Content ID is required'),
    type: z.enum(['verse', 'devotion', 'daily-verse', 'daily-devotion'], {
        message: 'Type must be "verse", "devotion", "daily-verse", or "daily-devotion"',
    }),
    comment: z.string().min(1, 'Comment is required').max(500, 'Comment cannot exceed 500 characters').transform((val) => val.trim()),
});
