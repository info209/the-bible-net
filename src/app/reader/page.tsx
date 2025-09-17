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
    // look for a parenthesized token that looks like an acronym (all caps or mixed but short)
    const parenMatches = [...displayName.matchAll(/\(([^)]+)\)/g)].map(m => m[1]);
    if (parenMatches.length > 0) {
        // prefer last parenthesis that is short & likely an acronym
        for (let i = parenMatches.length - 1; i >= 0; i--) {
            const token = parenMatches[i].trim();
            // if it contains letters and is short (<=5), use it
            if (/^[A-Za-z0-9&-]{1,5}$/.test(token)) return token.toUpperCase();
            // if token contains spaces but inside is all-caps words like "T N K", remove spaces
            if (/^[A-Z\s]{1,8}$/.test(token)) return token.replace(/\s+/g, "").toUpperCase();
        }
    }
    // fallback: take first letters of words (skip small words), up to 4 chars
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

    // hydrate selections after mount
    useEffect(() => {
        if (!isMounted) return;
        const v = localStorage.getItem("bible_version");
        const b = localStorage.getItem("bible_book");
        const ch = localStorage.getItem("bible_chapter");
        if (v) setVersion(v);
        if (b) setBook(b);
        if (ch && !isNaN(Number(ch))) setChapter(Number(ch));
    }, [isMounted]);

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

    // chapters
    useEffect(() => {
        if (!version || !book) return;
        setLoading(true);
        fetchWithKey(`${API_BASE}/chapter-meta/${version}/${book}`).then(r=>r.json()).then(data=>{
            let chapterNums: number[] = [];
            if (data && typeof data === "object") {
                if ("chapters" in data) chapterNums = Array.from({ length: (data as any).chapters }, (_, i) => i + 1);
                else if (Array.isArray(data)) chapterNums = data.map((_, i) => i + 1);
                else chapterNums = Object.keys(data).filter(k => !isNaN(Number(k))).map(Number).sort((a,b)=>a-b);
            }
            setChapters(chapterNums);
            setLoading(false);
        }).catch(()=>{ setChapters([]); setError("Failed to load chapters"); setLoading(false); });
    }, [version, book]);

    // verses
    useEffect(() => {
        if (!version || !book || !chapter) return;
        setLoading(true);
        fetchWithKey(`${API_BASE}/chapter/${version}/${book}/${chapter}`).then(r=>r.json()).then(data=>{
            const arr = (data && Array.isArray(data.verses)) ? data.verses : [];
            setVerses(arr); setLoading(false);
        }).catch(()=>{ setVerses([]); setError("Failed to load verses"); setLoading(false); });
    }, [version, book, chapter]);

    // persist selections
    useEffect(() => { if (isMounted && version) localStorage.setItem("bible_version", version); }, [version, isMounted]);
    useEffect(() => { if (isMounted && book) localStorage.setItem("bible_book", book); }, [book, isMounted]);
    useEffect(() => { if (isMounted && chapter) localStorage.setItem("bible_chapter", String(chapter)); }, [chapter, isMounted]);

    // cleanup when leaving reading mode
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

    const handleBookSelect = (b: any) => { setBook(b.slug); closeModal(); };
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

    return (
        <div className={readingMode ? "min-h-screen flex flex-col bg-[#0f0f10] text-gray-100" : "min-h-screen flex flex-col bg-[#FEFEFE]"}>
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
                                className="border rounded px-2 py-1 text-sm sm:px-3 sm:py-2 sm:text-base flex-1 min-w-[90px] bg-white"
                                onClick={() => openModalFor("books")}
                            >
                                {isMounted ? getBookDisplay(book) : "Book"}
                            </button>

                            {/* Chapter */}
                            <button
                                className="border rounded px-2 py-1 text-sm sm:px-3 sm:py-2 sm:text-base w-14 sm:w-16 text-center bg-white"
                                onClick={() => { !book ? openModalFor("books") : openModalFor("chapters"); }}
                            >
                                {isMounted ? String(chapter).padStart(2, "0") : "01"}
                            </button>

                            {/* Version - show acronym / short only */}
                            <button
                                className="border rounded px-2 py-1 text-sm sm:px-3 sm:py-2 sm:text-base min-w-[40px] sm:min-w-[120px] text-left bg-white"
                                onClick={() => openModalFor("versions")}
                                title={selectedVersionObj?.displayName || selectedVersionObj?.name || ""}
                            >
                                {isMounted ? (selectedVersionObj ? versionShortLabel : "Ver") : "Ver"}
                            </button>

                            {/* Reading mode button */}
                            <button
                                aria-label="Enter reading mode"
                                title="Reading mode"
                                onClick={enterReadingMode}
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center hover:bg-gray-50"
                            >
                                📰
                            </button>

                            {/* Music */}
                            <button
                                aria-label="audio"
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center hover:bg-gray-50"
                                onClick={() => setMusicOpen(true)}
                            >
                                🎵
                            </button>

                            {/* More */}
                            <button
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

                    <article className={readingMode ? "prose max-w-none text-lg leading-relaxed font-serif text-gray-100" : "prose max-w-none"}>
                        {verses.map((v: any) => (
                            <div key={v.n} className={`flex gap-2 items-start ${readingMode ? "text-gray-100" : "text-gray-800"}`}>
                                <span className={`font-bold ${readingMode ? "text-rose-300" : "text-gray-400"} w-8 text-right`}>{v.n}</span>
                                <span>{v.text}</span>
                            </div>
                        ))}
                    </article>
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
                    <div className="p-2">Audio controls (placeholder)</div>
                </ModalSelector>
            )}

            {!readingMode && isMounted && moreOpen && selectorsRef.current && (
                <ModalSelector portalKey={modalPortalKey} show={moreOpen} anchorRef={selectorsRef as MutableRefObject<HTMLDivElement>} onClose={() => setMoreOpen(false)} title="More">
                    <div className="p-2">
                        <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-50">Copy link</button>
                        <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-50">Share</button>
                        <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-50">Reader settings</button>
                    </div>
                </ModalSelector>
            )}
        </div>
    );
}
