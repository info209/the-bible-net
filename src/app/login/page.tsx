// src/app/login/page.tsx
'use client';

import React from 'react';
import SignInForm from '../../components/Auth/SignInForm';
import SocialButtons from '../../components/Auth/SocialButtons';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-md p-6 bg-white rounded-lg shadow">
                <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
                <SignInForm />
                <div className="my-4 flex items-center">
                    <div className="flex-1 h-px bg-gray-200" />
                    <div className="px-2 text-sm text-gray-500">or continue with</div>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>
                <SocialButtons />
            </div>
        </div>
    );
}
