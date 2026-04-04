'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, ShieldCheck, ArrowRight, Home, LogIn } from 'lucide-react';

function SuccessPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const type = searchParams.get('type') || 'account';

    const config = {
        account: {
            title: 'Account created successfully',
            message: 'Click Continue to set up your profile and finish creating your account.',
            icon: <CheckCircle className="w-12 h-12 text-white" />,
            buttonText: 'Continue',
            buttonAction: () => router.push('/'),
            showSkip: true,
        },
        profile: {
            title: 'Profile Updated!',
            message: 'Your profile has been successfully personalized. You are all set to explore!',
            icon: <CheckCircle className="w-12 h-12 text-white" />,
            buttonText: 'Go to Home',
            buttonAction: () => router.push('/home'),
            showSkip: false,
        },
        password: {
            title: 'Password Updated Successfully',
            message: 'Your password has been changed. You can now login with your new credentials.',
            icon: <ShieldCheck className="w-12 h-12 text-white" />,
            buttonText: 'Go to Login',
            buttonAction: () => router.push('/auth/login'),
            showSkip: false,
        }
    };

    const current = config[type as keyof typeof config] || config.account;

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md glass-ios border-none p-10 space-y-10 text-center relative overflow-hidden shadow-2xl"
        >
            <div className="space-y-6">
                <motion.div 
                    initial={{ scale: 0.5, rotate: -15, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                    className="mx-auto w-24 h-24 bg-[var(--color-primary-teal)] rounded-[2rem] flex items-center justify-center shadow-2xl shadow-[var(--color-primary-teal)]/30 relative"
                >
                    <div className="absolute inset-0 rounded-[2rem] border-4 border-white/20 animate-pulse" />
                    {current.icon}
                </motion.div>
                
                <div className="space-y-3">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter font-sans leading-tight">{current.title}</h1>
                    <p className="text-slate-500/80 font-medium px-4 leading-relaxed">
                        {current.message}
                    </p>
                </div>
            </div>

            <div className="space-y-5 pt-4">
                <button
                    onClick={current.buttonAction}
                    className="group w-full bg-[var(--color-primary-teal)] hover:bg-[var(--color-primary-teal-dark)] text-white font-bold py-5 rounded-2xl shadow-xl shadow-[var(--color-primary-teal)]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
                >
                    {current.buttonText}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </button>
                
                {current.showSkip && (
                    <button 
                        onClick={() => router.push('/home')}
                        className="w-full text-slate-400 font-extrabold py-2 hover:text-slate-600 transition-colors flex items-center justify-center gap-2 text-sm tracking-wide"
                    >
                        Skip for now
                    </button>
                )}
            </div>

            <div className="pt-6 border-t border-slate-200/40 flex justify-center gap-10">
                <button onClick={() => router.push('/home')} className="text-slate-400 hover:text-[var(--color-primary-teal)] transition-all hover:scale-110" title="Home">
                    <Home className="w-6 h-6" />
                </button>
                <button onClick={() => router.push('/auth/login')} className="text-slate-400 hover:text-[var(--color-primary-teal)] transition-all hover:scale-110" title="Sign In">
                    <LogIn className="w-6 h-6" />
                </button>
            </div>
        </motion.div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SuccessPageContent />
        </Suspense>
    );
}
