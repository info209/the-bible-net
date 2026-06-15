'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, BookOpen, Pencil, Share2, Trash2 } from 'lucide-react';

interface CardKebabMenuProps {
  onRead?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
}

export default function CardKebabMenu({
  onRead,
  onEdit,
  onShare,
  onDelete,
}: CardKebabMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const items = [
    { label: 'Read',   icon: BookOpen, action: onRead,   color: 'text-gray-700' },
    { label: 'Edit',   icon: Pencil,   action: onEdit,   color: 'text-gray-700' },
    { label: 'Share',  icon: Share2,   action: onShare,  color: 'text-gray-700' },
    { label: 'Delete', icon: Trash2,   action: onDelete, color: 'text-red-500'  },
  ].filter(i => i.action); // only show items with handlers

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="More options"
      >
        <MoreVertical className="w-4 h-4 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {items.map(({ label, icon: Icon, action, color }) => (
            <button
              key={label}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                action?.();
              }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium hover:bg-gray-50 transition-colors ${color}`}
            >
              <Icon className="w-4 h-4" strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
