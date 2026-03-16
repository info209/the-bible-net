"use client";
import { useEffect, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface ComparisonContentProps {
  book: string;
  chapter: number;
  version1: string;
  version2: string;
  theme: {
    bg: string;
    text: string;
    verseNumber: string;
  };
  font: string;
  fontSize: number;
  onClose: () => void;
  onVersion2Change: () => void;
  displayVersionName1: string;
  displayVersionName2: string;
}

export default function ComparisonContent({
  book,
  chapter,
  version1,
  version2,
  theme,
  font,
  fontSize,
  onClose,
  onVersion2Change,
  displayVersionName1,
  displayVersionName2
}: ComparisonContentProps) {
  const [content, setContent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchComparison = async () => {
      if (!book || !chapter || !version1 || !version2) return;
      
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/v1/bible/compare/${version1}/${version2}/${book}/${chapter}`);
        const result = await response.json();

        if (isMounted) {
          if (result.success) {
            setContent(result.data);
          } else {
            setError(result.error || 'Failed to fetch comparison');
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

    fetchComparison();

    return () => {
      isMounted = false;
    };
  }, [book, chapter, version1, version2]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 w-full" style={{ backgroundColor: theme.bg }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary-teal)]"></div>
        <p className="text-sm font-medium text-gray-500 animate-pulse">Aligning versions...</p>
      </div>
    );
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

  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: theme.bg }}>
      {/* Comparison Header - Sticky for side-by-side versions */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 flex divide-x divide-gray-200">
          <div className="w-10 sm:w-12 flex-shrink-0" /> {/* Spacer for verse numbers column */}
          <div className="flex-1 flex divide-x divide-gray-200">
            <div className="flex-1 p-2 sm:p-3 flex items-center min-w-0">
              <span className="font-semibold text-xs sm:text-sm text-[#d23952] truncate" title={displayVersionName1}>
                {displayVersionName1}
              </span>
            </div>
            <div className="flex-1 p-2 sm:p-3 flex justify-between items-center min-w-0">
              <button 
                onClick={onVersion2Change}
                className="font-semibold text-xs sm:text-sm text-[#006a6f] flex items-center gap-1 hover:text-[#005a5f] transition-colors truncate"
              >
                <span className="truncate" title={displayVersionName2}>{displayVersionName2}</span>
                <ChevronDown className="size-3 flex-shrink-0" />
              </button>
              <button 
                onClick={onClose}
                className="text-gray-400 p-1 hover:bg-gray-100 rounded-full flex-shrink-0 transition-colors ml-1"
              >
                <X className="size-3 sm:size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Rows */}
      <div className="max-w-3xl mx-auto px-4 mb-20">
        <div className="space-y-0">
          {content?.verses.map((verse: any) => (
            <div 
              key={verse.number} 
              className="flex divide-x divide-gray-100 border-b border-gray-50 hover:bg-black/5 transition-colors"
              id={`verse-compare-${verse.number}`}
            >
              {/* Verse Number Column */}
              <div className="w-10 sm:w-12 flex-shrink-0 flex justify-center py-4">
                <span className="text-[10px] sm:text-xs font-bold" style={{ color: theme.verseNumber }}>
                  {verse.number}
                </span>
              </div>

              {/* Left Version Column */}
              <div className="flex-1 p-3 sm:p-4">
                <p 
                  style={{ 
                    fontFamily: font, 
                    fontSize: `${fontSize}px`,
                    color: theme.text 
                  }}
                  className="leading-relaxed whitespace-pre-wrap"
                >
                  {verse.v1}
                </p>
              </div>

              {/* Right Version Column */}
              <div className="flex-1 p-3 sm:p-4">
                <p 
                  style={{ 
                    fontFamily: font, 
                    fontSize: `${fontSize}px`,
                    color: theme.text 
                  }}
                  className="leading-relaxed whitespace-pre-wrap"
                >
                  {verse.v2}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
