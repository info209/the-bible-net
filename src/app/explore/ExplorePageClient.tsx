'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FiSearch } from 'react-icons/fi';
import BibleSearchModal from '@/app/components/BibleSearchModal';
import ExplorePage from '@/app/components/ExplorePage';

export default function ExplorePageClient() {
    const [searchOpen, setSearchOpen] = useState(false);
    const router = useRouter();

    const handleNavigateToChapter = useCallback((book: string, chapter: number) => {
        const slug = book.toLowerCase().replace(/\s+/g, '-');
        router.push(`/bible?book=${encodeURIComponent(slug)}&chapter=${chapter}`);
    }, [router]);

    const handleNavigateToVerse = useCallback(
        (book: string, chapter: number, verse: number, version?: string) => {
            const slug = book.toLowerCase().replace(/\s+/g, '-');
            const params = new URLSearchParams({
                book: slug,
                chapter: String(chapter),
                verse: String(verse),
            });
            if (version) params.set('version', version);
            router.push(`/bible?${params}`);
        },
        [router],
    );

    return (
        <div className="relative">
            {/* Sticky search bar at the top of the explore page */}
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md px-4 py-3 border-b border-gray-100">
                <button
                    id="explore-search-trigger"
                    onClick={() => setSearchOpen(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-left"
                    aria-label="Open Bible search"
                >
                    <FiSearch size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-400 font-medium">
                        Search books, John 3:16, joy, fear…
                    </span>
                </button>
            </div>

            {/* Main explore content */}
            <div className="px-4 py-4">
                <ExplorePage />
            </div>

            {/* Search Modal */}
            <BibleSearchModal
                isOpen={searchOpen}
                onClose={() => setSearchOpen(false)}
                onNavigateToChapter={handleNavigateToChapter}
                onNavigateToVerse={handleNavigateToVerse}
            />
        </div>
    );
}
