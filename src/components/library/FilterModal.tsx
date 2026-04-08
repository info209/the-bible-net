'use client';

import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { SongBook } from './types';


interface FilterModalProps {
  currentFilters: {
    languages: string[];
    categories: string[];
    types: string[];
    tags: string[];
    sortBy: 'popularity' | 'title' | 'recent' | 'rating' | 'songCount';
  };
  availableBooks: SongBook[];
  onClose: () => void;
  onApply: (filters: FilterModalProps['currentFilters']) => void;
}

export default function FilterModal({ currentFilters, availableBooks, onClose, onApply }: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState(currentFilters);

  // Extract unique values from available books
  const uniqueLanguages = Array.from(new Set(availableBooks.map(b => b.language))).sort();
  const uniqueCategories = Array.from(new Set(availableBooks.map(b => b.category))).sort();
  const uniqueTypes = Array.from(new Set(availableBooks.map(b => b.type))).sort();
  const allTags = Array.from(new Set(availableBooks.flatMap(b => b.tags))).sort();

  const toggleArrayFilter = (key: 'languages' | 'categories' | 'types' | 'tags', value: string) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value]
    }));
  };

  const clearAll = () => {
    setLocalFilters({
      languages: [],
      categories: [],
      types: [],
      tags: [],
      sortBy: 'popularity'
    });
  };

  const handleApply = () => {
    onApply(localFilters);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Filters
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X className="size-5 text-[var(--color-gray-900)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Languages */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
              Language
            </h3>
            <div className="flex flex-wrap gap-2">
              {uniqueLanguages.map(lang => (
                <button
                  key={lang}
                  onClick={() => toggleArrayFilter('languages', lang)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    localFilters.languages.includes(lang)
                      ? 'bg-[var(--color-primary-teal)] text-white'
                      : 'bg-gray-100 text-[var(--color-text-secondary)] hover:bg-gray-200'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
              Category
            </h3>
            <div className="flex flex-wrap gap-2">
              {uniqueCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleArrayFilter('categories', cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    localFilters.categories.includes(cat)
                      ? 'bg-[var(--color-accent-rose)] text-white'
                      : 'bg-gray-100 text-[var(--color-text-secondary)] hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Types */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
              Type
            </h3>
            <div className="flex flex-wrap gap-2">
              {uniqueTypes.map(type => (
                <button
                  key={type}
                  onClick={() => toggleArrayFilter('types', type)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                    localFilters.types.includes(type)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-[var(--color-text-secondary)] hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleArrayFilter('tags', tag)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    localFilters.tags.includes(tag)
                      ? 'bg-[var(--color-primary-teal)] text-white'
                      : 'bg-gray-100 text-[var(--color-text-secondary)] hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-6 border-t border-gray-100">
          <button
            onClick={clearAll}
            className="px-6 py-3 text-[#E23744] font-semibold hover:bg-[#E23744]/5 rounded-xl transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 bg-[var(--color-primary-teal)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Apply Filters
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
