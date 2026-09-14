import { useState, useEffect, useRef } from 'react';
import { FiSearch } from 'react-icons/fi';
import { X, Clock, Trash2, BookOpen, ChevronDown, Loader2 } from 'lucide-react';
import { useAutoFocus, focusTarget } from '@/hooks/useAutoFocus';

interface SearchResult {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  preview: string;
  versionAbbr?: string;
  versionName?: string;
  verseId?: string;
}

interface BibleSearchProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVersion: string;
  onNavigateToVerse: (book: string, chapter: number, verse: number, version?: string) => void;
  isDark?: boolean;
  selectedTheme?: 'light' | 'sepia' | 'cream' | 'dark';
}

const SEARCH_HISTORY_KEY = 'bible_search_history';
const MAX_HISTORY_ITEMS = 10;
const PAGE_LIMIT = 25;

type TestamentFilter = 'all' | 'OT' | 'NT';

const TESTAMENT_FILTERS: { value: TestamentFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'OT', label: 'Old Testament' },
  { value: 'NT', label: 'New Testament' },
];

export default function BibleSearch({
  isOpen,
  onClose,
  selectedVersion,
  onNavigateToVerse,
  isDark = false,
  selectedTheme,
}: BibleSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [testamentFilter, setTestamentFilter] = useState<TestamentFilter>('all');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchKeyRef = useRef<string>('');
  const activeAbortRef = useRef<AbortController | null>(null);

  // Load search history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error loading search history:', e);
      }
    }
  }, []);

  // Focus search input when modal opens or reopens
  useAutoFocus({ active: isOpen }, searchInputRef);

  // Search function using Server API — fetches a specific page
  const performSearch = async (query: string, page: number, testament: TestamentFilter, isFirstPage: boolean) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      setHasMore(false);
      return;
    }

    const fetchKey = `${query}|${testament}|${page}`;
    if (lastFetchKeyRef.current === fetchKey) return;
    lastFetchKeyRef.current = fetchKey;

    // Cancel any in-flight request
    if (activeAbortRef.current) activeAbortRef.current.abort();
    const controller = new AbortController();
    activeAbortRef.current = controller;

    if (isFirstPage) {
      setIsSearching(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        q: encodeURIComponent(query),
        limit: String(PAGE_LIMIT),
        page: String(page),
      });
      if (testament !== 'all') params.set('testament', testament);

      const response = await fetch(`/api/v1/bible/search?${params}`, { signal: controller.signal });
      const data = await response.json();

      if (data.success && data.data?.results) {
        const formatted: SearchResult[] = data.data.results.map((r: any) => ({
          book: r.book.name,
          chapter: r.chapter.number,
          verse: r.number,
          text: r.text,
          preview: r.text,
          versionAbbr: r.version?.abbreviation,
          versionName: r.version?.name,
          verseId: r.verseId,
        }));

        if (isFirstPage) {
          setSearchResults(formatted);
        } else {
          // Append and deduplicate
          setSearchResults(prev => {
            const existingKeys = new Set(prev.map(r => `${r.book}-${r.chapter}-${r.verse}`));
            const deduped = formatted.filter(r => !existingKeys.has(`${r.book}-${r.chapter}-${r.verse}`));
            return [...prev, ...deduped];
          });
        }

        setHasMore(data.data.hasMore ?? false);
      } else if (isFirstPage) {
        setSearchResults([]);
        setHasMore(false);
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      console.error('Search failed:', error);
      if (isFirstPage) {
        setSearchResults([]);
        setHasMore(false);
      }
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  };

  // Reset and search from page 1 whenever query or filter changes
  const resetAndSearch = (query: string, testament: TestamentFilter) => {
    setCurrentPage(1);
    setSearchResults([]);
    setHasMore(false);
    lastFetchKeyRef.current = '';
    if (query.trim().length >= 2) {
      performSearch(query, 1, testament, true);
    }
  };

  // Debounced search as user types
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim() && searchQuery.trim().length >= 2) {
      setShowSuggestions(true);
      searchTimeoutRef.current = setTimeout(() => {
        resetAndSearch(searchQuery, testamentFilter);
      }, 500);
    } else {
      setSearchResults([]);
      setHasMore(false);
      setShowSuggestions(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, testamentFilter]);

  // Load more handler
  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    performSearch(searchQuery, nextPage, testamentFilter, false);
  };

  // Add to search history
  const addToHistory = (query: string) => {
    if (!query.trim()) return;
    const newHistory = [query, ...searchHistory.filter(item => item !== query)].slice(0, MAX_HISTORY_ITEMS);
    setSearchHistory(newHistory);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
  };

  // Clear search history
  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  // Handle search submission
  const handleSearch = (query: string) => {
    if (!query.trim()) return;
    addToHistory(query);
    resetAndSearch(query, testamentFilter);
    setShowSuggestions(false);
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    onNavigateToVerse(result.book, result.chapter, result.verse, result.versionAbbr);
    onClose();
  };

  // Handle history item click
  const handleHistoryClick = (historyQuery: string) => {
    setSearchQuery(historyQuery);
    handleSearch(historyQuery);
  };

  // Highlight search terms in text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const terms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    const escapedTerms = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    let highlightedText = text;
    
    escapedTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, `<mark class="${isDark ? 'bg-yellow-500/30 text-yellow-300' : 'bg-yellow-200/80 text-black'} px-0.5 rounded-sm">$1</mark>`);
    });

    return highlightedText;
  };

  if (!isOpen) return null;

  // Premium Themes Styling Variables
  const theme = selectedTheme || (isDark ? 'dark' : 'light');
  
  const backdropBg = {
    light: 'rgba(0,0,0,0.3)',
    sepia: 'rgba(0,0,0,0.45)',
    cream: 'rgba(0,0,0,0.45)',
    dark: 'rgba(0,0,0,0.85)'
  }[theme];

  const backdropBlur = {
    light: 'blur(4px)',
    sepia: 'blur(4px)',
    cream: 'blur(4px)',
    dark: 'blur(8px)'
  }[theme];

  const modalBg = {
    light: 'rgba(255,255,255,0.85)',
    sepia: 'rgba(250,240,227,0.97)',
    cream: 'rgba(253, 246, 235, 0.97)',
    dark: 'rgba(28,28,30,0.95)'
  }[theme];

  const borderCol = {
    light: 'rgba(255,255,255,0.3)',
    sepia: 'rgba(92, 74, 58, 0.15)',
    cream: 'rgba(74, 63, 42, 0.15)',
    dark: 'rgba(255, 255, 255, 0.08)'
  }[theme];

  const innerBorderCol = {
    light: 'rgba(0,0,0,0.06)',
    sepia: 'rgba(92, 74, 58, 0.12)',
    cream: 'rgba(74, 63, 42, 0.12)',
    dark: 'rgba(255, 255, 255, 0.06)'
  }[theme];

  const textCol = {
    light: '#31393a',
    sepia: '#5c4a3a',
    cream: '#4a3f2a',
    dark: '#e5e7e7'
  }[theme];

  const subTextCol = {
    light: '#6b7280',
    sepia: '#7d6855',
    cream: '#6e5f46',
    dark: 'rgba(255,255,255,0.4)'
  }[theme];

  const hoverBg = {
    light: 'rgba(0,0,0,0.05)',
    sepia: 'rgba(92, 74, 58, 0.08)',
    cream: 'rgba(74, 63, 42, 0.08)',
    dark: 'rgba(255,255,255,0.08)'
  }[theme];

  const resultCardBorder = {
    light: 'rgba(0,0,0,0.06)',
    sepia: 'rgba(92, 74, 58, 0.1)',
    cream: 'rgba(74, 63, 42, 0.1)',
    dark: 'rgba(255,255,255,0.05)'
  }[theme];

  const chipBg = {
    light: '#f3f4f6',
    sepia: 'rgba(92,74,58,0.1)',
    cream: 'rgba(74,63,42,0.09)',
    dark: 'rgba(255,255,255,0.09)'
  }[theme];

  const chipBorder = {
    light: '#e5e7eb',
    sepia: 'rgba(92,74,58,0.2)',
    cream: 'rgba(74,63,42,0.2)',
    dark: 'rgba(255,255,255,0.12)'
  }[theme];

  const accent = '#E23744';
  const accentLight = 'rgba(226,55,68,0.12)';
  const showFilters = !!searchQuery && searchQuery.trim().length >= 2;

  return (
    <div
      className="fixed inset-0 z-[100] transition-all duration-300 flex items-start justify-center"
      style={{ backgroundColor: backdropBg, backdropFilter: backdropBlur }}
      onClick={onClose}
    >
      <div 
        className="absolute top-16 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 shadow-[0_8px_24px_0_rgba(0,0,0,0.15)] rounded-2xl sm:w-full sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col transition-all duration-300 border backdrop-blur-3xl backdrop-saturate-[180%]"
        style={{
          backgroundColor: modalBg,
          borderColor: borderCol,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with search input */}
        <div className="p-4 border-b" style={{ borderColor: innerBorderCol }}>
          <div className="flex items-center space-x-3">
            {isSearching
              ? <Loader2 className="size-5 flex-shrink-0 animate-spin" style={{ color: accent }} />
              : <FiSearch className="size-5 flex-shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af' }} />
            }
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(searchQuery);
                }
              }}
              placeholder="Search the Bible..."
              className="flex-1 bg-transparent outline-none transition-colors text-[16px] md:text-sm"
              style={{
                color: textCol,
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setHasMore(false);
                  setCurrentPage(1);
                  setShowSuggestions(false);
                  lastFetchKeyRef.current = '';
                  focusTarget(searchInputRef.current);
                }}
                className="p-1.5 rounded-full transition-colors"
                style={{ backgroundColor: hoverBg }}
                aria-label="Clear search"
              >
                <X className="size-4 text-gray-400" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full transition-colors"
              style={{ backgroundColor: hoverBg }}
            >
              <X className="size-5" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#6b7280' }} />
            </button>
          </div>
        </div>

        {/* Testament filter pills */}
        {showFilters && (
          <div
            className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto border-b"
            style={{ borderColor: innerBorderCol, scrollbarWidth: 'none' }}
          >
            {TESTAMENT_FILTERS.map(f => {
              const isActive = f.value === testamentFilter;
              return (
                <button
                  key={f.value}
                  onClick={() => {
                    if (f.value !== testamentFilter) {
                      setTestamentFilter(f.value);
                    }
                  }}
                  className="flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide transition-all duration-150 hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: isActive ? accent : chipBg,
                    color: isActive ? '#ffffff' : subTextCol,
                    border: `1.5px solid ${isActive ? accent : chipBorder}`,
                    boxShadow: isActive ? '0 1px 6px rgba(226,55,68,0.3)' : 'none',
                  }}
                  aria-pressed={isActive}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {/* Search history (shown when no search query) */}
          {!searchQuery && searchHistory.length > 0 && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold" style={{ color: subTextCol }}>Recent Searches</h3>
                <button
                  onClick={clearHistory}
                  className="text-xs font-bold hover:text-[#D42C3A] flex items-center space-x-1 transition-colors"
                  style={{ color: '#E23744' }}
                >
                  <Trash2 className="size-3.5" />
                  <span>Clear All</span>
                </button>
              </div>
              <div className="space-y-1">
                {searchHistory.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleHistoryClick(item)}
                    className="w-full flex items-center space-x-3 p-2.5 rounded-xl transition-all text-left border border-transparent"
                    style={{ color: textCol }}
                  >
                    <Clock className="size-4 flex-shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#9ca3af' }} />
                    <span className="flex-1 text-sm font-medium">{item}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search results */}
          {searchQuery && (
            <div className="p-4">
              {isSearching && (
                <div className="text-center py-8" style={{ color: subTextCol }}>
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#E23744]"></div>
                  <p className="mt-2 text-sm font-medium">Searching...</p>
                </div>
              )}

              {!isSearching && searchResults.length === 0 && (
                <div className="text-center py-10" style={{ color: subTextCol }}>
                  <FiSearch className="size-12 mx-auto mb-3" style={{ color: isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db' }} />
                  <p className="text-sm font-semibold">No results found for "{searchQuery}"</p>
                  <p className="text-xs mt-1">Try different keywords or phrasing</p>
                </div>
              )}

              {searchResults.length > 0 && (
                <>
                  <div className="mb-4 text-xs font-bold tracking-wider" style={{ color: subTextCol }}>
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}{hasMore ? '+' : ''}
                  </div>
                  <div className="space-y-3">
                    {searchResults.map((result, index) => (
                      <button
                        key={`${result.book}-${result.chapter}-${result.verse}-${index}`}
                        onClick={() => handleResultClick(result)}
                        className="w-full text-left p-3.5 rounded-xl transition-all border flex flex-col"
                        style={{
                          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                          borderColor: resultCardBorder,
                        }}
                      >
                        <div className="flex items-start space-x-3 w-full">
                          <BookOpen className="size-4.5 flex-shrink-0 mt-1" style={{ color: '#E23744' }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold mb-1 flex items-center justify-between" style={{ color: '#E23744' }}>
                              <span>{result.book} {result.chapter}:{result.verse}</span>
                              {result.versionAbbr && (
                                <span
                                  className="text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-widest font-bold"
                                  style={{
                                    backgroundColor: isDark ? '#2c2c2e' : '#f3f4f6',
                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
                                    color: textCol,
                                  }}
                                >
                                  {result.versionAbbr}
                                </span>
                              )}
                            </div>
                            <div 
                              className="text-sm leading-relaxed"
                              style={{ color: textCol }}
                              dangerouslySetInnerHTML={{ 
                                __html: highlightText(result.text, searchQuery) 
                              }}
                            />
                          </div>
                        </div>
                      </button>
                    ))}

                    {/* Load more button */}
                    {(hasMore || isLoadingMore) && (
                      <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="w-full flex items-center justify-center gap-2 py-3 mt-1 rounded-xl text-sm font-bold transition-all duration-150 border disabled:opacity-60"
                        style={{
                          borderColor: chipBorder,
                          color: accent,
                          backgroundColor: accentLight,
                        }}
                        aria-label="Load more results"
                      >
                        {isLoadingMore
                          ? <><Loader2 className="size-4 animate-spin" /> Loading…</>
                          : <><ChevronDown className="size-4" /> Load more</>
                        }
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Empty state (no search query and no history) */}
          {!searchQuery && searchHistory.length === 0 && (
            <div className="text-center py-16" style={{ color: subTextCol }}>
              <FiSearch className="size-16 mx-auto mb-4" style={{ color: isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db' }} />
              <p className="text-sm font-semibold">Search the entire Bible</p>
              <p className="text-xs mt-1">Start typing to search chapters, books, and verses</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
