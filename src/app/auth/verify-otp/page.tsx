'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, ArrowRight, RefreshCcw, AlertCircle } from 'lucide-react';

export default function VerifyOTP() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

    useEffect(() => {
        if (!userId) {
            router.push('/auth/register');
        }
    }, [userId, router]);

    const handleInput = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const otpValue = otp.join('');
        if (otpValue.length !== 6) {
            setError('Please enter all 6 digits');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, otp: otpValue }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || 'Verification failed');
            } else {
                router.push(`/auth/profile-setup?userId=${userId}`);
            }
        } catch (err) {
            setError('Connection failed. Please check your internet.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        setError('');
        try {
            const res = await fetch('/api/auth/resend-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, email }),
            });
            if (res.ok) alert('New OTP sent!');
        } catch (err) {
            setError('Failed to resend. Try again later.');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans">
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md apple-nav-floating p-8 space-y-8"
            >
                <div className="text-center space-y-3">
                    <div className="mx-auto w-16 h-16 bg-[#41ADB0]/10 rounded-full flex items-center justify-center">
                        <ShieldCheck className="w-8 h-8 text-[#41ADB0]" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Verification</h1>
                    <p className="text-slate-500 font-medium px-4">
                        We have sent you an email at <span className="text-slate-900 font-semibold">{email || 'your email'}</span> with a verification code.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2 text-sm">
                            <AlertCircle className="w-5 h-5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex justify-between gap-2">
                        {otp.map((digit, i) => (
                            <input
                                key={i}
                                ref={(el) => { inputRefs.current[i] = el; }}
                                type="text"
                                inputMode="numeric"
                                value={digit}
                                onChange={(e) => handleInput(i, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(i, e)}
                                className="w-12 h-16 text-center text-3xl font-bold bg-white/50 border-2 border-slate-200 rounded-2xl outline-none focus:border-[#41ADB0] focus:ring-4 focus:ring-[#41ADB0]/10 transition-all text-slate-800"
                            />
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#41ADB0] hover:bg-[#369294] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#41ADB0]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {loading ? 'Verifying...' : (
                            <>
                                Verify & Continue <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>

                <div className="text-center space-y-4">
                    <button 
                        onClick={handleResend}
                        disabled={resending}
                        className="text-slate-500 font-semibold text-sm hover:text-[#41ADB0] transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                    >
                        <RefreshCcw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                        Resend Code
                    </button>
                    
                    <button 
                        onClick={() => router.back()}
                        className="text-[#41ADB0] text-sm font-bold block mx-auto hover:underline"
                    >
                        Change Email Address
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
