import { useState } from 'react';
import { ChevronLeft, Heart, Share2, Download, Type, Minus, Plus, Music2, ExternalLink, Youtube, Music } from 'lucide-react';
import { motion } from 'framer-motion';

interface SongDetailProps {
  songId: string;
  bookId: string;
  onBack: () => void;
}

export default function SongDetail({ songId, bookId, onBack }: SongDetailProps) {
  const [fontSize, setFontSize] = useState(16);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Mock data - replace with actual data fetching
  const songData = {
    id: '1',
    number: 1,
    title: 'Amazing Grace',
    subtitle: 'How Sweet the Sound',
    author: 'John Newton, 1779',
    composer: 'William Walker, 1835',
    category: 'Hymn',
    key: 'G Major',
    timeSignature: '3/4',
    tempo: 'Andante',
    tags: ['Hymn', 'Classic', 'Salvation'],
    youtubeUrl: 'https://youtube.com/watch?v=CDdvReNKKuk',
    spotifyUrl: 'https://open.spotify.com/track/example',
    appleMusic: 'https://music.apple.com/track/example',
    description: 'One of the most recognizable songs in the English-speaking world, Amazing Grace was written by John Newton, a former slave trader who found redemption in Christ.',
    historicalNote: 'Written in 1772, this hymn has become one of the most beloved songs in Christian worship.',
    lyrics: [
      {
        type: 'verse',
        number: 1,
        lines: [
          'Amazing grace! How sweet the sound',
          'That saved a wretch like me!',
          'I once was lost, but now am found;',
          'Was blind, but now I see.'
        ]
      },
      {
        type: 'verse',
        number: 2,
        lines: [
          '\'Twas grace that taught my heart to fear,',
          'And grace my fears relieved;',
          'How precious did that grace appear',
          'The hour I first believed!'
        ]
      },
      {
        type: 'verse',
        number: 3,
        lines: [
          'Through many dangers, toils and snares,',
          'I have already come;',
          '\'Tis grace hath brought me safe thus far,',
          'And grace will lead me home.'
        ]
      },
      {
        type: 'verse',
        number: 4,
        lines: [
          'When we\'ve been there ten thousand years,',
          'Bright shining as the sun,',
          'We\'ve no less days to sing God\'s praise',
          'Than when we first begun.'
        ]
      }
    ]
  };

  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, 24));
  };

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 12));
  };

  const openExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e6f0f1] pb-24">
      {/* Header */}
      <div className="glass-light border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={onBack}
                className="p-2 rounded-full hover:bg-gray-100/50 transition-colors flex-shrink-0"
              >
                <ChevronLeft className="size-5 text-[var(--color-gray-900)]" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--color-primary-teal)]">
                    #{songData.number}
                  </span>
                  <h1 className="text-lg font-semibold text-[var(--color-text-primary)] truncate">
                    {songData.title}
                  </h1>
                </div>
                {songData.subtitle && (
                  <p className="text-sm text-[var(--color-text-secondary)] truncate">{songData.subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button 
                onClick={() => setIsFavorite(!isFavorite)}
                className="p-2 rounded-full hover:bg-gray-100/50 transition-colors"
              >
                <Heart 
                  className={`size-5 ${isFavorite ? 'fill-[#E23744] text-[#E23744]' : 'text-[var(--color-gray-900)]'}`}
                />
              </button>
              <button className="p-2 rounded-full hover:bg-gray-100/50 transition-colors">
                <Share2 className="size-5 text-[var(--color-gray-900)]" />
              </button>
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-full hover:bg-gray-100/50 transition-colors"
              >
                <Type className="size-5 text-[var(--color-gray-900)]" />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          <motion.div
            initial={false}
            animate={{ height: showSettings ? 'auto' : 0, opacity: showSettings ? 1 : 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-white shadow-[var(--shadow-sm)] mb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">Font Size</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={decreaseFontSize}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <Minus className="size-4 text-[var(--color-text-primary)]" />
                  </button>
                  <span className="text-sm font-semibold text-[var(--color-text-primary)] w-12 text-center">
                    {fontSize}px
                  </span>
                  <button
                    onClick={increaseFontSize}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <Plus className="size-4 text-[var(--color-text-primary)]" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Song Info Card */}
        <div className="bg-white rounded-2xl shadow-[var(--shadow-sm)] p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                {songData.title}
              </h2>
              {songData.subtitle && (
                <p className="text-[var(--color-text-secondary)] mb-3">{songData.subtitle}</p>
              )}
              <div className="space-y-1.5 text-sm">
                <p className="text-[var(--color-text-secondary)]">
                  <span className="font-medium">Words:</span> {songData.author}
                </p>
                <p className="text-[var(--color-text-secondary)]">
                  <span className="font-medium">Music:</span> {songData.composer}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {songData.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full bg-[var(--color-primary-teal)]/10 text-xs font-medium text-[var(--color-primary-teal)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Music Info */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100 text-sm">
            <div className="flex items-center gap-2">
              <Music2 className="size-4 text-[var(--color-text-secondary)]" />
              <span className="text-[var(--color-text-secondary)]">Key: <strong>{songData.key}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-text-secondary)]">Time: <strong>{songData.timeSignature}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-text-secondary)]">Tempo: <strong>{songData.tempo}</strong></span>
            </div>
          </div>

          {/* Description */}
          {songData.description && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {songData.description}
              </p>
            </div>
          )}
        </div>

        {/* External Audio Links */}
        <div className="bg-white rounded-2xl shadow-[var(--shadow-sm)] p-6">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Listen Online
          </h3>
          <div className="space-y-3">
            {songData.youtubeUrl && (
              <button
                onClick={() => openExternalLink(songData.youtubeUrl!)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-red-50 hover:bg-red-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors">
                    <Youtube className="size-5 text-red-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-[var(--color-text-primary)]">YouTube</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Watch and listen on YouTube</p>
                  </div>
                </div>
                <ExternalLink className="size-5 text-[var(--color-text-secondary)]" />
              </button>
            )}

            {songData.spotifyUrl && (
              <button
                onClick={() => openExternalLink(songData.spotifyUrl!)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 group-hover:bg-green-200 transition-colors">
                    <Music className="size-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-[var(--color-text-primary)]">Spotify</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Listen on Spotify</p>
                  </div>
                </div>
                <ExternalLink className="size-5 text-[var(--color-text-secondary)]" />
              </button>
            )}

            {songData.appleMusic && (
              <button
                onClick={() => openExternalLink(songData.appleMusic!)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors">
                    <Music className="size-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-[var(--color-text-primary)]">Apple Music</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Listen on Apple Music</p>
                  </div>
                </div>
                <ExternalLink className="size-5 text-[var(--color-text-secondary)]" />
              </button>
            )}
          </div>
        </div>

        {/* Historical Note */}
        {songData.historicalNote && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-[var(--shadow-sm)] p-6 border border-amber-100">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
              <span className="text-amber-600">ℹ️</span>
              Historical Background
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {songData.historicalNote}
            </p>
          </div>
        )}

        {/* Lyrics */}
        <div className="bg-white rounded-2xl shadow-[var(--shadow-sm)] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Lyrics</h3>
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Download className="size-5 text-[var(--color-gray-900)]" />
            </button>
          </div>
          
          <div className="space-y-8">
            {songData.lyrics.map((section, idx) => (
              <motion.div
                key={idx}
                className="space-y-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                {section.type === 'verse' && (
                  <p className="text-sm font-semibold text-[var(--color-primary-teal)] mb-3">
                    Verse {section.number}
                  </p>
                )}
                {section.type === 'chorus' && (
                  <p className="text-sm font-semibold text-[var(--color-accent-rose)] mb-3">
                    Chorus
                  </p>
                )}
                <div className="space-y-2 leading-relaxed">
                  {section.lines.map((line, lineIdx) => (
                    <p 
                      key={lineIdx}
                      className="text-[var(--color-text-primary)]"
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Related Songs */}
        <div className="bg-white rounded-2xl shadow-[var(--shadow-sm)] p-6">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Related Songs
          </h3>
          <div className="space-y-2">
            {['How Great Thou Art', 'Blessed Assurance', 'It Is Well'].map((title, idx) => (
              <button
                key={idx}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--color-primary-teal)] to-[var(--color-primary-teal-dark)] flex items-center justify-center flex-shrink-0">
                  <Music2 className="size-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--color-text-primary)] truncate">{title}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">Classic Hymn</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
