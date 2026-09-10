'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import EditProfilePage from '@/app/components/EditProfilePage';
import { useAuth } from '@/context/AuthContext';

/**
 * ProfileSetupContent — post-OAuth route guard + onboarding form.
 *
 * This page is the centralized post-login destination for all OAuth providers
 * (Google, Facebook). The callbackUrl points here unconditionally, and this
 * guard resolves where to send the user:
 *
 *   loading            → show loading spinner (auth still initializing)
 *   authenticated      → onboardingCompleted? → /home : show form
 *   unauthenticated    → /auth/login
 */
function ProfileSetupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const from = searchParams?.get('from');
    const { status, user, isLoading } = useAuth();

    // Treat offline-cached session the same as authenticated for routing purposes
    const isLoggedIn = status === 'authenticated' || status === 'auth-status-unavailable-because-offline';

    useEffect(() => {
        if (isLoading) return; // Wait for auth to resolve — never redirect during loading

        if (!isLoggedIn && status !== 'loading') {
            // Not logged in — send to login
            router.replace('/auth/login');
            return;
        }

        if (isLoggedIn && user?.onboardingCompleted === true) {
            // Returning OAuth user whose profile is already complete — skip the form
            router.replace('/home');
            return;
        }

        // isLoggedIn && !onboardingCompleted → fall through to show form
    }, [status, user, isLoading, isLoggedIn, router]);

    // Show loading spinner while auth resolves or while we're about to redirect
    if (isLoading || (!isLoggedIn && status !== 'loading')) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-8 w-8 border-2 border-[var(--color-primary-teal)]/30 border-t-[var(--color-primary-teal)] rounded-full animate-spin" />
            </div>
        );
    }

    // Returning onboarded user — show spinner while redirect fires
    if (isLoggedIn && user?.onboardingCompleted === true) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-8 w-8 border-2 border-[var(--color-primary-teal)]/30 border-t-[var(--color-primary-teal)] rounded-full animate-spin" />
            </div>
        );
    }

    const navigateBackToProfileDrawer = () => {
        if (from) {
            const decodedFrom = decodeURIComponent(from);
            const separator = decodedFrom.includes('?') ? '&' : '?';
            router.push(`${decodedFrom}${separator}profile=true`);
        } else {
            router.push('/home?profile=true');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/60 dark:bg-[#0D0D0D] py-6 sm:py-10 px-4 sm:px-6">
            <div className="max-w-xl mx-auto bg-white dark:bg-[#151515] rounded-3xl shadow-sm border border-slate-100 dark:border-white/[0.08] overflow-hidden">
                <EditProfilePage
                    onBack={navigateBackToProfileDrawer}
                    onSaveSuccess={navigateBackToProfileDrawer}
                    isInsideDrawer={false}
                />
            </div>
        </div>
    );
}

export default function ProfileSetup() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400 font-medium">Loading profile...</div>}>
            <ProfileSetupContent />
        </Suspense>
    );
}
