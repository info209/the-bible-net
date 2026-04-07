"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "./components/AppHeader";
import BibleReaderPageContainer from "./components/BibleReaderPageContainer";
import BottomNav from "./components/BottomNav";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [hideBottomNav, setHideBottomNav] = useState(false);

  useEffect(() => {
    const handleReadingMode = (e: any) => {
      setHideBottomNav(e.detail.isReadingMode);
    };
    window.addEventListener('bible-reading-mode', handleReadingMode);
    return () => window.removeEventListener('bible-reading-mode', handleReadingMode);
  }, []);

  // Reset reading mode when leaving Bible page
  useEffect(() => {
    if (!pathname.startsWith('/bible')) {
      setHideBottomNav(false);
    }
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
    // Set body background for API docs
    if (pathname.startsWith('/api-docs')) {
      document.body.classList.add('bg-white');
    } else {
      document.body.classList.remove('bg-white');
    }
  }, [pathname, router]);

  const handleNavigate = (page: 'home' | 'bible' | 'library' | 'explore') => {
    router.push(`/${page}`);
  };

  if (!mounted) return <>{children}</>;

  const isAdminRoute = pathname.startsWith('/admin');
  const isApiDocs = pathname.startsWith('/api-docs');
  const isAuthRoute = pathname.startsWith('/auth');
  const isBiblePage = pathname === '/bible' || pathname.startsWith('/bible/');
  const isBible2Page = pathname === '/bible2' || pathname.startsWith('/bible2/');
  const isAnyBiblePage = isBiblePage || isBible2Page;
  const isPublicAppPage = pathname !== '/' && !isAdminRoute && !isApiDocs && !isAuthRoute;

  return (
    <>
      {/* 
        Optimization: 
        1. On /bible, BibleReaderPage renders its own AppHeader (internal to its design).
        2. On Home/Library/Explore, ClientLayout renders a static AppHeader.
      */}
      {isPublicAppPage && !isAnyBiblePage && <AppHeader />}
      
      {/* Heavy Bible readers mount outside main to take full height */}
      {isBiblePage && <BibleReaderPageContainer onNavigate={handleNavigate} />}
      {isBible2Page && <BibleReaderPageContainer onNavigate={handleNavigate} />}
      
      {/* Standard BottomNav for all app pages */}
      {isPublicAppPage && <BottomNav isVisible={!hideBottomNav} onNavigate={handleNavigate} />}

      <main className={isPublicAppPage ? "max-w-3xl mx-auto px-4 pt-4 pb-24" : ""}>
        {children}
      </main>
    </>
  );
}
