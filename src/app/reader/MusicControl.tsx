"use client";
import React, { useEffect, useRef, useState } from "react";
import { FaPlay, FaPause, FaRandom } from "react-icons/fa";

type Track = {
    id: string;
    title: string;
    src: string;
    art?: string | null;
};

export default function MusicControl() {
    const tracks: Track[] = [
        { id: "m1", title: "Music 1", src: "/music/music1.mpeg", art: "https://picsum.photos/seed/music1/200" },
        { id: "m2", title: "Music 2", src: "/music/music2.mpeg", art: "https://picsum.photos/seed/music2/200" },
        { id: "m3", title: "Music 3", src: "/music/music3.mpeg", art: "https://picsum.photos/seed/music3/200" },
    ];

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);

    const [shuffleAll, setShuffleAll] = useState(false);
    const [shuffledOrder, setShuffledOrder] = useState<number[]>([]);
    const [shuffledPtr, setShuffledPtr] = useState(0);

    const [perTrackLoop, setPerTrackLoop] = useState<Record<number, boolean>>({});

    const makeShuffledOrder = (start: number) => {
        const arr = tracks.map((_, i) => i);
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        // ensure start is first
        const idx = arr.indexOf(start);
        if (idx > 0) {
            arr.splice(idx, 1);
            arr.unshift(start);
        }
        return arr;
    };

    useEffect(() => {
        if (!audioRef.current) audioRef.current = new Audio();
        const a = audioRef.current;
        a.onended = handleEnded;
        a.playbackRate = speed;
        return () => {
            a.onended = null;
        };
    }, []);

    useEffect(() => {
        if (shuffleAll) {
            setShuffledOrder(makeShuffledOrder(currentIndex));
            setShuffledPtr(0);
        } else {
            setShuffledOrder([]);
            setShuffledPtr(0);
        }
    }, [shuffleAll]);

    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;
        const t = tracks[currentIndex];
        a.src = t.src;
        a.load();
        a.playbackRate = speed;
        if (isPlaying) {
            a.play().catch(() => setIsPlaying(false));
        }
    }, [currentIndex]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.playbackRate = speed;
    }, [speed]);

    const playPause = async () => {
        const a = audioRef.current;
        if (!a) return;
        if (isPlaying) {
            a.pause();
            setIsPlaying(false);
        } else {
            try {
                await a.play();
                setIsPlaying(true);
            } catch {
                setIsPlaying(false);
            }
        }
    };

    const handleEnded = () => {
        // per-track loop overrides
        if (perTrackLoop[currentIndex]) {
            const a = audioRef.current;
            if (!a) return;
            a.currentTime = 0;
            a.play().catch(() => {});
            return;
        }

        // shuffle all
        if (shuffleAll && shuffledOrder.length > 0) {
            let nextPtr = shuffledPtr + 1;
            if (nextPtr >= shuffledOrder.length) {
                const newOrder = makeShuffledOrder(currentIndex);
                setShuffledOrder(newOrder);
                nextPtr = 1;
            }
            setShuffledPtr(nextPtr);
            setCurrentIndex(shuffledOrder[nextPtr % shuffledOrder.length]);
            return;
        }

        // sequential cycle
        setCurrentIndex((currentIndex + 1) % tracks.length);
    };

    const togglePerTrackLoop = (i: number) => {
        setPerTrackLoop((p) => ({ ...p, [i]: !p[i] }));
        setCurrentIndex(i); // select track when toggling loop
        if (!isPlaying) playPause();
    };

    return (
        <div className="w-full max-w-md mx-auto">
            {/* top controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={playPause}
                        className="flex items-center gap-2 px-3 py-2 rounded-full bg-rose-600 text-white"
                    >
                        {isPlaying ? <FaPause /> : <FaPlay />}
                        <span className="hidden sm:inline">{isPlaying ? "Pause" : "Play"}</span>
                    </button>
                    <select
                        value={speed}
                        onChange={(e) => setSpeed(Number(e.target.value))}
                        className="border rounded px-2 py-1 text-sm"
                    >
                        <option value={0.75}>0.75x</option>
                        <option value={1}>1x</option>
                        <option value={1.25}>1.25x</option>
                        <option value={1.5}>1.5x</option>
                    </select>
                </div>

                <button
                    onClick={() => setShuffleAll((s) => !s)}
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
