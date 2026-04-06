import { motion } from 'framer-motion';
import { mockBibleContent } from './ChapterContent';
import { teluguBible, hindiBible } from './BibleData';

interface CompareViewProps {
  book: string;
  chapter: number;
  selectedVersions: string[];
  selectedTheme: 'light' | 'sepia' | 'cream' | 'dark';
}

const themeConfig = {
  light: {
    bg: '#fefefe',
    text: '#31393a',
    verseNumber: '#E23744'
  },
  sepia: {
    bg: '#f5e6d3',
    text: '#5c4a3a',
    verseNumber: '#D42C3A'
  },
  cream: {
    bg: '#fef3e2',
    text: '#4a3f2a',
    verseNumber: '#E23744'
  },
  dark: {
    bg: '#2e3737',
    text: '#e5e7e7',
    verseNumber: '#FF4757'
  }
};

// Background colors for each version (subtle tints)
const versionColors = [
  'rgba(255, 107, 107, 0.03)', // Coral tint
  'rgba(44, 184, 176, 0.03)',  // Teal tint
  'rgba(255, 159, 64, 0.03)',  // Amber tint
  'rgba(138, 88, 207, 0.03)'   // Purple tint
];

export default function CompareView({ book, chapter, selectedVersions, selectedTheme }: CompareViewProps) {
  const currentTheme = themeConfig[selectedTheme];

  // Get content for all selected versions
  const getVersionContent = (versionName: string) => {
    let bibleData = mockBibleContent;
    if (versionName === 'TELBSI') {
      bibleData = teluguBible as any;
    } else if (versionName === 'HINBSI') {
      bibleData = hindiBible as any;
    }
    return bibleData[book]?.[chapter]?.verses || [];
  };

  const allVersionsContent = selectedVersions.map(versionName => ({
    version: versionName,
    verses: getVersionContent(versionName)
  }));

  // Get the maximum number of verses (in case versions have different verse counts)
  const maxVerses = Math.max(...allVersionsContent.map(v => v.verses.length));

  // Check if we're on mobile (less than 768px)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024;

  // Inline layout for mobile
  if (isMobile) {
    return (
      <div className="px-4 py-6">
        {Array.from({ length: maxVerses }).map((_, verseIndex) => (
          <div key={verseIndex} className="mb-8" style={verseIndex === 0 ? { scrollMarginTop: '64px' } : {}}>
            {allVersionsContent.map((versionData, vIndex) => {
              const verse = versionData.verses[verseIndex];
              if (!verse) return null;

              return (
                <motion.div
                  key={`${versionData.version}-${verseIndex}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: verseIndex * 0.02 }}
                  className="mb-4 pb-4"
                  style={{
                    backgroundColor: vIndex < versionColors.length ? versionColors[vIndex] : 'transparent',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                >
                  {/* Version Label */}
                  <div 
                    className="text-xs font-semibold mb-2 tracking-wide"
                    style={{ 
                      color: currentTheme.verseNumber,
                      opacity: 0.8
                    }}
                  >
                    {versionData.version}
                  </div>

                  {/* Verse Text */}
                  <div className="leading-relaxed" style={{ color: currentTheme.text }}>
                    <span 
                      className="font-semibold mr-2"
                      style={{ color: currentTheme.verseNumber }}
                    >
                      {verse.number}
                    </span>
                    <span>{verse.text}</span>
                  </div>
                </motion.div>
              );
            })}
            {/* Removed divider line */}
          </div>
        ))}
      </div>
    );
  }

  // Side-by-side layout for tablet/desktop
  const columnCount = selectedVersions.length;
  const columnWidth = columnCount === 2 ? '50%' : columnCount === 3 ? '33.333%' : '25%';

  return (
    <div className="px-4 py-6">
      {/* Column Headers */}
      <div className="flex gap-4 mb-6 pb-4 border-b sticky top-[60px] z-10 backdrop-blur-xl" style={{ borderColor: `${currentTheme.text}20`, backgroundColor: currentTheme.bg }}>
        {allVersionsContent.map((versionData, index) => (
          <div
            key={versionData.version}
            className="font-bold text-center"
            style={{ 
              width: columnWidth,
              color: currentTheme.verseNumber
            }}
          >
            {versionData.version}
          </div>
        ))}
      </div>

      {/* Verse Rows */}
      {Array.from({ length: maxVerses }).map((_, verseIndex) => (
        <motion.div
          key={verseIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: verseIndex * 0.02 }}
          className="flex gap-4 mb-6"
          style={verseIndex === 0 ? { scrollMarginTop: '64px' } : {}}
        >
          {allVersionsContent.map((versionData, vIndex) => {
            const verse = versionData.verses[verseIndex];

            return (
              <div
                key={`${versionData.version}-${verseIndex}`}
                className="px-4 py-3 rounded-lg"
                style={{
                  width: columnWidth,
                  backgroundColor: vIndex < versionColors.length ? versionColors[vIndex] : 'transparent',
                  color: currentTheme.text
                }}
              >
                {verse ? (
                  <div className="leading-relaxed">
                    <span 
                      className="font-semibold mr-2"
                      style={{ color: currentTheme.verseNumber }}
                    >
                      {verse.number}
                    </span>
                    <span>{verse.text}</span>
                  </div>
                ) : (
                  <div className="text-center opacity-30">—</div>
                )}
              </div>
            );
          })}
        </motion.div>
      ))}
    </div>
  );
}
