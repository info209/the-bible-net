// src/context/AuthProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, signInAnonymously } from 'firebase/auth';
import { auth } from '../lib/firebaseClient';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (usr) => {
            if (!usr) {
                // If no user, sign in anonymously
                try {
                    const anonResult = await signInAnonymously(auth);
                    setUser(anonResult.user);
                } catch (err) {
                    setUser(null);
                }
                setLoading(false);
                return;
            }
            setUser(usr);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const signOut = async () => {
        await fetch('/api/auth/sessionLogout', { method: 'POST' });
        await firebaseSignOut(auth);
        setUser(null);
    };

    return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
