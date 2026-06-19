"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";
import { LikeProvider } from "@/context/LikeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    
    // Dynamically pick the backend API based on the route
    const basePath = pathname.startsWith('/admin') 
        ? "/api/auth/admin" 
        : "/api/auth/user";

    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                refetchOnWindowFocus: false,
                retry: 1,
                staleTime: 5 * 60 * 1000,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <SessionProvider basePath={basePath}>
                <LikeProvider>
                    {children}
                </LikeProvider>
            </SessionProvider>
        </QueryClientProvider>
    );
}
