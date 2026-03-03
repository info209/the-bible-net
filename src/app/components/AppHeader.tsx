import { BookOpen, Globe, Menu, User } from 'lucide-react';

interface AppHeaderProps {
  onMenuOpen?: () => void;
}

export default function AppHeader({ onMenuOpen }: AppHeaderProps) {
  return (
 <div style={{background:"#41ADB0"}} className="bg-teal-600/30 backdrop-blur-md border-b border-white/20 shadow-sm px-4 py-4">
  <div className="max-w-3xl mx-auto flex items-center justify-between">

    {/* Logo / App Name */}
    <div className="flex items-center gap-2">
      <BookOpen className="w-6 h-6 text-white" />
      <div>
        <p className="text-white text-sm font-medium leading-tight">
          Holy Bible
        </p>
        <p className="text-white/80 text-xs leading-tight">
          Your Daily Companion
        </p>
      </div>
    </div>

    {/* Right controls */}
    <div className="flex items-center gap-4">

      {/* Language selector */}
      <button className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/25
        hover:bg-white/10 hover:scale-105 active:scale-95
        transition-all duration-200">
        <span className="text-white text-sm">En</span>
        <Globe className="w-4 h-4 text-white" />
      </button>

      {/* Menu + User */}
      <button
        onClick={onMenuOpen}
        className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/25
          hover:bg-white/10 hover:scale-105 active:scale-95
          transition-all duration-200"
      >
        <Menu className="w-5 h-5 text-white" />
        <User className="w-5 h-5 text-white" />
      </button>

    </div>
  </div>
</div>

  );
}