'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { toast } from '@/context/ToastContext';
import { getFriendlyErrorMessage } from '@/utils/errorMapper';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                const friendlyMsg = getFriendlyErrorMessage(result.error, 'login');
                toast.error(friendlyMsg);
                setError(friendlyMsg);
            } else {
                router.push('/home');
            }
        } catch (err: any) {
            const friendlyMsg = getFriendlyErrorMessage(err, 'login');
            toast.error(friendlyMsg);
            setError(friendlyMsg);
        } finally {
            setLoading(false);
        }
    };

    const socialLogins = [
        {
            name: 'Google',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.326 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                    <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.326 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
                    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                </svg>
            )
        },
        {
            name: 'Facebook',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
            )
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-none sm:max-w-md min-h-screen sm:min-h-0 bg-white/95 sm:glass-ios border-none p-6 sm:p-8 space-y-6 sm:space-y-8 relative overflow-y-auto rounded-none sm:rounded-3xl shadow-none sm:shadow-2xl flex flex-col justify-center"
        >
            <div className="text-center space-y-3">
                <div className="relative flex items-center justify-center">
                    <motion.button
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        whileHover={{ x: -2, scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => router.back()}
                        className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-100/80 text-slate-600 hover:text-[var(--color-primary-teal)] hover:bg-slate-200/80 transition-all outline-none cursor-pointer"
                        title="Go back"
                        aria-label="Go back"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </motion.button>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-sans px-10">Welcome back</h1>
                </div>
                <p className="text-slate-500/80 font-medium">Please sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[var(--color-accent-rose)] transition-colors" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-100/50 border-none rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[var(--color-accent-rose)]/20 transition-all placeholder:text-gray-400 font-medium"
                                placeholder="Enter your email"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[var(--color-accent-rose)] transition-colors z-10" />
                            <PasswordInput
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-100/50 border-none rounded-2xl py-4 pl-12 pr-12 outline-none focus:ring-2 focus:ring-[var(--color-accent-rose)]/20 transition-all placeholder:text-gray-400 font-medium"
                                placeholder="••••••••"
                                buttonClassName="hover:text-[var(--color-primary-teal)]"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer group px-1">
                        <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${rememberMe ? 'bg-[var(--color-accent-rose)] border-[var(--color-accent-rose)] shadow-sm' : 'border-slate-300 group-hover:border-[var(--color-accent-rose)]'}`}>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={rememberMe}
                                onChange={() => setRememberMe(!rememberMe)}
                            />
                            {rememberMe && <CheckCircle2 className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                        </div>
                        <span className="text-slate-600 font-bold">Remember me</span>
                    </label>
                    <Link href="/auth/forgot-password" className="text-[var(--color-primary-teal)] font-bold hover:underline underline-offset-4">
                        Forgot password?
                    </Link>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[var(--color-primary-teal)] hover:bg-[var(--color-primary-teal-dark)] text-white font-bold py-4 rounded-2xl shadow-xl shadow-[var(--color-primary-teal)]/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none text-lg flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : 'Sign in'}
                </button>
            </form>

            <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200/60"></div>
                </div>
                <div className="relative flex justify-center text-xs tracking-widest font-bold text-slate-400">
                    <span className="bg-white/50 backdrop-blur-sm px-4 rounded-full">Or continue with</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {socialLogins.map((social) => (
                    <button
                        key={social.name}
                        type="button"
                        onClick={() => signIn(social.name.toLowerCase(), { callbackUrl: '/auth/profile-setup' })}
                        className="flex items-center justify-center p-3.5 border-none rounded-2xl bg-white/40 hover:bg-white/60 transition-all active:scale-[0.92] shadow-sm backdrop-blur-sm"
                        title={`Log in with ${social.name}`}
                    >
                        {social.icon}
                    </button>
                ))}
            </div>

            <div className="text-center pt-2">
                <p className="text-slate-500 text-sm font-medium">
                    New to The Bible Net?{' '}
                    <Link href="/auth/register" className="text-[var(--color-primary-teal)] font-extrabold hover:underline underline-offset-4">
                        Create account
                    </Link>
                </p>
            </div>
        </motion.div>
    );
}
