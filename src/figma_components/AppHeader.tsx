import { Globe, Menu, User } from 'lucide-react';
import { BiBible } from 'react-icons/bi';

interface AppHeaderProps {
  onMenuOpen?: () => void;
}

export default function AppHeader({ onMenuOpen }: AppHeaderProps) {
  return (
    <div className="glass-teal border-b border-white/20 shadow-[var(--shadow-xs)] px-4 py-4">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        {/* Logo/App Name */}
        <div className="flex items-center space-x-2">
          <BiBible className="size-6 text-[var(--color-text-light)]" />
          <div>
            <p className="text-[var(--color-text-light)] text-sm font-medium leading-tight">Holy Bible</p>
            <p className="text-[var(--color-text-light)]/80 text-xs leading-tight">Your Daily Companion</p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-4">
          {/* Language selector */}
          <button className="flex items-center space-x-1.5 px-3 py-1 rounded-full border border-white/25 hover:bg-white/10 hover:scale-105 transition-all duration-[var(--transition-base)] active:scale-95">
            <span className="text-[var(--color-text-light)] text-sm">En</span>
            <Globe className="size-4 text-[var(--color-text-light)]" />
          </button>

          {/* Menu and User buttons - Combined as one */}
          <button onClick={onMenuOpen} className="flex items-center space-x-2 px-3 py-2 rounded-full border border-white/25 hover:bg-white/10 hover:scale-105 transition-all duration-[var(--transition-base)] active:scale-95">
            <Menu className="size-5 text-[var(--color-text-light)]" />
            <User className="size-5 text-[var(--color-text-light)]" />
          </button>
        </div>
      </div>
    </div>
  );
}
