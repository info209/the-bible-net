"use client";
import React, { useEffect, useRef, useState } from "react";
import { FaPlay, FaPause, FaRandom } from "react-icons/fa";

type Track = {
    id: string;
    title: string;
    src: string;
    art?: string | null;
};

// Persistent DOM audio element
const getGlobalAudio = () => (typeof window !== 'undefined' ? document.getElementById('global-audio') as HTMLAudioElement : null);

// Persistent state helpers using localStorage
const MUSIC_STATE_KEY = 'bibleAppMusicState';
const defaultMusicState = {
    currentIndex: 0,
    perTrackLoop: {},
    shuffleAll: false,
    shuffledOrder: [] as number[],
    shuffledPtr: 0,
    userInitiatedPlay: false,
};
const getMusicState = () => {
    if (typeof window === 'undefined') return { ...defaultMusicState };
    try {
        const raw = localStorage.getItem(MUSIC_STATE_KEY);
        if (!raw) return { ...defaultMusicState };
        const parsed = JSON.parse(raw);
        return { ...defaultMusicState, ...parsed };
    } catch {
        return { ...defaultMusicState };
    }
};
const setMusicState = (patch: Partial<typeof defaultMusicState>) => {
    if (typeof window === 'undefined') return;
    const prev = getMusicState();
    const next = { ...prev, ...patch };
    localStorage.setItem(MUSIC_STATE_KEY, JSON.stringify(next));
    return next;
};

export default function MusicControl() {
    const tracks: Track[] = [
        { id: "m1", title: "Music 1", src: "/music/music1.mpeg", art: "https://picsum.photos/seed/music1/200" },
        { id: "m2", title: "Music 2", src: "/music/music2.mpeg", art: "https://picsum.photos/seed/music2/200" },
        { id: "m3", title: "Music 3", src: "/music/music3.mpeg", art: "https://picsum.photos/seed/music3/200" },
    ];

    // Initialize state from localStorage
    const [currentIndex, setCurrentIndexState] = useState(() => getMusicState().currentIndex);
    const [isPlaying, setIsPlaying] = useState(false);
    const [shuffleAll, setShuffleAllState] = useState(() => getMusicState().shuffleAll);
    const [shuffledOrder, setShuffledOrderState] = useState(() => getMusicState().shuffledOrder);
    const [shuffledPtr, setShuffledPtrState] = useState(() => getMusicState().shuffledPtr);
    const [perTrackLoop, setPerTrackLoopState] = useState(() => getMusicState().perTrackLoop);
    // userInitiatedPlay is not React state, but always read from localStorage

    // Wrap setters to persist state
    const setCurrentIndex = (v: number) => {
        setCurrentIndexState(v);
        setMusicState({ currentIndex: v });
    };
    const setShuffleAll = (v: boolean) => {
        setShuffleAllState(v);
        setMusicState({ shuffleAll: v });
    };
    const setShuffledOrder = (v: number[]) => {
        setShuffledOrderState(v);
        setMusicState({ shuffledOrder: v });
    };
    const setShuffledPtr = (v: number) => {
        setShuffledPtrState(v);
        setMusicState({ shuffledPtr: v });
    };
    const setPerTrackLoop = (v: Record<number, boolean>) => {
        setPerTrackLoopState(v);
        setMusicState({ perTrackLoop: v });
    };
    const getUserInitiatedPlay = () => getMusicState().userInitiatedPlay;
    const setUserInitiatedPlay = (val: boolean) => setMusicState({ userInitiatedPlay: val });

    // Track last loaded index to avoid reloading audio on remount
    const lastLoadedIndex = useRef<number | null>(null);

    useEffect(() => {
        const a = getGlobalAudio();
        if (!a) return;
        a.onended = handleEnded;
        // Sync isPlaying state with actual audio element on mount
        setIsPlaying(a && !a.paused && !a.ended);
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        a.addEventListener('play', handlePlay);
        a.addEventListener('pause', handlePause);
        return () => {
            a.onended = null;
            a.removeEventListener('play', handlePlay);
            a.removeEventListener('pause', handlePause);
        };
    }, []);

    useEffect(() => {
        const a = getGlobalAudio();
        if (!a) return;
        // Only update src and reload if the track index has changed
        if (lastLoadedIndex.current !== currentIndex) {
            const t = tracks[currentIndex];
            a.src = t.src;
            a.load();
            lastLoadedIndex.current = currentIndex;
            // Only play if user explicitly pressed play
            if (isPlaying) {
                a.play().catch(() => setIsPlaying(false));
            }
        }
    }, [currentIndex, isPlaying]);

    // On mount, rehydrate state from localStorage
    useEffect(() => {
        const state = getMusicState();
        setCurrentIndexState(state.currentIndex);
        setShuffleAllState(state.shuffleAll);
        setShuffledOrderState(state.shuffledOrder);
        setShuffledPtrState(state.shuffledPtr);
        setPerTrackLoopState(state.perTrackLoop);
        // Auto-play if user had previously pressed play
        if (state.userInitiatedPlay) {
            const a = getGlobalAudio();
            if (a) {
                a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            }
        }
    }, []);

    const playPause = async () => {
        const a = getGlobalAudio();
        if (!a) return;
        if (isPlaying) {
            a.pause();
            setIsPlaying(false);
            setUserInitiatedPlay(false); // <-- fix: persist pause intent
        } else {
            try {
                await a.play();
                setIsPlaying(true);
                setUserInitiatedPlay(true);
            } catch {
                setIsPlaying(false);
            }
        }
    };

    const handleEnded = () => {
        const a = getGlobalAudio();
        if (!a) return;
        if (shuffleAll) {
            // Play next track in shuffled order
            const nextIndex = (shuffledPtr + 1) % shuffledOrder.length;
            setShuffledPtr(nextIndex);
            setCurrentIndex(shuffledOrder[nextIndex]);
        } else if (perTrackLoop[currentIndex]) {
            // Loop current track
            a.currentTime = 0;
            a.play().catch(() => {});
        } else {
            // Play next track, loop to first after last
            const nextIndex = (currentIndex + 1) % tracks.length;
            setCurrentIndex(nextIndex);
        }
    };

    const toggleShuffle = () => {
        if (shuffleAll) {
            // Disable shuffle
            setShuffleAll(false);
            setShuffledOrder([]);
            setShuffledPtr(0);
        } else {
            // Enable shuffle and disable all per-track loops
            setShuffleAll(true);
            setPerTrackLoop({});
            // Generate a new shuffled order
            const newOrder = [...Array(tracks.length).keys()].sort(() => Math.random() - 0.5);
            setShuffledOrder(newOrder);
            setShuffledPtr(0);
        }
    };

    const togglePerTrackLoop = (i: number) => {
        // Disable shuffle and all other per-track loops
        setShuffleAll(false);
        const newLoop: Record<number, boolean> = {};
        if (!perTrackLoop[i]) newLoop[i] = true;
        setPerTrackLoop(newLoop);
        setCurrentIndex(i); // select track when toggling loop
        if (!isPlaying) playPause();
        setUserInitiatedPlay(true);
        // Immediately rehydrate perTrackLoop from localStorage after update
        setTimeout(() => setPerTrackLoopState({ ...getMusicState().perTrackLoop }), 0);
    };

    // Listen for localStorage changes (sync across tabs/windows)
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === MUSIC_STATE_KEY) {
                const state = getMusicState();
                setPerTrackLoopState({ ...state.perTrackLoop });
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    return (
        <div className="w-full max-w-md mx-auto">
            {/* top controls */}
            <div className="flex flex-row items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-1">
                    <button
                        onClick={playPause}
                        className="flex items-center gap-2 px-3 py-2 rounded-full bg-rose-600 text-white"
                    >
                        {isPlaying ? <FaPause /> : <FaPlay />}
                        <span className="hidden sm:inline">{isPlaying ? "Pause" : "Play"}</span>
                    </button>
                </div>
                <button
                    onClick={toggleShuffle}
                    className={`p-2 rounded ${shuffleAll ? "bg-rose-50 border border-rose-200 text-rose-600" : "bg-white border"}`}
                    title="Shuffle all"
                >
                    <FaRandom />
                </button>
            </div>

            {/* track list */}
            <div className="bg-white shadow rounded divide-y border">
                {tracks.map((t, i) => {
                    const active = i === currentIndex;
                    const loopOn = !!perTrackLoop[i];
                    return (
                        <div
                            key={t.id}
                            className={`flex items-center gap-3 px-3 py-3 ${active ? "bg-rose-50 border-l-4 border-rose-200" : ""}`}
                            onClick={() => setCurrentIndex(i)} // click row to select track
                        >
                            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                                {t.art ? <img src={t.art} alt={t.title} className="w-full h-full object-cover" /> : <div className="bg-gray-200 w-full h-full" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <div className={`text-sm font-medium truncate ${active ? "text-rose-600" : "text-gray-800"}`}>{t.title}</div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            togglePerTrackLoop(i);
                                        }}
                                        className={`p-2 rounded ${loopOn ? "bg-rose-100 text-rose-600 border border-rose-200" : "bg-white border"}`}
                                        title="Loop this track"
                                    >
                                        <FaRandom />
                                    </button>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {active ? (isPlaying ? "Playing" : "Paused") : "Ready"}
                                    {loopOn ? " · Looping" : ""}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
