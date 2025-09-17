"use client";
import React, { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
    title: string;
    show: boolean;
    anchorRef: React.RefObject<HTMLElement>;
    onClose: () => void;
    children: ReactNode;
    maxWidth?: number;
    portalKey?: string | number;
};

export default function ModalSelector({
                                          title,
                                          show,
                                          anchorRef,
                                          onClose,
                                          children,
                                          maxWidth = 900,
                                          portalKey,
                                      }: Props) {
    const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

    // compute and set position as fixed relative to the viewport.
    // top = rect.bottom + gap (in viewport coords)
    const updatePos = () => {
        if (!show || !anchorRef?.current) {
            setPos(null);
            return;
        }
        try {
            const rect = anchorRef.current.getBoundingClientRect();
            const gap = 8; // px gap between selectors and modal
            const modalWidth = Math.min(rect.width, maxWidth);
            const left = rect.left + (rect.width - modalWidth) / 2;
            const top = rect.bottom + gap;
            // clamp left so modal stays visible
            const clampedLeft = Math.max(8, left);
            setPos({ top, left: clampedLeft, width: modalWidth });
        } catch {
            setPos(null);
        }
    };

    useEffect(() => {
        if (!show) {
            setPos(null);
            return;
        }
        updatePos();
        // update on scroll/resize so modal follows selectors in viewport (fixed positioning)
        const onScroll = () => updatePos();
        const onResize = () => updatePos();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onResize);
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onResize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, anchorRef, maxWidth]);

    // synchronous fallback to compute position immediately during render (helps avoid flicker)
    let syncPos: { top: number; left: number; width: number } | null = null;
    if (typeof window !== "undefined" && show && anchorRef?.current) {
        try {
            const rect = anchorRef.current.getBoundingClientRect();
            const gap = 8;
            const modalWidth = Math.min(rect.width, maxWidth);
            const left = rect.left + (rect.width - modalWidth) / 2;
            const top = rect.bottom + gap;
            syncPos = { top, left: Math.max(8, left), width: modalWidth };
        } catch {
            syncPos = null;
        }
    }

    const posToUse = pos || syncPos;
    if (!show || !posToUse) return null;

    const root = typeof window !== "undefined" ? document.body : null;
    if (!root) return null;

    // Use fixed positioning so modal remains attached to viewport, updating top/left as the anchor moves.
    const modalElement = (
        <div key={portalKey} className="fixed inset-0 z-[55] pointer-events-none" aria-modal="true" role="dialog">
            <div
                // fixed positioned container
                style={{
                    position: "fixed",
                    top: posToUse.top,
                    left: posToUse.left,
                    width: posToUse.width,
                    zIndex: 56,
                }}
            >
                <div
                    className="bg-white border rounded-2xl shadow-xl overflow-hidden pointer-events-auto"
                    style={{ maxHeight: "68vh" }}
                >
                    <div className="sticky top-0 z-30 bg-white border-b flex items-center justify-between px-4 py-3">
                        <div className="text-md font-semibold text-gray-700">{title}</div>
                        <div className="flex items-center gap-2">
                            <button onClick={onClose} aria-label="Close" className="px-3 py-1 rounded text-gray-600 hover:bg-gray-100">✕</button>
                        </div>
                    </div>

                    <div className="overflow-y-auto max-h-[64vh]">
                        <div className="p-3">{children}</div>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalElement, root);
}
