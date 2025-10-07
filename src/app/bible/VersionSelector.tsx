"use client";
import React from "react";

export default function VersionSelector({ versions, onSelect, active, activeBook, activeChapter }: any) {
    // group by language
    const grouped = (versions || []).reduce((acc: any, v: any) => {
        const lang = v.language || "Other";
        acc[lang] = acc[lang] || [];
        acc[lang].push(v);
        return acc;
    }, {});

    // language code to name mapping
    const langNames: Record<string, string> = {
        en: "English",
        te: "Telugu",
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            {Object.keys(grouped).map(lang => (
                <div key={lang} className="mb-4">
                    <div className="font-semibold mb-2 text-xs text-gray-500">
                        {langNames[lang] || lang}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {grouped[lang].map((v: any) => (
                            <button
                                key={v.id}
                                onClick={() => {
                                    localStorage.setItem(
                                        "bible_last_selection",
                                        JSON.stringify({
                                            version: v.id,
                                            book: activeBook,
                                            chapter: activeChapter
                                        })
                                    );
                                    onSelect(v);
                                }}
                                className={`text-left px-3 py-2 rounded transition ${
                                    active === v.id
                                        ? "bg-rose-50 border border-rose-200 font-semibold"
                                        : "hover:bg-gray-50"
                                }`}
                            >
                                {v.displayName}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
