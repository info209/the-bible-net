import { Heart, MessageCircle, Share2, Maximize2, Play, Pause } from 'lucide-react';
import { useState } from 'react';
import AppHeader from './AppHeader';

export default function HomePage() {
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const dailyVerses = [
    {
      reference: "Psalm 23:1-3",
      version: "NKJV",
      text: "The Lord is my shepherd; I shall not want. He makes me to lie down in green pastures; He leads me beside the still waters. He restores my soul.",
      bgColor: "from-cyan-400 to-teal-500"
    },
    {
      reference: "John 3:16",
      version: "NKJV",
      text: "For God so loved the world that He gave His only begotten Son, that whoever believes in Him should not perish but have everlasting life.",
      bgColor: "from-blue-400 to-indigo-500"
    },
    {
      reference: "Philippians 4:13",
      version: "NKJV",
      text: "I can do all things through Christ who strengthens me.",
      bgColor: "from-purple-400 to-pink-500"
    }
  ];

  return (
    <div className="space-y-6 pb-6 bg-white min-h-full">
      {/* Greeting */}
      <div className="flex items-center space-x-3 animate-fade-in">
        <div className="size-10 rounded-full bg-gradient-to-br from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] flex items-center justify-center text-white font-bold text-lg">
          D
        </div>
        <div>
          <p className="text-gray-600 text-sm">Good morning,</p>
          <h2 className="text-xl font-bold text-gray-800">David</h2>
        </div>
      </div>

      {/* Daily Verse Card */}
      <div className="relative overflow-hidden">
        <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
          {dailyVerses.map((verse, index) => (
            <div key={index} className="w-full flex-shrink-0">
              <div className={`bg-gradient-to-br ${verse.bgColor} rounded-2xl p-6 shadow-xl relative overflow-hidden min-h-[360px] flex flex-col`}>
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
                
                {/* Content */}
                <div className="relative z-10 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-white/80 text-sm mb-1">Daily Verse</p>
                      <h3 className="text-white text-xl font-bold">{verse.reference}</h3>
                      <p className="text-white/90 text-sm">{verse.version}</p>
                    </div>
                  </div>

                  {/* Verse text */}
                  <div className="flex-1 flex items-center my-6">
                    <p className="text-white text-lg leading-relaxed font-serif italic">
                      "{verse.text}"
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/20">
                    <button className="flex flex-col items-center space-y-1 text-white hover:scale-110 transition-transform">
                      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                        <Heart className="size-4" />
                      </div>
                      <span className="text-xs">100k</span>
                    </button>
                    <button className="flex flex-col items-center space-y-1 text-white hover:scale-110 transition-transform">
                      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                        <MessageCircle className="size-4" />
                      </div>
                      <span className="text-xs">100k</span>
                    </button>
                    <button className="flex flex-col items-center space-y-1 text-white hover:scale-110 transition-transform">
                      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                        <Share2 className="size-4" />
                      </div>
                      <span className="text-xs">Share</span>
                    </button>
                    <button className="flex flex-col items-center space-y-1 text-white hover:scale-110 transition-transform">
                      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                        <Maximize2 className="size-4" />
                      </div>
                      <span className="text-xs">Expand</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Slide indicators */}
        <div className="flex justify-center space-x-2 mt-4">
          {dailyVerses.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                currentSlide === index ? 'w-8 bg-[var(--color-primary-teal)]' : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Daily Devotional Card */}
      <div className="bg-gradient-to-br from-pink-100 via-rose-100 to-pink-200 rounded-2xl p-6 shadow-xl relative overflow-hidden min-h-[320px]">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-rose-200/50 rounded-full -ml-16 -mt-16" />
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-pink-300/50 rounded-full -mr-12 -mb-12" />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Daily Devotional</p>
              <h3 className="text-gray-800 text-xl font-bold">Walking with God</h3>
              <p className="text-gray-600 text-sm">Psalm 23:1-3 NKJV</p>
            </div>
            <button className="p-2 bg-white rounded-full shadow-md hover:scale-110 transition-transform">
              {audioPlaying ? <Pause className="size-5 text-[var(--color-accent-rose)]" /> : <Play className="size-5 text-[var(--color-accent-rose)]" />}
            </button>
          </div>

          <div className="space-y-4 my-6">
            <p className="text-gray-700 leading-relaxed text-justify">
              The Lord is described as a shepherd, highlighting His role as a protector, provider, and guide. 
              Just as a shepherd cares for his sheep, God watches over us with tender love and compassion.
            </p>
            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-lg border-l-4 border-[var(--color-accent-rose)]">
              <p className="text-gray-700 italic text-sm">
                "In times of uncertainty, remember that you have a shepherd who knows the way and will never leave you."
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-rose-200">
            <button className="flex flex-col items-center space-y-1 text-gray-600 hover:text-[var(--color-accent-rose)] transition-colors">
              <div className="bg-white p-2 rounded-full shadow-sm">
                <Heart className="size-4" />
              </div>
              <span className="text-xs">Like</span>
            </button>
            <button className="flex flex-col items-center space-y-1 text-gray-600 hover:text-[var(--color-accent-rose)] transition-colors">
              <div className="bg-white p-2 rounded-full shadow-sm">
                <MessageCircle className="size-4" />
              </div>
              <span className="text-xs">Comment</span>
            </button>
            <button className="flex flex-col items-center space-y-1 text-gray-600 hover:text-[var(--color-accent-rose)] transition-colors">
              <div className="bg-white p-2 rounded-full shadow-sm">
                <Share2 className="size-4" />
              </div>
              <span className="text-xs">Share</span>
            </button>
            <button className="px-4 py-2 bg-[var(--color-accent-rose)] text-white rounded-full text-sm font-medium hover:bg-[#b92d42] transition-colors shadow-md">
              Read More
            </button>
          </div>
        </div>
      </div>

      {/* Reading Plans */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">My Reading Plans</h3>
          <button className="text-[var(--color-primary-teal)] text-sm font-medium hover:underline">View All</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {['One Year Bible', 'Psalms & Proverbs', 'Life of Jesus'].map((plan, i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 mb-1">{plan}</h4>
                  <p className="text-sm text-gray-500">Day {23 + i} of 365</p>
                </div>
                <div className="size-12 rounded-full bg-gradient-to-br from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] flex items-center justify-center text-white font-bold text-sm">
                  {Math.round((23 + i) / 365 * 100)}%
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div 
                  className="bg-gradient-to-r from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] h-2 rounded-full transition-all"
                  style={{ width: `${Math.round((23 + i) / 365 * 100)}%` }}
                />
              </div>
              <button className="w-full py-2 bg-[#e6f0f1] text-[var(--color-primary-teal)] rounded-lg text-sm font-medium hover:bg-[#d0e5e7] transition-colors">
                Continue Reading
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Prayer Wall Preview */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-2xl p-6 shadow-xl">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Community Prayer Requests</h3>
        <div className="space-y-3">
          {[
            { name: 'Sarah M.', prayer: 'Please pray for my family during this difficult time...', time: '2 hours ago' },
            { name: 'John D.', prayer: 'Praise God! My prayer was answered today!', time: '5 hours ago' },
            { name: 'Mary K.', prayer: 'Seeking wisdom for an important decision...', time: '1 day ago' }
          ].map((request, i) => (
            <div key={i} className="bg-white/80 backdrop-blur-sm rounded-lg p-4 hover:bg-white transition-colors">
              <div className="flex items-start space-x-3">
                <div className="size-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold">
                  {request.name[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-gray-800">{request.name}</p>
                    <span className="text-xs text-gray-500">{request.time}</span>
                  </div>
                  <p className="text-sm text-gray-600">{request.prayer}</p>
                  <button className="text-xs text-[var(--color-primary-teal)] font-medium mt-2 hover:underline">
                    🙏 Pray for this
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button className="w-full mt-4 py-3 bg-gradient-to-r from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] text-white rounded-xl font-medium hover:shadow-lg transition-all">
          View All Prayers
        </button>
      </div>
    </div>
  );
}
