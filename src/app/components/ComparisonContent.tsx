"use client";
import { useEffect, useState } from 'react';
import { ChevronDown, X, Plus, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { ComparisonSkeleton } from './BibleSkeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ComparisonContentProps {
  book: string;
  chapter: number;
  versionIds: string[];
  bibleVersions: any[];
  theme: {
    bg: string;
    text: string;
    verseNumber: string;
  };
  font: string;
  fontSize: number;
  onClose: () => void;
  onManageClick: () => void;
  onVersionRemove: (id: string) => void;
}

const versionColors = [
  'rgba(210, 57, 82, 0.03)', // Rose
  'rgba(0, 106, 111, 0.03)', // Teal
  'rgba(59, 130, 246, 0.03)', // Blue
  'rgba(245, 158, 11, 0.03)', // Amber
  'rgba(16, 185, 129, 0.03)', // Emerald
  'rgba(139, 92, 246, 0.03)', // Violet
];

export default function ComparisonContent({
  book,
  chapter,
  versionIds,
  bibleVersions,
  theme,
  font,
  fontSize,
  onClose,
  onManageClick,
  onVersionRemove
}: ComparisonContentProps) {
  const [contents, setContents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAllVersions = async () => {
      if (!book || !chapter || versionIds.length === 0) return;
      
      setIsLoading(true);
      setError(null);
      try {
        const fetchPromises = versionIds.map(vId => 
          fetch(`/api/v1/bible/${vId}/${book}/${chapter}`).then(res => res.json())
        );
        
        const results = await Promise.all(fetchPromises);
        
        if (isMounted) {
          const successResults = results.filter(r => r.success).map(r => r.data);
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
  }, [book, chapter, versionIds]);

  if (isLoading) {
    return <ComparisonSkeleton theme={theme} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] px-6 text-center w-full" style={{ backgroundColor: theme.bg }}>
        <div className="size-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <X className="size-8 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Comparison Failed</h3>
        <p className="text-gray-500 max-w-xs">{error}</p>
      </div>
    );
  }

  // Get all unique verse numbers across all versions
  const allVerseNumbers = Array.from(new Set(
    contents.flatMap(c => c.verses.map((v: any) => v.number))
  )).sort((a, b) => a - b);

  const getAbbreviation = (id: string, versionData: any) => {
     // If versionData is an object (from API), use abbreviation or name
     const versionStr = typeof versionData === 'object' 
        ? (versionData.abbreviation || versionData.name || 'Bible') 
        : versionData;

     if (versionStr && versionStr.length <= 10) return versionStr;
     
     const v = bibleVersions.find(v => v.id === id);
     return v?.name || versionStr || 'Version';
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full flex flex-col" 
      style={{ backgroundColor: theme.bg }}
    >
      {/* Comparison Grid Container */}
      <div className="flex-1 w-full max-w-[98%] mx-auto overflow-y-auto custom-scrollbar pt-8 pb-32">
        <div className="px-2">
            {/* Header Labels (Fixed atop grid) */}
            <div 
              className="grid gap-1 mb-6 sticky top-[60px] z-10 py-4 px-4 backdrop-blur-xl border-b border-black/[0.05]"
              style={{ 
                gridTemplateColumns: `repeat(${contents.length}, minmax(0, 1fr))`,
                backgroundColor: `${theme.bg}CC`
              }}
            >
              {contents.map(content => {
                const abbreviation = getAbbreviation(content.versionId, content.version);
                return (
                  <div key={content.versionId} className="text-center">
                    <h3 className="text-[var(--color-primary-teal)] font-bold text-xs sm:text-sm uppercase tracking-widest py-1">
                      {abbreviation}
                    </h3>
                  </div>
                );
              })}
            </div>

            {/* Verses Table-like Grid */}
            <div className="space-y-4">
              {allVerseNumbers.map((num, vIndex) => (
                <motion.div 
                  key={num} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: vIndex * 0.01 }}
                  className="grid gap-4"
                  style={{ gridTemplateColumns: `repeat(${contents.length}, minmax(0, 1fr))` }}
                >
                  {contents.map((content, idx) => {
                    const verse = content.verses.find((v: any) => v.number === num);
                    const bg = versionColors[idx % versionColors.length];
                    
                    return (
                      <div 
                        key={content.versionId} 
                        className="px-4 py-4 rounded-[2rem] transition-all hover:scale-[1.01] border border-transparent hover:border-black/[0.03] shadow-sm"
                        style={{ 
                          backgroundColor: theme.bg === '#fefefe' ? bg : 'rgba(255,255,255,0.03)',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <span className="font-bold text-[0.75rem] mt-1 leading-none opacity-40" style={{ color: theme.verseNumber }}>{num}</span>
                          <p 
                            style={{ 
                              fontFamily: font, 
                              fontSize: `${fontSize}px`,
                              color: theme.text 
                            }}
                            className="leading-relaxed text-base font-normal flex-1"
                          >
                            {verse?.text || (
                               <span className="italic text-gray-300">Verse not available in this version</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              ))}
            </div>
        </div>
      </div>

      {/* Floating Panel Footer removed in favor of Side Drawer Menu */}
    </motion.div>
  );
}
