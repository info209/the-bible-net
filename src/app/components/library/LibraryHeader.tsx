'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

interface LibraryHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
}

export default function LibraryHeader({
  searchQuery,
  onSearchChange,
  isSearchOpen,
  onToggleSearch,
}: LibraryHeaderProps) {
  return (
    <div className="space-y-3 pt-2 pb-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Library
        </h1>
        <button
          onClick={onToggleSearch}
          className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label="Search plans"
        >
          {isSearchOpen ? <X className="size-6" /> : <Search className="size-6" />}
        </button>
      </div>

      {isSearchOpen && (
        <div className="relative animate-in fade-in slide-in-from-top-2 duration-200">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search reading plans by title, topic, or author..."
            className="w-full px-4 py-3 pl-11 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-teal)] transition-all shadow-inner"
            autoFocus
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
