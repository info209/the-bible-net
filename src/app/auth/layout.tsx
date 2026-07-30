"use client";

import React from 'react';
import { motion } from 'framer-motion';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen w-full relative flex items-center justify-center p-0 sm:p-4 overflow-x-hidden overflow-y-auto bg-[var(--color-bg-primary)]">
            {/* Mesh Gradient Background */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--color-primary-teal)]/20 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--color-accent-rose)]/10 blur-[150px]" />
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-[var(--color-primary-teal)]/10 blur-[100px]" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-none sm:max-w-md min-h-screen sm:min-h-0 flex flex-col justify-center">
                {children}
            </div>

            {/* Subtle Texture Overlay */}
            <div className="absolute inset-0 z-[1] opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        </div>
    );
}
