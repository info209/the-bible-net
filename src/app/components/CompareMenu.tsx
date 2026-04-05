import { X, Plus, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CompareMenuProps {
  isOpen: boolean;
  onClose: () => void;
  versions: Array<{ id: string; name: string; fullName: string; language: string }>;
  selectedVersions: string[];
  onRemoveVersion: (versionName: string) => void;
  onAddVersion: (versionName: string) => void;
  onExitCompare: () => void;
}

export default function CompareMenu({
  isOpen,
  onClose,
  versions,
  selectedVersions,
  onRemoveVersion,
  onAddVersion,
  onExitCompare
}: CompareMenuProps) {
  if (!isOpen) return null;

  const availableVersions = versions.filter(v => !selectedVersions.includes(v.id));
  const canAddMore = selectedVersions.length < 4;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150]" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute right-4 top-16 glass-light border border-white/30 rounded-lg shadow-[var(--shadow-lg)] w-[320px] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="font-semibold text-[var(--color-text-primary)]">
              Currently Comparing:
            </h3>
          </div>

          {/* Selected Versions */}
          <div className="px-4 py-2 space-y-1">
            {selectedVersions.map((versionId) => {
              const version = versions.find(v => v.id === versionId);
              if (!version) return null;

              return (
                <div
                  key={version.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-teal)]" />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      {version.name}
                    </span>
                  </div>
                  <button
                    onClick={() => onRemoveVersion(version.id)}
                    className="p-1 rounded-full transition-all hover:bg-red-500/20"
                  >
                    <X className="size-4 text-[var(--color-text-primary)]/60 group-hover:text-red-500 transition-colors" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add More Versions */}
          {canAddMore && availableVersions.length > 0 && (
            <>
              <div className="border-t border-white/10 my-2" />
              <div className="px-4 py-2 space-y-1 max-h-[200px] overflow-y-auto">
                {availableVersions.map((version) => (
                  <button
                    key={version.id}
                    onClick={() => {
                      onAddVersion(version.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/10 transition-colors text-left group"
                  >
                    <span className="text-sm text-[var(--color-text-primary)]">
                      {version.name}
                    </span>
                    <div className="p-1 rounded-full transition-all group-hover:bg-red-500/20">
                      <Plus className="size-4 text-[var(--color-text-primary)]/60 group-hover:text-red-500 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Exit Compare Mode */}
          <div className="border-t border-white/10 mt-2">
            <button
              onClick={() => {
                onExitCompare();
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-500/10 transition-colors text-red-500"
            >
              <span className="text-sm font-medium">Exit Compare Mode</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
