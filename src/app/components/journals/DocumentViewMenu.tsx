'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreVertical,
  Pencil,
  Pin,
  Share2,
  Download,
  ChevronRight,
  FileText,
  FileType,
  Loader2,
} from 'lucide-react';
import { DocumentExportData, exportDocumentAsPdf, exportDocumentAsDocx, shareDocument } from '@/lib/export/documentExportService';

interface DocumentViewMenuProps {
  documentData: DocumentExportData;
  isPinned: boolean;
  onEdit: () => void;
  onTogglePin: () => void;
  onShare?: () => void;
  className?: string;
}

export default function DocumentViewMenu({
  documentData,
  isPinned,
  onEdit,
  onTogglePin,
  onShare,
  className = '',
}: DocumentViewMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloadSubmenuOpen, setIsDownloadSubmenuOpen] = useState(false);
  const [exportingType, setExportingType] = useState<'pdf' | 'docx' | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on outside click or tap
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsDownloadSubmenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsDownloadSubmenuOpen(false);
        triggerButtonRef.current?.focus();
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
      setIsDownloadSubmenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const handleEditClick = useCallback(() => {
    setIsOpen(false);
    setIsDownloadSubmenuOpen(false);
    onEdit();
  }, [onEdit]);

  const handlePinClick = useCallback(() => {
    setIsOpen(false);
    setIsDownloadSubmenuOpen(false);
    onTogglePin();
  }, [onTogglePin]);

  const handleShareClick = useCallback(async () => {
    setIsOpen(false);
    setIsDownloadSubmenuOpen(false);
    if (onShare) {
      onShare();
    } else {
      await shareDocument(documentData);
    }
  }, [onShare, documentData]);

  const handleExportPdf = useCallback(async () => {
    try {
      setExportingType('pdf');
      await exportDocumentAsPdf(documentData);
      setIsOpen(false);
      setIsDownloadSubmenuOpen(false);
    } catch {
      // Error toast is handled in export service
    } finally {
      setExportingType(null);
    }
  }, [documentData]);

  const handleExportDocx = useCallback(async () => {
    try {
      setExportingType('docx');
      await exportDocumentAsDocx(documentData);
      setIsOpen(false);
      setIsDownloadSubmenuOpen(false);
    } catch {
      // Error toast is handled in export service
    } finally {
      setExportingType(null);
    }
  }, [documentData]);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* 3-Dot Trigger Button */}
      <button
        ref={triggerButtonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B7A81] ${
          isOpen
            ? 'bg-gray-200/80 dark:bg-white/[0.12] text-[#0B7A81]'
            : 'hover:bg-gray-100 dark:hover:bg-white/[0.08] text-gray-600 dark:text-gray-300'
        }`}
        aria-label="Document options menu"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {/* Anchored Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-[#18181B] rounded-2xl shadow-xl border border-gray-100 dark:border-white/[0.08] py-1.5 z-50 select-none overflow-hidden"
            role="menu"
            aria-orientation="vertical"
          >
            {/* 1. Edit */}
            <button
              type="button"
              onClick={handleEditClick}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors cursor-pointer text-left focus:outline-none focus:bg-gray-50 dark:focus:bg-white/[0.06]"
              role="menuitem"
            >
              <Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" strokeWidth={1.8} />
              <span>Edit</span>
            </button>

            {/* 2. Pin / Unpin */}
            <button
              type="button"
              onClick={handlePinClick}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors cursor-pointer text-left focus:outline-none focus:bg-gray-50 dark:focus:bg-white/[0.06]"
              role="menuitem"
            >
              <Pin
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isPinned
                    ? 'text-[#0B7A81] fill-[#0B7A81] dark:text-[#14B8A6] dark:fill-[#14B8A6]'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
                strokeWidth={1.8}
              />
              <span>{isPinned ? 'Unpin' : 'Pin'}</span>
            </button>

            {/* 3. Share */}
            <button
              type="button"
              onClick={handleShareClick}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors cursor-pointer text-left focus:outline-none focus:bg-gray-50 dark:focus:bg-white/[0.06]"
              role="menuitem"
            >
              <Share2 className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" strokeWidth={1.8} />
              <span>Share</span>
            </button>

            {/* Divider */}
            <div className="my-1 border-t border-gray-100 dark:border-white/[0.06]" />

            {/* 4. Download with Nested / Accordion Presentation */}
            <div>
              <button
                type="button"
                onClick={() => setIsDownloadSubmenuOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors cursor-pointer text-left focus:outline-none focus:bg-gray-50 dark:focus:bg-white/[0.06]"
                role="menuitem"
                aria-haspopup="true"
                aria-expanded={isDownloadSubmenuOpen}
              >
                <div className="flex items-center gap-3">
                  <Download className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" strokeWidth={1.8} />
                  <span>Download</span>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    isDownloadSubmenuOpen ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {/* Submenu Options: PDF & Word */}
              <AnimatePresence>
                {isDownloadSubmenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden bg-gray-50/60 dark:bg-white/[0.03] border-y border-gray-100/80 dark:border-white/[0.04] py-1"
                  >
                    {/* PDF Download */}
                    <button
                      type="button"
                      disabled={exportingType !== null}
                      onClick={handleExportPdf}
                      className="w-full flex items-center justify-between pl-8 pr-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/[0.06] transition-colors cursor-pointer text-left disabled:opacity-50"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-3.5 h-3.5 text-[#0B7A81] dark:text-[#14B8A6]" />
                        <span>PDF</span>
                      </div>
                      {exportingType === 'pdf' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B7A81]" />
                      ) : (
                        <span className="text-[10px] text-gray-400 font-mono">.pdf</span>
                      )}
                    </button>

                    {/* Word (.docx) Download */}
                    <button
                      type="button"
                      disabled={exportingType !== null}
                      onClick={handleExportDocx}
                      className="w-full flex items-center justify-between pl-8 pr-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/[0.06] transition-colors cursor-pointer text-left disabled:opacity-50"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileType className="w-3.5 h-3.5 text-[#0B7A81] dark:text-[#14B8A6]" />
                        <span>Word</span>
                      </div>
                      {exportingType === 'docx' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B7A81]" />
                      ) : (
                        <span className="text-[10px] text-gray-400 font-mono">.docx</span>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
