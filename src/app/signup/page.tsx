// src/app/signup/page.tsx
'use client';

import React, { useState } from 'react';
import { auth } from '../../lib/firebaseClient';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import SocialButtons from '../../components/Auth/SocialButtons';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState('');
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
        if (!name.trim()) {
            setError('Full name is required.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(userCred.user);
            try { if (name) await (userCred.user as any).updateProfile({ displayName: name }); } catch {}
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
                    <img src="/logo.jpg" alt="logo" className="h-12" />
                </div>

                <h1 className="text-2xl font-semibold text-center mb-4">Create a new account</h1>

                <form onSubmit={handleContinue} className="space-y-4">
                    {error && <div className="text-red-600 text-sm">{error}</div>}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Enter your full name</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border rounded-lg p-3" placeholder="Full Name" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Enter your email</label>
                        <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full border rounded-lg p-3" type="email" placeholder="name@domain.com" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Enter your password</label>
                        <div className="relative">
                            <input value={password} onChange={(e)=>setPassword(e.target.value)} className="mt-1 block w-full border rounded-lg p-3 pr-12" type={showPassword ? 'text' : 'password'} placeholder="Min 8 characters" minLength={8} required />
                            <button type="button" onClick={toggleShowPassword} className="absolute right-3 top-3 text-gray-600" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <button disabled={loading} type="submit" className="w-full py-3 bg-teal-700 text-white rounded-lg">
                        {loading ? 'Please wait...' : 'Continue'}
                    </button>

                    <div className="mt-4">
                        <div className="h-3 rounded-full bg-pink-100 overflow-hidden">
                            <div className="h-3 rounded-full bg-pink-500" style={{ width: '40%' }} />
                        </div>
                        <div className="text-xs text-gray-500 mt-2">Step 1 of 2</div>
                    </div>
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
                    Already a member? <a href="/login" className="text-teal-700 underline">Login</a>
                </div>
            </div>
        </div>
    );
}
