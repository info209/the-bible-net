// src/components/HighlightToolbar.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import type { Firestore } from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import { createHighlight } from "@/lib/highlightApi";
import { useRouter } from "next/navigation";
import "@/styles/highlights.css";

type Props = {
    db: Firestore;
    authUser: FirebaseUser | null;
    version: string;
    book: string;
    chapter: number;
    selectionMode: boolean;
    setSelectionMode: (b: boolean) => void;
    selectedVersesSet: Set<number>;
    onToggleVerse: (verseNum: number) => void;
    clearSelection: () => void;
    verseToColor: Record<string,string>;
    onAfterApply?: (id: string) => void;
    show: boolean;
    onClose?: () => void;
};

const COLORS = [
    { name: "yellow", label: "Yellow", hex: "#FFECB3" },
    { name: "green", label: "Green", hex: "#CFFFD6" },
    { name: "blue", label: "Blue", hex: "#B3D4FF" },
    { name: "pink", label: "Pink", hex: "#FFD1EC" },
    { name: "purple", label: "Purple", hex: "#E4D1FF" }
];

// TEMPORARY FLAG TO DISABLE HIGHLIGHT TOOLBAR FUNCTIONALITY
const HIGHLIGHT_TOOLBAR_ENABLED = false;

export default function HighlightToolbar({
    db,
    authUser,
    version,
    book,
    chapter,
    selectionMode,
    setSelectionMode,
    selectedVersesSet,
    onToggleVerse,
    clearSelection,
    verseToColor,
    onAfterApply,
    show,
    onClose
}: Props) {
    if (!HIGHLIGHT_TOOLBAR_ENABLED) {
        // Render nothing or a placeholder if disabled
        return null;
    }

    const router = useRouter();
    const [selectedColor, setSelectedColor] = useState<string>("yellow");
    const [showSignInPrompt, setShowSignInPrompt] = useState(false);

    useEffect(() => {
        if (!show) {
            // close selection when sheet is closed
            setSelectionMode(false);
            clearSelection();
            setShowSignInPrompt(false);
        }
    }, [show, setSelectionMode, clearSelection]);

    const selectedVerses = useMemo(() => Array.from(selectedVersesSet).sort((a,b)=>a-b), [selectedVersesSet]);

    const selectedRangeText = useMemo(() => {
        if (selectedVerses.length === 0) return `${book} ${chapter}`;
        if (selectedVerses.length === 1) return `${book} ${chapter}:${selectedVerses[0]}`;
        return `${book} ${chapter}: ${selectedVerses[0]} - ${selectedVerses[selectedVerses.length - 1]}`;
    }, [selectedVerses, book, chapter]);

    function onPressHighlightButton() {
        if (!authUser) {
            // show sign in prompt but keep toolbar visible
            setShowSignInPrompt(true);
            return;
        }
        setSelectionMode(!selectionMode);
        setShowSignInPrompt(false);
    }

    function handleSignInRedirect() {
        setShowSignInPrompt(false);
        router.push('/login'); // change route if your login path differs
    }

    async function applyHighlight() {
        if (!authUser) {
            setShowSignInPrompt(true);
            return;
        }
        if (selectedVerses.length === 0) {
            alert("Select one or more verses to highlight.");
            return;
        }
        const start = selectedVerses[0];
        const end = selectedVerses[selectedVerses.length - 1];
        try {
            const highlightId = `${version}:${book}:${chapter}:${start}-${end}_${Date.now()}`;
            await createHighlight(db, authUser, { version, book, chapter, startVerse: start, endVerse: end, color: selectedColor, highlightId });
            clearSelection();
            setSelectionMode(false);
            if (onAfterApply) onAfterApply(highlightId);
            if (onClose) onClose();
        } catch (err: any) {
            console.error("applyHighlight error", err);
            alert("Failed to save highlight: " + (err?.message || err));
        }
    }

    if (!show) return null;

    return (
        <>
            {showSignInPrompt && (
                <div className="hb-signin-popover" role="dialog" aria-modal="true">
                    <div className="hb-signin-inner">
                        <div className="hb-signin-title">Want to highlight?</div>
                        <div className="hb-signin-sub">Sign in to save your highlights</div>
                        <div className="hb-signin-actions">
                            <button className="hb-btn hb-btn-primary" onClick={handleSignInRedirect}>Sign in</button>
                            <button className="hb-btn" onClick={() => setShowSignInPrompt(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <div className={`hb-bottom-sheet hb-sheet-open`} role="region" aria-hidden={!show}>
                <div className="hb-sheet-inner">
                    <div className="hb-sheet-selected">
                        { selectionMode ? (selectedVerses.length === 0 ? "Select one or more verses to highlight." : `Selected: ${selectedRangeText}`) : `${book} ${chapter}` }
                    </div>

                    <div className="hb-actions-row">
                        <div className="hb-color-picker" style={{ opacity: selectionMode ? 1 : 0.5 }}>
                            {COLORS.map((c) => (
                                <button
                                    key={c.name}
                                    title={c.label}
                                    className={`hb-color-swatch ${selectedColor === c.name ? "hb-color-selected" : ""}`}
                                    style={{ background: c.hex }}
                                    onClick={() => setSelectedColor(c.name)}
                                />
                            ))}
                        </div>

                        <div className="hb-controls">
                            <button className="hb-action hb-action-primary" onClick={() => onPressHighlightButton()}>
                                <span>Highlight</span>
                            </button>

                            <button className="hb-action" onClick={() => alert("Save/Note/Compare not implemented in this bundle.")}>
                                <span>Save</span>
                            </button>

                            <button
                                className="hb-action"
                                onClick={() => applyHighlight()}
                                disabled={!selectionMode || selectedVerses.length === 0}
                                title={(!selectionMode || selectedVerses.length === 0) ? "Select verses first" : "Apply highlight"}
                            >
                                <span>Apply</span>
                            </button>

                            <button className="hb-action" onClick={() => { clearSelection(); setSelectionMode(false); }}>
                                <span>Clear</span>
                            </button>

                            <button className="hb-action" onClick={() => { if (onClose) onClose(); }}>
                                <span>Close</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
