// src/components/Header.tsx
'use client';
import Image from 'next/image';
import { useAuth } from '../context/AuthProvider';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Header() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const [avatarError, setAvatarError] = useState(false);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !(menuRef.current as any).contains(e.target)) {
                setMenuOpen(false);
            }
        }
        if (menuOpen) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [menuOpen]);

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
                        style={{ width: '72px', height: '24px', objectFit: 'contain' }}
                        priority
                    />
                </div>

                {/* right controls */}
                <div className="flex items-center gap-1 sm:gap-2 text-[rgba(49,57,58,0.8)]">
                    {/* Menu+Avatar button */}
                    <div ref={menuRef} className="relative">
                        <button
                            className="flex items-center gap-1 px-2 py-1 rounded-full border-2 border-transparent focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                            onClick={() => setMenuOpen((open) => !open)}
                            aria-label="Open menu"
                        >
                            <div className="flex flex-col justify-center items-center" style={{height: '28px'}}>
                                <div style={{width: '16px', height: '2px', background: '#222', borderRadius: '2px', marginBottom: '3px'}}></div>
                                <div style={{width: '16px', height: '2px', background: '#222', borderRadius: '2px', marginBottom: '3px'}}></div>
                                <div style={{width: '16px', height: '2px', background: '#222', borderRadius: '2px'}}></div>
                            </div>
                            {/* Avatar logic: show nothing if not logged in, else show photo or initial */}
                            {loading || !user ? null : (
                                !avatarError && user.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt={user.fullName}
                                        className="w-8 h-8 rounded-full object-cover border ml-1"
                                        onError={() => setAvatarError(true)}
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white font-bold text-base ml-1">
                                        {user.firstName ? user.firstName[0].toUpperCase() : ''}
                                    </div>
                                )
                            )}
                        </button>
                        {/* Dropdown menu */}
                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white border rounded-xl shadow-2xl z-[1000]" style={{minWidth: '220px'}}>
                                <ul className="py-2">
                                    {user && !user.isAnonymous ? (
                                        <li>
                                            <button
                                                onClick={async () => {
                                                    await signOut();
                                                    setMenuOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-800"
                                            >
                                                Logout
                                            </button>
                                        </li>
                                    ) : (
                                        <li>
                                            <button
                                                onClick={() => router.push('/login')}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-800"
                                            >
                                                Login
                                            </button>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
