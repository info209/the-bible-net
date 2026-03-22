const fs = require('fs');
const path = require('path');

const bibleReaderFile = 'c:\\Users\\Pranjal Singh\\OneDrive\\Desktop\\Projects\\the-bible-net-prod\\src\\app\\components\\BibleReaderPage.tsx';
const chapterContentFile = 'c:\\Users\\Pranjal Singh\\OneDrive\\Desktop\\Projects\\the-bible-net-prod\\src\\app\\components\\ChapterContent.tsx';

let brCode = fs.readFileSync(bibleReaderFile, 'utf8');

// 1. Add VerseActionMenu import to BibleReaderPage.tsx
if (!brCode.includes('import VerseActionMenu')) {
    brCode = brCode.replace(
        "import ComparisonContent from './ComparisonContent';", 
        "import ComparisonContent from './ComparisonContent';\nimport VerseActionMenu from './VerseActionMenu';"
    );
}

// 2. Add state and handlers to BibleReaderPage.tsx
const stateInjection = \`
  // Selection State
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  
  const handleVerseLongPress = useCallback((verseNum: number) => {
    setSelectedVerses(prev => {
      if (prev.includes(verseNum)) return prev;
      return [...prev, verseNum];
    });
  }, []);

  const handleVerseTap = useCallback((verseNum: number) => {
    setSelectedVerses(prev => {
      if (prev.length === 0) return prev; // If not in selection mode, ignore
      if (prev.includes(verseNum)) {
        return prev.filter(v => v !== verseNum);
      } else {
        return [...prev, verseNum];
      }
    });
  }, []);

  // Handlers for menu actions
  const onVerseMenuClose = () => setSelectedVerses([]);
  const onVerseMenuHighlight = (color: string) => { console.log('Highlight', color); setSelectedVerses([]); };
  const onVerseMenuSave = () => { console.log('Save'); setSelectedVerses([]); };
  const onVerseMenuNote = () => { console.log('Note'); setSelectedVerses([]); };
  const onVerseMenuCompare = () => { 
    setComparisonMode(true); 
    setTtsPlaying(false);
    setTtsPaused(false);
    stopTTS(); // Disable narration
    setSelectedVerses([]);
  };
  const onVerseMenuShare = () => { console.log('Share'); setSelectedVerses([]); };
\`;

if (!brCode.includes('const [selectedVerses, setSelectedVerses]')) {
    brCode = brCode.replace('const [ttsPlaying, setTtsPlaying] = useState(false);', stateInjection + '\\n  const [ttsPlaying, setTtsPlaying] = useState(false);');
}

// 3. Render VerseActionMenu
const menuRenderInjection = \`
      {/* ── VERSE ACTION MENU ─────────────────────────────── */}
      <AnimatePresence>
        {selectedVerses.length > 0 && (
          <VerseActionMenu 
            isOpen={selectedVerses.length > 0}
            bookName={displayBookName}
            chapter={selectedChapter}
            selectedVerses={selectedVerses}
            onClose={onVerseMenuClose}
            onHighlight={onVerseMenuHighlight}
            onSave={onVerseMenuSave}
            onNote={onVerseMenuNote}
            onCompare={onVerseMenuCompare}
            onShare={onVerseMenuShare}
          />
        )}
      </AnimatePresence>
\`;

if (!brCode.includes('<VerseActionMenu ')) {
    brCode = brCode.replace('{/* ── AUDIO CONTROL PANEL (BOTTOM SHEET) ──────────────── */}', menuRenderInjection + '\n      {/* ── AUDIO CONTROL PANEL (BOTTOM SHEET) ──────────────── */}');
}

// 4. Pass props to ChapterContent
// Need to replace <ChapterContent ... /> usage
// It appears in multiple places in AnimatePresence/PageTurnTransition.
brCode = brCode.replace(/<ChapterContent\\s+book=\{[^]*?\\/>/g, (match) => {
    if (match.includes('selectedVerses')) return match;
    return match.replace('theme={currentTheme}', 'theme={currentTheme}\n                  selectedVerses={selectedVerses}\n                  onVerseLongPress={handleVerseLongPress}\n                  onVerseTap={handleVerseTap}');
});

fs.writeFileSync(bibleReaderFile, brCode, 'utf8');

// --- Now Patch ChapterContent.tsx ---
let ccCode = fs.readFileSync(chapterContentFile, 'utf8');

if (!ccCode.includes('selectedVerses?: number[]')) {
    ccCode = ccCode.replace('theme: {', 'selectedVerses?: number[];\n  onVerseLongPress?: (v: number) => void;\n  onVerseTap?: (v: number) => void;\n  theme: {');
}

if (!ccCode.includes('onVerseLongPress, onVerseTap')) {
    ccCode = ccCode.replace('theme }: ChapterContentProps', 'theme, selectedVerses = [], onVerseLongPress, onVerseTap }: ChapterContentProps');
}

// Add long press logic in ChapterContent
const hookInjection = \`
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{x: number, y: number} | null>(null);

  const handlePointerDown = (e: React.PointerEvent, verseNum: number) => {
    // Only trigger for primary touch/click
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    touchStartPosRef.current = { x: e.clientX, y: e.clientY };
    longPressTimerRef.current = setTimeout(() => {
      if (onVerseLongPress) onVerseLongPress(verseNum);
    }, 500); // 500ms long press
  };

  const handlePointerUp = (e: React.PointerEvent, verseNum: number) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    const endX = e.clientX;
    const endY = e.clientY;
    const moveDist = touchStartPosRef.current ? Math.sqrt(Math.pow(endX - touchStartPosRef.current.x, 2) + Math.pow(endY - touchStartPosRef.current.y, 2)) : 0;
    
    // Tap logic (if didn't move much and timeout was cleared)
    if (moveDist < 10) {
      if (onVerseTap) onVerseTap(verseNum);
    }
    touchStartPosRef.current = null;
  };

  const handlePointerCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  // Fetch Bible content from API
\`;

if (!ccCode.includes('handlePointerDown')) {
    ccCode = ccCode.replace('// Fetch Bible content from API', "import { useRef } from 'react';\n" + hookInjection);
    // Since we added an import, find the first line and put it. Actually useRef is already imported.
    ccCode = ccCode.replace("import { useRef } from 'react';\n", ""); 
    ccCode = ccCode.replace("import { useEffect, useState } from 'react';", "import { useEffect, useState, useRef } from 'react';");
}

// Update the <p> tag rendering verses
const pTagOriginal = \`className="transition-all duration-500 rounded px-2 py-1"\`;
const pTagReplaced = \`className={\`transition-all duration-300 rounded px-2 py-1 select-none cursor-pointer \${selectedVerses.includes(verse.number) ? 'bg-blue-50 border-blue-200 border-l-4' : ''}\`}
              onPointerDown={(e) => handlePointerDown(e, verse.number)}
              onPointerUp={(e) => handlePointerUp(e, verse.number)}
              onPointerCancel={handlePointerCancel}
\`;

if (!ccCode.includes('onPointerDown=')) {
    ccCode = ccCode.replace(pTagOriginal, pTagReplaced);
    
    // Replace the inline style background color logic to respect selection
    ccCode = ccCode.replace(/backgroundColor: readingVerse === verse.number \? '#fbebee' : 'transparent'/g, 
        "backgroundColor: selectedVerses.includes(verse.number) ? 'rgba(59, 130, 246, 0.1)' : readingVerse === verse.number ? '#fbebee' : 'transparent'"
    );
}

fs.writeFileSync(chapterContentFile, ccCode, 'utf8');

console.log('Successfully patched BibleReaderPage.tsx and ChapterContent.tsx');
