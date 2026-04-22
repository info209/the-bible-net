// Integration Guide for Bible Plans Library Module
// Update src/app/library/page.tsx to use the new BiblePlansLibrary

/**
 * OPTION 1: Replace existing LibraryView with BiblePlansLibrary
 * Use this if you want to completely replace the current library with Bible Plans
 */

// Option 1 - Simple Replacement
import { BiblePlansLibrary } from '@/components/library';

export default function LibraryPage() {
  return <BiblePlansLibrary />;
}

/**
 * OPTION 2: Keep both - Create a combined view
 * Use this if you want to keep both the existing library and Bible Plans
 */

'use client';

import { useState } from 'react';
import LibraryView from '@/components/library/LibraryView';
import { BiblePlansLibrary } from '@/components/library';

type LibraryMode = 'my-library' | 'bible-plans';

export default function CombinedLibraryPage() {
  const [mode, setMode] = useState<LibraryMode>('my-library');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mode Selector */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex gap-4">
          <button
            onClick={() => setMode('my-library')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              mode === 'my-library'
                ? 'bg-[var(--color-primary-teal)] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            My Library
          </button>
          <button
            onClick={() => setMode('bible-plans')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              mode === 'bible-plans'
                ? 'bg-[var(--color-primary-teal)] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Bible Plans
          </button>
        </div>
      </div>

      {/* Content */}
      {mode === 'my-library' && (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <LibraryView />
        </div>
      )}

      {mode === 'bible-plans' && <BiblePlansLibrary />}
    </div>
  );
}

/**
 * OPTION 3: Separate Routes
 * Create a new route for Bible Plans
 * 
 * Create: src/app/library/plans/page.tsx
 */

// src/app/library/plans/page.tsx
import { BiblePlansLibrary } from '@/components/library';

export const metadata = {
  title: 'Bible Plans - Spiritual Growth',
  description: 'Discover and complete Bible plans for spiritual growth',
};

export default function BiblePlansPage() {
  return <BiblePlansLibrary />;
}

/**
 * OPTION 4: Tabs within LibraryView
 * Integrate into existing LibraryView component
 * 
 * This requires modifying src/components/library/LibraryView.tsx
 */

// Add to src/components/library/LibraryView.tsx state
const [activeSection, setActiveSection] = useState<'my-library' | 'bible-plans'>(
  'my-library'
);

// Add section tabs above existing content
{
  activeSection === 'my-library' ? (
    // ... existing LibraryView content
  ) : (
    <BiblePlansLibrary />
  );
}

/**
 * SETUP CHECKLIST
 * 
 * 1. Database Setup
 *    □ Create collections: plans, plan_progress
 *    □ Create indexes as defined in models
 * 
 * 2. Environment Variables (already configured)
 *    □ NEXTAUTH_SECRET
 *    □ MONGODB_URI
 *    □ NEXTAUTH_URL
 * 
 * 3. Seed Data
 *    □ Run: npx tsx --tsconfig tsconfig.scripts.json src/scripts/seed_plans.ts
 *    □ Or manually insert sample plans via MongoDB
 * 
 * 4. Update Package Scripts (optional)
 *    Add to package.json:
 *    "seed:plans": "npx tsx --tsconfig tsconfig.scripts.json src/scripts/seed_plans.ts"
 *    "reset:plans": "npx tsx --tsconfig tsconfig.scripts.json src/scripts/reset_plans.ts"
 * 
 * 5. Component Integration
 *    □ Choose one of the 4 options above
 *    □ Update src/app/library/page.tsx
 *    □ Test in browser
 * 
 * 6. Verification
 *    □ Test "My Plans" tab (empty state)
 *    □ Test "Find Plans" tab (should show sample plans)
 *    □ Test starting a plan
 *    □ Test reading a day
 *    □ Test marking day complete
 *    □ Test completing full plan and rating
 *    □ Test save/unsave plan
 *    □ Test continuing a plan
 * 
 * 7. Performance (optional)
 *    □ Add React Query or SWR for client-side caching
 *    □ Implement pagination for large plan lists
 *    □ Add loading skeletons
 *    □ Optimize images with Next.js Image component
 */

/**
 * RECOMMENDED: Option 1 (Simple Replacement)
 * 
 * This is the cleanest approach if you want to focus purely on Bible Plans.
 * Simply update src/app/library/page.tsx to:
 * 
 * import { BiblePlansLibrary } from '@/components/library';
 * 
 * export const metadata = {
 *   title: 'Bible Plans - Library',
 *   description: 'Discover and read Bible plans for spiritual growth',
 * };
 * 
 * export default function LibraryPage() {
 *   return <BiblePlansLibrary />;
 * }
 */

/**
 * TESTING SCRIPT
 * Run this in the browser console to verify the module works:
 * 
 * // Check if plans can be loaded
 * fetch('/api/v1/plans')
 *   .then(r => r.json())
 *   .then(d => console.log('Plans loaded:', d))
 *   .catch(e => console.error('Error:', e));
 * 
 * // Check user library
 * fetch('/api/v1/plans/user/library?tab=my-plans')
 *   .then(r => r.json())
 *   .then(d => console.log('User library:', d))
 *   .catch(e => console.error('Error:', e));
 */
