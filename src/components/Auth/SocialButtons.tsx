// src/components/Auth/SocialButtons.tsx
'use client';

import React, { useState } from 'react';
import { auth, googleProvider, facebookProvider, twitterProvider } from '../../lib/firebaseClient';
import { signInWithPopup, fetchSignInMethodsForEmail } from 'firebase/auth';

async function exchangeIdTokenForSession(idToken: string) {
    await fetch('/api/auth/sessionLogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
    });
}

export default function SocialButtons() {
    const [socialError, setSocialError] = useState<string | null>(null);
    const handlePopup = async (provider: any) => {
        setSocialError(null);
        try {
            const result = await signInWithPopup(auth, provider);
            const token = await result.user.getIdToken();
            await exchangeIdTokenForSession(token);
            window.location.href = '/reader';
        } catch (err: any) {
            // Handle popup blocked or closed
            if (err.code === 'auth/popup-blocked') {
                setSocialError('Popup was blocked by your browser. Please allow popups and try again.');
            } else if (err.code === 'auth/popup-closed-by-user') {
                setSocialError('Popup was closed before completing sign-in. Please try again.');
            } else if (
                err.code === 'auth/account-exists-with-different-credential' &&
                err.customData &&
                err.customData.email
            ) {
                const email = err.customData.email;
                let message = `An account already exists with the email ${email}.`;
                try {
                    const methods = await fetchSignInMethodsForEmail(auth, email);
                    if (methods.length > 0) {
                        let readableMethods = methods.map((method) => {
                            switch (method) {
                                case 'password':
                                    return 'Email/Password';
                                case 'google.com':
                                    return 'Google';
                                case 'facebook.com':
                                    return 'Facebook';
                                case 'twitter.com':
                                    return 'X (Twitter)';
                                default:
                                    return method;
                            }
                        });
                        message += ` Please sign in using one of the following methods: ${readableMethods.join(', ')}`;
                    } else {
                        message += ' Please sign in using your email and password.';
                    }
                } catch (fetchErr) {
                    message += ' However, we could not retrieve the available sign-in methods. Please try again later or contact support.';
                }
                setSocialError(message);
            } else if (err.code === 'auth/invalid-credential') {
                setSocialError('Twitter sign-in failed due to invalid credentials. Please check your Twitter app configuration in Firebase and Twitter Developer Portal, and ensure the callback URL is correct. If the problem persists, try again or contact support.');
            } else {
                console.error('social sign in error', err);
                setSocialError('Social sign-in failed. Please try again or use another method.');
            }
        }
    };
    return (
        <div>
            {socialError && <div className="text-red-600 mb-2">{socialError}</div>}
            <div className="flex gap-2">
                <button onClick={() => handlePopup(googleProvider)} className="flex-1 py-2 border rounded">Google</button>
                <button onClick={() => handlePopup(facebookProvider)} className="flex-1 py-2 border rounded">Facebook</button>
                <button onClick={() => handlePopup(twitterProvider)} className="flex-1 py-2 border rounded">X</button>
            </div>
        </div>
    );
}
