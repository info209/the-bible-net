"use client";
import React from "react";
import { bookMapping } from "@/components/bookMapping";

export default function BookSelector({ books, onSelect, active, isTelugu }: any) {
    // Responsive: two columns on md+, one column on small screens
    return (
        <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Old Testament column */}
                <div className="min-w-0">
                    <div className="sticky top-0 bg-white pt-1 pb-2 z-10">
                        <div className="font-semibold text-xs text-gray-500">Old Testament</div>
                    </div>
                    <div className="mt-2 flex flex-col gap-1">
                        {(books.oldTestament || []).map((b: any) => {
                            const m = bookMapping.oldTestament.find((mm: any) => mm.slug === b.slug);
                            const label = isTelugu ? (m?.telugu || m?.english) : (m?.english || m?.telugu || b.slug);
                            return (
                                <button
                                    key={b.slug}
                                    onClick={() => onSelect(b)}
                                    className={`w-full text-left px-3 py-2 rounded transition ${
                                        active === b.slug ? "bg-rose-50 border border-rose-200 font-semibold" : "hover:bg-gray-50"
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* New Testament column */}
                <div className="min-w-0">
                    <div className="sticky top-0 bg-white pt-1 pb-2 z-10">
                        <div className="font-semibold text-xs text-gray-500">New Testament</div>
                    </div>
                    <div className="mt-2 flex flex-col gap-1">
                        {(books.newTestament || []).map((b: any) => {
                            const m = bookMapping.newTestament.find((mm: any) => mm.slug === b.slug);
                            const label = isTelugu ? (m?.telugu || m?.english) : (m?.english || m?.telugu || b.slug);
                            return (
                                <button
                                    key={b.slug}
                                    onClick={() => onSelect(b)}
                                    className={`w-full text-left px-3 py-2 rounded transition ${
                                        active === b.slug ? "bg-rose-50 border border-rose-200 font-semibold" : "hover:bg-gray-50"
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
