// src/app/bible/BookSelector.tsx
"use client";
import React from "react";

type Book = {
    slug: string;
    name?: string;
    chapterVerseCounts?: Record<string, number>;
    english?: string;
    telugu?: string;
};

type Props = {
    books: { oldTestament: Book[]; newTestament: Book[] };
    onSelect: (b: Book) => void;
    active?: string | null;
    isTelugu?: boolean;
    activeVersion: string;
    activeChapter: number;
};

export default function BookSelector({ books, onSelect, active, isTelugu, activeVersion, activeChapter }: Props) {
    const oldList = books?.oldTestament || [];
    const newList = books?.newTestament || [];

    const getLabel = (b: Book) => {
        const en = b.english || b.name || b.slug;
        const te = b.telugu || b.name || b.slug;
        return isTelugu ? te : en;
    };

    const BookRow: React.FC<{ b: Book; activeVersion: string; activeChapter: number }> = ({ b, activeVersion, activeChapter }) => {
        const label = getLabel(b);
        const isActive = active === b.slug;
        return (
            <button
                onClick={() => {
                    localStorage.setItem(
                        "bible_last_selection",
                        JSON.stringify({
                            version: activeVersion,
                            book: b.slug,
                            chapter: 1, // Reset chapter to 1 on book change
                            verse: 1,    // Reset verse to 1 on book change
                        })
                    );
                    onSelect({ ...b, chapter: 1, verse: 1 }); // Pass verse: 1 to parent
                }}
                className={`w-full text-left px-3 py-2 rounded transition flex items-center gap-2 ${
                    isActive ? "bg-rose-50 border border-rose-200 font-semibold text-rose-600" : "hover:bg-gray-50"
                }`}
                title={label}
                aria-pressed={isActive}
            >
                <span className="truncate">{label}</span>
            </button>
        );
    };

    // We render two vertical lists inside a responsive grid.
    // The grid uses auto-fit + minmax so it will show 2 columns when there's room,
    // and collapse to 1 column when space is too narrow.
    return (
        <div className="w-full">
            {/* responsive grid: auto-fit columns, each at least 140px; will fit 2 columns on most phones/tablets */}
            <div
                style={{
                    display: "grid",
                    gap: "1rem",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    alignItems: "start",
                }}
            >
                {/* Old Testament column */}
                <div className="min-w-0">
                    <div className="sticky top-0 z-10 bg-white pb-2">
                        <div className="text-base text-gray-500 font-semibold mb-2">Old Testament</div>
                    </div>

                    <div className="flex flex-col gap-1">
                        {oldList.length === 0 ? (
                            <div className="text-sm text-gray-400 px-2 py-2">No books</div>
                        ) : (
                            oldList.map((b) => <BookRow key={b.slug} b={b} activeVersion={activeVersion} activeChapter={activeChapter} />)
                        )}
                    </div>
                </div>

                {/* New Testament column */}
                <div className="min-w-0">
                    <div className="sticky top-0 z-10 bg-white pb-2">
                        <div className="text-base text-gray-500 font-semibold mb-2">New Testament</div>
                    </div>

                    <div className="flex flex-col gap-1">
                        {newList.length === 0 ? (
                            <div className="text-sm text-gray-400 px-2 py-2">No books</div>
                        ) : (
                            newList.map((b) => <BookRow key={b.slug} b={b} activeVersion={activeVersion} activeChapter={activeChapter} />)
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
