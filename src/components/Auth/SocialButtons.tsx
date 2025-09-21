// src/components/Auth/SocialButtons.tsx
'use client';

import React, { useState } from 'react';
import { auth, googleProvider, facebookProvider, twitterProvider } from '../../lib/firebaseClient';
import { signInWithPopup, fetchSignInMethodsForEmail, getAdditionalUserInfo } from 'firebase/auth';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook, FaXTwitter } from 'react-icons/fa6';

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
            const additionalInfo = getAdditionalUserInfo(result);
            if (additionalInfo?.isNewUser) {
                window.location.href = '/signup/complete';
            } else {
                window.location.href = '/reader';
            }
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
            <div className="flex gap-6 justify-center">
                <button
                    onClick={() => handlePopup(googleProvider)}
                    className="bg-white rounded-full shadow-md w-16 h-16 flex items-center justify-center transition hover:shadow-lg focus:outline-none"
                    aria-label="Sign in with Google"
                    type="button"
                >
                    <FcGoogle className="text-3xl" />
                </button>
                <button
                    onClick={() => handlePopup(facebookProvider)}
                    className="bg-white rounded-full shadow-md w-16 h-16 flex items-center justify-center transition hover:shadow-lg focus:outline-none"
                    aria-label="Sign in with Facebook"
                    type="button"
                >
                    <FaFacebook className="text-3xl text-blue-600" />
                </button>
                <button
                    onClick={() => handlePopup(twitterProvider)}
                    className="bg-white rounded-full shadow-md w-16 h-16 flex items-center justify-center transition hover:shadow-lg focus:outline-none"
                    aria-label="Sign in with X"
                    type="button"
                >
                    <FaXTwitter className="text-3xl text-black" />
                </button>
            </div>
        </div>
    );
}
