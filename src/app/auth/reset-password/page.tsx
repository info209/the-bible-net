'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react';

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) {
            router.push('/auth/login');
        }
    }, [token, router]);

    const validations = [
        { label: 'Minimum 8 characters', met: password.length >= 8 },
        { label: 'Include uppercase', met: /[A-Z]/.test(password) },
        { label: 'Include lowercase', met: /[a-z]/.test(password) },
        { label: 'Include number', met: /\d/.test(password) },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (password !== confirmPassword) {
            setError("Passwords don't match");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password, confirmPassword }),
            });

            if (res.ok) {
                router.push('/auth/success?type=password');
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to reset password. Token may be expired.');
            }
        } catch (err) {
            setError('Connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md glass-ios border-none p-8 space-y-8 relative overflow-hidden shadow-2xl"
        >
            <div className="text-center space-y-3 pt-2">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">New Password</h1>
                <p className="text-slate-500/80 font-medium leading-relaxed px-6">Secure your account with a fresh, strong password</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium"
                    >
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </motion.div>
                )}

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">New Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[var(--color-accent-rose)] transition-colors" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-100/50 border-none rounded-2xl py-4 pl-12 pr-12 outline-none focus:ring-2 focus:ring-[var(--color-accent-rose)]/20 transition-all font-mono placeholder:text-gray-400 font-bold tracking-widest"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-[var(--color-primary-teal)] transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Confirm Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[var(--color-accent-rose)] transition-colors" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-gray-100/50 border-none rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[var(--color-accent-rose)]/20 transition-all font-mono placeholder:text-gray-400 font-bold tracking-widest"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50/50 backdrop-blur-sm rounded-2xl border border-slate-200/40 shadow-inner">
                    {validations.map((v, i) => (
                        <div key={i} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-wider transition-colors ${v.met ? 'text-[var(--color-primary-teal)]' : 'text-slate-400'}`}>
                            {v.met ? <Check className="w-3.5 h-3.5 stroke-[4px]" /> : <X className="w-3.5 h-3.5 stroke-[4px]" />}
                            {v.label}
                        </div>
                    ))}
                </div>

                <button
                    type="submit"
                    disabled={loading || validations.some(v => !v.met)}
                    className="w-full bg-[var(--color-primary-teal)] hover:bg-[var(--color-primary-teal-dark)] text-white font-bold py-4 rounded-2xl shadow-xl shadow-[var(--color-primary-teal)]/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 text-lg"
                >
                    {loading ? (
                        <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : 'Confirm Reset'}
                </button>
            </form>
        </motion.div>
    );
}

export default function ResetPassword() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordContent />
        </Suspense>
    );
}
