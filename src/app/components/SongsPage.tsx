import { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Music, 
  Star, 
  MoreVertical,
  Download,
  Share2,
  Copy,
  ChevronDown,
  X,
  Printer,
  Info,
  Heart
} from 'lucide-react';
import { songsDatabase, Song, getGroupedSongs, getAlphabets, searchSongs } from './SongsData';
import { toast } from '@/context/ToastContext';

interface SongsPageProps {
  onBack: () => void;
}

export default function SongsPage({ onBack }: SongsPageProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [fontSize, setFontSize] = useState(16); // Default font size
  const [activeTab, setActiveTab] = useState<'lyrics' | 'chords' | 'info'>('lyrics');
  const [showActionMenu, setShowActionMenu] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const languages = ['All', 'English', 'Telugu', 'Hindi', 'Tamil'];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLanguageDropdown(false);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setShowActionMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Get songs based on search or language filter
  const getDisplaySongs = () => {
    if (searchQuery.trim()) {
      return searchSongs(searchQuery, selectedLanguage);
    }
    return getGroupedSongs(selectedLanguage);
  };

  const displaySongs = getDisplaySongs();
  const alphabets = getAlphabets(selectedLanguage);

  const toggleFavorite = (songId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(songId)) {
        newFavorites.delete(songId);
        toast.success('Removed from favorites');
      } else {
        newFavorites.add(songId);
        toast.success('Added to favorites');
      }
      return newFavorites;
    });
  };

  const handleShare = async (song: Song) => {
    const shareText = `${song.title}\nBy ${song.author}\n\n${song.lyrics.map(l => `${l.section}:\n${l.text}`).join('\n\n')}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: song.title,
          text: shareText
        });
        toast.success('Song shared successfully');
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareText);
      toast.success('Song copied to clipboard');
    }
    setShowActionMenu(false);
  };

  const handleCopy = async (song: Song) => {
    const copyText = `${song.title}\nBy ${song.author}\n\n${song.lyrics.map(l => `${l.section}:\n${l.text}`).join('\n\n')}`;
    await navigator.clipboard.writeText(copyText);
    toast.success('Lyrics copied to clipboard');
    setShowActionMenu(false);
  };

  const handleDownload = (song: Song) => {
    const content = `${song.title}\nBy ${song.author}\n${song.album ? `Album: ${song.album}\n` : ''}${song.year ? `Year: ${song.year}\n` : ''}\n\n${song.lyrics.map(l => `${l.section}:\n${l.text}`).join('\n\n')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${song.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Song downloaded');
    setShowActionMenu(false);
  };

  const handlePrint = () => {
    window.print();
    toast.success('Opening print dialog...');
    setShowActionMenu(false);
  };

  // Scroll to alphabet section
  const scrollToAlphabet = (letter: string) => {
    const element = document.getElementById(`letter-${letter}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // If a song is selected, show song detail view
  if (selectedSong) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSelectedSong(null)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="size-5 text-gray-700" />
            </button>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleFavorite(selectedSong.id)}
                className={`p-2 rounded-full transition-colors ${
                  favorites.has(selectedSong.id)
                    ? 'text-[var(--color-accent-rose)] bg-rose-50'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
              >
                {favorites.has(selectedSong.id) ? (
                  <Heart className="size-5 fill-current" />
                ) : (
                  <Heart className="size-5" />
                )}
              </button>
              
              <div className="relative" ref={actionMenuRef}>
                <button
                  onClick={() => setShowActionMenu(!showActionMenu)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <MoreVertical className="size-5 text-gray-700" />
                </button>
                
                {showActionMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20">
                    <button
                      onClick={() => handleShare(selectedSong)}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                    >
                      <Share2 className="size-4" />
                      <span>Share Song</span>
                    </button>
                    <button
                      onClick={() => handleCopy(selectedSong)}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                    >
                      <Copy className="size-4" />
                      <span>Copy Lyrics</span>
                    </button>
                    <button
                      onClick={() => handleDownload(selectedSong)}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                    >
                      <Download className="size-4" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={handlePrint}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                    >
                      <Printer className="size-4" />
                      <span>Print</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Song Info */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-[var(--color-primary-teal)]/5 to-[var(--color-primary-teal-light)]/5">
          <div className="flex items-start gap-4">
            <div className="p-4 bg-gradient-to-br from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] rounded-2xl shadow-lg">
              <Music className="size-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedSong.title}</h1>
              <p className="text-gray-600 mb-1">{selectedSong.author}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-[var(--color-primary-teal)] border border-[var(--color-primary-teal)]/20">
                  {selectedSong.language}
                </span>
                {selectedSong.year && (
                  <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-600 border border-gray-200">
                    {selectedSong.year}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-4 bg-white sticky top-[73px] z-10">
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'lyrics'
                ? 'text-[var(--color-primary-teal)]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Lyrics
            {activeTab === 'lyrics' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary-teal)]" />
            )}
          </button>
          {selectedSong.chords && selectedSong.chords.length > 0 && (
            <button
              onClick={() => setActiveTab('chords')}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === 'chords'
                  ? 'text-[var(--color-primary-teal)]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Chords
              {activeTab === 'chords' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary-teal)]" />
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab('info')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'info'
                ? 'text-[var(--color-primary-teal)]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Info
            {activeTab === 'info' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary-teal)]" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-w-3xl mx-auto">
          {activeTab === 'lyrics' && (
            <div className="space-y-8">
              {selectedSong.lyrics.map((lyric, index) => (
                <div key={index} className="space-y-3">
                  <h3 className="text-sm font-bold text-[var(--color-primary-teal)] uppercase tracking-wide">
                    {lyric.section}
                  </h3>
                  <p 
                    className="text-gray-700 whitespace-pre-line leading-relaxed"
                    style={{ fontSize: `${fontSize}px`, lineHeight: '1.8' }}
                  >
                    {lyric.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'chords' && selectedSong.chords && (
            <div className="space-y-8">
              {selectedSong.chords.map((chord, index) => (
                <div key={index} className="space-y-3">
                  <h3 className="text-sm font-bold text-[var(--color-primary-teal)] uppercase tracking-wide">
                    {chord.section}
                  </h3>
                  <p 
                    className="font-mono text-gray-700 whitespace-pre-line leading-relaxed bg-gray-50 p-4 rounded-lg"
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    {chord.chords}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <InfoRow label="Title" value={selectedSong.title} />
                <InfoRow label="Author" value={selectedSong.author} />
                {selectedSong.album && <InfoRow label="Album" value={selectedSong.album} />}
                {selectedSong.year && <InfoRow label="Year" value={selectedSong.year.toString()} />}
                <InfoRow label="Language" value={selectedSong.language} />
                <InfoRow label="Categories" value={selectedSong.category.join(', ')} />
              </div>

              {(selectedSong.metadata.composer || 
                selectedSong.metadata.key || 
                selectedSong.metadata.tempo ||
                selectedSong.metadata.timeSignature ||
                selectedSong.metadata.copyright) && (
                <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                  <h3 className="font-bold text-gray-900 mb-4">Musical Details</h3>
                  {selectedSong.metadata.composer && (
                    <InfoRow label="Composer" value={selectedSong.metadata.composer} />
                  )}
                  {selectedSong.metadata.key && (
                    <InfoRow label="Key" value={selectedSong.metadata.key} />
                  )}
                  {selectedSong.metadata.tempo && (
                    <InfoRow label="Tempo" value={selectedSong.metadata.tempo} />
                  )}
                  {selectedSong.metadata.timeSignature && (
                    <InfoRow label="Time Signature" value={selectedSong.metadata.timeSignature} />
                  )}
                  {selectedSong.metadata.copyright && (
                    <InfoRow label="Copyright" value={selectedSong.metadata.copyright} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Font Size Controls - Fixed at bottom */}
        {activeTab === 'lyrics' && (
          <div className="fixed bottom-6 right-6 bg-white rounded-full shadow-xl border border-gray-200 px-4 py-2 flex items-center gap-3">
            <button
              onClick={() => setFontSize(prev => Math.max(12, prev - 2))}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={fontSize <= 12}
            >
              <span className="text-sm font-bold text-gray-600">A-</span>
            </button>
            <span className="text-sm text-gray-500 font-medium">{fontSize}px</span>
            <button
              onClick={() => setFontSize(prev => Math.min(24, prev + 2))}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={fontSize >= 24}
            >
              <span className="text-lg font-bold text-gray-600">A+</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Main songs list view
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="size-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Songs</h1>
              <p className="text-xs text-gray-500">Worship & Hymns</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Search className="size-5 text-gray-700" />
          </button>
        </div>

        {/* Search Bar - Collapsible */}
        {showSearch && (
          <div className="px-4 pb-4 animate-in slide-in-from-top-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search songs, lyrics, or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-teal)] text-gray-900 placeholder-gray-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="size-4 text-gray-500" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Controls Row */}
        <div className="flex items-center gap-3 px-4 pb-3">
          {/* Language Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-sm font-medium text-gray-700"
            >
              <span>🌐</span>
              <span>{selectedLanguage}</span>
              <ChevronDown className="size-4" />
            </button>

            {showLanguageDropdown && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20">
                {languages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setSelectedLanguage(lang);
                      setShowLanguageDropdown(false);
                      setSearchQuery('');
                    }}
                    className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 ${
                      selectedLanguage === lang
                        ? 'text-[var(--color-primary-teal)] bg-[var(--color-primary-teal)]/5'
                        : 'text-gray-700'
                    }`}
                  >
                    <span>🌐</span>
                    <span>{lang}</span>
                    {selectedLanguage === lang && (
                      <span className="ml-auto text-[var(--color-primary-teal)]">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Song count */}
          <span className="text-sm text-gray-500">
            {Array.isArray(displaySongs) 
              ? `${displaySongs.length} songs` 
              : `${Object.values(displaySongs).flat().length} songs`}
          </span>
        </div>
      </div>

      {/* Alphabet Quick Jump - Only show when not searching */}
      {!searchQuery && (
        <div className="sticky top-[157px] z-10 bg-white border-b border-gray-200 px-4 py-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {alphabets.map((letter) => (
              <button
                key={letter}
                onClick={() => scrollToAlphabet(letter)}
                className="px-3 py-1.5 text-sm font-medium text-[var(--color-primary-teal)] hover:bg-[var(--color-primary-teal)]/10 rounded-full transition-colors"
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Songs List */}
      <div className="p-4 space-y-6 pb-24">
        {searchQuery ? (
          // Search Results
          Array.isArray(displaySongs) && displaySongs.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">
                Found {displaySongs.length} song{displaySongs.length !== 1 ? 's' : ''}
              </p>
              {displaySongs.map((song: Song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  isFavorite={favorites.has(song.id)}
                  onToggleFavorite={toggleFavorite}
                  onClick={() => setSelectedSong(song)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Music className="size-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No songs found</p>
            </div>
          )
        ) : (
          // Grouped by Alphabet
          Object.keys(displaySongs).length > 0 ? (
            Object.entries(displaySongs)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([letter, songs]) => (
                <div key={letter} id={`letter-${letter}`} className="space-y-3">
                  <h2 className="text-2xl font-bold text-gray-300 sticky top-[220px] bg-white py-2">
                    {letter}
                  </h2>
                  {songs.map((song: Song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      isFavorite={favorites.has(song.id)}
                      onToggleFavorite={toggleFavorite}
                      onClick={() => setSelectedSong(song)}
                    />
                  ))}
                </div>
              ))
          ) : (
            <div className="text-center py-12">
              <Music className="size-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No songs available</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// Song Card Component
function SongCard({ 
  song, 
  isFavorite, 
  onToggleFavorite, 
  onClick 
}: { 
  song: Song; 
  isFavorite: boolean; 
  onToggleFavorite: (id: string) => void;
  onClick: () => void;
}) {
  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="p-3 bg-gradient-to-br from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
          <Music className="size-5 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 mb-1 truncate">{song.title}</h3>
          <p className="text-sm text-gray-600 mb-2 truncate">{song.author}</p>
          <div className="flex flex-wrap gap-2">
            {song.category.slice(0, 2).map((cat, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(song.id);
          }}
          className={`p-2 rounded-full transition-colors ${
            isFavorite
              ? 'text-[var(--color-accent-rose)] bg-rose-50'
              : 'text-gray-400 hover:bg-gray-100'
          }`}
        >
          {isFavorite ? (
            <Heart className="size-5 fill-current" />
          ) : (
            <Heart className="size-5" />
          )}
        </button>
      </div>
    </div>
  );
}

// Info Row Component
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right">{value}</span>
    </div>
  );
}
