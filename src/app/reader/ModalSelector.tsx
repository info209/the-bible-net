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

    // update pos with effect (keeps pos live on resize/scroll)
    useEffect(() => {
        const update = () => {
            if (!show || !anchorRef?.current) {
                setPos(null);
                return;
            }
            const rect = anchorRef.current.getBoundingClientRect();
            const modalWidth = Math.min(rect.width, maxWidth);
            const left = rect.left + window.scrollX + (rect.width - modalWidth) / 2;
            const top = rect.bottom + window.scrollY + 12;
            setPos({ top, left: Math.max(8, left), width: modalWidth });
        };

        update();
        window.addEventListener("resize", update);
        window.addEventListener("scroll", update, true);
        return () => {
            window.removeEventListener("resize", update);
            window.removeEventListener("scroll", update, true);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, anchorRef, maxWidth]);

    // synchronous fallback pos: compute once synchronously if possible (avoids waiting for effect)
    let syncPos: { top: number; left: number; width: number } | null = null;
    if (typeof window !== "undefined" && show && anchorRef?.current) {
        try {
            const rect = anchorRef.current.getBoundingClientRect();
            if (rect && rect.width && rect.height) {
                const modalWidth = Math.min(rect.width, maxWidth);
                const left = rect.left + window.scrollX + (rect.width - modalWidth) / 2;
                const top = rect.bottom + window.scrollY + 12;
                syncPos = { top, left: Math.max(8, left), width: modalWidth };
            }
        } catch {
            syncPos = null;
        }
    }

    const posToUse = pos || syncPos;
    if (!show || !posToUse) return null;

    const root = typeof window !== "undefined" ? document.body : null;
    if (!root) return null;

    const modalElement = (
        <div key={portalKey} className="fixed inset-0 z-[55] pointer-events-none" aria-modal="true" role="dialog">
            <div style={{ position: "absolute", top: posToUse.top, left: posToUse.left, width: posToUse.width }}>
                <div className="bg-white border rounded-2xl shadow-xl overflow-hidden pointer-events-auto" style={{ maxHeight: "68vh" }}>
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
