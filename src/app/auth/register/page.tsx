'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, Mail, Lock, AlertCircle, ArrowRight, ChevronLeft, IdCard, Contact, Eye, EyeOff } from 'lucide-react';
import { LegalModal } from '@/components/LegalModal';


export default function RegisterStep1() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
    });
    const [tncAccepted, setTncAccepted] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [legalModal, setLegalModal] = useState<{ isOpen: boolean; type: 'terms' | 'privacy' }>({
        isOpen: false,
        type: 'terms',
    });


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
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md glass-ios border-none p-8 space-y-8 relative overflow-hidden shadow-2xl"
        >
            {/* Back Button */}
            <motion.button
                whileHover={{ x: -2, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => router.push('/home')}
                className="absolute left-6 top-6 p-2 rounded-full bg-white/10 text-slate-500 hover:text-[var(--color-primary-teal)] hover:bg-white/20 transition-all outline-none backdrop-blur-sm"
                title="Back to Home"
            >
                <ChevronLeft className="w-5 h-5" />
            </motion.button>

            <div className="text-center space-y-3 pt-4">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-sans">Join The Bible</h1>
                <p className="text-slate-500/80 font-medium">Step 1 of 3: Basic Details</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium"
                    >
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </motion.div>
                )}

                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">First Name</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[var(--color-accent-rose)] transition-colors" />
                            <input
                                type="text"
                                required
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="w-full bg-gray-100/50 border-none rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[var(--color-accent-rose)]/20 transition-all placeholder:text-gray-400 font-medium"
                                placeholder="John"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Last Name</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[var(--color-accent-rose)] transition-colors" />
                            <input
                                type="text"
                                required
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full bg-gray-100/50 border-none rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[var(--color-accent-rose)]/20 transition-all placeholder:text-gray-400 font-medium"
                                placeholder="Doe"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[var(--color-accent-rose)] transition-colors" />
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-gray-100/50 border-none rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[var(--color-accent-rose)]/20 transition-all placeholder:text-gray-400 font-medium"
                            placeholder="example@email.com"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[var(--color-accent-rose)] transition-colors" />
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={8}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full bg-gray-100/50 border-none rounded-2xl py-4 pl-12 pr-12 outline-none focus:ring-2 focus:ring-[var(--color-accent-rose)]/20 transition-all placeholder:text-gray-400 font-medium"
                            placeholder="Min. 8 characters"
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--color-primary-teal)] transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <div className="flex items-start gap-3 px-1">
                    <div className="flex items-center h-5 mt-0.5">
                        <input
                            type="checkbox"
                            id="tnc"
                            required
                            checked={tncAccepted}
                            onChange={(e) => setTncAccepted(e.target.checked)}
                            className="w-5 h-5 rounded-[6px] border-slate-300 text-[var(--color-primary-teal)] focus:ring-[var(--color-primary-teal)] accent-[var(--color-primary-teal)] cursor-pointer"
                        />
                    </div>
                    <label htmlFor="tnc" className="text-sm text-slate-600 font-medium cursor-pointer leading-relaxed">
                        I agree to the <button type="button" onClick={() => setLegalModal({ isOpen: true, type: 'terms' })} className="text-[var(--color-primary-teal)] font-bold hover:underline bg-transparent border-none p-0">Terms & Conditions</button>.
                    </label>

                </div>

                <button
                    type="submit"
                    disabled={loading || !tncAccepted || !formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || formData.password.length < 8}
                    className="w-full bg-[var(--color-primary-teal)] disabled:bg-slate-300 hover:bg-[var(--color-primary-teal-dark)] text-white font-bold py-4 rounded-2xl shadow-xl shadow-[var(--color-primary-teal)]/20 disabled:shadow-none transition-all active:scale-[0.98] disabled:active:scale-100 flex items-center justify-center gap-3 group text-lg"
                >
                    {loading ? (
                        <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                        </>
                    )}
                </button>
            </form>

            <div className="text-center pt-2">
                <p className="text-slate-500 text-sm font-medium">
                    Already have an account?{' '}
                    <Link href="/auth/login" className="text-[var(--color-primary-teal)] font-extrabold hover:underline underline-offset-4 font-sans">
                        Sign In
                    </Link>
                </p>
            </div>

            <LegalModal 
                isOpen={legalModal.isOpen} 
                onClose={() => setLegalModal({ ...legalModal, isOpen: false })} 
                type={legalModal.type} 
            />
        </motion.div>

    );
}
