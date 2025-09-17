"use client";
import React, { useEffect, useState } from "react";

type Props = {
    onClose?: () => void;
    fontSize?: "small" | "medium" | "large" | "xlarge";
    setFontSize?: (s: "small" | "medium" | "large" | "xlarge") => void;
    fontFamily?: string;
    setFontFamily?: (f: string) => void;
    theme?: "default" | "pink" | "sepia" | "dark";
    setTheme?: (t: "default" | "pink" | "sepia" | "dark") => void;
    transition?: "slide" | "fade" | "flip";
    setTransition?: (t: "slide" | "fade" | "flip") => void;
    hideFootnotes?: boolean;
    setHideFootnotes?: (h: boolean) => void;
};

export default function MoreMenu({
                                     onClose,
                                     fontSize: controlledFont,
                                     setFontSize: controlledSetFont,
                                     fontFamily: controlledFamily,
                                     setFontFamily: controlledSetFamily,
                                     theme: controlledTheme,
                                     setTheme: controlledSetTheme,
                                     transition: controlledTransition,
                                     setTransition: controlledSetTransition,
                                     hideFootnotes: controlledHide,
                                     setHideFootnotes: controlledSetHide,
                                 }: Props) {
    const [view, setView] = useState<"main" | "settings">("main");

    // fonts list (as in your screenshot)
    const fonts = [
        "Times New Roman",
        "Georgia",
        "Merriweather",
        "Lora",
        "Serif",
        "System UI"
    ];

    // local fallbacks
    const [localFont, localSetFont] = useState<"small" | "medium" | "large" | "xlarge">(
        (typeof window !== "undefined" && (localStorage.getItem("reader_fontSize") as any)) || "medium"
    );
    const [localFamily, localSetFamily] = useState<string>(
        (typeof window !== "undefined" && (localStorage.getItem("reader_fontFamily") as any)) || fonts[0]
    );
    const [localTheme, localSetTheme] = useState<"default" | "pink" | "sepia" | "dark">(
        (typeof window !== "undefined" && (localStorage.getItem("reader_theme") as any)) || "default"
    );
    const [localTrans, localSetTrans] = useState<"slide" | "fade" | "flip">(
        (typeof window !== "undefined" && (localStorage.getItem("reader_transition") as any)) || "slide"
    );
    const [localHide, localSetHide] = useState<boolean>(
        typeof window !== "undefined" && localStorage.getItem("reader_hideFootnotes") === "1" ? true : false
    );

    // active values prefer controlled props
    const activeFont = controlledFont ?? localFont;
    const activeFamily = controlledFamily ?? localFamily;
    const activeTheme = controlledTheme ?? localTheme;
    const activeTrans = controlledTransition ?? localTrans;
    const activeHide = typeof controlledHide === "boolean" ? controlledHide : localHide;

    const updateFont = (s: "small" | "medium" | "large" | "xlarge") => {
        if (controlledSetFont) controlledSetFont(s);
        else localSetFont(s);
    };

    const updateFamily = (f: string) => {
        if (controlledSetFamily) controlledSetFamily(f);
        else localSetFamily(f);
    };

    const updateTheme = (t: "default" | "pink" | "sepia" | "dark") => {
        if (controlledSetTheme) controlledSetTheme(t);
        else localSetTheme(t);
    };

    const updateTrans = (t: "slide" | "fade" | "flip") => {
        if (controlledSetTransition) controlledSetTransition(t);
        else localSetTrans(t);
    };

    const updateHide = (h: boolean) => {
        if (controlledSetHide) controlledSetHide(h);
        else localSetHide(h);
    };

    // persist local state if used
    useEffect(() => {
        try {
            if (!controlledSetFont) localStorage.setItem("reader_fontSize", localFont);
            if (!controlledSetFamily) localStorage.setItem("reader_fontFamily", localFamily);
            if (!controlledSetTheme) localStorage.setItem("reader_theme", localTheme);
            if (!controlledSetTransition) localStorage.setItem("reader_transition", localTrans);
            if (!controlledSetHide) localStorage.setItem("reader_hideFootnotes", localHide ? "1" : "0");
        } catch (e) {
            // ignore storage errors
        }
    }, [localFont, localFamily, localTheme, localTrans, localHide, controlledSetFont, controlledSetFamily, controlledSetTheme, controlledSetTransition, controlledSetHide]);

    // simple SVG icons for transitions
    const SlideIcon = ({ size = 22 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="2" y="5" width="7" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="15" y="5" width="7" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    const FadeIcon = ({ size = 22 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="5" width="6" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="9" y="5" width="6" height="14" rx="1.5" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
            <rect x="15" y="5" width="6" height="14" rx="1.5" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
        </svg>
    );

    const FlipIcon = ({ size = 22 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="5" width="7" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="14" y="5" width="7" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 7v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );

    // content wrapper: centered and responsive
    const PanelWrapper = ({ children }: { children: React.ReactNode }) => (
        <div className="w-full px-3 pb-4">
            <div className="mx-auto" style={{ maxWidth: 720 }}>
                <div className="bg-white rounded-2xl shadow-md p-4 flex flex-col items-center">{children}</div>
            </div>
        </div>
    );

    if (view === "settings") {
        return (
            <PanelWrapper>
                {/* Header */}
                <div className="flex items-center justify-between w-full mb-3">
                    <button
                        type="button"
                        onClick={() => setView("main")}
                        className="text-sm text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                    >
                        ← Back
                    </button>
                    <div className="font-semibold">Fonts & Settings</div>
                    <button
                        type="button"
                        onClick={() => { onClose?.(); }}
                        className="text-sm text-green-700 px-2 py-1 rounded hover:bg-green-50"
                    >
                        Done
                    </button>
                </div>

                {/* Font style / family */}
                <div className="mb-5 w-full">
                    <div className="text-sm text-gray-500 mb-2">Font family</div>
                    <div>
                        <select
                            aria-label="Select font family"
                            value={activeFamily}
                            onChange={(e) => updateFamily(e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        >
                            {fonts.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                </div>

                {/* Font size (4 options) */}
                <div className="mb-5 w-full">
                    <div className="text-sm text-gray-500 mb-2 text-center w-full">Font size</div>
                    <div className="flex gap-2 flex-wrap justify-center">
                        {(["small", "medium", "large", "xlarge"] as const).map((size) => (
                            <button
                                key={size}
                                type="button"
                                onClick={() => updateFont(size)}
                                className={`px-3 py-2 border rounded ${activeFont === size ? "bg-rose-50 border-rose-300 font-semibold" : "hover:bg-gray-50"}`}
                                aria-pressed={activeFont === size ? "true" : "false"}
                            >
                                {size === "small" && "A-"}
                                {size === "medium" && "A"}
                                {size === "large" && "A+"}
                                {size === "xlarge" && "A++"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Themes (4 options) */}
                <div className="mb-5 w-full">
                    <div className="text-sm text-gray-500 mb-2 text-center w-full">Theme</div>
                    <div className="flex gap-3 flex-wrap justify-center">
                        {[
                            { id: "default", label: "○", cls: "bg-white border text-black" },
                            { id: "pink", label: "✿", cls: "bg-pink-50 border text-pink-900" },
                            { id: "sepia", label: "☼", cls: "bg-yellow-50 border text-yellow-900" },
                            { id: "dark", label: "☾", cls: "bg-gray-900 text-white border border-gray-700" },
                        ].map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => updateTheme(t.id as any)}
                                className={`w-12 h-12 rounded-full flex items-center justify-center ${activeTheme === t.id ? "ring-2 ring-rose-400" : ""} ${t.cls}`}
                                title={t.id}
                                aria-pressed={activeTheme === t.id ? "true" : "false"}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Page transitions (3 options) */}
                <div className="mb-2 w-full">
                    <div className="text-sm text-gray-500 mb-2 text-center w-full">Page transitions</div>
                    <div className="grid grid-cols-3 gap-3 justify-items-center">
                        <button
                            type="button"
                            onClick={() => updateTrans("slide")}
                            className={`py-2 px-2 border rounded flex flex-col items-center justify-center ${activeTrans === "slide" ? "bg-rose-50 border-rose-300 font-semibold" : "hover:bg-gray-50"}`}
                            aria-pressed={activeTrans === "slide" ? "true" : "false"}
                        >
                            <SlideIcon />
                            <div className="text-xs mt-1">Slide</div>
                        </button>

                        <button
                            type="button"
                            onClick={() => updateTrans("fade")}
                            className={`py-2 px-2 border rounded flex flex-col items-center justify-center ${activeTrans === "fade" ? "bg-rose-50 border-rose-300 font-semibold" : "hover:bg-gray-50"}`}
                            aria-pressed={activeTrans === "fade" ? "true" : "false"}
                        >
                            <FadeIcon />
                            <div className="text-xs mt-1">Fade</div>
                        </button>

                        <button
                            type="button"
                            onClick={() => updateTrans("flip")}
                            className={`py-2 px-2 border rounded flex flex-col items-center justify-center ${activeTrans === "flip" ? "bg-rose-50 border-rose-300 font-semibold" : "hover:bg-gray-50"}`}
                            aria-pressed={activeTrans === "flip" ? "true" : "false"}
                        >
                            <FlipIcon />
                            <div className="text-xs mt-1">Flip</div>
                        </button>
                    </div>
                </div>
            </PanelWrapper>
        );
    }

    // --- Main view ---
    return (
        <PanelWrapper>
            <div className="flex flex-col gap-2 w-full">
                <button
                    type="button"
                    className="text-left px-3 py-2 rounded hover:bg-gray-50 w-full text-left"
                    onClick={() => setView("settings")}
                >
                    Fonts & Settings
                </button>

                <div className="flex items-center justify-between px-3 py-2">
                    <span>Hide footnotes</span>
                    {/* toggle switch */}
                    <button
                        type="button"
                        aria-pressed={activeHide ? "true" : "false"}
                        onClick={() => updateHide(!activeHide)}
                        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none ${activeHide ? "bg-rose-500" : "bg-gray-200"}`}
                    >
            <span
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${activeHide ? "translate-x-5" : "translate-x-1"}`}
            />
                    </button>
                </div>
            </div>
        </PanelWrapper>
    );
}
