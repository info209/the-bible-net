import { useState, useEffect, useRef } from 'react';
import { FiSearch } from 'react-icons/fi';
import { X, Clock, Trash2, BookOpen } from 'lucide-react';

interface SearchResult {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  preview: string;
  versionAbbr?: string;
  versionName?: string;
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Search function using Server API
  const performSearch = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/v1/bible/search?q=${encodeURIComponent(query)}&limit=50`);
      const data = await response.json();

      if (data.success && data.data.results) {
        const formattedResults: SearchResult[] = data.data.results.map((r: any) => ({
          book: r.book.name,
          chapter: r.chapter.number,
          verse: r.number,
          text: r.text,
          preview: r.text,
          versionAbbr: r.version?.abbreviation,
          versionName: r.version?.name
        }));
        setSearchResults(formattedResults);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
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
        performSearch(searchQuery);
      }, 500);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

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
    performSearch(query);
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

  const resultCardHover = {
    light: 'rgba(0,0,0,0.02)',
    sepia: 'rgba(92, 74, 58, 0.04)',
    cream: 'rgba(74, 63, 42, 0.04)',
    dark: 'rgba(255,255,255,0.04)'
  }[theme];

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
            <FiSearch className="size-5 flex-shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af' }} />
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
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSuggestions(false);
                }}
                className="p-1.5 rounded-full transition-colors"
                style={{ backgroundColor: hoverBg }}
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
                    style={{
                      hoverBg: hoverBg,
                      color: textCol
                    } as any}
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

              {!isSearching && searchResults.length > 0 && (
                <>
                  <div className="mb-4 text-xs font-bold uppercase tracking-wider" style={{ color: subTextCol }}>
                    Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                  </div>
                  <div className="space-y-3">
                    {searchResults.slice(0, 50).map((result, index) => (
                      <button
                        key={`${result.book}-${result.chapter}-${result.verse}-${index}`}
                        onClick={() => handleResultClick(result)}
                        className="w-full text-left p-3.5 rounded-xl transition-all border flex flex-col"
                        style={{
                          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                          borderColor: resultCardBorder,
                          hoverBg: resultCardHover
                        } as any}
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
                    {searchResults.length > 50 && (
                      <div className="text-center py-4 text-xs font-semibold" style={{ color: subTextCol }}>
                        Showing first 50 results
                      </div>
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
