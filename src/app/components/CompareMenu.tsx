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
      <div className="fixed inset-0 z-[250] flex justify-end" onClick={onClose}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="relative bg-white shadow-2xl w-full max-w-sm h-full flex flex-col border-l border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Compare Settings</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6">
            {/* 1. Currently comparing versions */}
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Currently Comparing
            </h3>
            <div className="space-y-2 mb-8">
              {selectedVersions.map((versionId) => {
                const version = versions.find(v => v.id === versionId);
                if (!version) return null;

                return (
                  <div
                    key={version.id}
                    className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 border border-gray-100 group"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 leading-tight">
                        {version.name}
                      </span>
                      <span className="text-[11px] text-gray-500 uppercase tracking-wider">
                        {version.fullName}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        if (selectedVersions.length > 2) {
                          onRemoveVersion(version.id);
                        }
                      }}
                      className={`p-2 rounded-full transition-all ${
                        selectedVersions.length > 2 
                          ? 'hover:bg-red-100 text-gray-400 hover:text-red-500' 
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                      title={selectedVersions.length <= 2 ? "Minimum 2 versions required" : "Remove version"}
                    >
                      <X className="size-4" strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 2. Available versions */}
            {canAddMore && availableVersions.length > 0 && (
              <>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                  <span>Available to Add</span>
                  <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[10px]">
                    Max 4
                  </span>
                </h3>
                <div className="space-y-2">
                  {availableVersions.map((version) => (
                    <button
                      key={version.id}
                      onClick={() => {
                        onAddVersion(version.id);
                        // Optional: keep it open so they can add multiple, or close it.
                        // User report didn't specify closing, but let's keep drawer open for better UX when adding.
                      }}
                      className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-white border border-gray-200 hover:border-[var(--color-primary-teal)] hover:bg-[var(--color-primary-teal-lighter)] transition-all text-left group"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-700 group-hover:text-[var(--color-primary-teal)] leading-tight">
                          {version.name}
                        </span>
                        <span className="text-[11px] text-gray-500 group-hover:text-[var(--color-primary-teal)]/70 uppercase tracking-wider">
                          {version.fullName}
                        </span>
                      </div>
                      <div className="p-1.5 rounded-full bg-gray-50 group-hover:bg-[var(--color-primary-teal)]/10 transition-colors">
                        <Plus className="size-4 text-gray-400 group-hover:text-[var(--color-primary-teal)]" strokeWidth={2.5} />
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
            {!canAddMore && (
               <div className="text-center py-4 text-sm font-medium text-gray-400">
                  Maximum 4 versions reached.
               </div>
            )}
          </div>

          {/* 3. Exit Compare Mode button */}
          <div className="p-5 border-t border-gray-100 bg-gray-50 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
            <button
              onClick={() => {
                onExitCompare();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 transition-all text-red-600 group"
            >
              <span className="text-sm font-bold">Exit Compare Mode</span>
              <ArrowRight className="size-4 transform group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
