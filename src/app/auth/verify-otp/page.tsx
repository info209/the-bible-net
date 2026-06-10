'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, ArrowRight, RefreshCcw, AlertCircle } from 'lucide-react';

function VerifyOTPContent() {
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
                // Try auto-login if registration credentials are in sessionStorage
                if (typeof window !== 'undefined') {
                    const tempEmail = sessionStorage.getItem('temp_register_email');
                    const tempPassword = sessionStorage.getItem('temp_register_password');
                    if (tempEmail && tempPassword) {
                        try {
                            const { signIn } = await import('next-auth/react');
                            const loginRes = await signIn('credentials', {
                                email: tempEmail,
                                password: tempPassword,
                                redirect: false,
                            });
                            sessionStorage.removeItem('temp_register_email');
                            sessionStorage.removeItem('temp_register_password');

                            if (loginRes && !loginRes.error) {
                                router.push('/home');
                                router.refresh();
                                return;
                            }
                        } catch (signInErr) {
                            console.error('Auto-login failed:', signInErr);
                        }
                    }
                }
                router.push('/home');
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
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md glass-ios border-none p-8 space-y-8 relative overflow-hidden shadow-2xl"
        >
            <div className="text-center space-y-4">
                <div className="mx-auto w-20 h-20 bg-[var(--color-primary-teal)]/10 rounded-full flex items-center justify-center shadow-inner">
                    <ShieldCheck className="w-10 h-10 text-[var(--color-primary-teal)]" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-sans">Verify Identity</h1>
                    <p className="text-slate-500/80 font-medium px-4 leading-relaxed">
                        We sent a 6-digit code to <span className="text-slate-900 font-bold block mt-1 underline decoration-[var(--color-primary-teal)]/30 underline-offset-4">{email || 'your email'}</span>
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
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

                <div className="flex justify-between gap-2.5">
                    {otp.map((digit, i) => (
                        <input
                            key={i}
                            ref={(el) => { inputRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleInput(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            className="w-12 h-16 text-center text-3xl font-bold bg-gray-100/50 border-2 border-transparent rounded-2xl outline-none focus:border-[var(--color-primary-teal)] focus:ring-4 focus:ring-[var(--color-primary-teal)]/10 transition-all text-slate-800 shadow-sm"
                        />
                    ))}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[var(--color-primary-teal)] hover:bg-[var(--color-primary-teal-dark)] text-white font-bold py-4 rounded-2xl shadow-xl shadow-[var(--color-primary-teal)]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group text-lg"
                >
                    {loading ? (
                        <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            Verify & Continue <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                        </>
                    )}
                </button>
            </form>

            <div className="text-center space-y-6 pt-2">
                <button
                    onClick={handleResend}
                    disabled={resending}
                    className="text-slate-500 font-bold text-sm hover:text-[var(--color-primary-teal)] transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                >
                    <RefreshCcw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                    Resend Code
                </button>

                <button
                    onClick={() => router.back()}
                    className="text-[var(--color-primary-teal)] text-sm font-extrabold block mx-auto hover:underline underline-offset-4"
                >
                    Change Email Address
                </button>
            </div>
        </motion.div>
    );
}

export default function VerifyOTP() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyOTPContent />
        </Suspense>
    );
}
