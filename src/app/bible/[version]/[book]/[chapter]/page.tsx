"use client";
import React, { useEffect, useRef, useState, MutableRefObject, useLayoutEffect } from "react";
import Header from "@/components/Header";
import FooterNav from "@/components/FooterNav";
import { bookMapping } from "@/components/bookMapping";
import ModalSelector from "@/app/bible/ModalSelector";
import BookSelector from "@/app/bible/BookSelector";
import ChapterSelector from "@/app/bible/ChapterSelector";
import VerseSelector from "@/app/bible/VerseSelector";
import VersionSelector from "@/app/bible/VersionSelector";
import MoreMenu from "@/app/bible/MoreMenu";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import MusicControl from "@/app/bible/MusicControl";

const API_BASE = "https://australia-southeast1-the-bible-net.cloudfunctions.net/api";
const fetchWithKey = (url: string) =>
    fetch(url, { headers: { "x-app-key": "your_secret_key" } });

const getCached = (key: string) => {
    if (typeof window === "undefined") return null;
    const val = localStorage.getItem(key);
    try { return val ? JSON.parse(val) : null; } catch { return null; }
};

function extractAcronym(displayName?: string) {
    if (!displayName) return "";
    const parenMatches = [...displayName.matchAll(/\(([^)]+)\)/g)].map(m => m[1]);
    if (parenMatches.length > 0) {
        for (let i = parenMatches.length - 1; i >= 0; i--) {
            const token = parenMatches[i].trim();
            if (/^[A-Za-z0-9&-]{1,5}$/.test(token)) return token.toUpperCase();
            if (/^[A-Z\s]{1,8}$/.test(token)) return token.replace(/\s+/g, "").toUpperCase();
        }
    }
    const words = displayName.replace(/[()]/g, "").split(/\s+/).filter(w => w.length > 0);
    const stopWords = new Set(["and","of","the","in","on","a","an","edition","version","rev","revised","indian"]);
    const letters: string[] = [];
    for (const w of words) {
        const cleaned = w.replace(/[^A-Za-z0-9]/g, "");
        if (!cleaned) continue;
        if (letters.length === 0 || !stopWords.has(cleaned.toLowerCase())) {
            letters.push(cleaned[0].toUpperCase());
        }
        if (letters.length >= 4) break;
    }
    if (letters.length === 0 && words.length > 0) {
        return words[0].slice(0, 3).toUpperCase();
    }
    return letters.join("").toUpperCase();
}

export default function BibleDynamicPage() {
    const params = useParams();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    // data & selections
    const [versions, setVersions] = useState<any[]>([]);
    const [books, setBooks] = useState<{ oldTestament: any[]; newTestament: any[] }>({ oldTestament: [], newTestament: [] });
    const [chapters, setChapters] = useState<number[]>([]);
    const [chaptersLoaded, setChaptersLoaded] = useState(false);
    const [verses, setVerses] = useState<any[]>([]);
    // Use params for version, book, chapter
    const [version, setVersion] = useState<string>(params.version as string || "");
    const [book, setBook] = useState<string>(params.book as string || "");
    const [chapter, setChapter] = useState<number>(params.chapter ? Number(params.chapter) : 1);
    const [selectedVerse, setSelectedVerse] = useState<number | null>(null);

    // ...existing UI, modal, popover, readingMode, etc. state...
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [mode, setMode] = useState<"books" | "chapters" | "verses" | "versions">("books");
    const selectorsRef = useRef<HTMLDivElement | null>(null);
    const [musicOpen, setMusicOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const [readingMode, setReadingMode] = useState(false);
    const [modalPortalKey, setModalPortalKey] = useState<number>(0);
    const selectedVersionObj = versions.find(v => v.id === version);
    const lang = (selectedVersionObj?.language || "").toLowerCase();
    const isTelugu = lang === "telugu" || lang === "te";
    const [fontSize, setFontSize] = useState<"small" | "medium" | "large" | "xlarge">("medium");
    const [fontFamily, setFontFamily] = useState<string>("Times New Roman");
    const [theme, setTheme] = useState<"default" | "pink" | "sepia" | "dark">("default");
    const [transition, setTransition] = useState<"slide" | "fade" | "flip">("slide");
    const [hideFootnotes, setHideFootnotes] = useState(false);

    // Fetch versions, books, chapters, verses (same as before)
    useEffect(() => {
        if (!isMounted) return;
        const cache = getCached("bible_versions");
        if (cache && Array.isArray(cache)) { setVersions(cache); return; }
        setLoading(true);
        fetchWithKey(`${API_BASE}/versions`).then(r=>r.json()).then(data=>{
            setVersions(data || []);
            localStorage.setItem("bible_versions", JSON.stringify(data || []));
            setLoading(false);
        }).catch(()=>{ setError("Failed to load versions"); setLoading(false); });
    }, [isMounted]);
    useEffect(() => {
        if (!version) return;
        setLoading(true);
        const cachedBooks = getCached("bible_books");
        if (cachedBooks && Array.isArray(cachedBooks) && cachedBooks.length > 0) {
            const apiBooks = cachedBooks;
            const apiBookSlugs = new Set(apiBooks.map((b: any) => b.slug));
            const oldBooks = bookMapping.oldTestament.filter(m => apiBookSlugs.has(m.slug)).map(m => ({ ...m, ...apiBooks.find(b => b.slug === m.slug) }));
            const newBooks = bookMapping.newTestament.filter(m => apiBookSlugs.has(m.slug)).map(m => ({ ...m, ...apiBooks.find(b => b.slug === m.slug) }));
            setBooks({ oldTestament: oldBooks, newTestament: newBooks });
            setLoading(false);
            return;
        }
        fetchWithKey(`${API_BASE}/books`).then(r=>r.json()).then(data=>{
            localStorage.setItem("bible_books", JSON.stringify(data));
            const apiBooks = Array.isArray(data) ? data : (data as any).books || [];
            const apiBookSlugs = new Set(apiBooks.map((b: any) => b.slug));
            const oldBooks = bookMapping.oldTestament.filter(m => apiBookSlugs.has(m.slug)).map(m => ({ ...m, ...apiBooks.find((b: { slug: string; }) => b.slug === m.slug) }));
            const newBooks = bookMapping.newTestament.filter(m => apiBookSlugs.has(m.slug)).map(m => ({ ...m, ...apiBooks.find((b: { slug: string; }) => b.slug === m.slug) }));
            setBooks({ oldTestament: oldBooks, newTestament: newBooks });
            setLoading(false);
        }).catch(()=>{ setBooks({ oldTestament: [], newTestament: [] }); setError("Failed to load books"); setLoading(false); });
    }, [version]);
    useEffect(() => {
        if (!version || !book) {
            setChapters([]);
            setChaptersLoaded(false);
            return;
        }
        setLoading(true);
        setChaptersLoaded(false);
        fetchWithKey(`${API_BASE}/chapter-meta/${version}/${book}`)
            .then(async (res) => {
                if (!res.ok) {
                    setChapters([]);
                    setChaptersLoaded(true);
                    setLoading(false);
                    setChapter(1);
                    return;
                }
                const data = await res.json();
                let chapterNums: number[] = [];
                if (data && typeof data === "object") {
                    if ("chapters" in data && typeof data.chapters === "number") chapterNums = Array.from({ length: (data as any).chapters }, (_, i) => i + 1);
                    else if (Array.isArray(data)) chapterNums = data.map((_, i) => i + 1);
                    else {
                        const keys = Object.keys(data).filter(k => !isNaN(Number(k)));
                        if (keys.length > 0) chapterNums = keys.map(Number).sort((a,b)=>a-b);
                    }
                }
                setChapters(chapterNums);
                setChaptersLoaded(true);
                setLoading(false);
                if (chapterNums.length > 0) {
                    if (!chapterNums.includes(chapter)) {
                        const maxAvailable = chapterNums[chapterNums.length - 1];
                        const fallback = Math.min(chapter, maxAvailable);
                        const finalChapter = chapterNums.includes(fallback) ? fallback : chapterNums[0];
                        setChapter(finalChapter);
                    }
                } else {
                    setChapter(1);
                }
            })
            .catch(() => {
                setChapters([]);
                setChaptersLoaded(true);
                setError("Failed to load chapters");
                setLoading(false);
                setChapter(1);
            });
    }, [version, book]);
    const versesRequestIdRef = useRef(0);
    useEffect(() => {
        if (!version || !book || !chapter) {
            setVerses([]);
            return;
        }
        if (!chaptersLoaded) {
            return;
        }
        let didFallback = false;
        const thisRequestId = ++versesRequestIdRef.current;
        async function loadVersesFor(versionId: string, bookSlug: string, chapNum: number) {
            try {
                setLoading(true);
                const res = await fetchWithKey(`${API_BASE}/chapter/${versionId}/${bookSlug}/${chapNum}`);
                if (thisRequestId !== versesRequestIdRef.current) {
                    return;
                }
                if (!res.ok) {
                    if (!didFallback) {
                        didFallback = true;
                        if (Array.isArray(chapters) && chapters.length > 0) {
                            const maxAvailable = chapters[chapters.length - 1];
                            const fallback = Math.min(chapNum, maxAvailable);
                            const final = chapters.includes(fallback) ? fallback : chapters[0];
                            if (final !== chapNum) {
                                setChapter(final);
                                return;
                            }
                        } else if (chapNum !== 1) {
                            setChapter(1);
                            return;
                        }
                    }
                    setVerses([]);
                    setLoading(false);
                    return;
                }
                const data = await res.json();
                if (thisRequestId !== versesRequestIdRef.current) {
                    return;
                }
                const arr = (data && Array.isArray(data.verses)) ? data.verses : [];
                setVerses(arr);
                setLoading(false);
            } catch (err) {
                if (!didFallback) {
                    didFallback = true;
                    if (Array.isArray(chapters) && chapters.length > 0) {
                        const maxAvailable = chapters[chapters.length - 1];
                        const fallback = Math.min(chapter, maxAvailable);
                        const final = chapters.includes(fallback) ? fallback : chapters[0];
                        if (final !== chapter) {
                            setChapter(final);
                            return;
                        }
                    } else if (chapter !== 1) {
                        setChapter(1);
                        return;
                    }
                }
                setVerses([]);
                setError("Failed to load verses");
                setLoading(false);
            }
        }
        loadVersesFor(version, book, chapter);
        return () => {
            versesRequestIdRef.current++;
        };
    }, [version, book, chapter, chaptersLoaded, chapters]);
    useEffect(() => {
        if (!readingMode) {
            setModalOpen(false);
            setMusicOpen(false);
            setMoreOpen(false);
            setMode("books");
            document.body.style.overflow = "";
            setTimeout(() => setModalPortalKey(k => k + 1), 40);
        }
    }, [readingMode]);
    const openModalFor = (m: typeof mode) => {
        setModalPortalKey(k => k + 1);
        setMode(m);
        setModalOpen(true);
        selectorsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    const closeModal = () => setModalOpen(false);
    // --- URL-driven navigation for selectors ---
    const handleBookSelect = (b: any) => {
        router.push(`/bible/${version}/${b.slug}/${chapter}`);
        closeModal();
    };
    const handleChapterSelect = (n: number) => {
        router.push(`/bible/${version}/${book}/${n}`);
        setMode("verses");
    };
    const handleVerseSelect = (n: number) => setSelectedVerse(n);
    const handleVersionSelect = (v: any) => {
        router.push(`/bible/${v.id}/${book}/${chapter}`);
        closeModal();
    };
    const getBookDisplay = (slug: string) => {
        if (!slug) return "Book";
        const mapping = [...bookMapping.oldTestament, ...bookMapping.newTestament].find(m => m.slug === slug);
        if (mapping) return isTelugu ? (mapping.telugu || mapping.english) : (mapping.english || mapping.telugu);
        return slug;
    };
    const versionShortLabel = isMounted ? extractAcronym(selectedVersionObj?.displayName || selectedVersionObj?.name || selectedVersionObj?.id) : "Ver";
    const enterReadingMode = () => {
        setModalOpen(false);
        setMusicOpen(false);
        setMoreOpen(false);
        setTimeout(() => setReadingMode(true), 80);
    };
    useEffect(() => {
        const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape" && readingMode) setReadingMode(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [readingMode]);
    const fontSizeMap: Record<string, string> = {
        small: "0.95rem",
        medium: "1rem",
        large: "1.125rem",
        xlarge: "1.25rem",
    };
    const articleStyle: React.CSSProperties = {
        fontSize: fontSizeMap[fontSize] || fontSizeMap["medium"],
        fontFamily: fontFamily ? `'${fontFamily}', serif` : undefined,
    };
    const themeStyles: Record<string, React.CSSProperties> = {
        default: { backgroundColor: "#FEFEFE", color: "#111827" },
        pink: { backgroundColor: "#fff5f7", color: "#3b0b17" },
        sepia: { backgroundColor: "#f4ecd8", color: "#2b2b2b" },
        dark: { backgroundColor: "#0f0f10", color: "#e6eef0" },
    };
    const rootThemeStyle = !readingMode ? (themeStyles[theme] || themeStyles["default"]) : {};
    const variants: Record<string, any> = {
        slide: {
            initial: { x: 80, opacity: 0 },
            animate: { x: 0, opacity: 1 },
            exit: { x: -80, opacity: 0 },
        },
        fade: {
            initial: { opacity: 0, scale: 0.99 },
            animate: { opacity: 1, scale: 1 },
            exit: { opacity: 0, scale: 0.99 },
        },
        flip: {
            initial: { rotateY: 90, opacity: 0 },
            animate: { rotateY: 0, opacity: 1 },
            exit: { rotateY: -90, opacity: 0 },
        },
    };
    const [showStickyBar, setShowStickyBar] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const lastShowStickyBar = useRef(false);
    const throttleTimeout = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        setHasMounted(true);
    }, []);
    useLayoutEffect(() => {
        if (readingMode) return;
        const initialScrollY = window.scrollY || window.pageYOffset;
        const shouldShow = initialScrollY > 40;
        setShowStickyBar(shouldShow);
        lastShowStickyBar.current = shouldShow;
    }, [readingMode]);
    useEffect(() => {
        if (readingMode) return;
        const handleScroll = () => {
            if (throttleTimeout.current) return;
            throttleTimeout.current = setTimeout(() => {
                const scrollY = window.scrollY || window.pageYOffset;
                const shouldShow = scrollY > 40;
                if (shouldShow !== lastShowStickyBar.current) {
                    setShowStickyBar(shouldShow);
                    lastShowStickyBar.current = shouldShow;
                }
                throttleTimeout.current = null;
            }, 100);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (throttleTimeout.current) clearTimeout(throttleTimeout.current);
        };
    }, [readingMode]);
    return (
        <div style={rootThemeStyle} data-theme={theme} className={readingMode ? "min-h-screen flex flex-col bg-[#0f0f10]" : "min-h-screen flex flex-col"}>
            {/* Sticky info bar: always rendered, CSS handles show/hide */}
            {!readingMode && (
                <div
                    className={`fixed top-0 left-0 w-full z-[100] bg-white/95 dark:bg-[#18181b]/95 backdrop-blur border-b border-gray-200 dark:border-gray-800
                        ${showStickyBar ? 'stickybar-visible' : 'stickybar-hidden'}${hasMounted ? ' stickybar-transition' : ''}`}
                    style={{ minHeight: '44px', boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)' }}
                >
                    <div className="flex justify-center items-center w-full max-w-3xl mx-auto px-3 sm:px-6 min-h-[44px] sm:min-h-[52px]">
                        <span className="font-medium text-base sm:text-lg text-gray-900 dark:text-gray-100 truncate text-center w-full">
                            {getBookDisplay(book)} · {String(chapter).padStart(2, "0")} · {selectedVersionObj ? versionShortLabel : ""}
                        </span>
                    </div>
                </div>
            )}

            {/* Always show Header in normal mode, only hide in reading mode */}
            {!readingMode && <Header />}

            {/* Always apply top padding to prevent layout jumps */}
            <main className={`flex-1 w-full pb-28 px-2 sm:px-4 transition-all duration-300 ${showStickyBar ? 'pt-[52px] sm:pt-[60px]' : ''}`}>
                <div className="mx-auto w-full max-w-5xl">
                    {/* Hide selectors when sticky bar is shown */}
                    {!readingMode && !showStickyBar && (
                        <div
                            ref={selectorsRef}
                            className="relative z-[70] flex flex-row flex-wrap gap-2 items-center mb-6 mt-4"
                        >
                            {/* Book */}
                            <button
                                type="button"
                                className="border rounded px-2 py-1 text-sm sm:px-3 sm:py-2 sm:text-base flex-1 min-w-[90px] bg-white"
                                onClick={() => openModalFor("books")}
                            >
                                {isMounted ? getBookDisplay(book) : "Book"}
                            </button>
                            {/* Chapter */}
                            <button
                                type="button"
                                className="border rounded px-2 py-1 text-sm sm:px-3 sm:py-2 sm:text-base w-14 sm:w-16 text-center bg-white"
                                onClick={() => { !book ? openModalFor("books") : openModalFor("chapters"); }}
                            >
                                {isMounted ? String(chapter).padStart(2, "0") : "01"}
                            </button>
                            {/* Version - show acronym / short only */}
                            <button
                                type="button"
                                className="border rounded px-2 py-1 text-sm sm:px-3 sm:py-2 sm:text-base min-w-[40px] sm:min-w-[120px] text-left bg-white"
                                onClick={() => openModalFor("versions")}
                                title={selectedVersionObj?.displayName || selectedVersionObj?.name || (loading ? "Loading versions..." : "")}
                                disabled={loading || versions.length === 0}
                            >
                                {loading || versions.length === 0
                                    ? <span className="text-gray-400 animate-pulse">Loading...</span>
                                    : (selectedVersionObj ? versionShortLabel : version || "Ver")}
                            </button>
                            {/* Music */}
                            <button
                                type="button"
                                aria-label="audio"
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center hover:bg-gray-50"
                                onClick={() => setMusicOpen(true)}
                            >
                                🎵
                            </button>
                            {/* More */}
                            <button
                                type="button"
                                aria-label="more"
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center hover:bg-gray-50"
                                onClick={() => setMoreOpen(true)}
                            >
                                ⋮
                            </button>
                        </div>
                    )}

                    {readingMode && (
                        <div className="mb-4 text-rose-600 font-medium tracking-wide flex items-center gap-3">
                            <div>{getBookDisplay(book)} · {String(chapter).padStart(2, "0")} · {selectedVersionObj?.displayName || ""}</div>
                            <button onClick={() => setReadingMode(false)} className="text-sm text-gray-300 hover:text-gray-100">✕ Exit</button>
                        </div>
                    )}

                    {loading && <div className="text-gray-500 mb-4">Loading...</div>}
                    {error && <div className="text-red-500 mb-4">{error}</div>}

                    {/* Animated article - key by chapter so it animates when chapter changes */}
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.article
                            key={`${version}_${book}_${chapter}`}
                            style={articleStyle}
                            className={readingMode ? "prose max-w-none text-lg leading-relaxed font-serif text-gray-100" : "prose max-w-none"}
                            variants={variants[transition] || variants["fade"]}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={{ duration: 0.36, ease: "easeInOut" }}
                        >
                            {verses.map((v: any) => (
                                <div key={v.n} className={`flex gap-2 items-start ${readingMode ? "text-gray-100" : "text-gray-800"}`}>
                                    <span className={`font-bold ${readingMode ? "text-rose-300" : "text-gray-400"} w-8 text-right`}>{v.n}</span>
                                    <span>{v.text}</span>
                                </div>
                            ))}
                            {/* footnotes placeholder example: conditionally hidden */}
                            {!hideFootnotes && (
                                <div className="mt-6 text-sm text-gray-500">
                                    {/* example footnote area - real footnote rendering depends on API */}
                                </div>
                            )}
                        </motion.article>
                    </AnimatePresence>
                </div>
            </main>

            {/* Hide footer when sticky bar is shown */}
            {!readingMode && !showStickyBar && <FooterNav />}

            {/* Modal */}
            {!readingMode && isMounted && modalOpen && selectorsRef.current && (
                <ModalSelector
                    portalKey={modalPortalKey}
                    show={modalOpen}
                    anchorRef={selectorsRef as MutableRefObject<HTMLDivElement>}
                    onClose={closeModal}
                    title={ mode === "books" ? "Select book" : mode === "chapters" ? "Select chapter" : mode === "verses" ? "Select verse" : "Select version" }
                >
                    {mode === "books" && <BookSelector books={books} onSelect={handleBookSelect} active={book} isTelugu={isTelugu} />}
                    {mode === "chapters" && <ChapterSelector chapters={chapters} onSelect={handleChapterSelect} active={chapter} />}
                    {mode === "verses" && <VerseSelector verses={verses} onSelect={handleVerseSelect} onBack={() => setMode("chapters")} onDone={() => closeModal()} active={selectedVerse} />}
                    {mode === "versions" && <VersionSelector versions={versions} onSelect={handleVersionSelect} active={version} />}
                </ModalSelector>
            )}

            {!readingMode && isMounted && musicOpen && selectorsRef.current && (
                <ModalSelector portalKey={modalPortalKey} show={musicOpen} anchorRef={selectorsRef as MutableRefObject<HTMLDivElement>} onClose={() => setMusicOpen(false)} title="Audio">
                    <div className="p-3">
                        <MusicControl />
                    </div>
                </ModalSelector>
            )}

            {/* MORE MENU: use the new MoreMenu component (passes setters so changes apply immediately) */}
            {!readingMode && isMounted && moreOpen && selectorsRef.current && (
                <ModalSelector
                    portalKey={modalPortalKey}
                    show={moreOpen}
                    anchorRef={selectorsRef as MutableRefObject<HTMLDivElement>}
                    onClose={() => setMoreOpen(false)}
                    title="More"
                >
                    <MoreMenu
                        onClose={() => setMoreOpen(false)}
                        fontSize={fontSize}
                        setFontSize={(v: any) => setFontSize(v)}
                        // fontFamily controller
                        // @ts-ignore
                        fontFamily={fontFamily}
                        // @ts-ignore
                        setFontFamily={(f: string) => setFontFamily(f)}
                        theme={theme}
                        setTheme={(t: any) => setTheme(t)}
                        transition={transition}
                        setTransition={(t: any) => setTransition(t)}
                        hideFootnotes={hideFootnotes}
                        setHideFootnotes={(h: boolean) => setHideFootnotes(h)}
                    />
                </ModalSelector>
            )}
        </div>
    );
}
