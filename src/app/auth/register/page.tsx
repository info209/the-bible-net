'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, Mail, Lock, AlertCircle, ArrowRight, ChevronLeft } from 'lucide-react';

export default function RegisterStep1() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Registration failed');
            } else {
                // Success - go to step 2 (OTP)
                // Store userId in localStorage or use searchParams
                router.push(`/auth/verify-otp?userId=${data.data.userId}&email=${encodeURIComponent(data.data.email)}`);
            }
        } catch (err: any) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md apple-nav-floating p-8 space-y-8 relative"
            >
                {/* Back Button */}
                <motion.button
                    whileHover={{ x: -2, scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => router.push('/home')}
                    className="absolute left-6 top-6 p-2 rounded-full bg-slate-50 text-slate-400 hover:text-[#41ADB0] hover:bg-[#41ADB0]/5 transition-all outline-none"
                    title="Back to Home"
                >
                    <ChevronLeft className="w-5 h-5" />
                </motion.button>
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Create a new account</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Step 1 of 3: Basic Details</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm"
                        >
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span>{error}</span>
                        </motion.div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700">First Name</label>
                            <div className="relative group">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#41ADB0] transition-colors" />
                                <input
                                    type="text"
                                    required
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="w-full bg-white/50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-[#41ADB0]/20 focus:border-[#41ADB0] transition-all"
                                    placeholder="John"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700">Last Name</label>
                            <div className="relative group">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#41ADB0] transition-colors" />
                                <input
                                    type="text"
                                    required
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="w-full bg-white/50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-[#41ADB0]/20 focus:border-[#41ADB0] transition-all"
                                    placeholder="Doe"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700">Email Address</label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#41ADB0] transition-colors" />
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full bg-white/50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-[#41ADB0]/20 focus:border-[#41ADB0] transition-all"
                                placeholder="example@email.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#41ADB0] transition-colors" />
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full bg-white/50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-[#41ADB0]/20 focus:border-[#41ADB0] transition-all"
                                placeholder="Minimum 8 characters"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl text-slate-500 text-xs italic leading-relaxed">
                        By continuing you agree to receive a 6-digit verification code via email and accept our Terms of Service.
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#41ADB0] hover:bg-[#369294] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#41ADB0]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                    >
                        {loading ? 'Sending Code...' : (
                            <>
                                Continue <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="text-center">
                    <p className="text-slate-500 text-sm font-medium">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="text-[#41ADB0] font-bold hover:underline">
                            Login here
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
