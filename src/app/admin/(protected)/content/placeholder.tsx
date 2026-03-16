"use client";

import Link from 'next/link';

export default function PlaceholderPage({ title, description, icon }: { title: string, description: string, icon: string }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                        <Link href="/admin/content" className="hover:text-white transition-colors">Content</Link>
                        <span>/</span>
                        <span className="text-gray-200">{title}</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">{title}</h1>
                    <p className="text-gray-400 mt-1">{description}</p>
                </div>
            </div>

            <div className="bg-[#111] border border-white/5 rounded-2xl p-20 text-center shadow-xl">
                <div className="text-6xl mb-6">{icon}</div>
                <h2 className="text-2xl font-bold text-white mb-2">{title} Management</h2>
                <p className="text-gray-500 max-w-md mx-auto mb-8">
                    This module is currently under development. Soon you will be able to manage your {title.toLowerCase()} directly from here.
                </p>
                <Link
                    href="/admin/content"
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all border border-white/10"
                >
                    ← Back to Content
                </Link>
            </div>
        </div>
    );
}
