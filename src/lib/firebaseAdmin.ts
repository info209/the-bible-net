// src/lib/firebaseAdmin.ts
import admin from 'firebase-admin';

if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
        ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

    if (!projectId || !clientEmail || !privateKey) {
        console.warn('Firebase admin credentials are not set. Server-side auth will fail until you set them.');
    }

    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            } as admin.ServiceAccount),
        });
    } catch (err) {
        console.error('Failed to initialize Firebase Admin:', err);
    }
}

export const adminAuth = admin.auth();
