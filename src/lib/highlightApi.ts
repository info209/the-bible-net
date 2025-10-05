// src/lib/highlightApi.ts
import {
    doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, collection,
    query, where, orderBy, serverTimestamp, limit
} from "firebase/firestore";
import { makeRangeId, coveredVerseIdsFromRange, makeVerseId } from "./highlightHelpers";
import type { Firestore } from "firebase/firestore";

export type CreateHighlightParams = {
    version: string;
    book: string;
    chapter: number;
    startVerse: number;
    endVerse: number;
    color?: string | null;
    noteId?: string | null;
    highlightId?: string;
};

export async function createHighlight(db: Firestore, authUser: { uid: string } | null, params: CreateHighlightParams) {
    if (!authUser) throw new Error("Auth required");
    const uid = authUser.uid;
    const { version, book, chapter, startVerse, endVerse } = params;

    if (!version || !book || !Number.isInteger(chapter) || !Number.isInteger(startVerse) || !Number.isInteger(endVerse)) {
        throw new Error("Invalid params");
    }
    if (startVerse < 1 || endVerse < startVerse) throw new Error("Invalid range");

    const rangeId = makeRangeId(version, book, chapter, startVerse, endVerse);
    const coveredVerseIds = coveredVerseIdsFromRange(book, chapter, startVerse, endVerse);
    const highlightId = params.highlightId || `${rangeId}_${Date.now()}`;

    const payload = {
        highlightId,
        rangeId,
        version,
        book,
        chapter,
        startVerse,
        endVerse,
        startVerseId: makeVerseId(book, chapter, startVerse),
        endVerseId: makeVerseId(book, chapter, endVerse),
        coveredVerseIds,
        color: params.color || null,
        noteId: params.noteId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    const ref = doc(db, "users", uid, "highlights", highlightId);
    await setDoc(ref, payload);
    return highlightId;
}

export async function updateHighlight(db: Firestore, authUser: { uid: string } | null, highlightId: string, updates: Partial<CreateHighlightParams & { color?: string | null; noteId?: string | null }>) {
    if (!authUser) throw new Error("Auth required");
    const uid = authUser.uid;
    const ref = doc(db, "users", uid, "highlights", highlightId);

    let updatePayload: any = { ...updates };

    if (updates.startVerse !== undefined || updates.endVerse !== undefined) {
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error("Highlight not found");
        const old = snap.data() as any;
        const startV = updates.startVerse !== undefined ? updates.startVerse : old.startVerse;
        const endV = updates.endVerse !== undefined ? updates.endVerse : old.endVerse;
        if (startV > endV) throw new Error("Invalid start/end");
        updatePayload.startVerse = startV;
        updatePayload.endVerse = endV;
        updatePayload.rangeId = makeRangeId(old.version, old.book, old.chapter, startV, endV);
        updatePayload.coveredVerseIds = coveredVerseIdsFromRange(old.book, old.chapter, startV, endV);
        updatePayload.startVerseId = makeVerseId(old.book, old.chapter, startV);
        updatePayload.endVerseId = makeVerseId(old.book, old.chapter, endV);
    }

    updatePayload.updatedAt = serverTimestamp();
    await updateDoc(ref, updatePayload);
}

export async function deleteHighlight(db: Firestore, authUser: { uid: string } | null, highlightId: string) {
    if (!authUser) throw new Error("Auth required");
    await deleteDoc(doc(db, "users", authUser!.uid, "highlights", highlightId));
}

export async function getHighlightsForChapter(db: Firestore, authUser: { uid: string } | null, book: string, chapter: number) {
    if (!authUser) throw new Error("Auth required");
    const col = collection(db, "users", authUser.uid, "highlights");
    const q = query(col, where("book", "==", book), where("chapter", "==", chapter), orderBy("startVerse"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getHighlightsCoveringVerse(db: Firestore, authUser: { uid: string } | null, verseId: string) {
    if (!authUser) return [];
    const col = collection(db, "users", authUser.uid, "highlights");
    const q = query(col, where("coveredVerseIds", "array-contains", verseId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listAllHighlights(db: Firestore, authUser: { uid: string } | null, { limit: L = 100 } = {}) {
    if (!authUser) throw new Error("Auth required");
    const col = collection(db, "users", authUser.uid, "highlights");
    const q = query(col, orderBy("createdAt", "desc"), limit(L));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
