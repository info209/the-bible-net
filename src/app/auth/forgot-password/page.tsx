'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, AlertCircle, ChevronLeft } from 'lucide-react';

export default function ForgotPassword() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (res.ok) {
                router.push('/auth/check-email');
            } else {
                const data = await res.json();
                setError(data.error || 'Something went wrong. Please try again.');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md apple-nav-floating p-8 space-y-8"
            >
                <div>
                    <button 
                        onClick={() => router.back()}
                        className="text-slate-400 font-semibold text-sm hover:text-[#41ADB0] transition-colors flex items-center gap-1 mb-6"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Login
                    </button>
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Forgot Password</h1>
                        <p className="text-slate-500 font-medium">Enter the email associated with your account</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2 text-sm">
                            <AlertCircle className="w-5 h-5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700">Email Address</label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#41ADB0] transition-colors" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 outline-none focus:border-[#41ADB0] focus:ring-4 focus:ring-[#41ADB0]/10 transition-all"
                                placeholder="example@email.com"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#41ADB0] hover:bg-[#369294] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#41ADB0]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                    >
                        {loading ? 'Sending...' : (
                            <>
                                Continue <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
