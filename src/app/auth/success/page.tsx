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
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md apple-nav-floating p-10 space-y-10 text-center"
            >
                <div className="space-y-6">
                    <motion.div 
                        initial={{ scale: 0.5, rotate: -15 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="mx-auto w-24 h-24 bg-[#41ADB0] rounded-[2rem] flex items-center justify-center shadow-2xl shadow-[#41ADB0]/30"
                    >
                        {current.icon}
                    </motion.div>
                    
                    <div className="space-y-3">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{current.title}</h1>
                        <p className="text-slate-500 font-medium px-4 leading-relaxed">
                            {current.message}
                        </p>
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    <button
                        onClick={current.buttonAction}
                        className="group w-full bg-[#41ADB0] hover:bg-[#369294] text-white font-bold py-5 rounded-2xl shadow-lg shadow-[#41ADB0]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        {current.buttonText}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    {current.showSkip && (
                        <button 
                            onClick={() => router.push('/')}
                            className="w-full text-slate-400 font-bold py-2 hover:text-slate-600 transition-colors flex items-center justify-center gap-2"
                        >
                            Skip for now
                        </button>
                    )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-center gap-8">
                    <button onClick={() => router.push('/')} className="text-slate-400 hover:text-[#41ADB0] transition-colors">
                        <Home className="w-6 h-6" />
                    </button>
                    <button onClick={() => router.push('/auth/login')} className="text-slate-400 hover:text-[#41ADB0] transition-colors">
                        <LogIn className="w-6 h-6" />
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SuccessPageContent />
        </Suspense>
    );
}
