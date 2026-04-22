'use client';

import React from 'react';

type TabId = 'my-plans' | 'find-plans' | 'saved' | 'completed';

interface LibraryTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  tabs: Array<{
    id: TabId;
    label: string;
  }>;
}

export default function LibraryTabs({
  activeTab,
  onTabChange,
  tabs,
}: LibraryTabsProps) {
  return (
    <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide border-b border-gray-100">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-3 font-medium whitespace-nowrap transition-all border-b-2 text-sm ${
            activeTab === tab.id
              ? 'border-[var(--color-primary-teal)] text-[var(--color-primary-teal)]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
