import { ContentRepository } from '@/repositories/contentRepository';
import { notFound } from 'next/navigation';
import { Heart, MessageCircle, Share2, Play } from 'lucide-react';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    try {
        const devotion = await ContentRepository.findById(params.id);
        if (!devotion || devotion.type !== 'devotion') {
            return { title: 'Devotional' };
        }
        return {
            title: devotion.title || 'Daily Devotional',
        };
    } catch {
        return { title: 'Daily Devotional' };
    }
}

export default async function DevotionPage({ params }: { params: { id: string } }) {
    const devotion = await ContentRepository.findById(params.id);

    if (!devotion || devotion.type !== 'devotion') {
        notFound();
    }

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white min-h-screen">
            <header className="mb-8">
                <p className="text-teal-600 font-medium mb-1 uppercase tracking-wider text-sm">Daily Devotional</p>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{devotion.title}</h1>
                <p className="text-gray-500">{devotion.reference}</p>
            </header>

            <div className="prose prose-teal max-w-none mb-12">
                <p className="text-lg leading-relaxed text-gray-800 whitespace-pre-wrap">
                    {devotion.text}
                </p>
            </div>

            {devotion.highlightQuote && (
                <div className="bg-teal-50 border-l-4 border-teal-500 p-6 rounded-r-2xl mb-12 italic text-teal-900">
                    "{devotion.highlightQuote}"
                </div>
            )}

            <div className="flex items-center justify-between pt-8 border-t">
                <div className="flex space-x-6">
                    <button className="flex items-center space-x-2 text-gray-600 hover:text-teal-600 transition-colors">
                        <Heart className="size-5" />
                        <span className="font-medium">{devotion.likeCount || 0}</span>
                    </button>
                    <button className="flex items-center space-x-2 text-gray-600 hover:text-teal-600 transition-colors">
                        <MessageCircle className="size-5" />
                        <span className="font-medium">{devotion.commentCount || 0}</span>
                    </button>
                </div>
                <button className="bg-teal-600 text-white px-6 py-2 rounded-full font-medium shadow-md hover:bg-teal-700 transition-all flex items-center space-x-2">
                    <Share2 className="size-4" />
                    <span>Share</span>
                </button>
            </div>
        </div>
    );
}
