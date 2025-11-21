"use client";
import React from "react";

export default function ChapterSelector({ chapters, onSelect, active, activeVersion, activeBook }: any) {
    return (
        <div className="w-full">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-6 gap-3 justify-center max-w-3xl mx-auto">
                {chapters.map((n: number) => (
                    <button
                        key={n}
                        onClick={() => {
                            const cached = (() => {
                                try {
                                    const val = localStorage.getItem("bible_last_selection");
                                    return val ? JSON.parse(val) : {};
                                } catch {
                                    return {};
                                }
                            })();
                            localStorage.setItem(
                                "bible_last_selection",
                                JSON.stringify({
                                    version: activeVersion,
                                    book: activeBook,
                                    chapter: n,
                                    verse: cached.verse // preserve verse if present
                                })
                            );
                            onSelect(n);
                        }}
                        className={`py-3 rounded-lg text-center border transition ${active === n ? "bg-rose-50 border-rose-200 font-semibold text-rose-600" : "bg-gray-50 hover:bg-gray-100"}`}
                    >
                        {String(n).padStart(2, "0")}
                    </button>
                ))}
            </div>
        </div>
    );
}
