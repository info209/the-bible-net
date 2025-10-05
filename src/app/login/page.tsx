// src/app/login/page.tsx
'use client';

import React from 'react';
import SignInForm from '../../components/Auth/SignInForm';
import SocialButtons from '../../components/Auth/SocialButtons';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();

    const handleBack = (e: React.MouseEvent) => {
        e.preventDefault();
        // prefer history.back when available; otherwise go to homepage
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
        } else {
            router.push('/');
        }
    };

    return (
        <div className="min-h-screen flex items-start sm:items-center justify-center bg-[#ffffff] px-4 py-8 sm:py-16">
            <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg border">
                <div className="flex justify-start mb-4">
                    {/* functional back button */}
                    <button onClick={handleBack} aria-label="Go back" className="inline-flex items-center text-2xl">
                        ←
                    </button>
                </div>

                <div className="flex justify-center mb-4">
                    <img src="/logo_white.png" alt="logo" className="h-12" />
                </div>

                <h1 className="text-2xl font-semibold text-center mb-1">Welcome to the Bible App</h1>
                <p className="text-center text-sm text-gray-500 mb-6">Please login to continue</p>

                <SignInForm />

                <div className="my-5 flex items-center">
                    <div className="flex-1 h-px bg-gray-200" />
                    <div className="px-3 text-sm text-gray-500">or continue with social accounts</div>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>

                <SocialButtons />

                <div className="mt-6 text-center text-sm text-gray-600">
                    Don't have an account? <a href="/signup" className="text-teal-700 no-underline">Create one</a>
                </div>
            </div>
        </div>
    );
}
