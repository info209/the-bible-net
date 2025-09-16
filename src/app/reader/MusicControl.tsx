"use client";
import React, { useState } from "react";

export default function MusicControl() {
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="flex items-center gap-4 mb-4">
                <button
                    onClick={() => setPlaying(p => !p)}
                    className="px-3 py-2 rounded bg-rose-50 border border-rose-200"
                >
                    {playing ? "Pause" : "Play"}
                </button>
                <div className="text-sm text-gray-600">Speed</div>
                <select value={speed} onChange={(e)=>setSpeed(Number(e.target.value))} className="border rounded px-2 py-1">
                    <option value={0.75}>0.75x</option>
                    <option value={1}>1x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                </select>
            </div>

            <div className="text-sm text-gray-500">
                Note: This panel shows audio controls. Wire to your audio player logic to play the selected chapter.
            </div>
        </div>
    );
}
