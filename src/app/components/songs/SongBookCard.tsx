import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import type { SongBook } from './SongsLibrary';

interface SongBookCardProps {
  book: SongBook;
  onClick: () => void;
}

export default function SongBookCard({ book, onClick }: SongBookCardProps) {
  return (
    <motion.div
      onClick={onClick}
      className="group relative h-72 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all cursor-pointer w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Cover Image - Full Background */}
      <img 
        src={book.coverImage} 
        alt={book.title}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      
      {/* Type Badge - Top Left */}
      <div className="absolute top-3 left-3">
        <div className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-md">
          <p className="text-xs font-semibold text-[var(--color-primary-teal)] capitalize">
            {book.type}
          </p>
        </div>
      </div>

      {/* Favorite Button - Top Right */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          // Handle favorite
        }}
        className="absolute top-3 right-3 p-2 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-colors"
      >
        <Heart className="size-4 text-white" />
      </button>

      {/* Book Info - Bottom Overlay (Like Journals) */}
      <div className="absolute inset-0 p-6 flex flex-col justify-end">
        {/* Language & Song Count */}
        <div className="flex items-center gap-2 text-xs text-white/80 mb-2">
          <span>{book.language}</span>
          <span>•</span>
          <span>{book.songCount} songs</span>
          {book.yearPublished && (
            <>
              <span>•</span>
              <span>{book.yearPublished}</span>
            </>
          )}
        </div>

        {/* Title */}
        <h3 className="text-white text-xl font-bold mb-2 line-clamp-2">
          {book.title}
        </h3>

        {/* Subtitle/Description */}
        {book.subtitle && (
          <p className="text-white/90 text-sm line-clamp-2">
            {book.subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
}
