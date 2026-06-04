import { ContentRepository } from '@/repositories/contentRepository';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    try {
        const devotion = await ContentRepository.findById(params.id);
        if (!devotion || devotion.type !== 'devotion') {
            return { title: 'Shared Devotional' };
        }
        return {
            title: `Shared Devotional: ${devotion.title}`,
        };
    } catch {
        return { title: 'Shared Devotional' };
    }
}

export default async function ShareDevotionPage({ params }: { params: { id: string } }) {
    const devotion = await ContentRepository.findById(params.id);

    if (!devotion || devotion.type !== 'devotion') {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full text-center">
                <p className="text-rose-600 font-bold uppercase tracking-widest text-xs mb-4">Daily Devotional</p>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{devotion.title}</h2>
                <p className="text-gray-500 text-sm mb-6">{devotion.reference}</p>
                <div className="h-px bg-gray-100 my-6" />
                <p className="text-gray-700 leading-relaxed line-clamp-4 mb-8">
                    {devotion.summary || devotion.text}
                </p>
                <Link 
                    href={`/devotion/${devotion._id}`}
                    className="inline-block bg-rose-500 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-rose-600 transition-all"
                >
                    Read Full Story
                </Link>
            </div>
        </div>
    );
}
