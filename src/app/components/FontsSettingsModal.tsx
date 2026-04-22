import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronLeft, Sun, Moon, Sparkles, BookOpen, Smartphone, FileIcon, SquareSplitHorizontal } from 'lucide-react';

export type ThemeType = 'light' | 'sepia' | 'cream' | 'dark';
export type TransitionType = 'slide' | 'fade' | 'flip' | 'curl' | 'scroll';

interface FontsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFont: string;
  onFontChange: (font: string) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  selectedTheme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  pageTransition: TransitionType;
  onPageTransitionChange: (transition: TransitionType) => void;
}

const FONTS = [
  'Times New Roman',
  'Georgia',
  'Arial',
  'Verdana',
  'Helvetica',
  'Merriweather'
];

export default function FontsSettingsModal({
  isOpen,
  onClose,
  selectedFont,
  onFontChange,
  fontSize,
  onFontSizeChange,
  selectedTheme,
  onThemeChange,
  pageTransition,
  onPageTransitionChange,
}: FontsSettingsModalProps) {
  
  // Prevent scrolling on body when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFontSizeChange(Number(e.target.value));
  };

  const calculateProgress = () => {
    const min = 12;
    const max = 24;
    return ((fontSize - min) / (max - min)) * 100;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Bottom Sheet Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[101] max-w-lg mx-auto bg-white rounded-t-[24px] shadow-2xl pb-safe flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <button 
                onClick={onClose}
                className="flex items-center text-gray-500 hover:text-gray-700 font-medium py-2 px-2 -ml-2"
              >
                <ChevronLeft size={20} className="mr-1" />
                Back
              </button>
              <h2 className="text-[17px] font-semibold text-[#111111]">Fonts & Settings</h2>
              <button 
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 font-medium py-2 px-2 -mr-2"
              >
                Done
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto px-6 py-6 pb-12 space-y-8">
              
              {/* Font Family Section */}
              <div className="space-y-3">
                <label className="block text-[#888888] text-[13px] font-medium">Font size</label>
                <div className="relative">
                  <select
                    value={selectedFont}
                    onChange={(e) => onFontChange(e.target.value)}
                    className="w-full appearance-none bg-white border border-[#E0E0E0] rounded-xl px-4 py-3.5 text-[#111] text-[15px] outline-none hover:border-gray-300 transition-colors cursor-pointer tracking-wide"
                    // Special styling for Times New Roman if selected
                    style={{ fontFamily: selectedFont === 'Times New Roman' ? '"Times New Roman", Times, serif' : 'inherit' }}
                  >
                    {FONTS.map(font => (
                      <option key={font} value={font} style={{ fontFamily: font }}>
                        {font} {/* Pluralized intentionally to match figma visually if they want, but standard is Roman */}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                </div>
              </div>

              {/* Font Size Settings */}
              <div className="space-y-3">
                <label className="block text-[#888888] text-[13px] font-medium">Font size</label>
                <div className="flex items-center gap-4 px-2">
                  <span className="text-[15px] font-medium text-gray-600">A-</span>
                  <div className="flex-1 relative flex items-center h-6">
                    <input
                      type="range"
                      min="12"
                      max="24"
                      step="1"
                      value={fontSize}
                      onChange={handleSliderChange}
                      className="absolute w-full h-[6px] appearance-none rounded-full cursor-pointer z-10 opacity-0"
                    />
                    {/* Custom Track Background */}
                    <div className="w-full h-[3px] bg-[#E5E5E8] rounded-full absolute pointer-events-none"></div>
                    {/* Custom Track Active */}
                    <div 
                      className="h-[3px] bg-[#EE4B5E] rounded-full absolute pointer-events-none" 
                      style={{ width: `${calculateProgress()}%` }}
                    ></div>
                    {/* Custom Thumb */}
                    <div 
                      className="w-5 h-5 bg-[#EE4B5E] border-2 border-white rounded-full absolute shadow-sm pointer-events-none transform -translate-x-1/2 -ml-[1px]"
                      style={{ left: `${calculateProgress()}%` }}
                    ></div>
                    {/* Track indicators */}
                    <div className="absolute w-full flex justify-between px-[2px] pointer-events-none">
                      <div className="w-[4px] h-[4px] rounded-full bg-[#E5E5E8]" />
                      <div className="w-[4px] h-[4px] rounded-full bg-[#E5E5E8]" />
                      <div className="w-[4px] h-[4px] rounded-full bg-[#E5E5E8]" />
                    </div>
                  </div>
                  <span className="text-[17px] font-medium text-[#111]">A+</span>
                </div>
              </div>

              {/* Theme Settings */}
              <div className="space-y-4">
                <label className="block text-[#888888] text-[13px] font-medium">Theme</label>
                <div className="flex items-center justify-between px-2 gap-4">
                  {/* Light */}
                  <button 
                    onClick={() => onThemeChange('light')}
                    className={`w-14 h-10 rounded-full flex items-center justify-center transition-all ${
                      selectedTheme === 'light' ? 'border-[1.5px] border-[#BBBBBB]' : 'border border-[#E5E5E8]'
                    } bg-[#FFFFFF]`}
                  >
                    <Sun size={15} className={selectedTheme === 'light' ? 'text-[#333]' : 'text-gray-400'} />
                  </button>
                  {/* Sepia/Greenish */}
                  <button 
                    onClick={() => onThemeChange('sepia')}
                    className={`w-14 h-10 rounded-full flex items-center justify-center transition-all ${
                      selectedTheme === 'sepia' ? 'border-[1.5px] border-[#BBBBBB]' : 'border border-[#E5E5E8]'
                    } bg-[#FFF5FA]`}
                  >
                    <BookOpen size={15} className={selectedTheme === 'sepia' ? 'text-[#10B981]' : 'text-[#10B981]/50'} />
                  </button>
                  {/* Cream/Yellow */}
                  <button 
                    onClick={() => onThemeChange('cream')}
                    className={`w-14 h-10 rounded-full flex items-center justify-center transition-all ${
                      selectedTheme === 'cream' ? 'border-[1.5px] border-[#BBBBBB]' : 'border border-[#E5E5E8]'
                    } bg-[#FEF4E2]`}
                  >
                    <Sparkles size={15} className={selectedTheme === 'cream' ? 'text-[#B45309]' : 'text-[#B45309]/50'} />
                  </button>
                  {/* Dark */}
                  <button 
                    onClick={() => onThemeChange('dark')}
                    className={`w-14 h-10 rounded-full flex items-center justify-center transition-all ${
                      selectedTheme === 'dark' ? 'border-[1.5px] border-[#555]' : 'border border-transparent'
                    } bg-[#2D2D2D]`}
                  >
                    <Moon size={15} className="text-white" />
                  </button>
                </div>
              </div>

              {/* Page Transitions Settings */}
              <div className="space-y-4">
                <label className="block text-[#888888] text-[13px] font-medium">Page transitions</label>
                <div className="grid grid-cols-3 gap-4">
                  {/* Slide */}
                  <button
                    onClick={() => onPageTransitionChange('slide')}
                    className="flex flex-col items-center gap-2 group outline-none"
                  >
                    <div className={`w-16 h-16 rounded-[16px] flex items-center justify-center transition-all ${
                      pageTransition === 'slide' 
                      ? 'border-[1.5px] border-gray-400 bg-[#F5F5F7] shadow-sm' 
                      : 'border-[1.5px] border-transparent bg-[#F5F5F7] hover:border-gray-200'
                    }`}>
                      <div className="w-8 h-8 rounded border-2 border-[#111] flex items-center justify-center mt-1">
                        <div className="w-6 h-1 bg-[#111]" />
                      </div>
                    </div>
                    <span className="text-[13px] text-[#555] font-medium">Slide</span>
                  </button>

                  {/* Fade */}
                  <button
                    onClick={() => onPageTransitionChange('fade')}
                    className="flex flex-col items-center gap-2 group outline-none"
                  >
                    <div className={`w-16 h-16 rounded-[16px] flex items-center justify-center transition-all ${
                      pageTransition === 'fade' 
                      ? 'border-[1.5px] border-gray-400 bg-[#F5F5F7] shadow-sm' 
                      : 'border-[1.5px] border-transparent bg-[#F5F5F7] hover:border-gray-200'
                    }`}>
                      <FileIcon size={24} className="text-[#111]" strokeWidth={1.5} />
                    </div>
                    <span className="text-[13px] text-[#555] font-medium">Fade</span>
                  </button>

                  {/* Flip */}
                  <button
                    onClick={() => onPageTransitionChange('flip')}
                    className="flex flex-col items-center gap-2 group outline-none"
                  >
                    <div className={`w-16 h-16 rounded-[16px] flex items-center justify-center transition-all ${
                      pageTransition === 'flip' 
                      ? 'border-[1.5px] border-gray-400 bg-[#F5F5F7] shadow-sm' 
                      : 'border-[1.5px] border-transparent bg-[#F5F5F7] hover:border-gray-200'
                    }`}>
                      <SquareSplitHorizontal size={26} className="text-[#111]" strokeWidth={1.5} />
                    </div>
                    <span className="text-[13px] text-[#555] font-medium">Flip</span>
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}
