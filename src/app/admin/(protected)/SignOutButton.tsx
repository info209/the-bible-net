'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export function SignOutButton() {
    return (
        <button 
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="flex items-center w-full justify-center md:justify-start space-x-2 text-[#d23952] hover:bg-red-500/10 p-2 rounded-lg transition-colors font-medium text-sm mt-2 cursor-pointer"
        >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Log out</span>
        </button>
    );
}
