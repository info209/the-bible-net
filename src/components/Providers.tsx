"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";
import { LikeProvider } from "@/context/LikeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NetworkStatusProvider } from "@/lib/offline/NetworkStatusContext";

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
                // Keep unused query data in memory for 24h so offline reads
                // from the in-memory TanStack Query cache are fast
                gcTime: 24 * 60 * 60 * 1000,
                // When offline, use cached data rather than failing immediately
                networkMode: 'offlineFirst',
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <NetworkStatusProvider>
                <SessionProvider basePath={basePath}>
                    <LikeProvider>
                        {children}
                    </LikeProvider>
                </SessionProvider>
            </NetworkStatusProvider>
        </QueryClientProvider>
    );
}
