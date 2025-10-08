// src/components/Auth/SignInForm.tsx
'use client';

import React, { useRef, useState } from 'react';
import { auth } from '../../lib/firebaseClient';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
} from 'firebase/auth';

export default function SignInForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resetMessage, setResetMessage] = useState<string | null>(null);
    const [rememberMe, setRememberMe] = useState(false);

    const emailRef = useRef<HTMLInputElement | null>(null);

    // toggle password visibility
    const [showPassword, setShowPassword] = useState(false);
    const toggleShowPassword = () => setShowPassword(s => !s);

    async function exchangeIdTokenForSession(idToken: string) {
        await fetch('/api/auth/sessionLogin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });
    }

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResetMessage(null);
        try {
            // Set Firebase persistence based on rememberMe
            if (rememberMe) {
                await import('firebase/auth').then(({ browserLocalPersistence, setPersistence }) =>
                    setPersistence(auth, browserLocalPersistence)
                );
            } else {
                await import('firebase/auth').then(({ browserSessionPersistence, setPersistence }) =>
                    setPersistence(auth, browserSessionPersistence)
                );
            }
            if (isRegister) {
                // create account then send verification
                const userCred = await createUserWithEmailAndPassword(auth, email, password);
                await sendEmailVerification(userCred.user);
                const token = await userCred.user.getIdToken();
                await exchangeIdTokenForSession(token);
                // go to complete profile (optional)
                window.location.href = '/signup/complete';
            } else {
                const userCred = await signInWithEmailAndPassword(auth, email, password);
                const token = await userCred.user.getIdToken();
                await exchangeIdTokenForSession(token);
                window.location.href = '/bible';
            }
        } catch (err: any) {
            setError(mapFirebaseError(err));
            console.error('auth submit error', err);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        setResetMessage(null);
        setError(null);

        if (!email) {
            // focus the email input and show message so user knows to enter email
            if (emailRef.current) {
                emailRef.current.focus();
            }
            setResetMessage('Please enter your email address above to receive a password reset link.');
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            setResetMessage('Password reset email sent! Please check your inbox.');
        } catch (err: any) {
            console.error('sendPasswordResetEmail error', err);
            setResetMessage(mapFirebaseError(err) || 'Failed to send password reset email.');
        }
    };

    // friendly mapping for firebase auth errors
    function mapFirebaseError(err: any) {
        const code = err?.code || err?.message || '';
        if (typeof code === 'string') {
            if (code.includes('auth/user-not-found')) return 'No account found with that email.';
            if (code.includes('auth/invalid-email')) return 'Please enter a valid email address.';
            if (code.includes('auth/wrong-password')) return 'Incorrect password. Please try again.';
            if (code.includes('auth/weak-password')) return 'Password is too weak. Use at least 6 characters.';
            if (code.includes('auth/email-already-in-use')) return 'This email is already in use. Try logging in.';
            if (code.includes('auth/popup-blocked')) return 'Popup blocked — allow popups and try again.';
            if (code.includes('auth/popup-closed-by-user')) return 'Popup closed before completing sign-in.';
            // fallback to raw message but trim long SDK noise
            return (err?.message || String(err)).toString();
        }
        return 'An unknown error occurred.';
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {error && <div className="text-red-600 text-sm">{error}</div>}
            {resetMessage && <div className="text-teal-700 text-sm">{resetMessage}</div>}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400">✉️</span>
                    <input
                        ref={emailRef}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 block w-full border rounded-lg p-3 pl-11 placeholder-gray-400"
                        type="email"
                        placeholder="name@domain.com"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400">🔒</span>
                    <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 block w-full border rounded-lg p-3 pl-11 placeholder-gray-400"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={isRegister ? 'Min 8 characters' : '********'}
                        required
                        minLength={isRegister ? 8 : 6}
                        aria-label="Password"
                    />
                    <button
                        type="button"
                        onClick={toggleShowPassword}
                        className="absolute right-3 top-3 text-gray-600"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword ? (
                            // Eye-off (closed) SVG
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 002.25 12c1.68 4.418 6.03 8 9.75 8 1.563 0 3.06-.376 4.42-1.09M21.75 12c-.326-.813-.77-1.59-1.32-2.29M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.75 9L3 3" />
                            </svg>
                        ) : (
                            // Eye (open) SVG
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12c1.68 4.418 6.03 8 9.75 8s8.07-3.582 9.75-8c-1.68-4.418-6.03-8-9.75-8s-8.07 3.582-9.75 8zm9.75 3a3 3 0 100-6 3 3 0 000 6z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                </label>

                {/* IMPORTANT: keep type="button" so this does NOT submit the form */}
                <button
                    type="button"
                    className="text-sm text-teal-700 no-underline"
                    onClick={handleForgotPassword}
                >
                    Forgot password?
                </button>
            </div>

            <button disabled={loading} type="submit" className="w-full py-3 bg-teal-700 text-white rounded-lg text-base">
                {loading ? 'Please wait...' : isRegister ? 'Create account' : 'Login'}
            </button>
        </form>
    );
}
