"use client";
import React from "react";

export default function MoreMenu({ onClose }: { onClose?: () => void }) {
    return (
        <div className="w-full max-w-sm mx-auto">
            <div className="flex flex-col gap-2">
                <button className="text-left px-3 py-2 rounded hover:bg-gray-50" onClick={() => { navigator.clipboard?.writeText(window.location.href); alert("Link copied"); onClose?.(); }}>
                    Copy link
                </button>
                <button className="text-left px-3 py-2 rounded hover:bg-gray-50" onClick={() => { alert("Share dialog"); onClose?.(); }}>
                    Share
                </button>
                <button className="text-left px-3 py-2 rounded hover:bg-gray-50" onClick={() => { alert("Open reader settings"); onClose?.(); }}>
                    Reader settings
                </button>
            </div>
        </div>
    );
}
