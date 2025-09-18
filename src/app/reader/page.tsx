"use client";
import React, { useEffect, useRef, useState, MutableRefObject } from "react";
import Header from "@/components/Header";
import FooterNav from "@/components/FooterNav";
import { bookMapping } from "@/components/bookMapping";

import ModalSelector from "@/app/reader/ModalSelector";
import BookSelector from "@/app/reader/BookSelector";
import ChapterSelector from "@/app/reader/ChapterSelector";
import VerseSelector from "@/app/reader/VerseSelector";
import VersionSelector from "@/app/reader/VersionSelector";
import MoreMenu from "@/app/reader/MoreMenu";

// framer-motion for page transitions
import { motion, AnimatePresence } from "framer-motion";

import MusicControl from "@/app/reader/MusicControl"; // <-- ADDED import

const API_BASE = "https://australia-southeast1-the-bible-net.cloudfunctions.net/api";
const fetchWithKey = (url: string) =>
    fetch(url, { headers: { "x-app-key": "your_secret_key" } });

const getCached = (key: string) => {
    if (typeof window === "undefined") return null;
    const val = localStorage.getItem(key);
    try { return val ? JSON.parse(val) : null; } catch { return null; }
};

// small helper to extract acronym/short label
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

export default function ReaderPage() {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    // data & selections
    const [versions, setVersions] = useState<any[]>([]);
    const [books, setBooks] = useState<{ oldTestament: any[]; newTestament: any[] }>({ oldTestament: [], newTestament: [] });
    const [chapters, setChapters] = useState<number[]>([]);
    const [chaptersLoaded, setChaptersLoaded] = useState(false); // guard so verses wait until chapters known
    const [verses, setVerses] = useState<any[]>([]);
    const [version, setVersion] = useState<string>("");
    const [book, setBook] = useState<string>("");
    const [chapter, setChapter] = useState<number>(1);
    const [selectedVerse, setSelectedVerse] = useState<number | null>(null);

    // UI
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [mode, setMode] = useState<"books" | "chapters" | "verses" | "versions">("books");
    const selectorsRef = useRef<HTMLDivElement | null>(null);

    // popovers
    const [musicOpen, setMusicOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);

    // reading mode
    const [readingMode, setReadingMode] = useState(false);

    // portal key (force remount)
    const [modalPortalKey, setModalPortalKey] = useState<number>(0);

    const selectedVersionObj = versions.find(v => v.id === version);
    const lang = (selectedVersionObj?.language || "").toLowerCase();
    const isTelugu = lang === "telugu" || lang === "te";

    // --- Settings state lifted into ReaderPage (applies immediately) ---
    const [fontSize, setFontSize] = useState<"small" | "medium" | "large" | "xlarge">("medium");
    const [fontFamily, setFontFamily] = useState<string>("Times New Roman"); // font-family
    const [theme, setTheme] = useState<"default" | "pink" | "sepia" | "dark">("default");
    const [transition, setTransition] = useState<"slide" | "fade" | "flip">("slide");
    const [hideFootnotes, setHideFootnotes] = useState(false);

    // hydrate selections after mount
    useEffect(() => {
        if (!isMounted) return;
        const v = localStorage.getItem("bible_version");
        const b = localStorage.getItem("bible_book");
        const ch = localStorage.getItem("bible_chapter");
        const sv = localStorage.getItem("bible_verse");
        if (v) setVersion(v);
        if (b) setBook(b);
        if (ch && !isNaN(Number(ch))) setChapter(Number(ch));
        if (sv && !isNaN(Number(sv))) setSelectedVerse(Number(sv));

        // hydrate reader settings
        const storedFont = localStorage.getItem("reader_fontSize") as any;
        const storedFamily = localStorage.getItem("reader_fontFamily") as any;
        const storedTheme = localStorage.getItem("reader_theme") as any;
        const storedTrans = localStorage.getItem("reader_transition") as any;
        const storedHide = localStorage.getItem("reader_hideFootnotes");
        if (storedFont === "small" || storedFont === "medium" || storedFont === "large" || storedFont === "xlarge") setFontSize(storedFont);
        if (storedFamily) setFontFamily(storedFamily);
        if (storedTheme === "default" || storedTheme === "pink" || storedTheme === "sepia" || storedTheme === "dark") setTheme(storedTheme);
        if (storedTrans === "slide" || storedTrans === "fade" || storedTrans === "flip") setTransition(storedTrans);
        setHideFootnotes(storedHide === "1" ? true : false);
    }, [isMounted]);

    // persist selections
    useEffect(() => { if (isMounted && version) localStorage.setItem("bible_version", version); }, [version, isMounted]);
    useEffect(() => { if (isMounted && book) localStorage.setItem("bible_book", book); }, [book, isMounted]);
    useEffect(() => { if (isMounted && chapter) localStorage.setItem("bible_chapter", String(chapter)); }, [chapter, isMounted]);
    useEffect(() => { if (isMounted && selectedVerse != null) localStorage.setItem("bible_verse", String(selectedVerse)); }, [selectedVerse, isMounted]);

    // persist reader settings
    useEffect(() => {
        if (!isMounted) return;
        try {
            localStorage.setItem("reader_fontSize", fontSize);
            localStorage.setItem("reader_fontFamily", fontFamily);
            localStorage.setItem("reader_theme", theme);
            localStorage.setItem("reader_transition", transition);
            localStorage.setItem("reader_hideFootnotes", hideFootnotes ? "1" : "0");
        } catch (e) { /* ignore storage errors */ }
    }, [fontSize, fontFamily, theme, transition, hideFootnotes, isMounted]);

    // Select first version if no cache and none selected
    useEffect(() => {
        if (!isMounted) return;
        const v = localStorage.getItem("bible_version");
        if (!v && versions.length > 0 && !version) {
            setVersion(versions[0].id);
        }
    }, [versions, isMounted, version]);

    // Select first book if no cache and none selected
    useEffect(() => {
        if (!isMounted) return;
        const b = localStorage.getItem("bible_book");
        if (!b && books.oldTestament && books.oldTestament.length > 0 && !book) {
            setBook(books.oldTestament[0].slug);
        } else if (!b && books.newTestament && books.newTestament.length > 0 && !book) {
            setBook(books.newTestament[0].slug);
        }
    }, [books, isMounted, book]);

    // Select first chapter if no cache and none selected
    useEffect(() => {
        if (!isMounted) return;
        const ch = localStorage.getItem("bible_chapter");
        if (!ch && chapters && chapters.length > 0 && (!chapter || !chapters.includes(chapter))) {
            setChapter(chapters[0]);
        }
    }, [chapters, isMounted, chapter]);

    // Select first verse if no cache and none selected
    useEffect(() => {
        if (!isMounted) return;
        const v = localStorage.getItem("bible_verse");
        if (!v && verses && verses.length > 0 && selectedVerse == null) {
            setSelectedVerse(1);
        }
    }, [verses, isMounted, selectedVerse]);

    // versions
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

    // books
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

    // chapters (fetch)
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
    }, [version, book]); // intentionally NOT including `chapter` here

    // --- Robust verses loader using request-id pattern ---
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

    // robust cleanup when leaving reading mode
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

    const handleBookSelect = (b: any) => {
        setBook(b.slug);
        closeModal();
    };
    const handleChapterSelect = (n: number) => { setChapter(n); setMode("verses"); };
    const handleVerseSelect = (n: number) => setSelectedVerse(n);
    const handleVersionSelect = (v: any) => { setVersion(v.id); closeModal(); };

    const getBookDisplay = (slug: string) => {
        if (!slug) return "Book";
        const mapping = [...bookMapping.oldTestament, ...bookMapping.newTestament].find(m => m.slug === slug);
        if (mapping) return isTelugu ? (mapping.telugu || mapping.english) : (mapping.english || mapping.telugu);
        return slug;
    };

    // Short version label / acronym for the version selector
    const versionShortLabel = isMounted ? extractAcronym(selectedVersionObj?.displayName || selectedVersionObj?.name || selectedVersionObj?.id) : "Ver";

    // reading mode toggle (small light)
    const enterReadingMode = () => {
        setModalOpen(false);
        setMusicOpen(false);
        setMoreOpen(false);
        setTimeout(() => setReadingMode(true), 80);
    };

    // escape -> exit reading
    useEffect(() => {
        const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape" && readingMode) setReadingMode(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [readingMode]);

    // compute article style for font-size + family
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

    // theme styles applied inline so we don't change external CSS
    // NOTE: these theme styles are applied only when NOT in readingMode (so reading mode retains its intended styles)
    const themeStyles: Record<string, React.CSSProperties> = {
        default: { backgroundColor: "#FEFEFE", color: "#111827" },
        pink: { backgroundColor: "#fff5f7", color: "#3b0b17" },
        sepia: { backgroundColor: "#f4ecd8", color: "#2b2b2b" },
        dark: { backgroundColor: "#0f0f10", color: "#e6eef0" },
    };

    const rootThemeStyle = !readingMode ? (themeStyles[theme] || themeStyles["default"]) : {};

    // framer variants for transitions
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

    return (
        <div style={rootThemeStyle} data-theme={theme} className={readingMode ? "min-h-screen flex flex-col bg-[#0f0f10]" : "min-h-screen flex flex-col"}>
            {!readingMode && <Header />}

            <main className="flex-1 w-full pt-4 pb-28 px-2 sm:px-4">
                <div className="mx-auto w-full max-w-5xl">
                    {!readingMode && (
                        <div
                            ref={selectorsRef}
                            className="relative z-[70] flex flex-row flex-wrap gap-2 items-center mb-6"
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
                                title={selectedVersionObj?.displayName || selectedVersionObj?.name || ""}
                            >
                                {isMounted ? (selectedVersionObj ? versionShortLabel : "Ver") : "Ver"}
                            </button>

                            {/* Reading mode button */}
                            <button
                                type="button"
                                aria-label="Enter reading mode"
                                title="Reading mode"
                                onClick={enterReadingMode}
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center hover:bg-gray-50"
                            >
                                📰
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

            {!readingMode && <FooterNav />}

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
