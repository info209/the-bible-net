"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "./components/AppHeader";
import BibleReaderPageContainer from "./components/BibleReaderPageContainer";
import BottomNav from "./components/BottomNav";
import NetworkStatusModal from "@/components/NetworkStatusModal";
import OfflineBanner from "@/components/offline/OfflineBanner";

const isBibleReadingRoute = (path: string) => path === '/bible' || path.startsWith('/bible/');

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
    if (!isBibleReadingRoute(pathname)) {
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
  const isBiblePage = isBibleReadingRoute(pathname);
  const isJournalsPage = pathname.startsWith('/journals');
  const isProfileSubPage =
    pathname.startsWith('/saved') ||
    pathname.startsWith('/notes') ||
    pathname.startsWith('/highlights') ||
    pathname.startsWith('/likes') ||
    pathname.startsWith('/comments');
  const isPublicAppPage = pathname !== '/' && !isAdminRoute && !isApiDocs && !isAuthRoute;
  const showAppHeader = isPublicAppPage && !isBiblePage && !isProfileSubPage && !isJournalsPage;
  const showBottomNav = isPublicAppPage && !isProfileSubPage;

  return (
    <>
      <NetworkStatusModal />
      {/* Non-blocking offline banner — shown when device loses connectivity */}
      {isPublicAppPage && <OfflineBanner />}
      {/* 
        Optimization: 
        1. On /bible, BibleReaderPage renders its own AppHeader (internal to its design).
        2. On Home/Library/Explore, ClientLayout renders a static AppHeader.
      */}
      {showAppHeader && <AppHeader />}
      
      {/* Heavy Bible readers mount outside main to take full height */}
      {isBiblePage && <BibleReaderPageContainer onNavigate={handleNavigate} />}
      
      {/* Standard BottomNav for all app pages */}
      {showBottomNav && <BottomNav isVisible={!hideBottomNav} onNavigate={handleNavigate} />}

      <main
        className={`transition-[padding-top] duration-250 ease-out ${
          isPublicAppPage
            ? isBiblePage
              ? "hidden"
              : isProfileSubPage
              ? "w-full pt-[var(--offline-banner-total-height,0px)]"
              : isJournalsPage
              ? "max-w-3xl mx-auto pt-[var(--offline-banner-total-height,0px)]"
              : "max-w-3xl mx-auto px-4 pb-24 pt-[calc(5rem+var(--offline-banner-total-height,0px))]"
            : ""
        }`}
      >
        {children}
      </main>
    </>
  );
}
