"use client";

import Header from '@/components/Header';
import FooterNav from '@/components/FooterNav';
import { useEffect, useState, useRef } from 'react';

// Set your API base URL here
const API_BASE = 'https://australia-southeast1-the-bible-net.cloudfunctions.net/api';

// Helper for fetch with x-app-key header
const fetchWithKey = (url: string) =>
  fetch(url, { headers: { 'x-app-key': 'your_secret_key' } });

export default function ReaderPage() {
  // State for API data
  const [versions, setVersions] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
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
    fetchWithKey(`${API_BASE}/versions/${version}/books`)
      .then((res) => res.json())
      .then((data) => {
        console.log('Books:', data);
        // Support both { books: [...] } and [...]
        const arr = Array.isArray(data) ? data : (Array.isArray(data.books) ? data.books : []);
        setBooks(arr);
        if (arr.length > 0) setBook(arr[0].slug);
        setLoading(false);
      })
      .catch(() => { setBooks([]); setError('Failed to load books'); setLoading(false); });
  }, [version]);

  // Fetch chapters when book changes
  useEffect(() => {
    if (!version || !book) return;
    setLoading(true);
    // Find the selected book object
    const selectedBook = books.find((b: any) => b.slug === book);
    if (selectedBook && selectedBook.chapterVerseCounts) {
      // Use chapterVerseCounts keys as chapter numbers
      const chapterNums = Object.keys(selectedBook.chapterVerseCounts).map(Number).sort((a, b) => a - b);
      setChapters(chapterNums);
      setChapter(chapterNums[0] || 1);
      setLoading(false);
    } else {
      // Fallback: fetch chapter-meta if not present
      fetchWithKey(`${API_BASE}/chapter-meta/${version}/${book}`)
        .then((res) => res.json())
        .then((data) => {
          console.log('Chapters meta:', data);
          let chapterCount = 1;
          if (typeof data === 'object' && data !== null && 'chapters' in data) {
            chapterCount = data.chapters;
          } else if (Array.isArray(data)) {
            chapterCount = data.length;
          }
          const arr = Array.from({ length: chapterCount }, (_, i) => i + 1);
          setChapters(arr);
          setChapter(1);
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

  return (
    <div className="min-h-screen flex flex-col bg-[#FEFEFE]">
      <Header />
      <main className="flex-1 w-full px-4 pt-4 pb-28">
        <div className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-4xl">
          {/* Selectors: Side by side */}
          <div className="flex flex-row gap-2 mb-6 items-start">
            {/* Version Selector */}
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="border rounded px-2 py-1 min-w-[120px]"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>{v.displayName} ({v.language})</option>
              ))}
            </select>
            {/* Book Selector: Dropdown with side-by-side Old/New Testament */}
            <div className="relative min-w-[220px]">
              <button
                ref={booksButtonRef}
                className="border rounded px-2 py-1 w-full text-left bg-white"
                onClick={() => setShowBooks((v) => !v)}
                type="button"
              >
                {(() => {
                  const selected = books.find((b: any) => b.slug === book);
                  return selected ? selected.name : 'Select Book';
                })()}
              </button>
              {showBooks && (
                <div
                  ref={booksDropdownRef}
                  className="absolute z-20 left-0 right-0 mt-1 flex gap-4 bg-white border rounded shadow-lg p-2 max-h-64 overflow-y-auto"
                >
                  {/* Old Testament */}
                  <div className="flex-1 min-w-[120px]">
                    <div className="font-semibold mb-2 text-xs text-gray-500">Old Testament</div>
                    <div className="flex flex-col gap-1">
                      {books.filter((b: any) => b.testament === 'old').map((b: any) => (
                        <button
                          key={b.slug}
                          className={`text-left px-2 py-1 rounded transition border border-transparent hover:bg-blue-50 ${book === b.slug ? 'bg-blue-100 border-blue-400 font-bold' : ''}`}
                          onClick={() => {
                            setBook(b.slug);
                            setShowBooks(false);
                          }}
                          type="button"
                        >
                          {b.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* New Testament */}
                  <div className="flex-1 min-w-[120px]">
                    <div className="font-semibold mb-2 text-xs text-gray-500">New Testament</div>
                    <div className="flex flex-col gap-1">
                      {books.filter((b: any) => b.testament === 'new').map((b: any) => (
                        <button
                          key={b.slug}
                          className={`text-left px-2 py-1 rounded transition border border-transparent hover:bg-blue-50 ${book === b.slug ? 'bg-blue-100 border-blue-400 font-bold' : ''}`}
                          onClick={() => {
                            setBook(b.slug);
                            setShowBooks(false);
                          }}
                          type="button"
                        >
                          {b.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Chapter Selector */}
            <select
              value={chapter}
              onChange={(e) => setChapter(Number(e.target.value))}
              className="border rounded px-2 py-1 min-w-[80px]"
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
