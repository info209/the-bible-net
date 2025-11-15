// src/components/Auth/SocialButtons.tsx
'use client';

import React, { useState } from 'react';
import { auth, googleProvider, facebookProvider, twitterProvider } from '../../lib/firebaseClient';
import { signInWithPopup, fetchSignInMethodsForEmail, getAdditionalUserInfo } from 'firebase/auth';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook, FaXTwitter } from 'react-icons/fa6';

export default function SocialButtons() {
    const [socialError, setSocialError] = useState<string | null>(null);

    const handlePopup = async (provider: any) => {
        setSocialError(null);
        try {
            const result = await signInWithPopup(auth, provider);
            const token = await result.user.getIdToken();
            const additionalInfo = getAdditionalUserInfo(result);
            let firstName = '';
            let lastName = '';
            if (
                additionalInfo?.profile &&
                typeof additionalInfo.profile === 'object' &&
                additionalInfo.profile !== null
            ) {
                const profile = additionalInfo.profile as Record<string, unknown>;
                firstName = typeof profile.given_name === 'string' ? profile.given_name :
                            typeof profile.first_name === 'string' ? profile.first_name : '';
                lastName = typeof profile.family_name === 'string' ? profile.family_name :
                           typeof profile.last_name === 'string' ? profile.last_name : '';
            }
            // Send name info to backend for session
            await fetch('/api/auth/sessionLogin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: token, firstName, lastName }),
            });
            if (additionalInfo?.isNewUser) {
                window.location.href = '/signup/complete';
            } else {
                window.location.href = '/bible';
            }
        } catch (err: any) {
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
                } catch {
                    message +=
                        ' However, we could not retrieve the available sign-in methods. Please try again later or contact support.';
                }
                setSocialError(message);
            } else if (err.code === 'auth/invalid-credential') {
                setSocialError(
                    'Twitter sign-in failed due to invalid credentials. Please check your configuration and try again.'
                );
            } else {
                console.error('social sign in error', err);
                setSocialError('Social sign-in failed. Please try again or use another method.');
            }
        }
    };

    return (
        <div>
            {socialError && <div className="text-red-600 mb-2">{socialError}</div>}

            <div className="flex gap-6 justify-center items-center">
                {/* Google */}
                <button
                    onClick={() => handlePopup(googleProvider)}
                    className="bg-white rounded-full shadow-md
                               w-11 h-11 sm:w-11 sm:h-11 md:w-12 md:h-12
                               flex items-center justify-center transition hover:shadow-lg focus:outline-none"
                    aria-label="Sign in with Google"
                    type="button"
                >
                    <FcGoogle
                        className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8
                                   transform scale-[1.05] translate-y-[1px]"
                        aria-hidden="true"
                    />
                </button>

                {/* Facebook */}
                <button
                    onClick={() => handlePopup(facebookProvider)}
                    className="bg-white rounded-full shadow-md
                               w-11 h-11 sm:w-11 sm:h-11 md:w-12 md:h-12
                               flex items-center justify-center transition hover:shadow-lg focus:outline-none"
                    aria-label="Sign in with Facebook"
                    type="button"
                >
                    <FaFacebook
                        className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8
                                   text-[#1877F2] transform scale-[1.0]"
                        aria-hidden="true"
                    />
                </button>

                {/* X (Twitter) */}
                <button
                    onClick={() => handlePopup(twitterProvider)}
                    className="bg-white rounded-full shadow-md
                               w-11 h-11 sm:w-10 sm:h-10 md:w-11 md:h-11
                               flex items-center justify-center transition hover:shadow-lg focus:outline-none"
                    aria-label="Sign in with X"
                    type="button"
                >
                    <FaXTwitter
                        className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7
                                   text-black transform scale-[0.95]"
                        aria-hidden="true"
                    />
                </button>
            </div>
        </div>
    );
}
