import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/services/userService';
import { z } from 'zod';

import { AuthService } from '@/services/authService';

// Validation schema
const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    country: z.string().optional(),
    language: z.string().optional(),
    bibleVersion: z.string().optional(),
    image: z.string().optional(),
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with email and password (Figma requirements)
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               country:
 *                 type: string
 *                 description: User's country
 *               language:
 *                 type: string
 *                 description: Preferred language
 *               bibleVersion:
 *                 type: string
 *                 description: Preferred Bible version abbreviation
 *               image:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully. OTP sent for verification.
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const validatedData = registerSchema.parse(body);

        // Create user
        const user = await UserService.createUser(validatedData);

        // Generate OTPs for verification
        await AuthService.generateOTP(user.email!, 'email');

        // Return success (don't send password)
        return NextResponse.json(
            {
                success: true,
                message: 'Registration successful. Please verify your email.',
                verificationRequired: ['email'],
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        // Log the error for server-side monitoring
        console.error(`[Registration Error] [${new Date().toISOString()}]:`, {
            message: error.message,
            stack: error.stack,
            name: error.name,
        });

        // Validation error (Zod)
        if (error.name === 'ZodError') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation failed',
                    details: error.errors.map((e: any) => ({
                        path: e.path.join('.'),
                        message: e.message
                    })),
                },
                { status: 400 }
            );
        }

        // Duplicate email error
        if (error.message.includes('already exists')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Conflict',
                    message: error.message
                },
                { status: 409 }
            );
        }

        // Mongoose validation error
        if (error.name === 'ValidationError') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Database Validation Error',
                    details: Object.values(error.errors).map((e: any) => e.message),
                },
                { status: 400 }
            );
        }

        // Catch-all for other errors
        return NextResponse.json(
            {
                success: false,
                error: 'Internal Server Error',
                message: error.message || 'An unexpected error occurred during registration'
            },
            { status: 500 }
        );
    }
}
