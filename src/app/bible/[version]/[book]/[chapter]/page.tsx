// src/app/bible/[version]/[book]/[chapter]/page.tsx
"use client";
import React, { useEffect, useRef, useState, MutableRefObject, useLayoutEffect, useMemo } from "react";
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

// HIGHLIGHT imports
import { db, auth } from "@/lib/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import { useHighlightsForChapter } from "@/hooks/useHighlightsForChapter";
import { createHighlight } from "@/lib/highlightApi";
import { makeVerseId } from "@/lib/highlightHelpers";
import HighlightToolbar from "@/components/HighlightToolbar";
import "@/styles/highlights.css";

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
    const LAST_SELECTION_KEY = "bible_last_selection";
    const savedSelection = typeof window !== "undefined" ? getCached(LAST_SELECTION_KEY) : null;
    const initialVersion = (savedSelection && savedSelection.version) ? savedSelection.version : (params.version as string || "");
    const initialBook = (savedSelection && savedSelection.book) ? savedSelection.book : (params.book as string || "");
    const initialChapter = (savedSelection && savedSelection.chapter) ? savedSelection.chapter : (params.chapter ? Number(params.chapter) : 1);

    const [version, setVersion] = useState<string>(initialVersion);
    const [book, setBook] = useState<string>(initialBook);
    const [chapter, setChapter] = useState<number>(initialChapter);
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

    // HIGHLIGHT state
    const [authUser, setAuthUser] = useState<any | null>(null);
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => setAuthUser(u));
        return () => unsub();
    }, []);

    const [selectionMode, setSelectionMode] = useState<boolean>(false);
    const [selectedVersesArray, setSelectedVersesArray] = useState<number[]>([]);
    const selectedVersesSet = useMemo(() => new Set<number>(selectedVersesArray), [selectedVersesArray]);

    function toggleVerseSelection(n: number) {
        setSelectedVersesArray(prev => {
            const s = new Set(prev);
            if (s.has(n)) s.delete(n); else s.add(n);
            return Array.from(s).sort((a,b)=>a-b);
        });
    }
    function clearSelection() {
        setSelectedVersesArray([]);
        setSelectionMode(false);
    }
    function isVerseSelected(n: number) {
        return selectedVersesArray.includes(n);
    }

    // toolbar visibility (FAB toggles this)
    const [highlightToolbarOpen, setHighlightToolbarOpen] = useState<boolean>(false);

    // subscribe to per-chapter highlights for coloring
    const { highlights: chapterHighlights, loading: highlightsLoading } = useHighlightsForChapter(db, authUser, book, chapter);
    const verseToColor: Record<string, string> = {};
    for (const h of chapterHighlights || []) {
        const color = h.color || "yellow";
        for (const vid of h.coveredVerseIds || []) {
            verseToColor[vid] = color;
        }
    }

    const selectedVersionObjMemo = selectedVersionObj;

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
    function handleBookSelect(selectedBook: any) {
        setBook(selectedBook.slug);
        setChapter(1);
        // Optionally, update the route if needed:
        router.push(`/bible/${version}/${selectedBook.slug}/1`);
        setModalOpen(false);
        setMode("chapters");
    }
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

    // Create highlight handler used by quick UI (single verse)
    async function handleCreateHighlight(startVerse: number, endVerse: number, color = "yellow") {
        if (!authUser) {
            alert("Please sign in to create highlights");
            return;
        }
        try {
            const highlightId = `${version}:${book}:${chapter}:${startVerse}-${endVerse}_${Date.now()}`;
            await createHighlight(db, authUser, { version, book, chapter, startVerse, endVerse, color, highlightId });
        } catch (err: any) {
            console.error("createHighlight failed", err);
            alert("Failed to save highlight: " + (err.message || err));
        }
    }

    // TEMPORARY FLAG TO DISABLE HIGHLIGHT BUTTONS
    const HIGHLIGHT_BUTTONS_ENABLED = false;

    // Whenever selection changes, save to localStorage
    useEffect(() => {
        if (!isMounted) return;
        localStorage.setItem(LAST_SELECTION_KEY, JSON.stringify({ version, book, chapter }));
    }, [version, book, chapter, isMounted]);
    useEffect(() => {
        if (params.version && params.version !== version) setVersion(params.version as string);
        if (params.book && params.book !== book) setBook(params.book as string);
        if (params.chapter && Number(params.chapter) !== chapter) setChapter(Number(params.chapter));
    }, [params.version, params.book, params.chapter]);

    return (
        <div style={rootThemeStyle} data-theme={theme} className={readingMode ? "min-h-screen flex flex-col bg-[#0f0f10]" : "min-h-screen flex flex-col"}>
            {/* Sticky info bar */}
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

            {!readingMode && <Header />}

            <main className={`flex-1 w-full pb-28 px-2 sm:px-4 transition-all duration-300 ${showStickyBar ? 'pt-[52px] sm:pt-[60px]' : ''}`}>
                <div className="mx-auto w-full max-w-5xl">
                    {/* Selectors section stays wide */}
                    {!readingMode && !showStickyBar && (
                        <div
                            ref={selectorsRef}
                            className="relative z-[70] flex flex-row flex-wrap gap-2 items-center mb-6 mt-4"
                        >
                            <button type="button" className="border rounded px-2 py-1 text-sm sm:px-3 sm:py-2 sm:text-base flex-1 min-w-[90px] bg-white" onClick={() => openModalFor("books")}>
                                {isMounted ? getBookDisplay(book) : "Book"}
                            </button>
                            <button type="button" className="border rounded px-2 py-1 text-sm sm:px-3 sm:py-2 sm:text-base w-14 sm:w-16 text-center bg-white" onClick={() => { !book ? openModalFor("books") : openModalFor("chapters"); }}>
                                {isMounted ? String(chapter).padStart(2, "0") : "01"}
                            </button>
                            <button type="button" className="border rounded px-2 py-1 text-sm sm:px-3 sm:py-2 sm:text-base min-w-[40px] sm:min-w-[120px] text-center flex justify-center items-center bg-white" onClick={() => openModalFor("versions")} title={selectedVersionObj?.displayName || selectedVersionObj?.name || selectedVersionObj?.id} disabled={loading || versions.length === 0}>
                                {loading || versions.length === 0 ? <span className="text-gray-400 animate-pulse">Loading...</span> : (selectedVersionObj ? versionShortLabel : version || "Ver")}
                            </button>
                            <button type="button" aria-label="audio" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center hover:bg-gray-50" onClick={() => setMusicOpen(true)}>🎵</button>
                            <button type="button" aria-label="more" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center hover:bg-gray-50" onClick={() => setMoreOpen(true)}>⋮</button>
                        </div>
                    )}

                    {/* Bible verses/content area is constrained */}
                    <div className="mx-auto w-full max-w-xl">
                        {readingMode && (
                            <div className="mb-4 text-rose-600 font-medium tracking-wide flex items-center gap-3">
                                <div>{getBookDisplay(book)} · {String(chapter).padStart(2, "0")} · {selectedVersionObj?.displayName || ""}</div>
                                <button onClick={() => setReadingMode(false)} className="text-sm text-gray-300 hover:text-gray-100">✕ Exit</button>
                            </div>
                        )}
                        {loading && <div className="text-gray-500 mb-4">Loading...</div>}
                        {error && <div className="text-red-500 mb-4">{error}</div>}
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.article key={`${version}_${book}_${chapter}`} style={articleStyle} className={readingMode ? "prose max-w-none text-lg leading-relaxed font-serif text-gray-100" : "prose max-w-none"} variants={variants[transition] || variants["fade"]} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.36, ease: "easeInOut" }}>
                                {verses.map((v: any) => {
                                    const vid = makeVerseId(book, chapter, v.n);
                                    const colorClass = verseToColor[vid] ? `hl-${verseToColor[vid]}` : "";
                                    const selectedClass = isVerseSelected(v.n) ? "selected-dotted" : "";
                                    const selectionCursor = selectionMode ? "selection-cursor" : "";
                                    return (
                                        <div
                                            key={v.n}
                                            data-verse-id={vid}
                                            className={`flex gap-2 items-start ${readingMode ? "text-gray-100" : "text-gray-800"} ${colorClass} ${selectedClass} ${selectionCursor}`}
                                            onClick={() => { if (selectionMode) toggleVerseSelection(v.n); }}
                                        >
                                            <span className={`font-bold ${readingMode ? "text-rose-300" : "text-gray-400"} w-8 text-right`}>{v.n}</span>
                                            <span>{v.text}</span>
                                            {!selectionMode && HIGHLIGHT_BUTTONS_ENABLED && (
                                                <button className="ml-3 text-xs px-2 py-1 border rounded text-gray-500" onClick={() => handleCreateHighlight(v.n, v.n, "yellow")} title="Highlight this verse">✦</button>
                                            )}
                                        </div>
                                    );
                                })}
                                {!hideFootnotes && (
                                    <div className="mt-6 text-sm text-gray-500"></div>
                                )}
                            </motion.article>
                        </AnimatePresence>
                    </div>
                </div>
            </main>

            {!readingMode && !showStickyBar && <FooterNav />}

            {!readingMode && isMounted && modalOpen && selectorsRef.current && (
                <ModalSelector portalKey={modalPortalKey} show={modalOpen} anchorRef={selectorsRef as MutableRefObject<HTMLDivElement>} onClose={closeModal} title={ mode === "books" ? "Select book" : mode === "chapters" ? "Select chapter" : mode === "verses" ? "Select verse" : "Select version" }>
                    {mode === "books" && <BookSelector books={books} onSelect={handleBookSelect} active={book} isTelugu={isTelugu} activeVersion={version} activeChapter={chapter} />}
                    {mode === "chapters" && <ChapterSelector chapters={chapters} onSelect={handleChapterSelect} active={chapter} activeVersion={version} activeBook={book} />}
                    {mode === "verses" && <VerseSelector verses={verses} onSelect={handleVerseSelect} onBack={() => setMode("chapters")} onDone={() => closeModal()} active={selectedVerse} />}
                    {mode === "versions" && <VersionSelector versions={versions} onSelect={handleVersionSelect} active={version} activeBook={book} activeChapter={chapter} />}
                </ModalSelector>
            )}

            {!readingMode && isMounted && musicOpen && selectorsRef.current && (
                <ModalSelector portalKey={modalPortalKey} show={musicOpen} anchorRef={selectorsRef as MutableRefObject<HTMLDivElement>} onClose={() => setMusicOpen(false)} title="Audio">
                    <div className="p-3"><MusicControl /></div>
                </ModalSelector>
            )}

            {!readingMode && isMounted && moreOpen && selectorsRef.current && (
                <ModalSelector portalKey={modalPortalKey} show={moreOpen} anchorRef={selectorsRef as MutableRefObject<HTMLDivElement>} onClose={() => setMoreOpen(false)} title="More">
                    <MoreMenu onClose={() => setMoreOpen(false)} fontSize={fontSize} setFontSize={(v: any) => setFontSize(v)} fontFamily={fontFamily} setFontFamily={(f: string) => setFontFamily(f)} theme={theme} setTheme={(t: any) => setTheme(t)} transition={transition} setTransition={(t: any) => setTransition(t)} hideFootnotes={hideFootnotes} setHideFootnotes={(h: boolean) => setHideFootnotes(h)} />
                </ModalSelector>
            )}

            {/* Floating action button to open highlight toolbar */}
            {HIGHLIGHT_BUTTONS_ENABLED && (
            <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: highlightToolbarOpen ? 260 : 88, zIndex: 125 }}>
                <button
                    aria-label="open highlight"
                    onClick={() => {
                        setHighlightToolbarOpen(true);
                        setSelectionMode(true); // Always enable selection mode when opening highlight toolbar
                    }}
                    className="rounded-full p-3 shadow-lg"
                    style={{ background: "#0f766e", color: "white", border: "none" }}
                >
                    ✦
                </button>
            </div>
            )}

            {/* HIGHLIGHT toolbar (show controlled by highlightToolbarOpen) */}
            <HighlightToolbar
                db={db}
                authUser={authUser}
                version={version}
                book={book}
                chapter={chapter}
                selectionMode={selectionMode}
                setSelectionMode={setSelectionMode}
                selectedVersesSet={selectedVersesSet}
                onToggleVerse={(n) => toggleVerseSelection(n)}
                clearSelection={() => clearSelection()}
                verseToColor={verseToColor}
                show={highlightToolbarOpen}
                onAfterApply={(id) => { console.log("highlight saved", id); }}
                onClose={() => setHighlightToolbarOpen(false)}
            />
        </div>
    );
}
