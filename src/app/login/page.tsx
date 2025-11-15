// src/app/login/page.tsx
'use client';

import React from 'react';
import SignInForm from '../../components/Auth/SignInForm';
import SocialButtons from '../../components/Auth/SocialButtons';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex items-start sm:items-center justify-center bg-[#ffffff] px-4 py-8 sm:py-16">
            <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg border">
                <div className="flex justify-end mb-4">
                    <button onClick={() => router.push('/')} aria-label="Cancel" className="inline-flex items-center text-base p-2 text-gray-700 hover:text-teal-700">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex justify-center mb-4">
                    <img src="/logo_white.png" alt="logo" className="h-24" />
                </div>

                <h1 className="text-2xl font-semibold text-left mb-1">Welcome</h1>
                <p className="text-left text-sm text-gray-500 mb-6">Please login to continue</p>

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
