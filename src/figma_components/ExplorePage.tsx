import { TrendingUp, Users, Video, Calendar, Star, BookOpen, Heart, MessageCircle } from 'lucide-react';

export default function ExplorePage() {
  const featuredPlans = [
    {
      title: 'The Story of Jesus',
      duration: '7 days',
      participants: '2.4M',
      category: 'New Testament',
      image: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800',
      color: 'from-blue-400 to-cyan-500'
    },
    {
      title: 'Prayers of the Bible',
      duration: '14 days',
      participants: '1.8M',
      category: 'Prayer',
      image: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800',
      color: 'from-purple-400 to-pink-500'
    },
    {
      title: 'Finding Peace',
      duration: '21 days',
      participants: '3.1M',
      category: 'Spiritual Growth',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
      color: 'from-teal-400 to-green-500'
    }
  ];

  const liveEvents = [
    {
      title: 'Sunday Service Live',
      time: 'Today at 10:00 AM',
      viewers: '45.2K watching',
      status: 'live'
    },
    {
      title: 'Bible Study Session',
      time: 'Today at 7:00 PM',
      viewers: 'Starts in 3 hours',
      status: 'upcoming'
    },
    {
      title: 'Youth Prayer Meeting',
      time: 'Tomorrow at 6:00 PM',
      viewers: '2.1K interested',
      status: 'upcoming'
    }
  ];

  const popularTopics = [
    { name: 'Faith', count: '1.2M', icon: '✝️', color: 'bg-blue-100 text-blue-700' },
    { name: 'Prayer', count: '980K', icon: '🙏', color: 'bg-purple-100 text-purple-700' },
    { name: 'Love', count: '850K', icon: '❤️', color: 'bg-pink-100 text-pink-700' },
    { name: 'Hope', count: '720K', icon: '🌟', color: 'bg-amber-100 text-amber-700' },
    { name: 'Wisdom', count: '690K', icon: '💡', color: 'bg-green-100 text-green-700' },
    { name: 'Peace', count: '640K', icon: '🕊️', color: 'bg-cyan-100 text-cyan-700' }
  ];

  const devotionals = [
    {
      title: 'Daily Bread',
      author: 'John Smith',
      reads: '125K',
      image: 'https://images.unsplash.com/photo-1472289065668-ce650ac443d2?w=800'
    },
    {
      title: 'Morning Glory',
      author: 'Sarah Johnson',
      reads: '98K',
      image: 'https://images.unsplash.com/photo-1502139214982-d0ad755818d8?w=800'
    },
    {
      title: 'Faith Walk',
      author: 'Michael Brown',
      reads: '87K',
      image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800'
    }
  ];

  return (
    <div className="space-y-6 pb-6 bg-white min-h-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Explore</h1>
        <p className="text-gray-600">Discover inspiring content and connect with the community</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search plans, devotionals, topics..."
          className="w-full px-6 py-4 rounded-full bg-white border-2 border-gray-200 focus:border-[var(--color-primary-teal)] focus:outline-none shadow-sm transition-all"
        />
        <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] text-white px-6 py-2 rounded-full font-medium hover:shadow-[var(--shadow-lg)] transition-all">
          Search
        </button>
      </div>

      {/* Trending Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <TrendingUp className="size-6 text-[var(--color-accent-rose)]" />
          <h2 className="text-xl font-bold text-gray-800">Trending Now</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredPlans.map((plan, i) => (
            <div key={i} className="group relative h-80 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all cursor-pointer">
              <img 
                src={plan.image}
                alt={plan.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${plan.color} opacity-60`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              <div className="absolute top-4 right-4">
                <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-800">
                  {plan.category}
                </span>
              </div>

              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <h3 className="text-white text-2xl font-bold mb-3">{plan.title}</h3>
                <div className="flex items-center space-x-4 text-white/90 text-sm mb-4">
                  <span className="flex items-center space-x-1">
                    <Calendar className="size-4" />
                    <span>{plan.duration}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Users className="size-4" />
                    <span>{plan.participants}</span>
                  </span>
                </div>
                <button className="w-full py-3 bg-white text-gray-800 rounded-xl font-bold hover:bg-gray-100 transition-colors">
                  Start Plan
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Events */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Video className="size-6 text-red-500" />
          <h2 className="text-xl font-bold text-gray-800">Live & Upcoming</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {liveEvents.map((event, i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 mb-1">{event.title}</h3>
                  <p className="text-sm text-gray-500">{event.time}</p>
                </div>
                {event.status === 'live' && (
                  <span className="flex items-center space-x-1 px-2 py-1 bg-red-500 text-white rounded-full text-xs font-bold animate-pulse">
                    <span className="size-2 bg-white rounded-full" />
                    <span>LIVE</span>
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-3">{event.viewers}</p>
              <button className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                event.status === 'live'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-[#e6f0f1] text-[var(--color-primary-teal)] hover:bg-[#d0e5e7]'
              }`}>
                {event.status === 'live' ? 'Watch Now' : 'Set Reminder'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Topics */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Star className="size-6 text-amber-500" />
          <h2 className="text-xl font-bold text-gray-800">Popular Topics</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {popularTopics.map((topic, i) => (
            <button
              key={i}
              className={`${topic.color} rounded-xl p-4 text-center hover:shadow-lg transition-all transform hover:-translate-y-1`}
            >
              <div className="text-3xl mb-2">{topic.icon}</div>
              <h3 className="font-bold text-sm mb-1">{topic.name}</h3>
              <p className="text-xs opacity-75">{topic.count}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Featured Devotionals */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <BookOpen className="size-6 text-[var(--color-primary-teal)]" />
          <h2 className="text-xl font-bold text-gray-800">Featured Devotionals</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {devotionals.map((devotional, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer">
              <div className="h-48 overflow-hidden">
                <img 
                  src={devotional.image}
                  alt={devotional.title}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="p-5">
                <h3 className="font-bold text-gray-800 text-lg mb-2">{devotional.title}</h3>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <span>by {devotional.author}</span>
                  <span className="flex items-center space-x-1">
                    <Heart className="size-4 text-red-500" />
                    <span>{devotional.reads}</span>
                  </span>
                </div>
                <button className="w-full py-2 bg-gradient-to-r from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] text-white rounded-lg font-medium hover:shadow-[var(--shadow-lg)] transition-all">
                  Read Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Community Section */}
      <div className="bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Users className="size-6 text-[var(--color-primary-teal)]" />
            <h2 className="text-xl font-bold text-gray-800">Join the Community</h2>
          </div>
          <span className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold text-gray-800">
            2.8M members
          </span>
        </div>
        <p className="text-gray-700 mb-6">
          Connect with fellow believers, share your journey, and grow together in faith. 
          Join discussions, prayer groups, and Bible study sessions.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-white transition-colors">
            <MessageCircle className="size-8 text-[var(--color-primary-teal)] mx-auto mb-2" />
            <h4 className="font-bold text-gray-800 mb-1">Discussions</h4>
            <p className="text-sm text-gray-600">Join conversations</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-white transition-colors">
            <Heart className="size-8 text-[var(--color-accent-rose)] mx-auto mb-2" />
            <h4 className="font-bold text-gray-800 mb-1">Prayer Wall</h4>
            <p className="text-sm text-gray-600">Share requests</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-white transition-colors">
            <BookOpen className="size-8 text-amber-600 mx-auto mb-2" />
            <h4 className="font-bold text-gray-800 mb-1">Study Groups</h4>
            <p className="text-sm text-gray-600">Learn together</p>
          </div>
        </div>
        <button className="w-full mt-6 py-4 bg-gradient-to-r from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] text-white rounded-xl font-bold text-lg hover:shadow-2xl transition-all">
          Explore Community
        </button>
      </div>
    </div>
  );
}
