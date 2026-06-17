import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CompareVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: Array<{ id: string; name: string; fullName: string; language: string }>;
  selectedVersions: string[];
  onToggleVersion: (versionName: string) => void;
  onStartCompare: () => void;
  isDark?: boolean;
  selectedTheme?: 'light' | 'sepia' | 'cream' | 'dark';
}

export default function CompareVersionsModal({
  isOpen,
  onClose,
  versions,
  selectedVersions,
  onToggleVersion,
  onStartCompare,
  isDark = false,
  selectedTheme,
}: CompareVersionsModalProps) {
  const canCompare = selectedVersions.length >= 2 && selectedVersions.length <= 4;

  // Premium Themes Styling Variables
  const theme = selectedTheme || (isDark ? 'dark' : 'light');
  
  const backdropBg = {
    light: 'rgba(0,0,0,0.4)',
    sepia: 'rgba(0,0,0,0.45)',
    cream: 'rgba(0,0,0,0.45)',
    dark: 'rgba(0,0,0,0.85)'
  }[theme];

  const backdropBlur = {
    light: 'blur(4px)',
    sepia: 'blur(4px)',
    cream: 'blur(4px)',
    dark: 'blur(8px)'
  }[theme];

  const modalBg = {
    light: '#ffffff',
    sepia: '#F7EFED',
    cream: '#FEF6EB',
    dark: '#1c1c1e'
  }[theme];

  const borderCol = {
    light: 'rgba(0,0,0,0.1)',
    sepia: 'rgba(92, 74, 58, 0.15)',
    cream: 'rgba(74, 63, 42, 0.15)',
    dark: 'rgba(255, 255, 255, 0.08)'
  }[theme];

  const textCol = {
    light: '#31393a',
    sepia: '#5c4a3a',
    cream: '#4a3f2a',
    dark: '#e5e7e7'
  }[theme];

  const subTextCol = {
    light: '#7c7c7c',
    sepia: '#7d6855',
    cream: '#6e5f46',
    dark: '#8e8e93'
  }[theme];
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 transition-all duration-300"
          style={{ backgroundColor: backdropBg, backdropFilter: backdropBlur }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative rounded-2xl shadow-[var(--shadow-lg)] w-[90%] max-w-md max-h-[80vh] overflow-hidden flex flex-col transition-all duration-300"
          style={{
            backgroundColor: modalBg,
            border: `1px solid ${borderCol}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: borderCol }}>
            <h2 className="text-xl font-semibold" style={{ color: textCol }}>
              Compare Versions
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full transition-colors"
              style={{ color: textCol, hoverBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' } as any}
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {/* Group by language */}
              {['English', 'Telugu', 'Hindi'].map((language) => {
                const languageVersions = versions.filter(v => v.language === language);
                if (languageVersions.length === 0) return null;

                return (
                  <div key={language} className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: subTextCol }}>
                      {language}
                    </p>
                    <div className="space-y-2">
                      {languageVersions.map((version) => {
                        const isSelected = selectedVersions.includes(version.id);
                        const isDisabled = !isSelected && selectedVersions.length >= 4;

                        // Dynamic colors for buttons
                        let btnBg = '';
                        let btnText = '';
                        let btnBorder = 'transparent';

                        if (isSelected) {
                          btnBg = theme === 'dark' ? 'rgba(255,71,87,0.15)' : 'rgba(226,55,68,0.1)';
                          btnText = theme === 'dark' ? '#ff4757' : '#E23744';
                          btnBorder = theme === 'dark' ? 'rgba(255,71,87,0.3)' : 'rgba(226,55,68,0.15)';
                        } else if (isDisabled) {
                          btnBg = {
                            light: '#f1f3f3',
                            sepia: '#EDE3E1',
                            cream: '#F5E8D5',
                            dark: '#1c1c1e'
                          }[theme];
                          btnText = theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(49,57,58,0.3)';
                          btnBorder = theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'transparent';
                        } else {
                          btnBg = {
                            light: '#f1f3f3',
                            sepia: '#EDE3E1',
                            cream: '#F5E8D5',
                            dark: '#2c2c2e'
                          }[theme];
                          btnText = textCol;
                          btnBorder = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'transparent';
                        }

                        return (
                          <button
                            key={version.id}
                            onClick={() => !isDisabled && onToggleVersion(version.id)}
                            disabled={isDisabled}
                            className="w-full text-left px-4 py-2.5 rounded transition-all flex items-center justify-between border"
                            style={{
                              backgroundColor: btnBg,
                              color: btnText,
                              borderColor: btnBorder,
                              cursor: isDisabled ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <span className="text-sm font-semibold">{version.fullName} ({version.name})</span>
                            {isSelected && <Check className="size-4" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: borderCol }}>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{ color: subTextCol }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (canCompare) {
                  onStartCompare();
                  onClose();
                }
              }}
              disabled={!canCompare}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                canCompare
                  ? 'bg-[#E23744] text-white hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-red-500/10'
                  : 'bg-gray-300/40 text-gray-400 cursor-not-allowed'
              }`}
              style={
                !canCompare && isDark
                  ? { backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.2)' }
                  : undefined
              }
            >
              Compare
            </button>
          </div>
        </motion.div>
      </div>
  );
}
