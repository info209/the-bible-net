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
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md apple-nav-floating p-8 space-y-8 text-center"
            >
                <div className="space-y-4">
                    <div className="mx-auto w-20 h-20 bg-[#41ADB0]/10 rounded-full flex items-center justify-center">
                        <MailOpen className="w-10 h-10 text-[#41ADB0]" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Check Your Email</h1>
                    <p className="text-slate-500 font-medium px-4">
                        We have sent a password reset link to your email. Please check your inbox and follow the instructions.
                    </p>
                </div>

                <div className="space-y-4 pt-4">
                    <button
                        onClick={handleResend}
                        disabled={resending}
                        className="w-full bg-[#41ADB0] hover:bg-[#369294] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#41ADB0]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <RefreshCw className={`w-5 h-5 ${resending ? 'animate-spin' : ''}`} />
                        {resending ? 'Resending...' : 'Resend Email'}
                    </button>
                    
                    <button 
                        onClick={() => router.push('/auth/login')}
                        className="text-slate-500 font-semibold text-sm hover:text-[#41ADB0] transition-colors flex items-center gap-1 mx-auto"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Login
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
