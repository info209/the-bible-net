'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
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
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md apple-nav-floating p-8 space-y-8"
            >
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reset Password</h1>
                    <p className="text-slate-500 font-medium px-4">Create a new, strong password</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2 text-sm">
                            <AlertCircle className="w-5 h-5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700">New Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#41ADB0] transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/50 border border-slate-200 rounded-2xl py-3 pl-10 pr-12 outline-none focus:border-[#41ADB0] focus:ring-4 focus:ring-[#41ADB0]/10 transition-all font-mono"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700">Confirm Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#41ADB0] transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-white/50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 outline-none focus:border-[#41ADB0] focus:ring-4 focus:ring-[#41ADB0]/10 transition-all font-mono"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        {validations.map((v, i) => (
                            <div key={i} className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${v.met ? 'text-[#41ADB0]' : 'text-slate-400'}`}>
                                {v.met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                {v.label}
                            </div>
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || validations.some(v => !v.met)}
                        className="w-full bg-[#41ADB0] hover:bg-[#369294] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#41ADB0]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                    >
                        {loading ? 'Updating...' : 'Reset Password'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
