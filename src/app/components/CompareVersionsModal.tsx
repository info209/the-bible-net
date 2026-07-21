import { useEffect } from 'react';
import { X, Check, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ModalHeader from './ModalHeader';

interface CompareVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: Array<{ id: string; name: string; fullName: string; language: string }>;
  selectedVersions: string[];
  onToggleVersion: (versionName: string) => void;
  onStartCompare: () => void;
  activeVersionId?: string | null;
  isDark?: boolean;
  selectedTheme?: 'light' | 'sepia' | 'cream' | 'dark';
}

function matchesVersion(v: { id: string; name: string; fullName?: string }, targetIdOrName?: string | null) {
  if (!targetIdOrName || !v) return false;
  return v.id === targetIdOrName || v.name === targetIdOrName || (v.fullName && v.fullName === targetIdOrName);
}

export default function CompareVersionsModal({
  isOpen,
  onClose,
  versions,
  selectedVersions,
  onToggleVersion,
  onStartCompare,
  activeVersionId,
  isDark = false,
  selectedTheme,
}: CompareVersionsModalProps) {
  // Find active version object matching activeVersionId or selectedVersions[0]
  const activeVersionObj = versions.find(v => activeVersionId ? matchesVersion(v, activeVersionId) : false)
    || versions.find(v => selectedVersions.some(s => matchesVersion(v, s)))
    || (versions.length > 0 ? versions[0] : null);

  const activeVersionCode = activeVersionObj ? activeVersionObj.id : (activeVersionId || selectedVersions[0]);
  const activeVersionDisplay = activeVersionObj ? activeVersionObj.name : (activeVersionId || 'active version');

  // Derive effective selected versions ensuring active reading version is always included
  const isActiveAlreadySelected = selectedVersions.some(s => matchesVersion(activeVersionObj || { id: activeVersionCode, name: activeVersionDisplay }, s));
  const effectiveSelectedVersions = !isActiveAlreadySelected && activeVersionCode
    ? [activeVersionCode, ...selectedVersions]
    : selectedVersions;

  // Calculate count of additional versions selected beyond active version
  const additionalCount = effectiveSelectedVersions.filter(s => !matchesVersion(activeVersionObj || { id: activeVersionCode, name: activeVersionDisplay }, s)).length;
  const canCompare = additionalCount >= 1 && effectiveSelectedVersions.length <= 4;

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
          className="relative rounded-lg shadow-[var(--shadow-lg)] w-[90%] max-w-md max-h-[80vh] overflow-hidden flex flex-col transition-all duration-300"
          style={{
            backgroundColor: modalBg,
            border: `1px solid ${borderCol}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <ModalHeader
            title="Compare versions"
            onClose={onClose}
            textCol={textCol}
            borderCol={borderCol}
            isDark={isDark}
          />

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Validation / Helper Notice */}
            {!canCompare ? (
              <div
                className="mb-4 p-3 rounded-lg text-xs font-medium flex items-center gap-2.5 border"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
                  borderColor: theme === 'dark' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.25)',
                  color: theme === 'dark' ? '#fbbf24' : '#b45309'
                }}
              >
                <Info className="size-4 shrink-0" />
                <span>Select at least 1 additional version to compare with <strong>{activeVersionDisplay}</strong>.</span>
              </div>
            ) : (
              <div
                className="mb-4 p-3 rounded-lg text-xs font-medium flex items-center gap-2.5 border"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(34, 197, 94, 0.08)',
                  borderColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.25)',
                  color: theme === 'dark' ? '#4ade80' : '#15803d'
                }}
              >
                <Check className="size-4 shrink-0" />
                <span>Comparing <strong>{activeVersionDisplay}</strong> with {additionalCount} additional version{additionalCount > 1 ? 's' : ''}.</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Group by language */}
              {['English', 'Telugu', 'Hindi'].map((language) => {
                const languageVersions = versions.filter(v => v.language === language);
                if (languageVersions.length === 0) return null;

                return (
                  <div key={language} className="space-y-2">
                    <p className="text-xs font-bold tracking-wider mb-2" style={{ color: subTextCol }}>
                      {language}
                    </p>
                    <div className="space-y-2">
                      {languageVersions.map((version) => {
                        const isActiveVersion = activeVersionObj ? matchesVersion(version, activeVersionObj.id) || matchesVersion(version, activeVersionObj.name) : false;
                        const isSelected = effectiveSelectedVersions.some(s => matchesVersion(version, s));
                        const isDisabled = !isSelected && effectiveSelectedVersions.length >= 4;

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
                            onClick={() => {
                              if (isActiveVersion) {
                                // Active version is locked as the base version
                                return;
                              }
                              if (!isDisabled) {
                                onToggleVersion(version.id);
                              }
                            }}
                            disabled={isDisabled}
                            className="w-full text-left px-4 py-2.5 rounded transition-all flex items-center justify-between border"
                            style={{
                              backgroundColor: btnBg,
                              color: btnText,
                              borderColor: btnBorder,
                              cursor: isActiveVersion ? 'default' : (isDisabled ? 'not-allowed' : 'pointer')
                            }}
                            title={isActiveVersion ? "Active reading version (required base version)" : undefined}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-semibold truncate">{version.fullName} ({version.name})</span>
                              {isActiveVersion && (
                                <span
                                  className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full shrink-0 uppercase"
                                  style={{
                                    backgroundColor: theme === 'dark' ? 'rgba(255, 71, 87, 0.25)' : 'rgba(226, 55, 68, 0.15)',
                                    color: theme === 'dark' ? '#ff6b7b' : '#E23744',
                                    border: `1px solid ${theme === 'dark' ? 'rgba(255, 71, 87, 0.4)' : 'rgba(226, 55, 68, 0.25)'}`
                                  }}
                                >
                                  Active
                                </span>
                              )}
                            </div>
                            {isSelected && <Check className="size-4 shrink-0" />}
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

