import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CompareVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: Array<{ id: string; name: string; fullName: string; language: string }>;
  selectedVersions: string[];
  onToggleVersion: (versionName: string) => void;
  onStartCompare: () => void;
}

export default function CompareVersionsModal({
  isOpen,
  onClose,
  versions,
  selectedVersions,
  onToggleVersion,
  onStartCompare
}: CompareVersionsModalProps) {
  const canCompare = selectedVersions.length >= 2 && selectedVersions.length <= 4;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative glass-light border border-white/30 rounded-2xl shadow-[var(--shadow-lg)] w-[90%] max-w-md max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Compare Versions
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="size-5 text-[var(--color-text-primary)]/60" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-3">
              {/* Group by language */}
              {['English', 'Telugu', 'Hindi'].map((language) => {
                const languageVersions = versions.filter(v => v.language === language);
                if (languageVersions.length === 0) return null;

                return (
                  <div key={language} className="space-y-2">
                    <p className="text-sm text-[var(--color-text-primary)]/60 mb-2">{language}</p>
                    {languageVersions.map((version) => {
                      const isSelected = selectedVersions.includes(version.id);
                      const isDisabled = !isSelected && selectedVersions.length >= 4;

                      return (
                        <button
                          key={version.id}
                          onClick={() => !isDisabled && onToggleVersion(version.id)}
                          disabled={isDisabled}
                          className={`w-full text-left px-4 py-2.5 rounded transition-colors ${isSelected
                              ? 'bg-[#fde8ea] text-[#E23744]'
                              : isDisabled
                                ? 'bg-[#f1f3f3] text-[var(--color-text-primary)]/40 cursor-not-allowed'
                                : 'bg-[#f1f3f3] text-[#31393a] hover:bg-[#e5e7e7]'
                            }`}
                        >
                          <div className="text-base font-medium">{version.fullName} ({version.name})</div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[var(--color-text-primary)]/70 hover:text-[var(--color-text-primary)] transition-colors"
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
              className={`px-6 py-2 rounded-lg font-medium transition-all ${canCompare
                  ? 'bg-[#E23744] text-white hover:bg-[#E23744]/90 shadow-md'
                  : 'bg-gray-300/50 text-gray-500 cursor-not-allowed'
                }`}
            >
              Compare
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
