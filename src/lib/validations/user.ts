import { z } from 'zod';

export const readingProgressSchema = z.object({
  bookId: z.string().min(1, 'Book ID is required'),
  bookName: z.string().optional(),
  chapter: z.number(),
  versionId: z.string().min(1, 'Version ID is required'),
  versionName: z.string().optional(),
  completed: z.boolean().optional(),
  progressPercent: z.number().optional(),
  lastReadAt: z.string().optional(), // Can be ISO string
});

export const syncProgressSchema = z.array(readingProgressSchema);
