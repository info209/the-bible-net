// src/components/Auth/SignInForm.tsx
'use client';

import React, { useState } from 'react';
import { auth } from '../../lib/firebaseClient';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';

export default function SignInForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resetMessage, setResetMessage] = useState<string | null>(null);

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
        try {
            if (isRegister) {
                const userCred = await createUserWithEmailAndPassword(auth, email, password);
                await sendEmailVerification(userCred.user);
                const token = await userCred.user.getIdToken();
                await exchangeIdTokenForSession(token);
            } else {
                const userCred = await signInWithEmailAndPassword(auth, email, password);
                const token = await userCred.user.getIdToken();
                await exchangeIdTokenForSession(token);
            }
            window.location.href = '/reader';
        } catch (err: any) {
            setError(err?.message || 'Auth error');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.MouseEvent) => {
        e.preventDefault();
        setResetMessage(null);
        setError(null);
        if (!email) {
            setResetMessage('Please enter your email address above first.');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            setResetMessage('Password reset email sent! Please check your inbox.');
        } catch (err: any) {
            setResetMessage(err?.message || 'Failed to send password reset email.');
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {error && <div className="text-red-600">{error}</div>}
            {resetMessage && <div className="text-blue-600">{resetMessage}</div>}
            <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full border rounded p-2" type="email" required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full border rounded p-2" type="password" required minLength={6} />
            </div>
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={isRegister} onChange={(e) => setIsRegister(e.target.checked)} />
                    <span>Create account</span>
                </label>
                <button type="button" className="text-sm text-blue-600 underline" onClick={handleForgotPassword}>Forgot?</button>
            </div>
            <button disabled={loading} type="submit" className="w-full py-2 bg-blue-600 text-white rounded">
                {loading ? 'Please wait...' : isRegister ? 'Register' : 'Sign In'}
            </button>
        </form>
    );
}
