import React from 'react';
import { X } from 'lucide-react';

export interface LabelTagProps {
  label: string;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

/**
 * Standardized Added / Selected Label Tag component matching the Journals & Prayers module design:
 * - Teal background (light: #E6F4F5, dark: #0B7A81/20)
 * - Teal text (light: #0B7A81, dark: #14B8A6)
 * - Pill shape (rounded-full)
 * - Consistent typography and padding (h-8 px-3 py-1 text-xs font-semibold)
 * - Removable cross (×) icon with subtle hover feedback when removal is supported
 */
export function LabelTag({
  label,
  onRemove,
  onClick,
  className = '',
  size = 'md',
  disabled = false,
}: LabelTagProps) {
  const isRemovable = Boolean(onRemove && !disabled);

  const sizeClasses =
    size === 'sm'
      ? 'h-6 px-2.5 py-0.5 text-[11px]'
      : 'h-8 px-3 py-1 text-xs';

  const interactiveClasses = isRemovable
    ? 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 cursor-pointer'
    : onClick && !disabled
    ? 'cursor-pointer active:scale-95'
    : '';

  return (
    <span
      onClick={(e) => {
        if (disabled) return;
        if (onRemove) {
          e.stopPropagation();
          onRemove();
        } else if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      className={`inline-flex items-center gap-1.5 shrink-0 bg-[#E6F4F5] dark:bg-[#0B7A81]/20 text-[#0B7A81] dark:text-[#14B8A6] rounded-full font-semibold select-none transition-colors ${sizeClasses} ${interactiveClasses} ${className}`}
      role={isRemovable || onClick ? 'button' : undefined}
      tabIndex={isRemovable || onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (disabled) return;
        if ((e.key === 'Enter' || e.key === ' ') && (onRemove || onClick)) {
          e.preventDefault();
          if (onRemove) onRemove();
          else if (onClick) onClick();
        }
      }}
      aria-label={isRemovable ? `Remove label ${label}` : label}
    >
      <span>{label}</span>
      {isRemovable && (
        <X
          className={`${size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} opacity-70 hover:opacity-100 shrink-0 transition-opacity`}
          aria-hidden="true"
        />
      )}
    </span>
  );
}

export default LabelTag;
