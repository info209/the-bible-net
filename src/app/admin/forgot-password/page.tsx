"use client";

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { forgotPasswordSchema } from '@/lib/validations/admin';
import { z } from 'zod';
import { toast } from '@/context/ToastContext';
import { getFriendlyErrorMessage } from '@/utils/errorMapper';

type FormData = z.infer<typeof forgotPasswordSchema>;

export default function AdminForgotPasswordPage() {
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        setStatus(null);

        try {
            const res = await fetch('/api/admin/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await res.json();
            if (res.ok) {
                setStatus({ type: 'success', message: result.message });
            } else {
                const friendlyMsg = getFriendlyErrorMessage(result.error || result.message || 'Something went wrong', 'forgot-password');
                toast.error(friendlyMsg);
                setStatus({ type: 'error', message: friendlyMsg });
            }
        } catch (err) {
            const friendlyMsg = getFriendlyErrorMessage(err, 'forgot-password');
            toast.error(friendlyMsg);
            setStatus({ type: 'error', message: friendlyMsg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
            <div className="w-full max-w-md p-8 rounded-2xl bg-[#111] border border-white/10 shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Forgot Password</h1>
                    <p className="text-gray-400">Enter your email to receive a reset link</p>
                </div>

                {status?.type === 'success' ? (
                    <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/20 text-green-200 text-center">
                        <div className="text-4xl mb-4">📧</div>
                        <p>{status.message}</p>
                        <a href="/admin/login" title="Back to Login" className="mt-6 inline-block text-blue-400 hover:text-blue-300 transition-colors">Back to Login</a>
                    </div>
                ) : (
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

                        {status?.type === 'error' && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
                                {status.message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:from-blue-500 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>

                        <div className="text-center">
                            <a href="/admin/login" title="Back to Login" className="text-sm text-gray-400 hover:text-white transition-colors">Return to login</a>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
