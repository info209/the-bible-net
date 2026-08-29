'use client';

import React from 'react';

export type LibraryTabId = 'my-plans' | 'find-plans' | 'saved' | 'completed';

interface LibraryTabsProps {
  activeTab: LibraryTabId;
  onTabChange: (tab: LibraryTabId) => void;
}

const tabs: { id: LibraryTabId; label: string }[] = [
  { id: 'my-plans', label: 'My plans' },
  { id: 'find-plans', label: 'Find plans' },
  { id: 'saved', label: 'Saved' },
  { id: 'completed', label: 'Completed' },
];

export default function LibraryTabs({ activeTab, onTabChange }: LibraryTabsProps) {
  return (
    <div className="w-full overflow-x-auto scrollbar-none py-1 mb-4">
      <div className="flex items-center space-x-2 min-w-max">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer select-none ${
                isSelected
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
