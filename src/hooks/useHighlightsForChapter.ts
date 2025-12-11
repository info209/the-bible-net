// src/hooks/useHighlightsForChapter.ts
"use client";
import { useEffect, useState, useRef } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";

export function useHighlightsForChapter(db: Firestore, authUser: FirebaseUser | null, book: string, chapter: number) {
    const [highlights, setHighlights] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const unsubRef = useRef<(() => void) | null>(null);

    // useEffect(() => {
    //     if (!authUser) { setHighlights([]); setLoading(false); return; }
    //     setLoading(true);
    //     const uid = authUser.uid;
    //     const col = collection(db, "users", uid, "highlights");
    //     const q = query(col, where("book", "==", book), where("chapter", "==", chapter), orderBy("startVerse"));
    //     unsubRef.current = onSnapshot(q, snap => {
    //         setHighlights(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    //         setLoading(false);
    //     }, err => {
    //         console.error("highlights onSnapshot error", err);
    //         setLoading(false);
    //     });

    //     return () => { if (unsubRef?.current) unsubRef?.current(); };
    // }, [db, authUser?.uid, book, chapter]);

      useEffect(() => {
    if (!authUser) {
      setHighlights([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const uid = authUser.uid;
    const col = collection(db, "users", uid, "highlights");
    const q = query(
      col,
      where("book", "==", book),
      where("chapter", "==", chapter),
      orderBy("startVerse")
    );

    // Subscribe
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setHighlights(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("highlights onSnapshot error", err);
        setLoading(false);
      }
    );

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [db, authUser?.uid, book, chapter]);

    return { highlights, loading };
}
