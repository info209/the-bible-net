"use client";

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { resetPasswordSchema } from '@/lib/validations/admin';
import { z } from 'zod';
import { toast } from '@/context/ToastContext';
import { getFriendlyErrorMessage } from '@/utils/errorMapper';

type FormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { token: token || '' }
    });

    if (!token) {
        return (
            <div className="text-center p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-200">Invalid or missing reset token. Please request a new one.</p>
                <a href="/admin/forgot-password" title="Request New Link" className="mt-4 inline-block text-blue-400">Request New Link</a>
            </div>
        );
    }

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        setStatus(null);

        try {
            const res = await fetch('/api/admin/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await res.json();
            if (res.ok) {
                setStatus({ type: 'success', message: result.message });
                setTimeout(() => router.push('/admin/login'), 2000);
            } else {
                const friendlyMsg = getFriendlyErrorMessage(result.error || result.message || 'Something went wrong', 'reset-password');
                toast.error(friendlyMsg);
                setStatus({ type: 'error', message: friendlyMsg });
            }
        } catch (err) {
            const friendlyMsg = getFriendlyErrorMessage(err, 'reset-password');
            toast.error(friendlyMsg);
            setStatus({ type: 'error', message: friendlyMsg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <input type="hidden" {...register('token')} />
            
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                <input
                    {...register('password')}
                    type="password"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="••••••••"
                />
                {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                <input
                    {...register('confirmPassword')}
                    type="password"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="••••••••"
                />
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>}
            </div>

            {status && (
                <div className={`p-4 rounded-xl border ${status.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-200' : 'bg-red-500/10 border-red-500/20 text-red-200'} text-sm`}>
                    {status.message}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:from-blue-500 hover:to-blue-400 transition-all disabled:opacity-50"
            >
                {loading ? 'Updating...' : 'Update Password'}
            </button>
        </form>
    );
}

export default function AdminResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
            <div className="w-full max-w-md p-8 rounded-2xl bg-[#111] border border-white/10 shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Set New Password</h1>
                    <p className="text-gray-400">Password must be at least 8 characters</p>
                </div>

                <Suspense fallback={<div className="text-center text-gray-500">Loading token...</div>}>
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </div>
    );
}
