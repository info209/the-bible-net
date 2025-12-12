// src/app/bible/[version]/[book]/[chapter]/page.tsx
"use client";
import React, { useEffect, useRef, useState, MutableRefObject, useLayoutEffect, useMemo, useCallback } from "react";
import Header from "@/components/Header";
import FooterNav from "@/components/FooterNav";
import { bookMapping } from "@/components/bookMapping";
import ModalSelector from "@/app/bible/ModalSelector";
import BookSelector from "@/app/bible/BookSelector";
import ChapterSelector from "@/app/bible/ChapterSelector";
import VerseSelector from "@/app/bible/VerseSelector";
import VersionSelector from "@/app/bible/VersionSelector";
import MoreMenu from "@/app/bible/MoreMenu";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import Image from "next/image";
import backArrowIcon from "../../../../../../public/assets/back_arrow_icon.png";
import frontArrowIcon from '../../../../../../public/assets/front_arrow_icon.png';

// Version mapping utility
import { transformVersionsForFrontend, toBackendVersionId } from "@/lib/versionMapping";

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

// Version label override for TELBSI
function getVersionDisplayName(versionId: string, displayName: string) {
    return versionId === 'bsi' ? 'పరిశుద్ధ గ్రంథం (TELBSI)' : displayName;
}
function getVersionShortLabel(versionId: string, acronym: string | undefined) {
    return versionId === 'bsi' ? 'TELBSI' : (acronym || versionId);
}

export default function BibleDynamicPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
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
    const initialVerse = searchParams?.get("verse")
        ? Number(searchParams.get("verse"))
        : (savedSelection && savedSelection.verse ? savedSelection.verse : 1);

    const [version, setVersion] = useState<string>(initialVersion);
    const [book, setBook] = useState<string>(initialBook);
    const [chapter, setChapter] = useState<number>(initialChapter);
    const [selectedVerse, setSelectedVerse] = useState<number | null>(initialVerse);

    // Convert frontend version ID to backend version ID for API calls
    const backendVersion = useMemo(() => {
        const versionObj = versions.find(v => v.id === version);
        return versionObj?._backendId || toBackendVersionId(version);
    }, [version, versions]);

    // ...existing UI, modal, popover, readingMode, etc. state...
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [mode, setMode] = useState<"books" | "chapters" | "verses" | "versions">("books");
    const selectorsRef = useRef<HTMLDivElement | null>(null);
    const versesContainerRef = useRef<HTMLDivElement | null>(null);
    const [musicOpen, setMusicOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const [readingMode, setReadingMode] = useState(false);
    const [modalPortalKey, setModalPortalKey] = useState<number>(0);
    const [modalTitle, setModalTitle] = useState<string>("More"); // CHANGED: dynamic modal title for MoreMenu
    const selectedVersionObj = versions.find(v => v.id === version);
    const lang = (selectedVersionObj?.language || "").toLowerCase();
    const isTelugu = lang === "telugu" || lang === "te";
    // Settings cache keys
    const FONT_SIZE_KEY = "bible_fontSize";
    const FONT_FAMILY_KEY = "bible_fontFamily";
    const THEME_KEY = "bible_theme";
    const TRANSITION_KEY = "bible_transition";
    const HIDE_FOOTNOTES_KEY = "bible_hideFootnotes";

    // Font size options
    const fontSizeOptions: Array<"small" | "medium" | "large" | "xlarge"> = ["small", "medium", "large", "xlarge"];
    const fontSizeMap: Record<string, string> = {
        small: "1.05rem",
        medium: "1.25rem",
        large: "1.45rem",
        xlarge: "1.65rem",
    };

    // Default states
    const [fontSize, setFontSize] = useState<"small" | "medium" | "large" | "xlarge">();
    const [fontFamily, setFontFamily] = useState<string>();
    const [theme, setTheme] = useState<"default" | "pink" | "sepia" | "dark">();
    const [transition, setTransition] = useState<"slide" | "fade" | "flip">();
    const [hideFootnotes, setHideFootnotes] = useState<boolean>();
    const [hideOuterClose, setHideOuterClose] = useState(false);


    // On mount, read settings from localStorage (only once)
    useEffect(() => {
        if (typeof window === "undefined") return;
        setFontSize(() => {
            const fs = localStorage.getItem(FONT_SIZE_KEY);
            return (fs && fontSizeOptions.includes(fs as any)) ? (fs as any) : "medium";
        });
        setFontFamily(() => {
            const ff = localStorage.getItem(FONT_FAMILY_KEY);
            return ff || "Times New Roman";
        });
        setTheme(() => {
            const th = localStorage.getItem(THEME_KEY);
            return (th && ["default","pink","sepia","dark"].includes(th)) ? (th as any) : "default";
        });
        setTransition(() => {
            const tr = localStorage.getItem(TRANSITION_KEY);
            return (tr && ["slide","fade","flip"].includes(tr)) ? (tr as any) : "slide";
        });
        setHideFootnotes(() => {
            const hf = localStorage.getItem(HIDE_FOOTNOTES_KEY);
            return hf === "1" ? true : false;
        });
    }, []);

    // Persist settings to localStorage only when changed and defined
    useEffect(() => {
        if (typeof window === "undefined" || fontSize === undefined) return;
        localStorage.setItem(FONT_SIZE_KEY, fontSize);
    }, [fontSize]);
    useEffect(() => {
        if (typeof window === "undefined" || fontFamily === undefined) return;
        localStorage.setItem(FONT_FAMILY_KEY, fontFamily);
    }, [fontFamily]);
    useEffect(() => {
        if (typeof window === "undefined" || theme === undefined) return;
        localStorage.setItem(THEME_KEY, theme);
    }, [theme]);
    useEffect(() => {
        if (typeof window === "undefined" || transition === undefined) return;
        localStorage.setItem(TRANSITION_KEY, transition);
    }, [transition]);
    useEffect(() => {
        if (typeof window === "undefined" || hideFootnotes === undefined) return;
        localStorage.setItem(HIDE_FOOTNOTES_KEY, hideFootnotes ? "1" : "0");
    }, [hideFootnotes]);

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
        if (cache && Array.isArray(cache)) {
            const transformedCache = transformVersionsForFrontend(cache);
            setVersions(transformedCache);
            return;
        }
        setLoading(true);
        fetchWithKey(`${API_BASE}/versions`).then(r=>r.json()).then(data=>{
            const backendVersions = data || [];
            const transformedVersions = transformVersionsForFrontend(backendVersions);
            setVersions(transformedVersions);
            localStorage.setItem("bible_versions", JSON.stringify(backendVersions)); // Store original backend data
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
        fetchWithKey(`${API_BASE}/chapter-meta/${backendVersion}/${book}`)
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
    }, [version, book, backendVersion]);
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
        loadVersesFor(backendVersion, book, chapter);
        return () => {
            versesRequestIdRef.current++;
        };
    }, [version, book, chapter, chaptersLoaded, chapters, backendVersion]);
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
        setSelectedVerse(1); // Reset verse to 1
        // Update localStorage with verse: 1
        if (typeof window !== "undefined") {
            localStorage.setItem("bible_last_selection", JSON.stringify({
                version,
                book: selectedBook.slug,
                chapter: 1,
                verse: 1
            }));
        }
        // Update the route to include verse=1
        router.push(`/bible/${version}/${selectedBook.slug}/1?verse=1`);
        setModalOpen(false);
        setMode("chapters");
    }
    const handleChapterSelect = (n: number) => {
        setChapter(n);
        setSelectedVerse(1); // Always select the first verse when opening verse selector
        setMode("verses");
        // Do NOT update the route here; wait until verse is selected
    };
     const handleVerseDone = (overrideVerse?: number) => {
        const validVerseNumbers = verses.map((v: any) => v.n);
        const fallbackVerse = validVerseNumbers[0] || 1;
        let finalVerse = overrideVerse ?? selectedVerse ?? fallbackVerse;
        if (!validVerseNumbers.includes(finalVerse)) {
            finalVerse = fallbackVerse;
            setSelectedVerse(fallbackVerse);
        } else if (overrideVerse && overrideVerse !== selectedVerse) {
            setSelectedVerse(overrideVerse);
        }
        if (typeof window !== "undefined") {
            localStorage.setItem("bible_last_selection", JSON.stringify({
                version,
                book,
                chapter,
                verse: finalVerse
            }));
            const nextPath = `/bible/${version}/${book}/${chapter}?verse=${finalVerse}`;
            const currentPath = window.location.pathname + window.location.search;
            if (currentPath !== nextPath) {
                window.history.replaceState(null, "", nextPath);
            } else {
                const url = new URL(window.location.href);
                url.searchParams.set("verse", String(finalVerse));
                window.history.replaceState(null, "", url.toString());
            }
        }
        closeModal();
    };
    const handleVerseSelect = (n: number) => setSelectedVerse(n);
    const handleVersionSelect = (v: any) => {
        router.push(`/bible/${v.id}/${book}/${chapter}`);
        closeModal();
    };



    
    const getBookDisplay = (slug?: string) => {
  if (!slug) return "Book";
  const mapping = [...bookMapping.oldTestament, ...bookMapping.newTestament]
    .find(m => m.slug === slug);
  if (mapping) {
    return isTelugu ? (mapping.telugu || mapping.english) : (mapping.english || mapping.telugu);
  }
  return slug;
};
    const bookDisplay = useMemo(() => {
  return book ? getBookDisplay(book) : "Book";
}, [book, isTelugu]); // recompute only when book or language changes

    const resolvedVersionName = getVersionDisplayName(version, selectedVersionObj?.displayName || selectedVersionObj?.name || selectedVersionObj?.id || "");
    const versionShortLabel = isMounted
        ? getVersionShortLabel(version, selectedVersionObj?.acronym)
        : "Ver";
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

    // Ensure fontSize is always defined before using as index
    const resolvedFontSize = fontSize !== undefined ? fontSize : "medium";
    const resolvedFontFamily = fontFamily !== undefined ? fontFamily : "Times New Roman";
    const resolvedTheme = theme !== undefined ? theme : "default";
    const resolvedTransition = transition !== undefined ? transition : "slide";
    const resolvedHideFootnotes = hideFootnotes !== undefined ? hideFootnotes : false;

    // Use resolvedTransition for variants lookup
    const articleStyle: React.CSSProperties = {
        fontSize: fontSizeMap[resolvedFontSize] || fontSizeMap["medium"],
        fontFamily: resolvedFontFamily ? `'${resolvedFontFamily}', serif` : undefined,
    };
    const themeStyles: Record<string, React.CSSProperties> = {
        default: { backgroundColor: "#FEFEFE", color: "#111827" },
        pink: { backgroundColor: "#fff5f7", color: "#3b0b17" },
        sepia: { backgroundColor: "#f4ecd8", color: "#2b2b2b" },
        dark: { backgroundColor: "#0f0f10", color: "#e6eef0" },
    };
    const rootThemeStyle = !readingMode ? (themeStyles[resolvedTheme] || themeStyles["default"]) : {};
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
        const container = versesContainerRef.current;
        if (!container) return; // Must have the ref element
        const initialScrollY = container.scrollTop;
        const shouldShow = initialScrollY > 40;
        setShowStickyBar(shouldShow);
        lastShowStickyBar.current = shouldShow;
    }, [readingMode]);

// Sticky bar visibility (same behavior as header/footer)
useEffect(() => {
  if (readingMode) return;
  const container = versesContainerRef.current;
  if (!container) return;

  let lastY = container.scrollTop;

  const handleScroll = () => {
    const currentY = container.scrollTop;

    if (currentY > lastY && currentY > 40) {
      // scrolling down past threshold → hide
      setShowStickyBar(true);
    } else if (currentY < lastY) {
      // scrolling up → show
      setShowStickyBar(false);
    }

    lastY = currentY;
  };

  container.addEventListener("scroll", handleScroll, { passive: true });
  return () => container.removeEventListener("scroll", handleScroll);
}, [readingMode]);



    // Create highlight handler used by quick UI (single verse)
    async function handleCreateHighlight(startVerse: number, endVerse: number, color = "yellow") {
        if (!authUser) {
            alert("Please sign in to create highlights");
            return;
        }
        try {
            const highlightId = `${backendVersion}:${book}:${chapter}:${startVerse}-${endVerse}_${Date.now()}`;
            await createHighlight(db, authUser, { version: backendVersion, book, chapter, startVerse, endVerse, color, highlightId });
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
        localStorage.setItem(LAST_SELECTION_KEY, JSON.stringify({
            version,
            book,
            chapter,
            verse: selectedVerse ?? undefined
        }));
    }, [version, book, chapter, selectedVerse, isMounted]);
    useEffect(() => {
        if (params.version && params.version !== version) setVersion(params.version as string);
        if (params.book && params.book !== book) setBook(params.book as string);
        if (params.chapter && Number(params.chapter) !== chapter) setChapter(Number(params.chapter));
    }, [params.version, params.book, params.chapter]);

    // FooterNav visibility logic
    const [showFooterNav, setShowFooterNav] = useState(true);
    const [showHeader, setShowHeader] = useState(true);
    const lastScrollY = useRef(0); // Initialize with 0 for SSR safety
    const [selectorsSticky, setSelectorsSticky] = useState(false);
    // Set lastScrollY after mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            lastScrollY.current = window.scrollY;
        }
    }, []);
    // IntersectionObserver for sticky detection
    useEffect(() => {
        const ref = selectorsRef.current;
        if (!ref) return;
        const observer = new window.IntersectionObserver(
            ([entry]) => {
                setSelectorsSticky(!entry.isIntersecting);
            },
            { root: null, threshold: 0.01 }
        );
        observer.observe(ref);
        return () => observer.disconnect();
    }, [selectorsRef]);
    // Scroll direction tracking and FooterNav visibility
   useEffect(() => {
  if (readingMode) return;
  const container = versesContainerRef.current;
  if (!container) return;

  let lastY = container.scrollTop;
  let ticking = false;

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        // Clamp overshoot values (avoid bounce at top/bottom)
        const maxScroll = container.scrollHeight - container.clientHeight;
        const currentY = Math.max(0, Math.min(container.scrollTop, maxScroll));

        // Ignore tiny jitter (threshold)
        if (Math.abs(currentY - lastY) < 5) {
          ticking = false;
          return;
        }

        // Header/Footer toggle
        if (selectorsSticky) {
          if (currentY > lastY) {
            // scrolling down
            setShowFooterNav(false);
            setShowHeader(false);
          } else {
            // scrolling up
            setShowFooterNav(true);
            setShowHeader(true);
          }
        } else {
          // always visible if not sticky
          setShowFooterNav(true);
          setShowHeader(true);
        }

        // Sticky bar toggle
        if (currentY > 40 && currentY > lastY) {
          setShowStickyBar(true);
        } else if (currentY < lastY) {
          setShowStickyBar(false);
        }

        lastY = currentY;
        ticking = false;
      });
      ticking = true;
    }
  };

  container.addEventListener("scroll", handleScroll, { passive: true });
  return () => container.removeEventListener("scroll", handleScroll);
}, [readingMode, selectorsSticky]);



   useEffect(() => {
  if (!selectedVerse || selectedVerse === 1) return;

  const el = document.getElementById(`verse-${selectedVerse}`);
  const container = document.getElementById("verses-container");

  if (!el || !container) return;

  container.scrollTo({
    top: el.offsetTop - container.offsetTop - 100, // offset for header
    behavior: "smooth",
  });

}, [selectedVerse]);

// All books in canonical order
const allBooksInOrder = [...books.oldTestament, ...books.newTestament];
const currentBookIndex = allBooksInOrder.findIndex(b => b.slug === book);

const canGoPrev = () => {
  if (chapter > 1) return true;
  return currentBookIndex > 0;
};

const canGoNext = () => {
  if (chapters && chapter < chapters.length) return true;
  return currentBookIndex < allBooksInOrder.length - 1 && currentBookIndex !== -1;
};

const getBookChapterCount = (bookSlug: string): number => {
  const bookData = allBooksInOrder.find(b => b.slug === bookSlug);
  return bookData?.chapters || 151; // safe fallback
};

const handlePrev = () => {
  if (!canGoPrev()) return;

  if (chapter > 1) {
    // Previous chapter in current book
    const newChapter = chapter - 1;
    setChapter(newChapter);
    router.replace(`/bible/${version}/${book}/${newChapter}?verse=1`);
  } else if (currentBookIndex > 0) {
    // Go to last chapter of previous book
    const prevBook = allBooksInOrder[currentBookIndex - 1];
    const lastChapter = getBookChapterCount(prevBook.slug);
    setBook(prevBook.slug);
    setChapter(lastChapter);
    setSelectedVerse(1);
    router.replace(`/bible/${version}/${prevBook.slug}/${lastChapter}?verse=1`);
  }
};

const handleNext = () => {
  if (!canGoNext()) return;

  if (chapters && chapter < chapters.length) {
    // Next chapter in current book
    const newChapter = chapter + 1;
    setChapter(newChapter);
    router.replace(`/bible/${version}/${book}/${newChapter}?verse=1`);
  } else if (currentBookIndex < allBooksInOrder.length - 1) {
    // Go to chapter 1 of next book
    const nextBook = allBooksInOrder[currentBookIndex + 1];
    setBook(nextBook.slug);
    setChapter(1);
    setSelectedVerse(1);
    router.replace(`/bible/${version}/${nextBook.slug}/1?verse=1`);
  }
};
const VerseSkeleton = ({ count = 5, readingMode = false }) => {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start space-x-2">
          <span
            className={`flex-1 h-4 rounded ${
              readingMode ? "bg-gray-600" : "bg-gray-200"
            }`}
          ></span>
        </div>
      ))}
    </div>
  );
};


    return (
        <div
            style={rootThemeStyle}
            data-theme={theme}
            className={`bible_page min-h-screen flex flex-col ${
                readingMode && "bg-[#0f0f10]"
            }`}
            >

            {/* Sticky info bar for reading mode */}
            {readingMode && (
                <div className="sticky top-0 z-[100] w-full bg-rose-50 border-b border-rose-200 font-semibold text-rose-600">
                    <div className="flex items-center w-full max-w-5xl mx-auto px-3 sm:px-6 min-h-[44px] sm:min-h-[52px]">
                        <span className="truncate text-left text-rose-600 font-semibold">
                            {getBookDisplay(book)} · {String(chapter).padStart(2, "0")} · {selectedVersionObj ? versionShortLabel : ""}
                        </span>
                    </div>
                </div>
            )}
            {/* Sticky info bar for non-reading mode */}
            {!readingMode && !showHeader &&(
                <div
                    className={`fixed top-0 left-0 w-full z-[70] pointer-events-none bg-transparent border-none shadow-none transition-all duration-300 ${showStickyBar ? '' : 'opacity-0'}`}
                    style={{ minHeight: '44px' }}
                >
                    <div className="flex items-center lg:w-[68%] md:w-[59%] w-[88%] max-w-5xl mx-auto px-3 sm:px-6 min-h-[44px] sm:min-h-[52px]">
                        <span className="font-medium text-base sm:text-lg text-gray-900 dark:text-black truncate text-left bg-transparent">
                            {getBookDisplay(book)}  {String(chapter).padStart(2)} | {selectedVersionObj ? versionShortLabel.toUpperCase() : ""}
                        </span>
                    </div>
                </div>
            )}
               {!readingMode && (
                <div
                    className={`fixed top-0 left-0 w-full duration-500 ease-in-out ${
    showHeader ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full"
  }`}>
                  <Header
                    selectorsRef={selectorsRef}
                    readingMode={readingMode}
                    showStickyBar={showStickyBar}
                    book={book}
                    chapter={chapter}
                    version={version}
                    versionShortLabel={versionShortLabel}
                    openModalFor={openModalFor}
                    handleVerseDone={handleVerseDone}
                    setMusicOpen={setMusicOpen}
                    setMoreOpen={setMoreOpen}
                    isMounted={isMounted}
                    selectedVersionObj={selectedVersionObj}
                    versions={versions}
                    bookDisplay={(slug) => getBookDisplay(slug)}
                    />
                </div>
                )}
            <main
                className={`flex-1 w-full px-2 sm:px-4 transition-all duration-300 
                ${showHeader ? 'pt-[28%] md:pt-[20%] lg:pt-[15%] xl:pt-[10%]' : 'pt-[10%]  md:pt-[6%] lg:pt-[5%] xl:pt-[3%]'} 
                ${showFooterNav ? 'pb-[80px]' : 'pb-0'}`}>
                <div className="mx-auto w-full max-w-5xl">
                    {/* Selectors section stays wide */}
                        <div
                        id="verses-container" 
                        ref={versesContainerRef}
                        className="overflow-y-auto no-scrollbar h-[100vh]"
                          style={{ paddingBottom: showFooterNav ? "250px":"" }}
                          >
                    {/* Bible verses/content area is constrained */}
                    <div className="mx-auto w-full max-w-xl">
                        {readingMode && (
                            <div className="mb-4 text-rose-600 font-medium tracking-wide flex items-center gap-3">
                                <button onClick={() => setReadingMode(false)} className="text-sm text-gray-300 hover:text-gray-100">✕ Exit</button>
                            </div>
                        )}
                        {loading && <VerseSkeleton count={30} readingMode={readingMode} />}

                        {error && <div className="text-red-500 mb-4">{error}</div>}



                        <AnimatePresence mode="wait" initial={false}>
                            <motion.article key={`${version}_${book}_${chapter}`}
                                            style={articleStyle}
                                            className={readingMode ? "prose max-w-none  text-lg leading-relaxed font-serif text-gray-100" : "prose max-w-none pb-[20%]"}
                                            variants={variants[resolvedTransition] || variants["fade"]}
                                            initial="initial" animate="animate" exit="exit" transition={{ duration: 0.36, ease: "easeInOut" }}>

                                {verses.map((v: any) => {
                                    const vid = makeVerseId(book, chapter, v.n);
                                    const colorClass = verseToColor[vid] ? `hl-${verseToColor[vid]}` : "";
                                    const selectedClass = isVerseSelected(v.n) ? "selected-dotted" : "";
                                    const selectionCursor = selectionMode ? "selection-cursor" : "";
                                    return (
                                        <span
                                            key={v.n}
                                            id={`verse-${v.n}`}
                                            data-verse-id={vid}
                                            className={` ${readingMode ? "text-gray-100" : "text-gray-800"} ${colorClass} ${selectedClass} ${selectionCursor}`}
                                            onClick={() => { if (selectionMode) toggleVerseSelection(v.n); }}
                                        >
                                            <span className={`${readingMode ? "text-rose-300" : "text-[#D23952]"}`}>{v.n}</span>
                                             {" "}<span>{v.text}</span>{" "}
                                            {!selectionMode && HIGHLIGHT_BUTTONS_ENABLED && (
                                                <button className="ml-3 text-xs px-2 py-1 border rounded text-gray-500" onClick={() => handleCreateHighlight(v.n, v.n, "yellow")} title="Highlight this verse">✦</button>
                                            )}
                                        </span>
                                    );
                                })}
                                {!hideFootnotes && (
                                    <div className="mt-6 text-sm text-gray-500"></div>
                                )}


                            </motion.article>
                        </AnimatePresence>

                    </div>
                </div>
                 </div>
            </main>

                        {loading || versions.length > 0 && (
                                        <div
                                                className="
                                                    fixed flex justify-between
                                                    top-[83%] left-1/2 -translate-x-1/2 -translate-y-1/2
                                                    w-[90%]
                                                    md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                                                    md:w-[90%]
                                                    lg:w-[75%]
                                                "
                                                >
                                    <div  className={`w-10 h-10 flex border items-center justify-center rounded-full 
                                               ${canGoPrev() ? 'bg-white cursor-pointer hover:bg-gray-100 shadow-md' : 'bg-gray-300 cursor-not-allowed opacity-70'}`}
                                        onClick={handlePrev}>
                                        <Image src={backArrowIcon} alt="Back"/>
                                    </div>
                                    <div className={`w-10 h-10 flex border items-center justify-center rounded-full 
                                               ${canGoNext() ? 'bg-white cursor-pointer hover:bg-gray-100 shadow-md' : 'bg-gray-300 cursor-not-allowed opacity-70'}`}
                                   onClick={handleNext}
                                    >
                                        <Image src={frontArrowIcon} alt="Next"/>
                                    </div>

                                </div>
                                )}
            {/* FooterNav visibility logic */}
           {!readingMode && (
                    <div
                        className={`fixed bottom-0 left-0 w-full z-[70] transition-all duration-500 ease-in-out
                        ${showFooterNav ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full"}`}
                        style={{ minHeight: "60px" }}
                    >
                        <FooterNav />
                    </div>
                    )}


            {!readingMode && isMounted && modalOpen && selectorsRef.current && (
                <ModalSelector portalKey={modalPortalKey} show={modalOpen} anchorRef={selectorsRef as MutableRefObject<HTMLDivElement>} onClose={closeModal} title={ mode === "books" ? "Select book" : mode === "chapters" ? "Select chapter" : mode === "verses" ? "Select verse" : "Select version" } mode={mode} onBack={() => setMode("chapters")} onDone={handleVerseDone} maxWidth={400} customHeight={520}>
                    {mode === "books" && <BookSelector books={books} onSelect={handleBookSelect} active={book} isTelugu={isTelugu} activeVersion={version} activeChapter={chapter} />}
                    {mode === "chapters" && <ChapterSelector chapters={chapters} onSelect={handleChapterSelect} active={chapter} activeVersion={version} activeBook={book} />}
                    {mode === "verses" && <VerseSelector verses={verses} onSelect={handleVerseSelect} onBack={() => setMode("chapters")} onDone={handleVerseDone} active={selectedVerse} />}
                    {mode === "versions" && <VersionSelector versions={versions} onSelect={handleVersionSelect} active={version} activeBook={book} activeChapter={chapter} />}
                </ModalSelector>
            )}

            {!readingMode && isMounted && musicOpen && selectorsRef.current && (
                <ModalSelector portalKey={modalPortalKey} show={musicOpen} anchorRef={selectorsRef as MutableRefObject<HTMLDivElement>} onClose={() => setMusicOpen(false)}
                onBack={()=>{}} onDone={()=>{}} title="Audio">
                    <div className="p-3"><MusicControl /></div>
                </ModalSelector>
            )}

            {!readingMode && isMounted && moreOpen && selectorsRef.current && (
                <ModalSelector
                    portalKey={modalPortalKey}
                    show={moreOpen}
                    anchorRef={selectorsRef as MutableRefObject<HTMLDivElement>}
                    onClose={() => {
                        setMoreOpen(false);
                        // ensure outer close is restored when modal closes
                        setHideOuterClose(false);
                    }}
                      onBack={()=>{}} onDone={()=>{}}
                    // IMPORTANT: leave title empty so inner MoreMenu renders its own compact header/card
                    title=""
                    hideClose={hideOuterClose} // hide outer X when MoreMenu requests it
                >
                    <MoreMenu
                        nested={true}
                        onClose={() => {
                            setMoreOpen(false);
                            setHideOuterClose(false);
                        }}
                        onHideOuterClose={(hide: boolean) => {
                            // called by MoreMenu to hide/show outer close button
                            setHideOuterClose(hide);
                        }}
                        fontSize={fontSize}
                        setFontSize={(v: any) => setFontSize(v)}
                        fontFamily={fontFamily}
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
            {/* <HighlightToolbar
                db={db}
                authUser={authUser}
                version={backendVersion}
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
            /> */}
        </div>
    );
}