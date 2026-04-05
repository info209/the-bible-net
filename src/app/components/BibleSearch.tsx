import { useState, useEffect, useRef } from 'react';
import { FiSearch } from 'react-icons/fi';
import { X, Clock, Trash2, BookOpen } from 'lucide-react';
import { mockBibleContent } from './ChapterContent';
import { teluguBible, hindiBible } from './BibleData';

interface SearchResult {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  preview: string;
}

interface BibleSearchProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVersion: string;
  onNavigateToVerse: (book: string, chapter: number, verse: number) => void;
}

const SEARCH_HISTORY_KEY = 'bible_search_history';
const MAX_HISTORY_ITEMS = 10;

export default function BibleSearch({ isOpen, onClose, selectedVersion, onNavigateToVerse }: BibleSearchProps) {
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

  // Get Bible content based on version
  const getBibleContent = () => {
    if (selectedVersion === 'TELBSI') {
      return teluguBible as any;
    } else if (selectedVersion === 'HINBSI') {
      return hindiBible as any;
    }
    return mockBibleContent;
  };

  // Search function
  const performSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const results: SearchResult[] = [];
    const bibleData = getBibleContent();
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);

    // Search through all books and chapters
    Object.keys(bibleData).forEach((book) => {
      Object.keys(bibleData[book]).forEach((chapterNum) => {
        const chapter = bibleData[book][chapterNum];
        if (chapter && chapter.verses) {
          chapter.verses.forEach((verse: any) => {
            const verseText = verse.text.toLowerCase();
            
            // Check if all search terms are present in the verse
            const allTermsFound = searchTerms.every(term => verseText.includes(term));
            
            if (allTermsFound) {
              // Create a preview with highlighted search terms
              let preview = verse.text;
              if (preview.length > 150) {
                // Find the position of the first search term
                const firstTermIndex = verseText.indexOf(searchTerms[0]);
                const start = Math.max(0, firstTermIndex - 50);
                const end = Math.min(verse.text.length, firstTermIndex + 100);
                preview = (start > 0 ? '...' : '') + verse.text.slice(start, end) + (end < verse.text.length ? '...' : '');
              }

              results.push({
                book,
                chapter: parseInt(chapterNum),
                verse: verse.number,
                text: verse.text,
                preview
              });
            }
          });
        }
      });
    });

    setSearchResults(results);
    setIsSearching(false);
  };

  // Debounced search as user types
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim()) {
      setShowSuggestions(true);
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 300); // 300ms debounce
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selectedVersion]);

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
    onNavigateToVerse(result.book, result.chapter, result.verse);
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
    let highlightedText = text;
    
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 text-[#31393a]">$1</mark>');
    });

    return highlightedText;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/20" onClick={onClose}>
      <div 
        className="absolute top-16 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 bg-white/85 backdrop-blur-3xl backdrop-saturate-[180%] border border-white/30 shadow-[0_8px_24px_0_rgba(0,0,0,0.15)] rounded-2xl sm:w-full sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with search input */}
        <div className="p-4 border-b border-gray-200/50">
          <div className="flex items-center space-x-3">
            <FiSearch className="size-5 text-gray-400 flex-shrink-0" />
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
              className="flex-1 bg-transparent outline-none text-[#31393a] placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSuggestions(false);
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="size-4 text-gray-400" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="size-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {/* Search history (shown when no search query) */}
          {!searchQuery && searchHistory.length > 0 && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-500">Recent Searches</h3>
                <button
                  onClick={clearHistory}
                  className="text-xs text-[#E23744] hover:text-[#D42C3A] flex items-center space-x-1"
                >
                  <Trash2 className="size-3" />
                  <span>Clear All</span>
                </button>
              </div>
              <div className="space-y-2">
                {searchHistory.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleHistoryClick(item)}
                    className="w-full flex items-center space-x-3 p-2 hover:bg-gray-100/70 rounded-lg transition-colors text-left"
                  >
                    <Clock className="size-4 text-gray-400 flex-shrink-0" />
                    <span className="text-[#31393a] flex-1">{item}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search results */}
          {searchQuery && (
            <div className="p-4">
              {isSearching && (
                <div className="text-center py-8 text-gray-500">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#E23744]"></div>
                  <p className="mt-2 text-sm">Searching...</p>
                </div>
              )}

              {!isSearching && searchResults.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FiSearch className="size-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No results found for "{searchQuery}"</p>
                  <p className="text-xs mt-1 text-gray-400">Try different keywords</p>
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <>
                  <div className="mb-4 text-sm text-gray-600">
                    Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                  </div>
                  <div className="space-y-3">
                    {searchResults.slice(0, 50).map((result, index) => (
                      <button
                        key={`${result.book}-${result.chapter}-${result.verse}-${index}`}
                        onClick={() => handleResultClick(result)}
                        className="w-full text-left p-3 hover:bg-gray-100/70 rounded-lg transition-colors border border-gray-200/50"
                      >
                        <div className="flex items-start space-x-3">
                          <BookOpen className="size-5 text-[#E23744] flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[#E23744] mb-1">
                              {result.book} {result.chapter}:{result.verse}
                            </div>
                            <div 
                              className="text-sm text-[#31393a] leading-relaxed"
                              dangerouslySetInnerHTML={{ 
                                __html: highlightText(result.preview, searchQuery) 
                              }}
                            />
                          </div>
                        </div>
                      </button>
                    ))}
                    {searchResults.length > 50 && (
                      <div className="text-center py-2 text-sm text-gray-500">
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
            <div className="text-center py-12 text-gray-400">
              <FiSearch className="size-16 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">Search the entire Bible</p>
              <p className="text-xs mt-1">Type to start searching</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
