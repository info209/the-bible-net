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

    // robust cleanup when leaving reading mode
    useEffect(() => {
        if (!readingMode) {
            setModalOpen(false);
            setMusicOpen(false);
            setMoreOpen(false);
            setMode("books");
            document.body.style.overflow = "";
            // bump portal key so any portal DOM is remounted/cleared
            setTimeout(() => setModalPortalKey(k => k + 1), 40);
        }
    }, [readingMode]);

    // open modal helper (force a portal remount so it's fresh)
    const openModalFor = (m: typeof mode) => {
        // ensure fresh portal -> bump key then open
        setModalPortalKey(k => k + 1);
        setMode(m);
        setModalOpen(true);
        selectorsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    const closeModal = () => setModalOpen(false);

    // popovers
    const openMusic = () => { setMusicOpen(true); setMoreOpen(false); setModalOpen(false); setModalPortalKey(k => k + 1); selectorsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); };
    const closeMusic = () => setMusicOpen(false);

    const openMore = () => { setMoreOpen(true); setMusicOpen(false); setModalOpen(false); setModalPortalKey(k => k + 1); selectorsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); };
    const closeMore = () => setMoreOpen(false);

    // selection handlers
    const handleBookSelect = (b: any) => { setBook(b.slug); closeModal(); };
    const handleChapterSelect = (n: number) => { setChapter(n); setMode("verses"); };
    const handleVerseSelect = (n: number) => setSelectedVerse(n);
    const handleVersionSelect = (v: any) => { setVersion(v.id); closeModal(); };

    const getBookDisplay = (slug: string) => {
        if (!slug) return "Select Book";
        const mapping = [...bookMapping.oldTestament, ...bookMapping.newTestament].find(m => m.slug === slug);
        if (mapping) return isTelugu ? (mapping.telugu || mapping.english) : (mapping.english || mapping.telugu);
        return slug;
    };

    // enter reading mode (simple)
    const enterReadingMode = () => {
        setModalOpen(false);
        setMusicOpen(false);
        setMoreOpen(false);
        setTimeout(() => setReadingMode(true), 80);
    };

    // exit reading mode via Escape
    useEffect(() => {
        const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape" && readingMode) setReadingMode(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [readingMode]);

    return (
        <div className={readingMode ? "min-h-screen flex flex-col bg-[#0f0f10] text-gray-100" : "min-h-screen flex flex-col bg-[#FEFEFE]"}>
            {!readingMode && <Header />}

            <main className="flex-1 w-full pt-4 pb-28 px-3 sm:px-6">
                <div className="mx-auto w-full max-w-5xl">
                    {!readingMode && (
                        <div ref={selectorsRef} className="relative z-[70] flex flex-col md:flex-row gap-3 md:items-center mb-6">
                            <div className="flex-1 min-w-0">
                                <button className="border rounded px-3 py-2 w-full text-left bg-white" onClick={() => openModalFor("books")}>
                                    {isMounted ? getBookDisplay(book) : "Select Book"}
                                </button>
                            </div>

                            <div className="flex gap-3 items-center">
                                <button className="border rounded px-3 py-2 w-28 text-center bg-white" onClick={() => { if (!book) openModalFor("books"); else openModalFor("chapters"); }}>
                                    {isMounted ? String(chapter).padStart(2, '0') : "01"}
                                </button>

                                <button className="border rounded px-3 py-2 min-w-[200px] text-left bg-white" onClick={() => openModalFor("versions")}>
                                    {isMounted ? (selectedVersionObj ? `${selectedVersionObj.displayName} (${selectedVersionObj.language})` : "Select Version") : "Select Version"}
                                </button>
                            </div>

                            <div className="flex items-center gap-2 md:ml-4 ml-auto flex-shrink-0">
                                <button aria-label="Enter reading mode" title="Reading mode" onClick={enterReadingMode} className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-gray-50">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="3" stroke="#374151" strokeWidth="1.6"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" stroke="#374151" strokeWidth="1.6" strokeLinecap="round"/></svg>
                                </button>

                                <button aria-label="audio" className="w-10 h-10 rounded-full border flex items-center justify-center hover:bg-gray-50" onClick={openMusic}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M9 17V7l10-2v10" stroke="#1f6f6f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="6" cy="17" r="2" stroke="#1f6f6f" strokeWidth="1.8"/></svg>
                                </button>

                                <button aria-label="more" className="w-10 h-10 rounded-full border flex items-center justify-center hover:bg-gray-50" onClick={openMore}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="5" r="1.5" fill="#333"/><circle cx="12" cy="12" r="1.5" fill="#333"/><circle cx="12" cy="19" r="1.5" fill="#333"/></svg>
                                </button>
                            </div>
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

            {/* Modals (no anchorVisible gating) */}
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
                <ModalSelector portalKey={modalPortalKey} show={musicOpen} anchorRef={selectorsRef as MutableRefObject<HTMLDivElement>} onClose={closeMusic} title="Audio">
                    <div className="p-2">Audio controls (placeholder)</div>
                </ModalSelector>
            )}

            {!readingMode && isMounted && moreOpen && selectorsRef.current && (
                <ModalSelector portalKey={modalPortalKey} show={moreOpen} anchorRef={selectorsRef as MutableRefObject<HTMLDivElement>} onClose={closeMore} title="More">
                    <div className="p-2">
                        <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-50" onClick={() => { navigator.clipboard?.writeText(window.location.href); alert("Link copied"); closeMore(); }}>Copy link</button>
                        <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-50" onClick={() => { alert("Share dialog"); closeMore(); }}>Share</button>
                        <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-50" onClick={() => { alert("Reader settings"); closeMore(); }}>Reader settings</button>
                    </div>
                </ModalSelector>
            )}
        </div>
    );
}
