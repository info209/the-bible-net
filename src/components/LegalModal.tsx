'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from '@/components/ui/dialog';
import { X, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LegalModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'terms' | 'privacy';
}

export function LegalModal({ isOpen, onClose, type }: LegalModalProps) {
    const [content, setContent] = useState<{ title: string; content: string; lastUpdated: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchContent();
        }
    }, [isOpen, type]);

    const fetchContent = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/content/${type}`);
            const data = await res.json();
            if (res.ok) {
                setContent(data);
            } else {
                setError('Failed to load content. Please try again later.');
            }
        } catch (err) {
            setError('An error occurred. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[700px] w-[95vw] max-h-[85vh] p-0 overflow-hidden bg-white rounded-3xl border-none shadow-2xl">
                <DialogHeader className="p-6 border-b border-gray-100 flex flex-row items-center justify-between sticky top-0 bg-white z-10">
                    <DialogTitle className="text-2xl font-bold text-slate-900">
                        {type === 'terms' ? 'Terms & conditions' : 'Privacy policy'}
                    </DialogTitle>
                    <DialogClose asChild>
                        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X className="w-6 h-6 text-slate-500" />
                        </button>
                    </DialogClose>
                </DialogHeader>

                <div className="relative h-[calc(85vh-88px)]">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-500">
                            <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary-teal)]" />
                            <p className="font-medium">Loading content...</p>
                        </div>
                    ) : error ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-red-500 gap-4">
                            <p className="font-bold text-lg">{error}</p>
                            <button 
                                onClick={fetchContent}
                                className="px-6 py-2 bg-[var(--color-primary-teal)] text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
                            >
                                Try again
                            </button>
                        </div>
                    ) : (
                        <ScrollArea className="h-full">
                            <div className="p-8 pb-12">
                                {content && (
                                    <>
                                        <div 
                                            className="prose prose-slate max-w-none 
                                                prose-headings:text-slate-900 prose-headings:font-bold 
                                                prose-p:text-slate-600 prose-p:leading-relaxed
                                                prose-li:text-slate-600
                                                prose-a:text-[var(--color-primary-teal)] prose-a:no-underline hover:prose-a:underline"
                                            dangerouslySetInnerHTML={{ __html: content.content }}
                                        />
                                        <div className="mt-12 pt-6 border-t border-gray-100 text-sm text-slate-400 font-medium italic">
                                            Last updated: {new Date(content.lastUpdated).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
