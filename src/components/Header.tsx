// src/components/Header.tsx
'use client';
import Image from 'next/image';
import { useAuth } from '../context/AuthProvider';

export default function Header() {
    const { user, loading, signOut } = useAuth();

    return (
        <header className="bg-white w-full border-b">
            <div className="max-w-5xl mx-auto px-3 sm:px-4 h-16 sm:h-20 flex items-center justify-between">
                {/* logo badge */}
                <div className="rounded-md w-[80px] sm:w-[104px] h-[32px] sm:h-[40px] flex items-center justify-center bg-gradient-to-r from-teal-400 to-teal-500 shadow-sm overflow-hidden">
                    <Image
                        src="/logo.jpg"
                        alt="App logo"
                        width={72}
                        height={24}
                        className="object-contain"
                        priority
                    />
                </div>

                {/* right controls */}
                <div className="flex items-center gap-2 sm:gap-3 text-[rgba(49,57,58,0.8)]">
                    {/* Keep existing controls */}
                    <div className="text-xs sm:text-sm">En</div>
                    <button aria-label="locale" className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center">🌐</button>
                    <button aria-label="menu" className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center">≡</button>

                    {/* Add auth controls */}
                    {loading ? (
                        <span className="text-xs sm:text-sm">Loading...</span>
                    ) : user ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm">{user.displayName || user.email}</span>
                            <button
                                onClick={signOut}
                                className="text-xs sm:text-sm px-2 py-1 border rounded"
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <a
                            href="/login"
                            className="text-xs sm:text-sm px-2 py-1 border rounded"
                        >
                            Sign In
                        </a>
                    )}
                </div>
            </div>
        </header>
    );
}
