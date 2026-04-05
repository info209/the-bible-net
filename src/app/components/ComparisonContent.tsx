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
              className="grid gap-1 mb-6 sticky top-0 z-10 py-2"
              style={{ 
                gridTemplateColumns: `repeat(${contents.length}, minmax(0, 1fr))`,
                backgroundColor: theme.bg
              }}
            >
              {contents.map(content => {
                const abbreviation = getAbbreviation(content.versionId, content.version);
                return (
                  <div key={content.versionId} className="text-center">
                    <h3 className="text-[#d23952] font-black text-xs sm:text-sm uppercase tracking-widest py-1">
                      {abbreviation}
                    </h3>
                  </div>
                );
              })}
            </div>

            {/* Verses Table-like Grid */}
            <div className="space-y-1 sm:space-y-2">
              {allVerseNumbers.map(num => (
                <div 
                  key={num} 
                  className="grid gap-1 sm:gap-2"
                  style={{ gridTemplateColumns: `repeat(${contents.length}, minmax(0, 1fr))` }}
                >
                  {contents.map(content => {
                    const verse = content.verses.find((v: any) => v.number === num);
                    return (
                      <div 
                        key={content.versionId} 
                        className="px-3 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-[2rem] transition-all hover:bg-black/[0.03]"
                        style={{ backgroundColor: theme.bg === '#ffffff' ? '#fcfcfc' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,0,0,0.02)' }}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <span className="text-[#d23952] font-semibold text-xs sm:text-sm mt-1 leading-none">{num}</span>
                          <p 
                            style={{ 
                              fontFamily: font, 
                              fontSize: `${fontSize}px`,
                              color: theme.text 
                            }}
                            className="leading-relaxed leading-7 text-sm sm:text-base font-normal"
                          >
                            {verse?.text || '—'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
        </div>
      </div>

      {/* Floating Panel as per Screenshot 4 UI style */}
      <div className="fixed bottom-24 right-8 z-50">
        <Popover>
          <PopoverTrigger asChild>
            <button className="bg-white/95 backdrop-blur-md text-[#31393a] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 rounded-[2rem] pl-6 pr-4 py-3 flex items-center gap-4 hover:bg-white transition-all transform hover:scale-105 active:scale-95 duration-300 group">
              <div className="flex flex-col items-start">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Comparing</span>
                  <span className="text-sm font-black text-[#1e293b]">{contents.length} Versions</span>
              </div>
              <div className="flex -space-x-2.5">
                {versionIds.slice(0, 3).map((id, i) => (
                  <div key={id} className="size-9 rounded-full bg-[#fbebee] border-4 border-white flex items-center justify-center text-[10px] font-black text-[#d23952] shadow-sm transform transition-all group-hover:translate-x-1" style={{ zIndex: 3-i }}>
                    {getAbbreviation(id, '').substring(0, 3)}
                  </div>
                ))}
                {versionIds.length > 3 && (
                   <div className="size-9 rounded-full bg-gray-100 border-4 border-white flex items-center justify-center text-[10px] font-black text-gray-500 shadow-sm" style={{ zIndex: 0 }}>
                      +{versionIds.length - 3}
                   </div>
                )}
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0 rounded-3xl overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] border-none mt-4 mr-0 sm:mr-4" align="end">
             <div className="p-6 bg-white">
                <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-5">Current Library</h4>
                <div className="space-y-4 mb-8">
                  {versionIds.map(vId => {
                    const v = bibleVersions.find(v => v.id === vId);
                    return (
                      <div key={vId} className="flex items-center justify-between group">
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-[#1e293b] tracking-wide">{v?.name || vId}</span>
                            <span className="text-[10px] text-gray-400 font-medium truncate max-w-[140px] uppercase tracking-wider">{v?.fullName || 'Full Version Name'}</span>
                        </div>
                        <button 
                          onClick={() => {
                            if (versionIds.length > 2) {
                               onVersionRemove(vId);
                            }
                          }}
                          className={`${versionIds.length > 2 ? 'text-gray-200 hover:text-red-500' : 'text-gray-100 cursor-not-allowed'} transition-colors p-2 rounded-full hover:bg-gray-50`}
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                   <button 
                     onClick={() => {
                        onManageClick();
                     }}
                     className="w-full flex items-center justify-between text-xs font-black text-[#006a6f] hover:bg-[#ebf8f8] transition-all py-4 px-4 rounded-2xl group border border-[#ebf8f8]"
                   >
                     <span>ADD VERSION</span>
                     <Plus className="size-4 transform group-hover:rotate-90 transition-transform" />
                   </button>
                   
                   <button 
                     onClick={onClose}
                     className="w-full flex items-center justify-between text-xs font-black text-[#d23952] hover:bg-[#fbebee] transition-all py-4 px-4 rounded-2xl group"
                   >
                     <span>EXIT COMPARE</span>
                     <LogOut className="size-4 transform group-hover:translate-x-1 transition-transform" />
                   </button>
                </div>
             </div>
          </PopoverContent>
        </Popover>
      </div>
    </motion.div>
  );
}
