"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "./components/AppHeader";
import BibleReaderPage from "./components/BibleReaderPage";
import HomePage from "./components/HomePage";
import ChapterContent from "./components/ChapterContent";
import "./globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Redirect root to /home
    if (pathname === '/') {
      router.push('/home');
    }
  }, [pathname, router]);

  const handleNavigate = (page: 'home' | 'bible' | 'library' | 'explore') => {
    router.push(`/${page}`);
  };

  if (!mounted) return null;

  const isHomePage = pathname === '/home';
  const isBiblePage = pathname === '/bible';
  const isLibraryPage = pathname === '/library';
  const isExplorePage = pathname === '/explore';

  return (
    <html lang="en">
      <body>
        {/* Only show regular layout for non-root paths */}
        {pathname !== '/' && (
          <>
            {/* Header - Always visible */}
            <AppHeader />
            
            {/* Content Area - Only for non-Bible pages */}
            {isHomePage && (
              <div className="relative z-0 pb-24">
                <HomePage />
              </div>
            )}
            {isLibraryPage && (
              <div className="relative z-0 pb-24">
                <ChapterContent />
              </div>
            )}
            {isExplorePage && (
              <div className="relative z-0 pb-24">
                <ChapterContent />
              </div>
            )}

            {/* Bible Reader - for all pages the component renders its content/nav */}
            <BibleReaderPage onNavigate={handleNavigate} />          </>
        )}
        {children}
      </body>
    </html>
  );
}
