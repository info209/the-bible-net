import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/services/userService';
import { z } from 'zod';

const registerSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    preferredLanguage: z.string().optional(),
    preferredBibleVersion: z.string().optional(),
    country: z.string().optional(),
});

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user and send OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password]
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password, minLength: 8 }
 *               preferredLanguage: { type: string, default: en }
 *               preferredBibleVersion: { type: string, default: KJV }
 *               country: { type: string }
 *     responses:
 *       201:
 *         description: Success, OTP sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { type: object, properties: { userId: { type: string }, email: { type: string } } }
 *       400:
 *         description: Validation or Registration error
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validatedData = registerSchema.parse(body);

        const result = await UserService.registerUser(validatedData);

        return NextResponse.json({
            success: true,
            message: 'Verification code sent to your email.',
            data: { userId: result.userId, email: result.email },
        }, { status: 201 });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
        }
        console.error('Registration error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
