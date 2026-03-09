import { ContentRepository } from '@/repositories/contentRepository';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function ShareVersePage({ params }: { params: { id: string } }) {
    const verse = await ContentRepository.findById(params.id);

    if (!verse || verse.type !== 'verse') {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full text-center">
                <p className="text-teal-600 font-bold uppercase tracking-widest text-xs mb-4">Verse of the Day</p>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{verse.reference}</h2>
                <div className="h-px bg-gray-100 my-6" />
                <p className="text-xl italic font-serif text-gray-700 leading-relaxed mb-8">
                    "{verse.text}"
                </p>
                <Link 
                    href="/home"
                    className="inline-block bg-teal-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-teal-700 transition-all"
                >
                    Read More in App
                </Link>
            </div>
        </div>
    );
}
