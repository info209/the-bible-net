// src/app/signup/page.tsx
'use client';

import React, { useState } from 'react';
import { auth } from '../../lib/firebaseClient';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import SocialButtons from '../../components/Auth/SocialButtons';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
    const router = useRouter();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // NEW: show/hide password on signup form as well
    const [showPassword, setShowPassword] = useState(false);
    const toggleShowPassword = () => setShowPassword(s => !s);

    async function exchangeIdTokenForSession(idToken: string) {
        await fetch('/api/auth/sessionLogin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });
    }

    const handleContinue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName.trim() || !lastName.trim()) {
            setError('First name and Last name are required.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            // Run email verification and profile update in background
            sendEmailVerification(userCred.user);
            const displayName = `${firstName.trim()} ${lastName.trim()}`;
            updateProfile(userCred.user, { displayName });
            const token = await userCred.user.getIdToken();
            await exchangeIdTokenForSession(token);
            window.location.href = '/signup/complete';
        } catch (err: any) {
            setError(err?.message || 'Failed to create account');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = (e: React.MouseEvent) => {
        e.preventDefault();
        if (typeof window !== 'undefined' && window.history.length > 1) router.back();
        else router.push('/login');
    };

    return (
        <div className="min-h-screen flex items-start sm:items-center justify-center bg-[#ffffff] px-4 py-8 sm:py-16">
            <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg border">
                <div className="flex justify-start mb-4">
                    <button onClick={handleBack} aria-label="Go back" className="inline-flex items-center text-2xl">←</button>
                </div>

                <div className="flex justify-center mb-4">
                    <img src="/logo_white.png" alt="logo" className="h-24" />
                </div>

                <h1 className="text-2xl font-semibold text-left mb-4">Create a new account</h1>

                <form onSubmit={handleContinue} className="space-y-4">
                    {error && <div className="text-red-600 text-sm">{error}</div>}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">First name</label>
                        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1 block w-full border rounded-lg p-3" placeholder="First name" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last name</label>
                        <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1 block w-full border rounded-lg p-3" placeholder="Last name" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full border rounded-lg p-3" type="email" placeholder="email@domain.com" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        <div className="relative">
                            <input value={password} onChange={(e)=>setPassword(e.target.value)} className="mt-1 block w-full border rounded-lg p-3 pr-12" type={showPassword ? 'text' : 'password'} placeholder="Min 8 characters" minLength={8} required />
                            <button type="button" onClick={toggleShowPassword} className="absolute right-3 top-3 text-gray-600" aria-label={showPassword ? 'Hide password' : 'Show password'}>
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

                    <button disabled={loading} type="submit" className="w-full py-3 bg-teal-700 text-white rounded-lg flex items-center justify-center">
                        {loading ? (<span className="loader mr-2"></span>) : null}
                        {loading ? 'Please wait...' : 'Create account'}
                    </button>
                </form>

                <div className="my-6 flex items-center">
                    <div className="flex-1 h-px bg-gray-200" />
                    <div className="px-3 text-sm text-gray-500">or continue with social accounts</div>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="flex items-center justify-center">
                    <SocialButtons />
                </div>

                <div className="mt-6 text-center text-sm">
                    Already a member? <a href="/login" className="text-teal-700 no-underline">Login</a>
                </div>
            </div>

            {/* Add loader CSS */}
            <style jsx>{`
            .loader {
              border: 2px solid #f3f3f3;
              border-top: 2px solid #319795;
              border-radius: 50%;
              width: 18px;
              height: 18px;
              animation: spin 0.8s linear infinite;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            `}</style>
        </div>
    );
}
