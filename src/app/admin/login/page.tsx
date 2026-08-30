"use client";

import { useState } from 'react';
import { signIn, SessionProvider } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { adminLoginSchema } from '@/lib/validations/admin';
import { z } from 'zod';
import { PasswordInput } from '@/components/ui/password-input';
import { toast } from '@/context/ToastContext';
import { getFriendlyErrorMessage } from '@/utils/errorMapper';

type FormData = z.infer<typeof adminLoginSchema>;

export default function AdminLoginPage() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(adminLoginSchema),
    });

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        setError(null);

        try {
            const res = await signIn('credentials', {
                email: data.email,
                password: data.password,
                redirect: false,
            });

            if (res?.error) {
                const friendlyMsg = getFriendlyErrorMessage(res.error, 'login');
                toast.error(friendlyMsg);
                setError(friendlyMsg);
            } else {
                router.push('/admin/dashboard');
                router.refresh();
            }
        } catch (err) {
            const friendlyMsg = getFriendlyErrorMessage(err, 'login');
            toast.error(friendlyMsg);
            setError(friendlyMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SessionProvider basePath="/api/auth/admin">
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#0a0a0a_100%)]">
                <div className="w-full max-w-md p-8 rounded-2xl bg-[#111] border border-white/10 shadow-2xl backdrop-blur-xl">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
                        <p className="text-gray-400">Secure Access Only</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                            <input
                                {...register('email')}
                                type="email"
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                placeholder="admin@thebible.net"
                            />
                            {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                            <PasswordInput
                                {...register('password')}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all pr-12"
                                placeholder="••••••••"
                                buttonClassName="hover:text-white text-gray-400"
                            />
                            {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center">
                                <input {...register('rememberMe')} type="checkbox" className="rounded border-white/10 bg-white/5 text-blue-500" />
                                <span className="ml-2 text-sm text-gray-400">Remember me</span>
                            </label>
                            <a href="/admin/forgot-password" title="Forgot Password" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">Forgot password?</a>
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:from-blue-500 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span className="ml-2">Signing in...</span>
                                </div>
                            ) : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>
        </SessionProvider>
    );
}
