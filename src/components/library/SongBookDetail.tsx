'use client';

import { useState } from 'react';
import { ChevronLeft, Search, Heart, Share2, Download, Music2, SortAsc, Play, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

interface Song {
  id: string;
  number: number;
  title: string;
  subtitle?: string;
  author?: string;
  composer?: string;
  tags: string[];
  isFavorite: boolean;
  youtubeUrl?: string;
  spotifyUrl?: string;
  hasLyrics: boolean;
}

interface SongBookDetailProps {
  bookId: string;
  onBack: () => void;
  onSelectSong: (songId: string) => void;
}

// Mock data - replace with actual data fetching
const mockBook = {
  id: 'classic-hymns',
  title: 'Classic Hymns',
  subtitle: 'Traditional English Worship',
  language: 'English',
  coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
  songCount: 450,
  description: 'A comprehensive collection of timeless Christian hymns that have blessed generations',
  publisher: 'Christian Hymns Publishing',
  yearPublished: 1950,
  rating: 4.8
};

const mockSongs: Song[] = [
  {
    id: '1',
    number: 1,
    title: 'Amazing Grace',
    subtitle: 'How Sweet the Sound',
    author: 'John Newton',
    composer: 'William Walker',
    tags: ['Hymn', 'Classic', 'Salvation'],
    isFavorite: true,
    youtubeUrl: 'https://youtube.com/watch?v=example',
    hasLyrics: true
  },
  {
    id: '2',
    number: 2,
    title: 'How Great Thou Art',
    author: 'Stuart K. Hine',
    composer: 'Swedish Folk Melody',
    tags: ['Hymn', 'Worship', 'Creation'],
    isFavorite: false,
    hasLyrics: true
  },
  {
    id: '3',
    number: 3,
    title: 'Blessed Assurance',
    author: 'Fanny Crosby',
    composer: 'Phoebe Knapp',
    tags: ['Hymn', 'Classic', 'Assurance'],
    isFavorite: false,
    hasLyrics: true
  },
  {
    id: '4',
    number: 10,
    title: 'Holy, Holy, Holy',
    subtitle: 'Lord God Almighty',
    author: 'Reginald Heber',
    composer: 'John B. Dykes',
    tags: ['Hymn', 'Worship', 'Trinity'],
    isFavorite: true,
    youtubeUrl: 'https://youtube.com/watch?v=example',
    hasLyrics: true
  },
  {
    id: '5',
    number: 15,
    title: 'Great Is Thy Faithfulness',
    author: 'Thomas Chisholm',
    composer: 'William Runyan',
    tags: ['Hymn', 'Classic', 'Faithfulness'],
    isFavorite: false,
    hasLyrics: true
  },
];

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function SongBookDetail({ bookId, onBack, onSelectSong }: SongBookDetailProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'number' | 'title'>('number');
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites'>('all');

  const filteredSongs = mockSongs
    .filter(song => {
      const matchesSearch = searchQuery === '' || 
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.author?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFavorite = activeFilter === 'all' || song.isFavorite;
      return matchesSearch && matchesFavorite;
    })
    .sort((a, b) => {
      if (sortBy === 'number') return a.number - b.number;
      return a.title.localeCompare(b.title);
    });

  // Group songs by first letter when sorting by title
  const groupedSongs: { [key: string]: Song[] } = {};
  if (sortBy === 'title') {
    filteredSongs.forEach(song => {
      const firstLetter = song.title[0].toUpperCase();
      if (!groupedSongs[firstLetter]) {
        groupedSongs[firstLetter] = [];
      }
      groupedSongs[firstLetter].push(song);
    });
  }

  const handleLetterClick = (letter: string) => {
    const element = document.getElementById(`letter-${letter}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e6f0f1] pb-24">
      {/* Header */}
      <div className="glass-light border-b border-white/20 sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={onBack}
              className="p-2 rounded-full hover:bg-gray-100/50 transition-colors"
            >
              <ChevronLeft className="size-5 text-[var(--color-gray-900)]" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-[var(--color-text-primary)] truncate">{mockBook.title}</h1>
              <p className="text-sm text-[var(--color-text-secondary)]">{mockBook.subtitle} • {mockBook.songCount} songs</p>
            </div>
            <button className="p-2 rounded-full hover:bg-gray-100/50 transition-colors">
              <Share2 className="size-5 text-[var(--color-gray-900)]" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              placeholder="Search songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-teal)] focus:border-transparent"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeFilter === 'all'
                    ? 'bg-[var(--color-primary-teal)] text-white'
                    : 'bg-white text-[var(--color-text-secondary)] hover:bg-gray-50'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter('favorites')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeFilter === 'favorites'
                    ? 'bg-[#E23744] text-white'
                    : 'bg-white text-[var(--color-text-secondary)] hover:bg-gray-50'
                }`}
              >
                <Heart className="size-3.5" />
                Favorites
              </button>
            </div>

            <button
              onClick={() => setSortBy(sortBy === 'number' ? 'title' : 'number')}
              className="px-4 py-1.5 rounded-full text-sm font-medium bg-white text-[var(--color-text-secondary)] hover:bg-gray-50 transition-all flex items-center gap-1.5"
            >
              <SortAsc className="size-3.5" />
              {sortBy === 'number' ? '#' : 'A-Z'}
            </button>
          </div>
        </div>
      </div>

      {/* Book Info Banner */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden mb-6">
          <div className="flex gap-4 p-4">
            <img 
              src={mockBook.coverImage} 
              alt={mockBook.title}
              className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-md bg-[var(--color-primary-teal)]/10 text-xs font-semibold text-[var(--color-primary-teal)] flex items-center gap-1">
                  <Globe className="size-3" />
                  {mockBook.language}
                </span>
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {mockBook.yearPublished}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-3">
                {mockBook.description}
              </p>
              <button className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                <Download className="size-4 text-[var(--color-gray-900)]" />
              </button>
            </div>
          </div>
        </div>

        {/* Songs List */}
        <div className="relative">
          {/* Letter Navigation for Alphabetical Sort */}
          {sortBy === 'title' && (
            <div className="fixed right-4 top-1/2 -translate-y-1/2 z-30 hidden sm:flex flex-col gap-0.5 p-2 rounded-full glass-light backdrop-blur-md shadow-[var(--shadow-md)]">
              {alphabet.map((letter) => {
                const hasLetter = groupedSongs[letter]?.length > 0;
                return (
                  <button
                    key={letter}
                    onClick={() => hasLetter && handleLetterClick(letter)}
                    disabled={!hasLetter}
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold transition-all ${
                      hasLetter
                        ? 'text-[var(--color-primary-teal)] hover:bg-[var(--color-primary-teal)]/10 cursor-pointer'
                        : 'text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          )}

          {sortBy === 'number' ? (
            /* Number-based list */
            <div className="space-y-2">
              {filteredSongs.map((song) => (
                <motion.button
                  key={song.id}
                  onClick={() => onSelectSong(song.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-white hover:bg-gray-50 shadow-[var(--shadow-xs)] transition-all group text-left"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Song Number Icon */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary-teal)] to-[var(--color-primary-teal-dark)] flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">{song.number}</span>
                  </div>

                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary-teal)] transition-colors truncate">
                      {song.title}
                    </h3>
                    {song.subtitle && (
                      <p className="text-sm text-[var(--color-text-secondary)] truncate">{song.subtitle}</p>
                    )}
                    {song.author && (
                      <p className="text-xs text-[var(--color-text-tertiary)] truncate mt-0.5">
                        {song.author}
                      </p>
                    )}
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {song.youtubeUrl && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                          YouTube
                        </span>
                      )}
                      {song.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-[var(--color-text-secondary)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Favorite Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle favorite toggle
                    }}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <Heart 
                      className={`size-5 ${song.isFavorite ? 'fill-[#E23744] text-[#E23744]' : 'text-gray-400'}`}
                    />
                  </button>
                </motion.button>
              ))}
            </div>
          ) : (
            /* Alphabetical grouped list */
            <div className="space-y-6">
              {Object.keys(groupedSongs).sort().map((letter) => (
                <div key={letter} id={`letter-${letter}`}>
                  <h2 className="text-2xl font-bold text-[var(--color-primary-teal)] mb-3 sticky top-32 bg-gradient-to-br from-[#f8f9fa] to-[#e6f0f1] py-2">
                    {letter}
                  </h2>
                  <div className="space-y-2">
                    {groupedSongs[letter].map((song) => (
                      <motion.button
                        key={song.id}
                        onClick={() => onSelectSong(song.id)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-white hover:bg-gray-50 shadow-[var(--shadow-xs)] transition-all group text-left"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary-teal)] to-[var(--color-primary-teal-dark)] flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold">{song.number}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary-teal)] transition-colors truncate">
                            {song.title}
                          </h3>
                          {song.subtitle && (
                            <p className="text-sm text-[var(--color-text-secondary)] truncate">{song.subtitle}</p>
                          )}
                          {song.author && (
                            <p className="text-xs text-[var(--color-text-tertiary)] truncate mt-0.5">
                              {song.author}
                            </p>
                          )}
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            {song.youtubeUrl && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                                YouTube
                              </span>
                            )}
                            {song.tags.slice(0, 2).map((tag) => (
                              <span key={tag} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-[var(--color-text-secondary)]">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                          <Heart 
                            className={`size-5 ${song.isFavorite ? 'fill-[#E23744] text-[#E23744]' : 'text-gray-400'}`}
                          />
                        </button>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredSongs.length === 0 && (
            <div className="text-center py-12">
              <Music2 className="size-12 text-[var(--color-text-tertiary)] mx-auto mb-3" />
              <p className="text-[var(--color-text-secondary)]">No songs found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
