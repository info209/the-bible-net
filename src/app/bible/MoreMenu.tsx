// src/app/bible/MoreMenu.tsx
"use client";
import React, { useEffect, useState } from "react";
import { PiSlideshow } from "react-icons/pi";
import { MdBlurOn } from "react-icons/md";
import { CgEditFlipH } from "react-icons/cg";

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

    const fonts = [
        "Times New Roman",
        "Georgia",
        "Merriweather",
        "Lora",
        "Serif",
        "System UI"
    ];

    const [localFont, localSetFont] = useState<"small" | "medium" | "large" | "xlarge">(
        (typeof window !== "undefined" && (localStorage.getItem("bible_fontSize") as any)) || "medium"
    );
    const [localFamily, localSetFamily] = useState<string>(
        (typeof window !== "undefined" && (localStorage.getItem("bible_fontFamily") as any)) || fonts[0]
    );
    const [localTheme, localSetTheme] = useState<"default" | "pink" | "sepia" | "dark">(
        (typeof window !== "undefined" && (localStorage.getItem("bible_theme") as any)) || "default"
    );
    const [localTrans, localSetTrans] = useState<"slide" | "fade" | "flip">(
        (typeof window !== "undefined" && (localStorage.getItem("bible_transition") as any)) || "slide"
    );
    const [localHide, localSetHide] = useState<boolean>(
        typeof window !== "undefined" && localStorage.getItem("bible_hideFootnotes") === "1" ? true : false
    );

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

    useEffect(() => {
        try {
            if (!controlledSetFont) localStorage.setItem("bible_fontSize", localFont);
            if (!controlledSetFamily) localStorage.setItem("bible_fontFamily", localFamily);
            if (!controlledSetTheme) localStorage.setItem("bible_theme", localTheme);
            if (!controlledSetTransition) localStorage.setItem("bible_transition", localTrans);
            if (!controlledSetHide) localStorage.setItem("bible_hideFootnotes", localHide ? "1" : "0");
        } catch (e) {}
    }, [localFont, localFamily, localTheme, localTrans, localHide, controlledSetFont, controlledSetFamily, controlledSetTheme, controlledSetTransition, controlledSetHide]);

    const IconWrapper = ({ children, selected }: { children: React.ReactNode; selected?: boolean }) => (
        <div className={`w-20 h-20 rounded-lg flex items-center justify-center border ${selected ? "bg-rose-50 border-rose-300 ring-2 ring-rose-200" : "bg-white border-gray-200"} shadow-sm`}>
            {children}
        </div>
    );

    const SlideIcon = ({ size = 28 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="2" y="5" width="7" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            <rect x="15" y="5" width="7" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M11 12h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    const FadeIcon = ({ size = 28 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="5" width="5" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            <rect x="9" y="5" width="6" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.1" opacity="0.6" />
            <rect x="17" y="5" width="4" height="14" rx="1.5" stroke="currentColor" strokeWidth="0.9" opacity="0.3" />
        </svg>
    );

    const FlipIcon = ({ size = 28 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="5" width="7" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            <rect x="14" y="5" width="7" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 7v10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );

    const PanelWrapper = ({ children }: { children: React.ReactNode }) => (
        <div className="w-full px-3 pb-4">
            <div className="mx-auto" style={{ maxWidth: 720 }}>
                <div className="bg-white rounded-2xl shadow-xl p-4 flex flex-col items-center">{children}</div>
            </div>
        </div>
    );

    const fontIndex = ["small", "medium", "large", "xlarge"].indexOf(activeFont as any);
    const pink = "#f43f5e";

    if (view === "settings") {
        return (
            <PanelWrapper>
                <div className="flex items-center justify-between w-full mb-3">
                    <button
                        type="button"
                        onClick={() => setView("main")}
                        className="text-sm text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                    >
                        ← Back
                    </button>
                    <div className="font-semibold text-lg">Fonts & Settings</div>
                    <button
                        type="button"
                        onClick={() => { onClose?.(); }}
                        className="text-sm text-rose-600 px-2 py-1 rounded hover:bg-rose-50"
                    >
                        Done
                    </button>
                </div>

                <div className="mb-5 w-full">
                    <div className="text-sm text-gray-500 mb-2 text-left">Font family</div>
                    <div>
                        <select
                            aria-label="Select font family"
                            value={activeFamily}
                            onChange={(e) => updateFamily(e.target.value)}
                            className="w-full border rounded-lg px-4 py-3 bg-white"
                        >
                            {fonts.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                </div>

                {/* ---------- Custom slider with filled track, small stop dots, and larger selected dot ---------- */}
                <div className="mb-6 w-full">
                    <div className="text-sm text-gray-500 mb-2 text-left">Font size</div>
                    <div className="w-full px-2 py-3 bg-transparent">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium select-none">A-</span>
                            <span className="text-sm font-medium select-none">A+</span>
                        </div>
                        <div className="relative h-10 flex items-center">
                            {/* Neutral track (full width) */}
                            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 rounded-full bg-gray-300" />
                            {/* Filled accent track up to selected stop */}
                            <div
                                className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 rounded-full bg-rose-400"
                                style={{ width: `${(fontIndex / 3) * 100}%`, transition: 'width 0.18s cubic-bezier(.4,1.3,.6,1)' }}
                            />
                            {/* Dots at stops */}
                            {[0, 1, 2, 3].map((i) => {
                                const leftPct = (i / 3) * 100;
                                const isActive = i === fontIndex;
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            position: "absolute",
                                            left: `calc(${leftPct}% )`,
                                            top: "50%",
                                            transform: "translate(-50%, -50%)",
                                            pointerEvents: "none",
                                            width: isActive ? "24px" : "12px",
                                            height: isActive ? "24px" : "12px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: isActive ? 16 : 7,
                                                height: isActive ? 16 : 7,
                                                borderRadius: 9999,
                                                background: isActive ? pink : "#cbd5e1",
                                                boxShadow: isActive ? "0 2px 6px rgba(244,63,94,0.18)" : "none",
                                                border: isActive ? "2.5px solid #fff" : undefined,
                                                transition: "all 0.18s cubic-bezier(.4,1.3,.6,1)",
                                            }}
                                        />
                                    </div>
                                );
                            })}
                            {/* Invisible range input for interaction, hide native thumb */}
                            <input
                                aria-label="Font size"
                                type="range"
                                min={0}
                                max={3}
                                step={1}
                                value={fontIndex}
                                onChange={e => updateFont((['small','medium','large','xlarge'][parseInt(e.target.value)]) as any)}
                                className="absolute inset-0 w-full h-10 opacity-0 cursor-pointer z-10"
                                style={{ margin: 0 }}
                            />
                        </div>
                    </div>
                </div>
                {/* ---------- end slider block ---------- */}

                <div className="mb-6 w-full">
                    <div className="text-sm text-gray-500 mb-3 text-left">Theme</div>
                    <div className="flex w-full justify-between items-center gap-2 sm:gap-4 md:gap-6">
                        {/* Default Theme: pill, border, check icon */}
                        <button
                            type="button"
                            onClick={() => updateTheme("default")}
                            className={`h-10 w-20 sm:h-12 sm:w-28 md:h-14 md:w-32 flex items-center justify-center rounded-full border transition-all ${activeTheme === "default" ? "border-teal-400" : "border-gray-300"} bg-white hover:border-teal-400`}
                            aria-pressed={activeTheme === "default" ? "true" : "false"}
                            title="Default"
                        >
                            <svg className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="16" cy="16" r="10" stroke="#14b8a6" strokeWidth="2" fill="none" />
                                <path d="M12.5 16.5l3 3 5-5" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                        {/* Pink Theme: pill, border, sun icon */}
                        <button
                            type="button"
                            onClick={() => updateTheme("pink")}
                            className={`h-10 w-20 sm:h-12 sm:w-28 md:h-14 md:w-32 flex items-center justify-center rounded-full border transition-all ${activeTheme === "pink" ? "border-pink-400" : "border-pink-200"} bg-pink-50 hover:border-pink-400`}
                            aria-pressed={activeTheme === "pink" ? "true" : "false"}
                            title="Pink"
                        >
                            {/* Heroicons Sun */}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#e9a8d4" className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M6.343 17.657l-1.414 1.414M17.657 17.657l-1.414-1.414M6.343 6.343L4.929 4.929M12 8a4 4 0 100 8 4 4 0 000-8z" />
                            </svg>
                        </button>
                        {/* Sepia Theme: pill, border, sun icon */}
                        <button
                            type="button"
                            onClick={() => updateTheme("sepia")}
                            className={`h-10 w-20 sm:h-12 sm:w-28 md:h-14 md:w-32 flex items-center justify-center rounded-full border transition-all ${activeTheme === "sepia" ? "border-yellow-400" : "border-yellow-300"} bg-yellow-50 hover:border-yellow-400`}
                            aria-pressed={activeTheme === "sepia" ? "true" : "false"}
                            title="Sepia"
                        >
                            {/* Heroicons Sun (sepia color) */}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#e5c78c" className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M6.343 17.657l-1.414 1.414M17.657 17.657l-1.414-1.414M6.343 6.343L4.929 4.929M12 8a4 4 0 100 8 4 4 0 000-8z" />
                            </svg>
                        </button>
                        {/* Dark Theme: pill, filled, moon icon */}
                        <button
                            type="button"
                            onClick={() => updateTheme("dark")}
                            className={`h-10 w-20 sm:h-12 sm:w-28 md:h-14 md:w-32 flex items-center justify-center rounded-full border-0 transition-all ${activeTheme === "dark" ? "ring-2 ring-gray-400" : ""} bg-[#2d2d2d]`}
                            aria-pressed={activeTheme === "dark" ? "true" : "false"}
                            title="Dark"
                        >
                            {/* Heroicons Moon */}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#fff" className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="mb-3 w-full">
                    <div className="text-sm sm:text-base text-gray-500 mb-3 text-left">Page transitions</div>
                    <div className="flex w-full gap-2 sm:gap-3 md:gap-4 justify-between items-end">
                        <button
                            type="button"
                            onClick={() => updateTrans("slide")}
                            className={`flex-1 flex flex-col items-center gap-1 group`}
                            aria-pressed={activeTrans === "slide" ? "true" : "false"}
                        >
                            <span className={`flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-md border transition-all ${activeTrans === "slide" ? "bg-rose-50 ring-2 ring-rose-200 border-rose-300" : "bg-white border-gray-200"}`}>
                                <PiSlideshow className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />
                            </span>
                            <span className={`mt-1 text-xs sm:text-sm font-medium ${activeTrans === "slide" ? "text-rose-600" : "text-gray-500"}`}>Slide</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => updateTrans("fade")}
                            className={`flex-1 flex flex-col items-center gap-1 group`}
                            aria-pressed={activeTrans === "fade" ? "true" : "false"}
                        >
                            <span className={`flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-md border transition-all ${activeTrans === "fade" ? "bg-rose-50 ring-2 ring-rose-200 border-rose-300" : "bg-white border-gray-200"}`}>
                                <MdBlurOn className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />
                            </span>
                            <span className={`mt-1 text-xs sm:text-sm font-medium ${activeTrans === "fade" ? "text-rose-600" : "text-gray-500"}`}>Fade</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => updateTrans("flip")}
                            className={`flex-1 flex flex-col items-center gap-1 group`}
                            aria-pressed={activeTrans === "flip" ? "true" : "false"}
                        >
                            <span className={`flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-md border transition-all ${activeTrans === "flip" ? "bg-rose-50 ring-2 ring-rose-200 border-rose-300" : "bg-white border-gray-200"}`}>
                                <CgEditFlipH className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />
                            </span>
                            <span className={`mt-1 text-xs sm:text-sm font-medium ${activeTrans === "flip" ? "text-rose-600" : "text-gray-500"}`}>Flip</span>
                        </button>
                    </div>
                </div>
            </PanelWrapper>
        );
    }

    return (
        <PanelWrapper>
            <div className="flex flex-col gap-2 w-full">
                <button
                    type="button"
                    className="px-3 py-3 rounded-lg hover:bg-gray-50 w-full text-left flex items-center justify-between"
                    onClick={() => setView("settings")}
                >
                    <span className="font-medium">Fonts & Settings</span>
                    <span className="text-xs text-gray-400">›</span>
                </button>

                <div className="flex items-center justify-between px-3 py-2">
                    <span>Hide footnotes</span>
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
