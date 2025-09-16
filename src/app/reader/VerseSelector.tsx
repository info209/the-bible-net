"use client";
import React from "react";

export default function VerseSelector({ verses, onSelect, onBack, onDone, active }: any) {
    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-3">
                <button onClick={onBack} className="text-sm text-gray-600 px-2 py-1 rounded hover:bg-gray-100">← Back</button>
                <button onClick={onDone} className="text-sm text-green-700 px-2 py-1 rounded hover:bg-green-50">Done</button>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-3 max-w-3xl mx-auto">
                {verses.map((v: any) => (
                    <button
                        key={v.n}
                        onClick={() => onSelect(v.n)}
                        className={`py-2 rounded-lg text-center border transition ${active === v.n ? "bg-rose-50 border-rose-200 font-semibold" : "bg-gray-50 hover:bg-gray-100"}`}
                    >
                        {String(v.n).padStart(2, "0")}
                    </button>
                ))}
            </div>
        </div>
    );
}
