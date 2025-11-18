// ModalSelector.tsx
"use client";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
    title: string;
    show: boolean;
    anchorRef: React.RefObject<HTMLElement>;
    onClose: () => void;
    children: ReactNode;
    maxWidth?: number;
    portalKey?: string | number;
    hideClose?: boolean; // NEW - hide outer X when true
    mode?: string;
    onBack: () => void;
    onDone: () => void;
};

export default function ModalSelector({
                                          title,
                                          show,
                                          anchorRef,
                                          onClose,
                                          children,
                                          maxWidth = 960,
                                          portalKey,
                                          hideClose = false,
                                          mode,
                                          onBack,
                                          onDone
                                      }: Props) {
    const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

    // Store the exact element that opened the modal — captured once when modal opens.
    const initialTriggerRef = useRef<HTMLElement | null>(null);

    // Helper to pick trigger:
    function findTriggerElement(): HTMLElement | null {
        try {
            const container = anchorRef?.current;
            if (!container) return null;

            if (initialTriggerRef.current && container.contains(initialTriggerRef.current)) {
                return initialTriggerRef.current;
            }

            const active = document.activeElement;
            if (active instanceof HTMLElement && container.contains(active)) return active;
            const ariaPressed = container.querySelector<HTMLElement>('[aria-pressed="true"]');
            if (ariaPressed) return ariaPressed;
            const firstBtn = container.querySelector<HTMLElement>('button, [role="button"], [data-selector-trigger]');
            if (firstBtn) return firstBtn;
            return container;
        } catch {
            return anchorRef?.current || null;
        }
    }

    // When modal opens, capture the trigger element once.
    useEffect(() => {
        if (!show) {
            initialTriggerRef.current = null;
            return;
        }
        try {
            const container = anchorRef?.current;
            if (!container) return;
            const active = document.activeElement;
            if (active instanceof HTMLElement && container.contains(active)) {
                initialTriggerRef.current = active;
            } else {
                const ariaPressed = container.querySelector<HTMLElement>('[aria-pressed="true"]');
                if (ariaPressed) initialTriggerRef.current = ariaPressed;
                else {
                    const firstBtn = container.querySelector<HTMLElement>('button, [role="button"], [data-selector-trigger]');
                    if (firstBtn) initialTriggerRef.current = firstBtn;
                    else initialTriggerRef.current = container;
                }
            }
        } catch {
            initialTriggerRef.current = anchorRef?.current || null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);

    const updatePos = () => {
        if (!show || !anchorRef?.current) {
            setPos(null);
            return;
        }
        try {
            const gap = 8;
            const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
            const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

            const triggerEl = findTriggerElement();
            const rect = triggerEl ? triggerEl.getBoundingClientRect() : anchorRef.current.getBoundingClientRect();

            if (vw >= 768) {
                // Modal width changes 
                const scaled = Math.max(320, Math.min(rect.width * 2.2, vw * 0.8));
                const modalWidth = Math.min(maxWidth, scaled);

                const leftCentered = rect.left + rect.width / 2 - modalWidth / 2;
                const left = Math.max(16, Math.min(leftCentered, vw - modalWidth - 16));

                const topCandidate = rect.bottom + gap;
                const top = Math.max(40, Math.min(topCandidate, Math.round(vh * 0.45)));

                setPos({ top: Math.round(top), left: Math.round(left), width: Math.round(modalWidth) });
            } else {
                const anchorRect = anchorRef.current.getBoundingClientRect();
                const mobileWidth = Math.min(anchorRect.width, maxWidth, vw - 32);
                const left = Math.max(8, Math.round(anchorRect.left + (anchorRect.width - mobileWidth) / 2));
                const top = Math.round(anchorRect.bottom + gap);
                setPos({ top, left, width: Math.round(mobileWidth) });
            }
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

    // synchronous fallback for render
    let syncPos: { top: number; left: number; width: number } | null = null;
    if (typeof window !== "undefined" && show && anchorRef?.current) {
        try {
            const gap = 8;
            const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
            const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
            const triggerEl = findTriggerElement();
            const rect = triggerEl ? triggerEl.getBoundingClientRect() : anchorRef.current.getBoundingClientRect();

            if (vw >= 768) {
                const scaled = Math.max(420, Math.min(rect.width * 2.2, vw * 0.8));
                const modalWidth = Math.min(maxWidth, scaled);
                const leftCentered = rect.left + rect.width / 2 - modalWidth / 2;
                const left = Math.max(16, Math.min(leftCentered, vw - modalWidth - 16));
                const topCandidate = rect.bottom + gap;
                const top = Math.max(40, Math.min(topCandidate, Math.round(vh * 0.45)));
                syncPos = { top: Math.round(top), left: Math.round(left), width: Math.round(modalWidth) };
            } else {
                const anchorRect = anchorRef.current.getBoundingClientRect();
                const mobileWidth = Math.min(anchorRect.width, maxWidth, vw - 32);
                const left = Math.max(8, Math.round(anchorRect.left + (anchorRect.width - mobileWidth) / 2));
                const top = Math.round(anchorRect.bottom + gap);
                syncPos = { top, left, width: Math.round(mobileWidth) };
            }
        } catch {
            syncPos = null;
        }
    }

    const posToUse = pos || syncPos;
    const isVisible = show && posToUse;
    const root = typeof window !== "undefined" ? document.body : null;
    if (!root) return null;

    // prevent background scroll
    useEffect(() => {
        if (show) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [show]);

    const modalElement = (
        <div key={portalKey} className="fixed inset-0 z-[55] pointer-events-none" aria-modal="true" role="dialog"
             style={{ display: isVisible ? undefined : 'none' }}>
            {isVisible && (
                <div
                    style={{
                        position: "fixed",
                        top: posToUse.top,
                        left: posToUse.left,
                        width: posToUse.width,
                        zIndex: 56,
                        transition: "all 0.18s ease",
                    }}
                >
                    <div
                        className="bg-white border rounded-2xl shadow-xl overflow-hidden pointer-events-auto"
                        style={{ maxHeight: "50vh" }}
                    >
                        {/* Top header from the selector (optional). If title is empty, we skip rendering this header. */}
                        {title ? (
                            <div className="sticky top-0 z-30 bg-white border-b flex items-center justify-between px-4 py-3">
                               {mode === "verses" && (
                                          <button
                                            onClick={onBack}
                                            className="text-sm text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                                          >
                                            ← Back
                                          </button>
                                        )}
                                <div className="text-md font-semibold text-gray-700">{title}</div>
                                
                                    {!hideClose && (
                                        <div className="flex items-center gap-2">
                                            <button onClick={onClose} aria-label="Close" className="px-3 py-1 rounded text-gray-600 hover:bg-gray-100">✕</button>
                                        </div>
                                    )}
{/*                               
                                  {mode === "verses" && (
                                        <button
                                          onClick={onDone}
                                          className="text-sm text-green-700 px-2 py-1 rounded hover:bg-green-50"
                                          >
                                            Done
                                              </button>)} */}
                            </div>
                        ) : (
                            // If title is empty, we still render a small spacing to avoid visual jump; keep pointer area for close if not hidden.
                            <div className="sticky top-0 z-30 bg-white border-b" style={{ height: 0 }} />
                        )}

                        {/* content */}
                        <div className="overflow-y-auto max-h-[64vh]">
                            {/* If title was empty, the children are responsible for their own header/controls */}
                            <div className="p-3">{children}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return createPortal(modalElement, root);
}
