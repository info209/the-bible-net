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

    function handleSelect(v: any) {
        // Only update cache if selection changed
        const cached = (() => {
            try {
                const val = localStorage.getItem("bible_last_selection");
                return val ? JSON.parse(val) : null;
            } catch {
                return null;
            }
        })();
        const newSelection = {
            version: v.id,
            book: activeBook,
            chapter: activeChapter,
            verse: cached?.verse // preserve verse if present
        };
        if (!cached || cached.version !== newSelection.version || cached.book !== newSelection.book || cached.chapter !== newSelection.chapter) {
            localStorage.setItem("bible_last_selection", JSON.stringify(newSelection));
        }
        onSelect(v);
    }

    return (
        <div className="w-full max-w-2xl mx-auto">
            {Object.keys(grouped).map(lang => (
                <div key={lang} className="mb-4">
                    <div className="font-semibold mb-2 text-xs text-gray-500">
                        {langNames[lang] || lang}
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                        {grouped[lang].map((v: any) => (
                            <button
                                key={v.id}
                                onClick={() => handleSelect(v)}
                                className={`text-left px-3 py-2 rounded transition w-full ${
                                    active === v.id
                                        ? "bg-rose-50 border border-rose-200 font-semibold text-rose-600"
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
