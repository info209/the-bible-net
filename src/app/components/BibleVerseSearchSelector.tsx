'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, ChevronLeft, X, BookOpen, Loader2 } from 'lucide-react';
import { getLocalizedBookName } from '@/utils/bibleBooks';

interface BibleVersion {
  id: string;
  name: string;
  fullName: string;
  language: string;
  abbreviation: string;
}

interface BibleBook {
  _id: string;
  name: string;
  abbreviation: string;
  testament: 'OT' | 'NT';
  order: number;
  chaptersCount?: number;
}

interface BibleVerseSearchSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (verseRef: {
    bookName: string;
    chapter: number;
    verses: number[];
    label: string;
    version: string;
  }) => void;
}

const bookChaptersFallback: { [key: string]: number } = {
  'Genesis': 50, 'Exodus': 40, 'Leviticus': 27, 'Numbers': 36, 'Deuteronomy': 34,
  'Joshua': 24, 'Judges': 21, 'Ruth': 4, '1 Samuel': 31, '2 Samuel': 24,
  '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36, 'Ezra': 10,
  'Nehemiah': 13, 'Esther': 10, 'Job': 42, 'Psalms': 150, 'Proverbs': 31,
  'Ecclesiastes': 12, 'Song of Solomon': 8, 'Isaiah': 66, 'Jeremiah': 52, 'Lamentations': 5,
  'Ezekiel': 48, 'Daniel': 12, 'Hosea': 14, 'Joel': 3, 'Amos': 9,
  'Obadiah': 1, 'Jonah': 4, 'Micah': 7, 'Nahum': 3, 'Habakkuk': 3,
  'Zephaniah': 3, 'Haggai': 2, 'Zechariah': 14, 'Malachi': 4,
  'Matthew': 28, 'Mark': 16, 'Luke': 24, 'John': 21, 'Acts': 28,
  'Romans': 16, '1 Corinthians': 16, '2 Corinthians': 13, 'Galatians': 6, 'Ephesians': 6,
  'Philippians': 4, 'Colossians': 4, '1 Thessalonians': 5, '2 Thessalonians': 3,
  '1 Timothy': 6, '2 Timothy': 4, 'Titus': 3, 'Philemon': 1, 'Hebrews': 13,
  'James': 5, '1 Peter': 5, '2 Peter': 3, '1 John': 5, '2 John': 1,
  '3 John': 1, 'Jude': 1, 'Revelation': 22
};

export default function BibleVerseSearchSelector({
  isOpen,
  onClose,
  onSelect,
}: BibleVerseSearchSelectorProps) {
  const [versions, setVersions] = useState<BibleVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('KJV');
  const [selectedVersionName, setSelectedVersionName] = useState<string>('KJV');
  const [selectedVersionLang, setSelectedVersionLang] = useState<string>('English');
  
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookSortType, setBookSortType] = useState<'traditional' | 'alphabetical'>('traditional');
  
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  
  const [versesCount, setVersesCount] = useState<number>(0);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [selectedVerseStart, setSelectedVerseStart] = useState<number | null>(null);
  const [selectedVerseEnd, setSelectedVerseEnd] = useState<number | null>(null);
  
  const [step, setStep] = useState<'book' | 'chapter' | 'verse'>('book');
  const [loading, setLoading] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Hydrate translation version from localStorage
  useEffect(() => {
    if (!isOpen) return;
    const cachedId = localStorage.getItem('bible-reader-version-id');
    const cachedName = localStorage.getItem('bible-reader-version-name');
    if (cachedId) {
      setSelectedVersionId(cachedId);
      if (cachedName) setSelectedVersionName(cachedName);
    }
  }, [isOpen]);

  // Fetch all available Bible versions
  useEffect(() => {
    if (!isOpen) return;
    const fetchVersions = async () => {
      try {
        const response = await fetch('/api/v1/bible/versions');
        const data = await response.json();
        if (data.success && data.data) {
          const list = data.data.map((v: any) => ({
            id: v.id || v._id || v.abbreviation,
            name: v.name,
            fullName: v.fullName,
            language: v.language,
            abbreviation: v.abbreviation,
          }));
          setVersions(list);
          
          // Ensure selectedVersionId corresponds to an actual fetched ID/Abbreviation
          const activeId = selectedVersionId;
          const matched = list.find((v: any) => v.id === activeId || v.abbreviation === activeId);
          if (matched) {
            setSelectedVersionId(matched.id);
            setSelectedVersionName(matched.name);
            setSelectedVersionLang(matched.language);
          } else if (list.length > 0) {
            setSelectedVersionId(list[0].id);
            setSelectedVersionName(list[0].name);
            setSelectedVersionLang(list[0].language);
          }
        }
      } catch (error) {
        console.error('Failed to load Bible versions:', error);
      }
    };
    fetchVersions();
  }, [isOpen]);

  // Fetch books for the selected version
  useEffect(() => {
    if (!isOpen || !selectedVersionId) return;
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/bible/${selectedVersionId}/books`);
        const data = await response.json();
        if (data.success && data.data) {
          setBooks(data.data);
        }
      } catch (error) {
        console.error('Failed to load books:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, [isOpen, selectedVersionId]);

  // Fetch verses count for the selected chapter
  useEffect(() => {
    if (!isOpen || !selectedBook || !selectedChapter || !selectedVersionId) return;
    const fetchVerses = async () => {
      setLoadingVerses(true);
      try {
        // Query chapter content to know the exact number of verses
        const response = await fetch(`/api/v1/bible/${selectedVersionId}/${selectedBook.name}/${selectedChapter}`);
        const data = await response.json();
        if (data.success && data.data && data.data.verses) {
          setVersesCount(data.data.verses.length);
        } else {
          setVersesCount(30); // reasonable fallback
        }
      } catch (error) {
        console.error('Failed to load chapter verses count:', error);
        setVersesCount(30); // fallback
      } finally {
        setLoadingVerses(false);
      }
    };
    fetchVerses();
  }, [isOpen, selectedBook, selectedChapter, selectedVersionId]);

  // Focus search input when book selection step starts
  useEffect(() => {
    if (step === 'book' && isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [step, isOpen]);

  // Dismiss dialog without full reset — preserves search query for next open
  const handleClose = () => {
    setSelectedBook(null);
    setSelectedChapter(null);
    setSelectedVerseStart(null);
    setSelectedVerseEnd(null);
    setStep('book');
    onClose();
  };

  // Full reset — used after a verse is successfully inserted
  const handleFullReset = () => {
    setSearchQuery('');
    setSelectedBook(null);
    setSelectedChapter(null);
    setSelectedVerseStart(null);
    setSelectedVerseEnd(null);
    setStep('book');
    onClose();
  };

  const handleVersionChange = (val: string) => {
    const matched = versions.find(v => v.id === val || v.abbreviation === val);
    if (matched) {
      setSelectedVersionId(matched.id);
      setSelectedVersionName(matched.name);
      setSelectedVersionLang(matched.language);
      localStorage.setItem('bible-reader-version-id', matched.id);
      localStorage.setItem('bible-reader-version-name', matched.name);
      
      // Reset selections since books/languages changed
      setSelectedBook(null);
      setSelectedChapter(null);
      setSelectedVerseStart(null);
      setSelectedVerseEnd(null);
      setStep('book');
    }
  };

  // Filter books based on search query
  const filteredBooks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return books;
    
    return books.filter(b => {
      const locName = getLocalizedBookName(b.name, selectedVersionLang).toLowerCase();
      return (
        b.name.toLowerCase().includes(query) ||
        b.abbreviation.toLowerCase().includes(query) ||
        locName.includes(query)
      );
    });
  }, [books, searchQuery, selectedVersionLang]);

  // Group books by testament
  const bookGroups = useMemo(() => {
    const ot = filteredBooks.filter(b => b.testament === 'OT');
    const nt = filteredBooks.filter(b => b.testament === 'NT');
    
    const sortBooks = (arr: BibleBook[]) => {
      if (bookSortType === 'alphabetical') {
        return [...arr].sort((a, b) => {
          const nameA = getLocalizedBookName(a.name, selectedVersionLang);
          const nameB = getLocalizedBookName(b.name, selectedVersionLang);
          return nameA.localeCompare(nameB);
        });
      }
      return [...arr].sort((a, b) => a.order - b.order);
    };

    return {
      'Old Testament': sortBooks(ot),
      'New Testament': sortBooks(nt),
    };
  }, [filteredBooks, bookSortType, selectedVersionLang]);

  const handleBookSelect = (book: BibleBook) => {
    setSelectedBook(book);
    setStep('chapter');
  };

  const handleChapterSelect = (chapter: number) => {
    setSelectedChapter(chapter);
    setSelectedVerseStart(null);
    setSelectedVerseEnd(null);
    setStep('verse');
  };

  const handleVerseClick = (vNum: number) => {
    if (selectedVerseStart === null) {
      setSelectedVerseStart(vNum);
      setSelectedVerseEnd(vNum);
    } else if (selectedVerseStart === vNum && selectedVerseEnd === vNum) {
      // Toggle off
      setSelectedVerseStart(null);
      setSelectedVerseEnd(null);
    } else if (vNum > selectedVerseStart) {
      setSelectedVerseEnd(vNum);
    } else {
      setSelectedVerseStart(vNum);
      setSelectedVerseEnd(vNum);
    }
  };

  const handleInsert = () => {
    if (!selectedBook || !selectedChapter || selectedVerseStart === null || selectedVerseEnd === null) return;
    
    // Construct label in localized book name
    const locBookName = getLocalizedBookName(selectedBook.name, selectedVersionLang);
    const label = selectedVerseStart === selectedVerseEnd
      ? `${locBookName} ${selectedChapter}:${selectedVerseStart}`
      : `${locBookName} ${selectedChapter}:${selectedVerseStart}-${selectedVerseEnd}`;
      
    onSelect({
      bookName: selectedBook.name, // keep canonical English name in attributes
      chapter: selectedChapter,
      verses: Array.from({ length: selectedVerseEnd - selectedVerseStart + 1 }, (_, i) => selectedVerseStart! + i),
      label,
      version: selectedVersionName,
    });
    
    handleFullReset();
  };

  if (!isOpen) return null;

  const totalChapters = selectedBook
    ? bookChaptersFallback[selectedBook.name] || selectedBook.chaptersCount || 50
    : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center sm:p-4 select-none">
      <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md flex flex-col shadow-2xl transition-all" style={{ maxHeight: '92dvh' }}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            {step !== 'book' && (
              <button
                type="button"
                onClick={() => setStep(step === 'verse' ? 'chapter' : 'book')}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-full transition-colors text-gray-500 dark:text-gray-400"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h3 className="font-bold text-base text-gray-800 dark:text-[#F5F5F5]">
              {step === 'book' && 'Link Scripture'}
              {step === 'chapter' && (selectedBook ? getLocalizedBookName(selectedBook.name, selectedVersionLang) : 'Select Chapter')}
              {step === 'verse' && (selectedBook ? `${getLocalizedBookName(selectedBook.name, selectedVersionLang)} ${selectedChapter}` : 'Select Verses')}
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            {/* Version Selector — shows abbreviation, full name on hover */}
            {step === 'book' && versions.length > 0 && (
              <select
                value={selectedVersionId}
                onChange={(e) => handleVersionChange(e.target.value)}
                title={versions.find(v => v.id === selectedVersionId)?.name ?? selectedVersionId}
                className="text-xs font-semibold bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-lg px-2 py-1 outline-none text-[#0B7A81] focus:ring-1 focus:ring-[#0B7A81] max-w-[90px] sm:max-w-none"
              >
                {versions.map(v => (
                  <option key={v.id} value={v.id} title={v.name} className="bg-white dark:bg-[#121214] text-gray-800 dark:text-[#F5F5F5]">
                    {v.abbreviation || v.id}
                  </option>
                ))}
              </select>
            )}
            
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-full transition-colors text-gray-500 dark:text-gray-400"
              aria-label="Close verse search"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0 bg-gray-50/50 dark:bg-white/[0.01]">
          {/* STEP 1: BOOK SELECTION */}
          {step === 'book' && (
            <div className="space-y-4 flex flex-col h-full">
              {/* Search Bar */}
              <div className="relative shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search Bible book..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] text-sm outline-none focus:border-[#0B7A81] focus:ring-1 focus:ring-[#0B7A81] text-gray-800 dark:text-[#F5F5F5]"
                />
              </div>

              {/* Sort controls */}
              <div className="flex justify-between items-center text-xs shrink-0 px-1 text-gray-400">
                <span className="font-semibold tracking-wider">Books</span>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setBookSortType('traditional')}
                    className={`font-semibold transition-colors ${bookSortType === 'traditional' ? 'text-[#0B7A81]' : 'hover:text-gray-600'}`}
                  >
                    Traditional
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setBookSortType('alphabetical')}
                    className={`font-semibold transition-colors ${bookSortType === 'alphabetical' ? 'text-[#0B7A81]' : 'hover:text-gray-600'}`}
                  >
                    Alphabetical
                  </button>
                </div>
              </div>

              {/* Books List */}
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0B7A81] mb-2" />
                  <span className="text-sm">Loading books...</span>
                </div>
              ) : filteredBooks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                  No matching books found.
                </div>
              ) : (
                <div className="flex-1 space-y-4">
                  {Object.entries(bookGroups).map(([testament, list]) => {
                    if (list.length === 0) return null;
                    return (
                      <div key={testament} className="space-y-2">
                        <span className="text-[10px] font-bold text-gray-400 tracking-wider block px-1">
                          {testament}
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {list.map(b => (
                            <button
                              key={b._id}
                              type="button"
                              onClick={() => handleBookSelect(b)}
                              className="text-left px-3 py-2 bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] hover:border-[#0B7A81] hover:bg-[#0B7A81]/[0.02] dark:hover:bg-[#0B7A81]/[0.05] rounded-xl text-sm transition-all truncate text-gray-700 dark:text-[#E2E8F0] font-medium"
                            >
                              {getLocalizedBookName(b.name, selectedVersionLang)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CHAPTER SELECTION */}
          {step === 'chapter' && (
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: totalChapters }, (_, i) => i + 1).map(chapter => (
                <button
                  key={chapter}
                  type="button"
                  onClick={() => handleChapterSelect(chapter)}
                  className="aspect-square flex items-center justify-center bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] hover:border-[#0B7A81] rounded-xl text-sm text-gray-700 dark:text-[#E2E8F0] font-semibold active:scale-95 transition-all"
                >
                  {chapter.toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          )}

          {/* STEP 3: VERSE SELECTION */}
          {step === 'verse' && (
            <div className="space-y-4 flex flex-col h-full">
              {loadingVerses ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0B7A81] mb-2" />
                  <span className="text-sm">Loading verses count...</span>
                </div>
              ) : (
                <>
                  <span className="text-xs font-semibold text-gray-400 block px-1">
                    Select a start verse and end verse to specify a range.
                  </span>
                  
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: versesCount }, (_, i) => i + 1).map(vNum => {
                      const isSelected = selectedVerseStart !== null && selectedVerseEnd !== null &&
                        vNum >= selectedVerseStart && vNum <= selectedVerseEnd;
                      
                      return (
                        <button
                          key={vNum}
                          type="button"
                          onClick={() => handleVerseClick(vNum)}
                          className={`aspect-square flex items-center justify-center border rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                            isSelected
                              ? 'bg-[#0B7A81] border-[#0B7A81] text-white'
                              : 'bg-white dark:bg-white/[0.02] border-gray-100 dark:border-white/[0.04] hover:border-[#0B7A81] text-gray-700 dark:text-[#E2E8F0]'
                          }`}
                        >
                          {vNum.toString().padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer info/controls */}
        {step === 'verse' && selectedVerseStart !== null && (
          <div className="p-4 border-t border-gray-100 dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.01] shrink-0 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold tracking-wider">Reference label</span>
              <span className="text-sm font-bold text-[#0B7A81] truncate max-w-[220px]">
                {selectedBook && `${getLocalizedBookName(selectedBook.name, selectedVersionLang)} ${selectedChapter}:${selectedVerseStart}${selectedVerseStart === selectedVerseEnd ? '' : `-${selectedVerseEnd}`}`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleInsert}
              className="px-5 py-2 bg-[#0B7A81] text-white font-semibold rounded-xl text-sm hover:bg-[#0B7A81]/90 transition-all active:scale-95 shadow-md shadow-[#0B7A81]/10"
            >
              Insert verse
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
