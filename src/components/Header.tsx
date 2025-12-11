// src/components/Header.tsx
'use client';
import Image from 'next/image';
import { useAuth } from '../context/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import profileIcon from '../../public/assets/profile_icon.svg';
import menuIcon from '../../public/assets/menu_icon.png';
import languageIcon from '../../public/assets/earth_icons.svg';
import musicIcon from '../../public/assets/music_Icon.svg';
import moreIcon from '../../public/assets/more_icon.svg';
interface HeaderProps {
  selectorsRef?: React.RefObject<HTMLDivElement | null>;
  readingMode?: boolean;
  showStickyBar?: boolean;
  book?: string;
  chapter?: number;
  version?: string;
  versionShortLabel?: string;
  openModalFor?: (mode: "books" | "chapters" | "verses" | "versions") => void;
  handleVerseDone?: () => void;
  setMusicOpen?: (open: boolean) => void;
  setMoreOpen?: (open: boolean) => void;
  isMounted?: boolean;
  selectedVersionObj?: any;
  versions?: any[];
  bookDisplay?: (slug: string) => string;
}

export default function Header({
  setMusicOpen = () => {},
  setMoreOpen = () => {},
  openModalFor = () => {},
  handleVerseDone = () => {},
  isMounted = false,
  selectedVersionObj = null,
  versions = [],
  bookDisplay = (slug) => slug,
  readingMode = false,
  showStickyBar = false,
  book = "",
  chapter = 1,
  version = "",
  versionShortLabel = "",
  selectorsRef
}: HeaderProps) {
    const { user, loading, signOut } = useAuth();
    const pathname = usePathname();

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

     const versionLabel = useMemo(() => {
  // Only compute when on /bible
  if (pathname.startsWith("/bible")) {
    if (versions?.length === 0) {
      return "Loading…";
    }

    return (
      versionShortLabel?.toUpperCase() ||
      version?.toUpperCase() ||
      "VER"
    );
  }

  // Fallback when not on /bible
  return "";
}, [pathname, loading, versions, versionShortLabel, version]);


    return (
        <>
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
                    <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-base font-medium"style={{color:"#F1F3F3"}}>
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
                                <div style={{width: '14px', height: '2px', background: '#F1F3F3', borderRadius: '2px', marginBottom: '2px'}}></div>
                                <div style={{width: '14px', height: '2px', background: '#F1F3F3', borderRadius: '2px', marginBottom: '2px'}}></div>
                                <div style={{width: '14px', height: '2px', background: '#F1F3F3', borderRadius: '2px'}}></div>
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
                                        <>
                                        <li>
                                            <button
                                                onClick={() => router.push('/login')}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-800"
                                            >
                                                Login
                                            </button>
                                        </li>
                                          <li>
                                            <button
                                                onClick={() => router.push('/signup')}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-800"
                                            >
                                                Create Account
                                            </button>
                                        </li>
                                        </>
                                        
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
 
        </header>
        {pathname.startsWith("/bible") && (
        <AnimatePresence>  
            {!readingMode && !showStickyBar && (
                        <motion.div
                            ref={selectorsRef}
                            className={`fixed top-0 left-0 z-[70] flex flex-row flex-wrap items-center gap-2 mb-6 mt-4 mx-4 md:ml-[150px] lg:ml-[166px] lg:w-[68%] md:w-[59%] w-[88%] bg-transparent border-none shadow-none transition-all duration-300`}
                            style={{ background: 'none', boxShadow: 'none', border: 'none', position: 'sticky', top: 0 }}
                        >
                            {!readingMode && (
                                <>
                                    <button type="button" className="border rounded px-2 py-1 text-sm sm:px-3 sm:py-2 sm:text-base w-auto min-w-0 max-w-xs truncate bg-white" onClick={() =>{
                                        setMusicOpen(false);
                                        setMoreOpen(false); openModalFor("books")}}> {isMounted ? (book ? bookDisplay(book) : "Book") : "Book"}
</button>

                                    <button type="button" className="border rounded px-2 py-1 text-sm sm:px-3 sm:py-2 sm:text-base w-auto min-w-0 max-w-[64px] text-center bg-white" 
                                     onClick={() => {
                                        setMusicOpen(false);
                                        setMoreOpen(false);
                                        if (!book) {
                                        openModalFor("books");
                                        } else {
                                        openModalFor("chapters");
                                        }
                                    }}
                                    >{isMounted ? String(chapter).padStart(2) : "1"}</button>
                                    <button type="button" className="border rounded px-2 py-1 text-sm sm:px-3 sm:py-2 sm:text-base w-auto min-w-0 max-w-xs text-center flex justify-center items-center bg-white" onClick={() => {setMusicOpen(false); setMoreOpen(false); openModalFor("versions")}} title={selectedVersionObj?.displayName || selectedVersionObj?.name || selectedVersionObj?.id} disabled={loading || versions.length === 0}>{loading || versions.length === 0 ? <span className="text-gray-400 animate-pulse">Loading...</span> : (versionLabel)}</button>
                                </>
                            )}
                            <div className="flex-grow" />
                            <button type="button" aria-label="audio" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:bg-gray-50" 
                            onClick={() => {
                                handleVerseDone(); 
                                setMusicOpen(true);
                                setMoreOpen(false);
                            }}><Image src={musicIcon} alt="Music icon"/></button>
                            <button type="button" aria-label="more" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full  flex items-center justify-center hover:bg-gray-50" 
                            onClick={() => {
                                handleVerseDone(); 
                                setMoreOpen(true);
                                setMusicOpen(false);
                                }}><Image src={moreIcon} alt="moreIcon" width={24}/></button>
                        </motion.div>
                    )}</AnimatePresence>)}
        </>
    );
}