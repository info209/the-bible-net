"use client";

import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";

export function Providers({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    
    // Dynamically pick the backend API based on the route
    const basePath = pathname.startsWith('/admin') 
        ? "/api/auth/admin" 
        : "/api/auth/user";

    return (
        <SessionProvider basePath={basePath}>
            {children}
        </SessionProvider>
    );
}
