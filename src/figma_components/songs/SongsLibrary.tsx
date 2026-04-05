import { useState } from 'react';
import { Search, SlidersHorizontal, Music, Heart, Clock, TrendingUp, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SongBookCard from './SongBookCard';
import FilterModal from './FilterModal';
import SongBookDetail from './SongBookDetail';
import SongDetail from './SongDetail';

export interface SongBook {
  id: string;
  title: string;
  subtitle?: string;
  language: string;
  type: 'hymnal' | 'chorus' | 'contemporary' | 'traditional' | 'album';
  coverImage: string;
  songCount: number;
  tags: string[];
  category: string;
  author?: string;
  publisher?: string;
  yearPublished?: number;
  rating?: number;
  popularity?: number;
  description?: string;
}

interface SongsLibraryProps {
  onBack?: () => void;
  isEmbedded?: boolean;
}

const mockSongBooks: SongBook[] = [
  {
    id: 'classic-hymns',
    title: 'Classic Hymns',
    subtitle: 'Traditional English Worship',
    language: 'English',
    type: 'hymnal',
    coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    songCount: 450,
    tags: ['Traditional', 'Classic', 'Worship'],
    category: 'Hymns',
    publisher: 'Christian Hymns Publishing',
    yearPublished: 1950,
    rating: 4.8,
    popularity: 95,
    description: 'A comprehensive collection of timeless Christian hymns'
  },
  {
    id: 'andhra-keerthanalu',
    title: 'ఆంధ్ర క్రైస్తవ కీర్తనలు',
    subtitle: 'Andhra Kristhava Keerthanalu',
    language: 'Telugu',
    type: 'hymnal',
    coverImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400',
    songCount: 680,
    tags: ['Traditional', 'Telugu', 'Classic'],
    category: 'Hymns',
    author: 'Various Telugu Authors',
    yearPublished: 1952,
    rating: 4.9,
    popularity: 98,
    description: 'Complete collection of Andhra Christian songs'
  },
  {
    id: 'seyonu-geethalu',
    title: 'సేయోను గీతాలు',
    subtitle: 'Seyonu Geethalu',
    language: 'Telugu',
    type: 'traditional',
    coverImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400',
    songCount: 320,
    tags: ['Worship', 'Telugu', 'Devotional'],
    category: 'Traditional',
    yearPublished: 1965,
    rating: 4.7,
    popularity: 87,
    description: 'Traditional Telugu worship songs'
  },
  {
    id: 'tamil-hymns',
    title: 'தமிழ் கீர்த்தனைகள்',
    subtitle: 'Tamil Christian Keerthanai',
    language: 'Tamil',
    type: 'hymnal',
    coverImage: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400',
    songCount: 420,
    tags: ['Traditional', 'Tamil', 'Hymns'],
    category: 'Hymns',
    publisher: 'Tamil Christian Literature Society',
    yearPublished: 1958,
    rating: 4.8,
    popularity: 92,
    description: 'Complete Tamil Christian hymnal'
  },
  {
    id: 'hindi-bhajans',
    title: 'हिन्दी भजन संग्रह',
    subtitle: 'Hindi Christian Bhajan',
    language: 'Hindi',
    type: 'contemporary',
    coverImage: 'https://images.unsplash.com/photo-1516534775068-ba3e7458af70?w=400',
    songCount: 280,
    tags: ['Contemporary', 'Hindi', 'Worship'],
    category: 'Contemporary',
    yearPublished: 1985,
    rating: 4.6,
    popularity: 84,
    description: 'Modern Hindi worship songs'
  },
  {
    id: 'contemporary-worship',
    title: 'Contemporary Worship',
    subtitle: 'Modern English Praise',
    language: 'English',
    type: 'contemporary',
    coverImage: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400',
    songCount: 350,
    tags: ['Contemporary', 'Worship', 'Modern'],
    category: 'Contemporary',
    yearPublished: 2010,
    rating: 4.9,
    popularity: 96,
    description: 'Latest contemporary worship songs'
  }
];

type ViewMode = 'library' | 'bookDetail' | 'songDetail';

export default function SongsLibrary({ onBack, isEmbedded }: SongsLibraryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('library');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('all');
  
  const [filters, setFilters] = useState({
    languages: [] as string[],
    categories: [] as string[],
    types: [] as string[],
    tags: [] as string[],
    sortBy: 'popularity' as 'popularity' | 'title' | 'recent' | 'rating' | 'songCount'
  });

  const handleOpenBook = (bookId: string) => {
    setSelectedBookId(bookId);
    setViewMode('bookDetail');
  };

  const handleOpenSong = (songId: string) => {
    setSelectedSongId(songId);
    setViewMode('songDetail');
  };

  const handleBack = () => {
    if (viewMode === 'songDetail') {
      setViewMode('bookDetail');
      setSelectedSongId(null);
    } else if (viewMode === 'bookDetail') {
      setViewMode('library');
      setSelectedBookId(null);
    } else {
      onBack && onBack();
    }
  };

  const applyFilters = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setShowFilters(false);
  };

  // Filter and sort books
  const filteredBooks = mockSongBooks.filter(book => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        book.title.toLowerCase().includes(query) ||
        book.subtitle?.toLowerCase().includes(query) ||
        book.tags.some(tag => tag.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    // Language filter
    if (filters.languages.length > 0 && !filters.languages.includes(book.language)) {
      return false;
    }

    // Category filter
    if (filters.categories.length > 0 && !filters.categories.includes(book.category)) {
      return false;
    }

    // Type filter
    if (filters.types.length > 0 && !filters.types.includes(book.type)) {
      return false;
    }

    // Tags filter
    if (filters.tags.length > 0 && !filters.tags.some(tag => book.tags.includes(tag))) {
      return false;
    }

    // Quick filters
    if (activeQuickFilter === 'favorites') {
      // Would check if book is favorited
      return true;
    }
    if (activeQuickFilter === 'recent') {
      // Would check recent books
      return true;
    }

    return true;
  }).sort((a, b) => {
    switch (filters.sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'songCount':
        return b.songCount - a.songCount;
      case 'popularity':
      default:
        return (b.popularity || 0) - (a.popularity || 0);
    }
  });

  // Show different views based on mode
  if (viewMode === 'bookDetail' && selectedBookId) {
    return (
      <SongBookDetail
        bookId={selectedBookId}
        onBack={handleBack}
        onSelectSong={handleOpenSong}
      />
    );
  }

  if (viewMode === 'songDetail' && selectedSongId) {
    return (
      <SongDetail
        songId={selectedSongId}
        bookId={selectedBookId || ''}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e6f0f1] pb-24">
      {/* Header with Search and Filter */}
      <div className="glass-light border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Songs</h1>
              <p className="text-sm text-[var(--color-text-secondary)]">Worship & Hymns Collection</p>
            </div>
            <button
              onClick={handleBack}
              className="p-2 rounded-full hover:bg-gray-100/50 transition-colors"
            >
              <Music className="size-5 text-[var(--color-gray-900)]" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[var(--color-text-tertiary)]" />
              <input
                type="text"
                placeholder="Search song books, albums, songs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-teal)] focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(true)}
              className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              <SlidersHorizontal className="size-5 text-[var(--color-gray-900)]" />
            </button>
            {(filters.languages.length + filters.categories.length + filters.types.length + filters.tags.length > 0) && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-[var(--color-primary-teal)] text-white text-xs rounded-full flex items-center justify-center font-semibold">
                {filters.languages.length + filters.categories.length + filters.types.length + filters.tags.length}
              </span>
            )}
          </div>

          {/* Quick Filters - Match Library Design */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
            <button
              onClick={() => setActiveQuickFilter('all')}
              className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                activeQuickFilter === 'all'
                  ? 'bg-[var(--color-primary-teal)] text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveQuickFilter('favorites')}
              className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                activeQuickFilter === 'favorites'
                  ? 'bg-[var(--color-primary-teal)] text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Favorites
            </button>
            <button
              onClick={() => setActiveQuickFilter('recent')}
              className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                activeQuickFilter === 'recent'
                  ? 'bg-[var(--color-primary-teal)] text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => {
                setFilters(prev => ({ ...prev, sortBy: 'popularity' }));
                setActiveQuickFilter('popular');
              }}
              className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                activeQuickFilter === 'popular'
                  ? 'bg-[var(--color-primary-teal)] text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Popular
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Active Filters Display */}
        {(filters.languages.length + filters.categories.length + filters.types.length + filters.tags.length > 0) && (
          <div className="mb-6 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-[var(--color-text-secondary)]">Active filters:</span>
            {filters.languages.map(lang => (
              <span key={lang} className="px-3 py-1 rounded-full bg-[var(--color-primary-teal)]/10 text-sm text-[var(--color-primary-teal)] flex items-center gap-1.5">
                <Globe className="size-3.5" />
                {lang}
              </span>
            ))}
            {filters.categories.map(cat => (
              <span key={cat} className="px-3 py-1 rounded-full bg-[var(--color-accent-rose)]/10 text-sm text-[var(--color-accent-rose)]">
                {cat}
              </span>
            ))}
            {filters.types.map(type => (
              <span key={type} className="px-3 py-1 rounded-full bg-purple-100 text-sm text-purple-700">
                {type}
              </span>
            ))}
            {filters.tags.map(tag => (
              <span key={tag} className="px-3 py-1 rounded-full bg-gray-100 text-sm text-[var(--color-text-secondary)]">
                {tag}
              </span>
            ))}
            <button
              onClick={() => setFilters({
                languages: [],
                categories: [],
                types: [],
                tags: [],
                sortBy: 'popularity'
              })}
              className="text-sm text-[#E23744] font-medium hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Results Count */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {filteredBooks.length} {filteredBooks.length === 1 ? 'Book' : 'Books'}
          </h2>
        </div>

        {/* Books Grid */}
        {filteredBooks.length === 0 ? (
          <div className="text-center py-16">
            <Music className="size-16 text-[var(--color-text-tertiary)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              No books found
            </h3>
            <p className="text-[var(--color-text-secondary)] mb-4">
              Try adjusting your filters or search query
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilters({
                  languages: [],
                  categories: [],
                  types: [],
                  tags: [],
                  sortBy: 'popularity'
                });
                setActiveQuickFilter('all');
              }}
              className="px-6 py-2 bg-[var(--color-primary-teal)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredBooks.map((book) => (
              <SongBookCard
                key={book.id}
                book={book}
                onClick={() => handleOpenBook(book.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Filter Modal */}
      <AnimatePresence>
        {showFilters && (
          <FilterModal
            currentFilters={filters}
            availableBooks={mockSongBooks}
            onClose={() => setShowFilters(false)}
            onApply={applyFilters}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
