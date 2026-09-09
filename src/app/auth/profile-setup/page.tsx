'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import EditProfilePage from '@/app/components/EditProfilePage';

function ProfileSetupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const from = searchParams?.get('from');

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
