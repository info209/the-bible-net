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
  isDark?: boolean;
  selectedTheme?: 'light' | 'sepia' | 'cream' | 'dark';
}

export default function CompareMenu({
  isOpen,
  onClose,
  versions,
  selectedVersions,
  onRemoveVersion,
  onAddVersion,
  onExitCompare,
  isDark = false,
  selectedTheme,
}: CompareMenuProps) {

  const availableVersions = versions.filter(v => !selectedVersions.includes(v.id));
  const canAddMore = selectedVersions.length < 4;

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

  const panelBg = {
    light: '#ffffff',
    sepia: '#f5e6c8',
    cream: '#f8f6f1',
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

  const headingCol = {
    light: '#111827',
    sepia: '#5c4a3a',
    cream: '#4a3f2a',
    dark: '#ffffff'
  }[theme];

  const subTextCol = {
    light: '#9ca3af',
    sepia: '#7d6855',
    cream: '#6e5f46',
    dark: 'rgba(255,255,255,0.4)'
  }[theme];

  const cardBg = {
    light: '#f9fafb',
    sepia: '#f2dec6',
    cream: '#fcf0db',
    dark: '#2c2c2e'
  }[theme];

  const cardBorder = {
    light: '#f3f4f6',
    sepia: 'rgba(92, 74, 58, 0.1)',
    cream: 'rgba(74, 63, 42, 0.1)',
    dark: 'rgba(255,255,255,0.04)'
  }[theme];

  const availableBtnBg = {
    light: '#ffffff',
    sepia: '#f5e6c8',
    cream: '#f8f6f1',
    dark: '#2c2c2e'
  }[theme];

  const availableBtnBorder = {
    light: '#e5e7eb',
    sepia: 'rgba(92, 74, 58, 0.15)',
    cream: 'rgba(74, 63, 42, 0.15)',
    dark: 'rgba(255,255,255,0.06)'
  }[theme];

  return (
    <div className="fixed inset-0 z-[250] flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 transition-all duration-300"
          style={{ backgroundColor: backdropBg, backdropFilter: backdropBlur }}
          onClick={onClose}
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="relative shadow-2xl w-full max-w-sm h-full flex flex-col transition-all duration-300 border-l"
          style={{
            backgroundColor: panelBg,
            borderColor: borderCol,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: borderCol }}>
            <h2 className="text-xl font-bold font-sans" style={{ color: headingCol }}>Compare Settings</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full transition-colors"
              style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#6b7280', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'transparent' }}
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6">
            {/* 1. Currently comparing versions */}
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: subTextCol }}>
              Currently Comparing
            </h3>
            <div className="space-y-2 mb-8">
              {selectedVersions.map((versionId) => {
                const version = versions.find(v => v.id === versionId);
                if (!version) return null;

                return (
                  <div
                    key={version.id}
                    className="flex items-center justify-between py-3 px-4 rounded-xl border transition-all duration-200"
                    style={{
                      backgroundColor: cardBg,
                      borderColor: cardBorder,
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold leading-tight" style={{ color: textCol }}>
                        {version.name}
                      </span>
                      <span className="text-[11px] uppercase tracking-wider mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#6b7280' }}>
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
                          ? isDark
                            ? 'hover:bg-red-500/20 text-white/40 hover:text-red-400'
                            : 'hover:bg-red-100 text-gray-400 hover:text-red-500'
                          : 'text-gray-300 cursor-not-allowed opacity-40'
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
                <h3 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center justify-between" style={{ color: subTextCol }}>
                  <span>Available to Add</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', color: textCol }}>
                    Max 4
                  </span>
                </h3>
                <div className="space-y-2">
                  {availableVersions.map((version) => (
                    <button
                      key={version.id}
                      onClick={() => {
                        onAddVersion(version.id);
                      }}
                      className="w-full flex items-center justify-between py-3 px-4 rounded-xl border transition-all text-left group"
                      style={{
                        backgroundColor: availableBtnBg,
                        borderColor: availableBtnBorder,
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-bold group-hover:text-[var(--color-primary-teal)] leading-tight transition-colors" style={{ color: textCol }}>
                          {version.name}
                        </span>
                        <span className="text-[11px] group-hover:text-[var(--color-primary-teal)]/70 uppercase tracking-wider mt-0.5 transition-colors" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#6b7280' }}>
                          {version.fullName}
                        </span>
                      </div>
                      <div className="p-1.5 rounded-full transition-colors" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }}>
                        <Plus className="size-4 text-gray-400 group-hover:text-[var(--color-primary-teal)] transition-colors" strokeWidth={2.5} />
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
            {!canAddMore && (
              <div className="text-center py-4 text-sm font-medium" style={{ color: subTextCol }}>
                Maximum 4 versions reached.
              </div>
            )}
          </div>

          {/* 3. Exit Compare Mode button */}
          <div className="p-5 border-t shadow-[0_-4px_10px_rgba(0,0,0,0.02)]" style={{ borderColor: borderCol, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb' }}>
            <button
              onClick={() => {
                onExitCompare();
                onClose();
              }}
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border transition-all group ${
                isDark 
                  ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400' 
                  : 'bg-red-50 hover:bg-red-100 border-red-100 text-red-600'
              }`}
            >
              <span className="text-sm font-bold">Exit Compare Mode</span>
              <ArrowRight className="size-4 transform group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
            </button>
          </div>
        </motion.div>
      </div>
  );
}
