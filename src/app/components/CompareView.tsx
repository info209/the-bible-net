"use client";
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ComparisonSkeleton } from './BibleSkeleton';

interface CompareViewProps {
  book: string;
  chapter: number;
  selectedVersions: string[]; // These can be names OR abbreviations like 'NKJV'
  selectedTheme: 'light' | 'sepia' | 'cream' | 'dark';
  apiVersions?: any[]; // Full version list from API to resolve names to IDs
  font?: string;
  fontSize?: number;
}

const themeConfig = {
  light: {
    bg: '#fefefe',
    text: '#31393a',
    verseNumber: '#E23744'
  },
  sepia: {
    bg: '#f5e6c8',
    text: '#5c4a3a',
    verseNumber: '#D42C3A'
  },
  cream: {
    bg: '#f8f6f1',
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
  'rgba(210, 57, 82, 0.03)', // Rose/Coral
  'rgba(0, 106, 111, 0.03)', // Teal
  'rgba(59, 130, 246, 0.03)', // Blue
  'rgba(245, 158, 11, 0.03)', // Amber
  'rgba(16, 185, 129, 0.03)', // Emerald
  'rgba(139, 92, 246, 0.03)', // Violet
];

export default function CompareView({ 
  book, 
  chapter, 
  selectedVersions, 
  selectedTheme, 
  apiVersions = [],
  font = 'Inter',
  fontSize = 18
}: CompareViewProps) {
  const currentTheme = themeConfig[selectedTheme];
  const [contents, setContents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map selected versions to API IDs and short names
  const resolvedVersions = useMemo(() => {
    return selectedVersions.map(vSource => {
      const match = apiVersions.find(av => 
        av.id === vSource || av.name === vSource || av.fullName === vSource
      );
      return {
        id: match?.id || vSource,
        shortName: match?.name || vSource,
        fullName: match?.fullName || vSource
      };
    });
  }, [selectedVersions, apiVersions]);

  useEffect(() => {
    let isMounted = true;

    const fetchAllVersions = async () => {
      if (!book || !chapter || resolvedVersions.length === 0) return;
      
      setIsLoading(true);
      setError(null);
      try {
        const fetchPromises = resolvedVersions.map(v => 
          fetch(`/api/v1/bible/${v.id}/${book}/${chapter}`).then(res => res.json())
        );
        
        const results = await Promise.all(fetchPromises);
        
        if (isMounted) {
          const successResults = results
            .map((r, index) => {
              if (r.success) {
                return {
                  ...r.data,
                  versionId: resolvedVersions[index].id
                };
              }
              return null;
            })
            .filter(Boolean);
          
          if (successResults.length > 0) {
            setContents(successResults);
          } else {
            setError('Failed to fetch version contents');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('An error occurred during comparison');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAllVersions();

    return () => {
      isMounted = false;
    };
  }, [book, chapter, resolvedVersions]);

  // Get all unique verse numbers across all versions for alignment
  const allVerseNumbers = useMemo(() => {
    const numbers = new Set<number>();
    contents.forEach(content => {
      content.verses?.forEach((v: any) => {
        if (v.number) numbers.add(Number(v.number));
      });
    });
    return Array.from(numbers).sort((a, b) => a - b);
  }, [contents]);

  if (isLoading) {
    return (
      <div className="pt-20">
        <ComparisonSkeleton theme={currentTheme} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] px-6 text-center w-full" style={{ backgroundColor: currentTheme.bg }}>
        <div className="size-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <X className="size-8 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Comparison Failed</h3>
        <p className="text-gray-500 max-w-xs">{error}</p>
      </div>
    );
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Inline layout for mobile
  if (isMobile) {
    return (
      <div className="px-4 py-16">
        {allVerseNumbers.map((num, verseIndex) => (
          <div key={num} className="mb-10 first:scroll-mt-20">
            {contents.map((versionData, vIndex) => {
              const verse = versionData.verses.find((v: any) => v.number === num);
              if (!verse) return null;

              const versionMeta = resolvedVersions.find(rv => rv.id === versionData.versionId);
              const bg = versionColors[vIndex % versionColors.length];

              return (
                <motion.div
                  key={`${versionData.versionId}-${num}`}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3 }}
                  className="mb-4 pb-4 px-4 py-4 rounded-xl border border-black/[0.03]"
                  style={{
                    backgroundColor: currentTheme.bg === '#fefefe' ? bg : 'rgba(255, 255, 255, 0.03)',
                  }}
                >
                  {/* Version Label - Showing Abbreviation */}
                  <div 
                    className="text-[10px] font-bold mb-2 tracking-widest uppercase opacity-60"
                    style={{ color: currentTheme.verseNumber }}
                  >
                    {versionMeta?.shortName || versionData.versionId}
                  </div>

                  {/* Verse Text */}
                  <div 
                    className="leading-relaxed" 
                    style={{ 
                      color: currentTheme.text,
                      fontFamily: font,
                      fontSize: `${fontSize}px`
                    }}
                  >
                    <span 
                      className="font-bold mr-3"
                      style={{ color: currentTheme.verseNumber, opacity: 0.4 }}
                    >
                      {num}
                    </span>
                    <span>{verse.text}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // Side-by-side layout for tablet/desktop
  const columnCount = contents.length;
  const gridTemplateColumns = `repeat(${columnCount}, minmax(0, 1fr))`;

  return (
    <div className="px-4 py-16 max-w-7xl mx-auto">
      {/* Column Headers - Sticky */}
      <div 
        className="grid gap-6 mb-8 pb-4 border-b sticky top-[60px] z-10 backdrop-blur-xl transition-colors duration-300" 
        style={{ 
          borderColor: `${currentTheme.text}15`, 
          backgroundColor: `${currentTheme.bg}CC`,
          gridTemplateColumns 
        }}
      >
        {contents.map((versionData, index) => {
          const versionMeta = resolvedVersions.find(rv => rv.id === versionData.versionId);
          return (
            <div
              key={versionData.versionId}
              className="font-black text-center py-2 text-xs sm:text-sm tracking-[0.2em] uppercase"
              style={{ color: currentTheme.verseNumber }}
            >
              {versionMeta?.shortName || versionData.versionId}
            </div>
          );
        })}
      </div>

      {/* Verse Rows */}
      <div className="space-y-6">
        {allVerseNumbers.map((num, verseIndex) => (
          <div
            key={num}
            className="grid gap-6"
            style={{ gridTemplateColumns }}
          >
            {contents.map((versionData, vIndex) => {
              const verse = versionData.verses.find((v: any) => v.number === num);
              const bg = versionColors[vIndex % versionColors.length];

              return (
                <motion.div 
                  key={`${versionData.versionId}-${num}`} 
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: vIndex * 0.05 }}
                  className="px-6 py-6 rounded-[2rem] transition-all hover:scale-[1.02] border border-black/[0.02] shadow-sm flex flex-col"
                  style={{ 
                    backgroundColor: currentTheme.bg === '#fefefe' ? bg : 'rgba(255, 255, 255, 0.03)',
                  }}
                >
                   {verse ? (
                    <div className="flex items-start gap-4">
                      <span 
                        className="font-bold text-[11px] mt-1.5 opacity-30 select-none" 
                        style={{ color: currentTheme.verseNumber }}
                      >
                        {num}
                      </span>
                      <p 
                        style={{ 
                          fontFamily: font, 
                          fontSize: `${fontSize}px`,
                          color: currentTheme.text 
                        }}
                        className="leading-relaxed font-normal"
                      >
                        {verse.text}
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center italic opacity-20 text-sm">
                      Verse not available
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
