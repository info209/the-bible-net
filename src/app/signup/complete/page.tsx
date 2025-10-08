// src/app/signup/complete/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupCompletePage() {
    const router = useRouter();
    const [country, setCountry] = useState('New Zealand');
    const [language, setLanguage] = useState('English (EN)');
    const [version, setVersion] = useState('NKJV');
    const [loading, setLoading] = useState(false);

    const handleCreateNow = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // TODO: persist profile preferences to your DB if you have an endpoint
        setTimeout(() => {
            setLoading(false);
            window.location.href = '/bible';
        }, 700);
    };

    const handleSkip = () => {
        window.location.href = '/bible';
    };

    const handleBack = (e: React.MouseEvent) => {
        e.preventDefault();
        if (typeof window !== 'undefined' && window.history.length > 1) router.back();
        else router.push('/signup');
    };

    return (
        <div className="min-h-screen flex items-start sm:items-center justify-center bg-[#ffffff] px-4 py-8 sm:py-16">
            <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg border">
                <div className="flex justify-start mb-4">
                    <button onClick={handleBack} aria-label="Go back" className="inline-flex items-center text-2xl">←</button>
                </div>

                <h1 className="text-2xl font-semibold text-left mb-2">Complete your profile</h1>
                <p className="text-left text-sm text-gray-500 mb-4">Help us personalize your Bible reading experience</p>

                <form onSubmit={handleCreateNow} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                        <select value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1 block w-full border rounded-lg p-3">
                            <option>New Zealand</option>
                            <option>United States</option>
                            <option>India</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Preferred language</label>
                        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1 block w-full border rounded-lg p-3">
                            <option>English (EN)</option>
                            <option>Telugu (TE)</option>
                            <option>Spanish (ES)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Preferred versions</label>
                        <select value={version} onChange={(e) => setVersion(e.target.value)} className="mt-1 block w-full border rounded-lg p-3">
                            <option>NKJV</option>
                            <option>ESV</option>
                            <option>KJV</option>
                        </select>
                    </div>

                    <button disabled={loading} type="submit" className="w-full py-3 bg-teal-700 text-white rounded-lg">
                        {loading ? 'Please wait...' : 'Create now'}
                    </button>

                    <button type="button" onClick={handleSkip} className="w-full py-3 mt-2 bg-gray-200 text-gray-700 rounded-lg">
                        Skip for now
                    </button>

                    <div className="mt-4">
                        <div className="h-3 rounded-full bg-pink-100 overflow-hidden">
                            <div className="h-3 rounded-full bg-pink-500" style={{ width: '100%' }} />
                        </div>
                        <div className="text-xs text-gray-500 mt-2">Step 2 of 2</div>
                    </div>
                </form>
            </div>
        </div>
    );
}
