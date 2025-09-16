// src/components/Header.tsx
"use client";
import Image from "next/image";
import { useState } from "react";

export default function Header() {
    const [showControls, setShowControls] = useState(false);

    return (
        <header className="bg-white w-full border-b">
            {/* Use the same max width as reader (max-w-5xl) so header aligns with page content */}
            <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
                {/* Desktop row */}
                <div className="hidden md:flex h-20 items-center justify-between">
                    {/* Left logo */}
                    <div className="flex items-center gap-4">
                        <div className="rounded-md w-[112px] h-[44px] flex items-center justify-center bg-gradient-to-r from-teal-400 to-teal-500 shadow-sm overflow-hidden">
                            {/* keep width/height to provide an intrinsic ratio; use objectFit for safe scaling */}
                            <Image
                                src="/logo.jpg"
                                alt="App logo"
                                width={96}
                                height={32}
                                style={{ objectFit: "contain", width: "96px", height: "32px" }}
                                priority
                            />
                        </div>
                    </div>

                    {/* Right controls */}
                    <div className="flex items-center gap-3 text-[rgba(49,57,58,0.85)]">
                        <div className="text-sm hidden lg:block">En</div>
                        <button aria-label="locale" className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100">
                            🌐
                        </button>
                        <button aria-label="menu" className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100">
                            ≡
                        </button>
                    </div>
                </div>

                {/* Mobile row: show a centered logo and a right-side collapsed control */}
                <div className="flex md:hidden h-16 items-center justify-between py-2">
                    <div className="flex items-center">
                        <button
                            aria-label="open-menu"
                            onClick={() => setShowControls(s => !s)}
                            className="w-9 h-9 flex items-center justify-center rounded hover:bg-gray-100"
                        >
                            ☰
                        </button>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="rounded-md w-[88px] h-[36px] flex items-center justify-center bg-gradient-to-r from-teal-400 to-teal-500 shadow-sm overflow-hidden">
                            <Image
                                src="/logo.jpg"
                                alt="App logo"
                                width={80}
                                height={28}
                                style={{ objectFit: "contain", width: "80px", height: "28px" }}
                                priority
                            />
                        </div>
                    </div>

                    <div className="flex items-center">
                        <button aria-label="locale" className="w-9 h-9 flex items-center justify-center rounded hover:bg-gray-100">
                            🌐
                        </button>
                    </div>

                    {/* Simple collapsed menu on mobile (toggle). Keep minimal — style/contents as needed */}
                    {showControls && (
                        <div className="absolute left-4 right-4 top-16 bg-white border rounded shadow-md p-3 md:hidden">
                            <div className="flex flex-col gap-2">
                                <button className="text-left px-2 py-2 rounded hover:bg-gray-50">En</button>
                                <button className="text-left px-2 py-2 rounded hover:bg-gray-50">Locale</button>
                                <button className="text-left px-2 py-2 rounded hover:bg-gray-50">Menu</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
