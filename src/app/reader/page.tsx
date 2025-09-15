"use client";

import Header from '@/components/Header';
import FooterNav from '@/components/FooterNav';
import { useEffect, useState, useRef } from 'react';
import { bookMapping } from '@/components/bookMapping';

// Set your API base URL here
const API_BASE = 'https://australia-southeast1-the-bible-net.cloudfunctions.net/api';

// Helper for fetch with x-app-key header
const fetchWithKey = (url: string) =>
  fetch(url, { headers: { 'x-app-key': 'your_secret_key' } });

export default function ReaderPage() {
  // State for API data
  const [versions, setVersions] = useState<any[]>([]);
  const [books, setBooks] = useState<{ oldTestament: any[]; newTestament: any[] }>({ oldTestament: [], newTestament: [] });
  const [chapters, setChapters] = useState<number[]>([]);
  const [verses, setVerses] = useState<any[]>([]);

  // State for selections
  const [version, setVersion] = useState<string>('');
  const [book, setBook] = useState<string>('');
  const [chapter, setChapter] = useState<number>(1);

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropdown open/close state
  const [showBooks, setShowBooks] = useState(false);
  const booksButtonRef = useRef<HTMLButtonElement>(null);
  const booksDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showBooks) return;
    function handleClick(e: MouseEvent) {
      if (
        booksDropdownRef.current &&
        !booksDropdownRef.current.contains(e.target as Node) &&
        booksButtonRef.current &&
        !booksButtonRef.current.contains(e.target as Node)
      ) {
        setShowBooks(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showBooks]);

  // Fetch versions on mount
  useEffect(() => {
    setLoading(true);
    fetchWithKey(`${API_BASE}/versions`)
      .then((res) => res.json())
      .then((data) => {
        console.log('Versions:', data);
        setVersions(data);
        if (data.length > 0) setVersion(data[0].id); // Use id instead of version
        setLoading(false);
      })
      .catch(() => { setError('Failed to load versions'); setLoading(false); });
  }, []);

  // Fetch books when version changes
  useEffect(() => {
    if (!version) return;
    setLoading(true);
    fetchWithKey(`${API_BASE}/books`)
      .then((res) => res.json())
      .then((data) => {
        // Handle both { books: [...] } and [...]
        const apiBooks = Array.isArray(data) ? data : (Array.isArray(data.books) ? data.books : []);
        const apiBookSlugs = new Set(apiBooks.map((b: any) => b.slug));
        // Only include books present in API response
        const oldBooks = bookMapping.oldTestament.filter(m => apiBookSlugs.has(m.slug)).map(m => {
          const apiBook = apiBooks.find((b: any) => b.slug === m.slug);
          return { ...m, ...apiBook };
        });
        const newBooks = bookMapping.newTestament.filter(m => apiBookSlugs.has(m.slug)).map(m => {
          const apiBook = apiBooks.find((b: any) => b.slug === m.slug);
          return { ...m, ...apiBook };
        });
        setBooks({ oldTestament: oldBooks, newTestament: newBooks });
        // Try to preserve book selection
        const prevBookSlug = book;
        const allBooks = [...oldBooks, ...newBooks];
        const bookExists = allBooks.some((b: any) => b.slug === prevBookSlug);
        if (bookExists) {
          setBook(prevBookSlug);
        } else if (allBooks.length > 0) {
          setBook(allBooks[0].slug);
        }
        setLoading(false);
      })
      .catch(() => { setBooks({ oldTestament: [], newTestament: [] }); setError('Failed to load books'); setLoading(false); });
  }, [version]);

  // Fetch chapters when book changes or version changes
  useEffect(() => {
    if (!version || !book) return;
    setLoading(true);
    const selectedBookObj = [...books.oldTestament, ...books.newTestament].find((b: any) => b.slug === book);
    if (selectedBookObj && selectedBookObj.chapterVerseCounts) {
      const chapterNums = Object.keys(selectedBookObj.chapterVerseCounts).map(Number).sort((a, b) => a - b);
      setChapters(chapterNums);
      // Try to preserve chapter selection
      const prevChapterNum = chapter;
      if (chapterNums.includes(prevChapterNum)) {
        setChapter(prevChapterNum);
      } else {
        setChapter(chapterNums[0] || 1);
      }
      setLoading(false);
    } else {
      fetchWithKey(`${API_BASE}/chapter-meta/${version}/${book}`)
        .then((res) => res.json())
        .then((data) => {
          // Handle object with numeric keys (chapter numbers)
          let chapterNums: number[] = [];
          if (typeof data === 'object' && data !== null) {
            if ('chapters' in data) {
              // { chapters: N }
              chapterNums = Array.from({ length: data.chapters }, (_, i) => i + 1);
            } else if (Array.isArray(data)) {
              // [ ... ]
              chapterNums = data.map((_, i) => i + 1);
            } else {
              // {1: 80, 2: 52, ...}
              const keys = Object.keys(data);
              if (keys.every(k => !isNaN(Number(k)))) {
                chapterNums = keys.map(Number).sort((a, b) => a - b);
              }
            }
          }
          setChapters(chapterNums);
          // Try to preserve chapter selection
          const prevChapterNum = chapter;
          if (chapterNums.includes(prevChapterNum)) {
            setChapter(prevChapterNum);
          } else {
            setChapter(chapterNums[0] || 1);
          }
          setLoading(false);
        })
        .catch(() => { setChapters([]); setError('Failed to load chapters'); setLoading(false); });
    }
  }, [version, book, books]);

  // Fetch verses when chapter changes
  useEffect(() => {
    if (!version || !book || !chapter) return;
    setLoading(true);
    fetchWithKey(`${API_BASE}/chapter/${version}/${book}/${chapter}`)
      .then((res) => res.json())
      .then((data) => {
        console.log('Verses:', data);
        const arr = (data && Array.isArray(data.verses)) ? data.verses : [];
        setVerses(arr);
        setLoading(false);
      })
      .catch(() => { setVerses([]); setError('Failed to load verses'); setLoading(false); });
  }, [version, book, chapter]);

  // Helper to get selected version object
  const selectedVersionObj = versions.find(v => v.id === version);
  const lang = selectedVersionObj?.language?.toLowerCase();
  const isTelugu = lang === 'telugu' || lang === 'te';

  return (
    <div className="min-h-screen flex flex-col bg-[#FEFEFE]">
      <Header />
      <main className="flex-1 w-full px-2 sm:px-4 pt-4 pb-28">
        <div className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-4xl">
          {/* Selectors: Responsive layout */}
          <div className="flex flex-col sm:flex-row gap-2 mb-6 items-stretch sm:items-start">
            {/* Version Selector */}
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="border rounded px-2 py-2 min-w-[120px] w-full sm:w-auto"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>{v.displayName} ({v.language})</option>
              ))}
            </select>
            {/* Book Selector: Dropdown with side-by-side Old/New Testament */}
            <div className="relative min-w-[160px] sm:min-w-[220px] w-full sm:w-auto">
              <button
                ref={booksButtonRef}
                className="border rounded px-2 py-2 w-full text-left bg-white"
                onClick={() => setShowBooks((v) => !v)}
                type="button"
              >
                {(() => {
                  const allBooks = [...(books.oldTestament || []), ...(books.newTestament || [])];
                  const selected = allBooks.find((b: any) => b.slug === book);
                  if (selected) {
                    // Use mapping for display
                    const mapping = [...bookMapping.oldTestament, ...bookMapping.newTestament].find(m => m.slug === selected.slug);
                    if (mapping) {
                      return isTelugu ? mapping.telugu : mapping.english;
                    }
                    return selected.slug;
                  }
                  return 'Select Book';
                })()}
              </button>
              {showBooks && (
                <div
                  ref={booksDropdownRef}
                  className="absolute z-20 left-0 right-0 mt-1 flex flex-col sm:flex-row gap-4 bg-white border rounded shadow-lg p-2 max-h-64 overflow-y-auto"
                >
                  {/* Old Testament */}
                  <div className="flex-1 min-w-[100px] sm:min-w-[120px]">
                    <div className="font-semibold mb-2 text-xs text-gray-500">Old Testament</div>
                    <div className="flex flex-col gap-1">
                      {(books.oldTestament || []).map((b: any) => {
                        const mapping = bookMapping.oldTestament.find(m => m.slug === b.slug);
                        return (
                          <button
                            key={b.slug}
                            className={`text-left px-2 py-2 rounded transition border border-transparent hover:bg-blue-50 ${book === b.slug ? 'bg-blue-100 border-blue-400 font-bold' : ''}`}
                            onClick={() => {
                              setBook(b.slug);
                              setShowBooks(false);
                            }}
                            type="button"
                          >
                            {mapping ? (isTelugu ? mapping.telugu : mapping.english) : b.slug}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* New Testament */}
                  <div className="flex-1 min-w-[100px] sm:min-w-[120px]">
                    <div className="font-semibold mb-2 text-xs text-gray-500">New Testament</div>
                    <div className="flex flex-col gap-1">
                      {(books.newTestament || []).map((b: any) => {
                        const mapping = bookMapping.newTestament.find(m => m.slug === b.slug);
                        return (
                          <button
                            key={b.slug}
                            className={`text-left px-2 py-2 rounded transition border border-transparent hover:bg-blue-50 ${book === b.slug ? 'bg-blue-100 border-blue-400 font-bold' : ''}`}
                            onClick={() => {
                              setBook(b.slug);
                              setShowBooks(false);
                            }}
                            type="button"
                          >
                            {mapping ? (isTelugu ? mapping.telugu : mapping.english) : b.slug}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Chapter Selector */}
            <select
              value={chapter}
              onChange={(e) => setChapter(Number(e.target.value))}
              className="border rounded px-2 py-2 min-w-[80px] w-full sm:w-auto"
            >
              {chapters.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          {/* Loading/Error */}
          {loading && <div className="text-gray-500 mb-4">Loading...</div>}
          {error && <div className="text-red-500 mb-4">{error}</div>}
          {/* Verses */}
          <div className="space-y-2">
            {verses.map((v: any) => (
              <div key={v.n} className="flex gap-2 items-start">
                <span className="font-bold text-gray-400 w-8 text-right">{v.n}</span>
                <span className="text-gray-800">{v.text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
      <FooterNav />
    </div>
  );
}
