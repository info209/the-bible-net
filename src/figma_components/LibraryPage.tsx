import { BookOpen, Heart, Calendar, FolderOpen, Plus, Edit3, Music } from 'lucide-react';
import { useState } from 'react';
import SongsLibrary from './songs/SongsLibrary';

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'journals' | 'prayers' | 'bookmarks' | 'songs'>('all');

  const journals = [
    {
      title: 'My Journey with God',
      date: 'Feb 1, 2026',
      preview: 'Today I felt God\'s presence during my morning prayer...',
      bgImage: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800'
    },
    {
      title: 'Answered Prayers',
      date: 'Jan 28, 2026',
      preview: 'Praise God! He answered my prayer about...',
      bgImage: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800'
    },
    {
      title: 'Faith Reflections',
      date: 'Jan 25, 2026',
      preview: 'Reflecting on Psalm 23 and what it means to have...',
      bgImage: 'https://images.unsplash.com/photo-1465146633011-14f8e0781093?w=800'
    }
  ];

  const prayers = [
    { title: 'For Family', date: 'Today', status: 'ongoing' },
    { title: 'Work Guidance', date: 'Yesterday', status: 'answered' },
    { title: 'Health & Healing', date: 'Jan 30', status: 'ongoing' },
    { title: 'Financial Provision', date: 'Jan 28', status: 'answered' }
  ];

  const bookmarks = [
    { reference: 'John 3:16', note: 'God\'s love for the world' },
    { reference: 'Psalm 23:1-6', note: 'The Lord is my shepherd' },
    { reference: 'Romans 8:28', note: 'All things work together for good' },
    { reference: 'Philippians 4:13', note: 'I can do all things through Christ' }
  ];

  return (
    <div className="space-y-6 pb-6 bg-white min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">My Library</h1>
          <p className="text-gray-600">Your spiritual journey documented</p>
        </div>
        <button className="bg-gradient-to-r from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] text-white p-4 rounded-full shadow-[var(--shadow-lg)] hover:shadow-[var(--shadow-xl)] transition-all">
          <Plus className="size-6" />
        </button>
      </div>

      {/* Tabs - Always Visible */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
            activeTab === 'all'
              ? 'bg-[var(--color-primary-teal)] text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab('journals')}
          className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
            activeTab === 'journals'
              ? 'bg-[var(--color-primary-teal)] text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Journals
        </button>
        <button
          onClick={() => setActiveTab('prayers')}
          className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
            activeTab === 'prayers'
              ? 'bg-[var(--color-primary-teal)] text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Prayers
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
            activeTab === 'bookmarks'
              ? 'bg-[var(--color-primary-teal)] text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Bookmarks
        </button>
        <button
          onClick={() => setActiveTab('songs')}
          className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
            activeTab === 'songs'
              ? 'bg-[var(--color-primary-teal)] text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Songs
        </button>
      </div>

      {/* Songs Content - Embedded */}
      {activeTab === 'songs' && (
        <SongsLibrary isEmbedded />
      )}

      {/* Content based on active tab */}
      {(activeTab === 'all' || activeTab === 'journals') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
              <Edit3 className="size-5 text-[var(--color-primary-teal)]" />
              <span>Journals</span>
            </h2>
            {activeTab === 'all' && (
              <button className="text-[var(--color-primary-teal)] text-sm font-medium hover:underline">View All</button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {journals.map((journal, i) => (
              <div key={i} className="group relative h-72 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all cursor-pointer">
                <img 
                  src={journal.bgImage} 
                  alt={journal.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <p className="text-white/80 text-sm mb-2">{journal.date}</p>
                  <h3 className="text-white text-xl font-bold mb-2">{journal.title}</h3>
                  <p className="text-white/90 text-sm line-clamp-2">{journal.preview}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(activeTab === 'all' || activeTab === 'prayers') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
              <Heart className="size-5 text-[var(--color-accent-rose)]" />
              <span>Prayer Requests</span>
            </h2>
            {activeTab === 'all' && (
              <button className="text-[var(--color-primary-teal)] text-sm font-medium hover:underline">View All</button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prayers.map((prayer, i) => (
              <div key={i} className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800 mb-1">{prayer.title}</h3>
                    <p className="text-sm text-gray-500">{prayer.date}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    prayer.status === 'answered'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {prayer.status === 'answered' ? '✓ Answered' : '🙏 Ongoing'}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button className="flex-1 py-2 bg-[#e6f0f1] text-[var(--color-primary-teal)] rounded-lg text-sm font-medium hover:bg-[#d0e5e7] transition-colors">
                    View Details
                  </button>
                  <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(activeTab === 'all' || activeTab === 'bookmarks') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
              <BookOpen className="size-5 text-[var(--color-primary-teal)]" />
              <span>Bookmarked Verses</span>
            </h2>
            {activeTab === 'all' && (
              <button className="text-[var(--color-primary-teal)] text-sm font-medium hover:underline">View All</button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookmarks.map((bookmark, i) => (
              <div key={i} className="bg-gradient-to-br from-[#e6f0f1] to-white rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow border-l-4 border-[var(--color-primary-teal)]">
                <h3 className="font-bold text-[var(--color-primary-teal)] text-lg mb-2">{bookmark.reference}</h3>
                <p className="text-gray-600 text-sm mb-3">{bookmark.note}</p>
                <div className="flex space-x-2">
                  <button className="flex-1 py-2 bg-[var(--color-primary-teal)] text-white rounded-lg text-sm font-medium hover:bg-[#005358] transition-colors">
                    Read Passage
                  </button>
                  <button className="px-4 py-2 bg-white text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors border border-gray-200">
                    Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats - Only show when not in Songs tab */}
      {activeTab !== 'songs' && (
        <div className="bg-gradient-to-br from-purple-100 via-pink-100 to-rose-100 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Your Journey Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-[var(--color-primary-teal)] mb-1">24</div>
              <p className="text-sm text-gray-600">Days Streak</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-[var(--color-accent-rose)] mb-1">156</div>
              <p className="text-sm text-gray-600">Chapters Read</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-amber-600 mb-1">42</div>
              <p className="text-sm text-gray-600">Journal Entries</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">18</div>
              <p className="text-sm text-gray-600">Prayers Answered</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
