'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MailOpen, RefreshCw, ChevronLeft } from 'lucide-react';

export default function CheckEmail() {
    const router = useRouter();
    const [resending, setResending] = useState(false);

    const handleResend = async () => {
        setResending(true);
        // Resend logic here (call forgot-password again if needed)
        setTimeout(() => setResending(false), 2000);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md glass-ios border-none p-8 space-y-8 text-center relative overflow-hidden shadow-2xl"
        >
            <div className="space-y-5">
                <div className="mx-auto w-24 h-24 bg-[var(--color-primary-teal)]/10 rounded-full flex items-center justify-center shadow-inner relative">
                    <div className="absolute inset-0 rounded-full border-2 border-[var(--color-primary-teal)]/20 animate-ping" />
                    <MailOpen className="w-12 h-12 text-[var(--color-primary-teal)] relative z-10" />
                </div>
                <div className="space-y-3">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter font-sans">Check inbox</h1>
                    <p className="text-slate-500/90 font-medium px-4 leading-relaxed">
                        A secure magic link has been dispatched to your email address. Follow it to reset your credentials.
                    </p>
                </div>
            </div>

            <div className="space-y-6 pt-4">
                <button
                    onClick={handleResend}
                    disabled={resending}
                    className="w-full bg-[var(--color-primary-teal)] hover:bg-[var(--color-primary-teal-dark)] text-white font-bold py-4 rounded-2xl shadow-xl shadow-[var(--color-primary-teal)]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
                >
                    <RefreshCw className={`w-5 h-5 ${resending ? 'animate-spin' : ''}`} />
                    {resending ? 'Resending link...' : 'Resend email'}
                </button>
                
                <button 
                    onClick={() => router.push('/auth/login')}
                    className="text-slate-500 font-bold text-sm hover:text-[var(--color-primary-teal)] transition-colors flex items-center gap-2 mx-auto group"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to sign in
                </button>
            </div>
        </motion.div>
    );
}
