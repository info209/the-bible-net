// src/app/page.tsx
import Header from '@/components/Header';
import VerseCard from '@/components/VerseCard';
import FooterNav from '@/components/FooterNav';

const sampleCards = [
	{
		id: 'c1',
		tag: 'Daily verse',
		title: 'Psalm 3:14 NKJV',
		verseText:
			'And the earth was waste and void; and darkness was upon the face of the deep: and the Spirit of God moved upon the face of the waters.',
		bg: '/card-bg-1.jpg', // 🔵 blue background card
		variant: 'blue',
		stats: { likes: '100k', comments: '100k', shares: '100k' },
	},
	{
		id: 'c2',
		tag: 'Daily devotional',
		title: 'Psalm 3:14 NKJV',
		verseText:
			'And the earth was waste and void; and darkness was upon the face of the deep: and the Spirit of God moved upon the face of the waters.',
		bg: '/card-bg-2.jpg', // 🌸 pink background card
		variant: 'pink',
		stats: { likes: '50k', comments: '12k', shares: '6k' },
	},
];

export default function Home() {
	return (
		<div className="min-h-screen flex flex-col bg-[#FEFEFE] px-2 md:px-4">
			{/* Top header */}
			<div className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-5xl mb-2 md:mb-6">
				<Header />
			</div>

			{/* Main content */}
			<main className="flex-1 w-full pt-2 md:pt-6 pb-28">
				<div className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-5xl space-y-4 md:space-y-6">
					{/* Greeting row */}
					<div className="flex items-center gap-3 md:gap-4 mb-2 md:mb-0">
						<button
							aria-label="new"
							className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-2xl"
						>
							+
						</button>
						<div className="text-lg font-medium">Shalom, Andriya</div>
					</div>

					{/* Verse cards */}
					{sampleCards.map((c) => (
						<VerseCard
							key={c.id}
							tag={c.tag}
							title={c.title}
							verseText={c.verseText}
							bg={c.bg}
							variant={c.variant as any}
							stats={c.stats}
						/>
					))}
				</div>
			</main>
			<div className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-5xl mt-4 md:mt-6">
				<FooterNav />
			</div>
		</div>
	);
}
