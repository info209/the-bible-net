import { X } from 'lucide-react';

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  textCol: string;
  borderCol: string;
  isDark?: boolean;
}

export default function ModalHeader({
  title,
  onClose,
  textCol,
  borderCol,
  isDark = false,
}: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: borderCol }}>
      <h2 className="text-xl font-semibold truncate pr-4" style={{ color: textCol }}>
        {title}
      </h2>
      <button
        onClick={onClose}
        className="p-2 rounded-full transition-colors flex-shrink-0"
        style={{ color: textCol, '--hover-bg': isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' } as React.CSSProperties}
      >
        <X className="size-5" />
      </button>
    </div>
  );
}
