// src/components/Header.tsx
'use client';
import Image from 'next/image';
import { useAuth } from '../context/AuthProvider';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaGlobe } from 'react-icons/fa';
import profileIcon from '../../public/assets/profile_icon.png'
import menuIcon from '../../public/assets/menu_icon.png'
import languageIcon from '../../public/assets/language_change_icon.png'

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
        <header className="bg-[#41ADB0] w-full border-b-2 border-gray-100 shadow-sm mb-2">
            <div className="max-w-5xl mx-auto px-2 sm:px-4 md:px-8 pr-2 sm:pr-6 h-12 sm:h-16 md:h-20 flex items-center justify-between min-w-0">
                {/* Responsive logo - w-auto for perfect alignment */}
                <div className="flex items-center justify-center w-24 h-8 sm:w-32 sm:h-12 md:w-40 md:h-14 mr-2 sm:mr-3 flex-shrink-0">
                    <Image
                        src="/n_logo.png"
                        alt="App logo"
                        fill={false}
                        width={256}
                        height={56}
                        style={{ height: '100%', objectFit: 'contain', width: '100%' }}
                        priority
                    />
                </div>
                {/* right controls: language selector + menu/avatar */}
                <div className="flex items-center gap-1 sm:gap-3 md:gap-5 min-w-0">
                    {/* Language selector */}
                    <div className="flex items-center gap-1 sm:gap-2 text-white text-xs sm:text-base font-medium">
                        <span className="inline text-xs sm:text-base">En</span>
                       <Image src={languageIcon} alt='language'/>
                    </div>
                    {/* Menu+Avatar button */}
                    <div ref={menuRef} className="relative">
                        <button
                            className="flex items-center gap-1 px-1 sm:px-2 py-1 rounded-full focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-[#41ADB0]"
                            onClick={() => setMenuOpen((open) => !open)}
                            aria-label="Open menu"
                        >
                            <div className="flex flex-col justify-center items-center" style={{height: '24px'}}>
                                <div style={{width: '14px', height: '2px', background: '#fff', borderRadius: '2px', marginBottom: '2px'}}></div>
                                <div style={{width: '14px', height: '2px', background: '#fff', borderRadius: '2px', marginBottom: '2px'}}></div>
                                <div style={{width: '14px', height: '2px', background: '#fff', borderRadius: '2px'}}></div>
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
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-base ml-1">
                                        {user.firstName ? <span className="border-2 border-white rounded-full w-8 h-8 flex items-center justify-center">{user.firstName[0].toUpperCase()} </span>: <Image src={profileIcon} alt="profile"/>}   
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
