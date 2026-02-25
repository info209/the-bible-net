import { handlers } from '@/lib/auth';

/**
 * @swagger
 * /api/auth/signin/{provider}:
 *   post:
 *     summary: Sign in with OAuth provider
 *     description: Initiate OAuth authentication flow.
 *     tags:
 *       - Auth
 *     parameters:
 *       - in: path
 *         name: provider
 *         schema:
 *           type: string
 *           enum: [google, facebook]
 *         required: true
 *         description: OAuth provider to use
 *     requestBody:
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               callbackUrl:
 *                 type: string
 *                 description: URL to redirect to after sign in
 *         application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 callbackUrl:
 *                   type: string
 *     responses:
 *       302:
 *         description: Redirects to provider login page
 *       500:
 *         description: Server error
 */
/**
 * @swagger
 * /api/auth/signin/credentials:
 *   post:
 *     summary: Sign in with email and password
 *     description: Authenticate user using credentials. This endpoint is handled by NextAuth.js.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               callbackUrl:
 *                 type: string
 *                 description: URL to redirect to after sign in
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               callbackUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sign in successful
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
export const { GET, POST } = handlers;

