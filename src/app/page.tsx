"use client";

// src/app/page.tsx
import Header from '@/components/Header';
import VerseCard from '@/components/VerseCard';
import FooterNav from '@/components/FooterNav';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthProvider';
import { FaCross } from "react-icons/fa";
import { transformVersionsForFrontend } from '@/lib/versionMapping';

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

const API_BASE = 'https://australia-southeast1-the-bible-net.cloudfunctions.net/api';
const fetchWithKey = (url: string) => fetch(url, { headers: { 'x-app-key': 'your_secret_key' } });

export default function Home() {
	const { user, loading } = useAuth();

	// Extract first name from user object
	let firstName = '';
	if (user) {
		const displayName = user.displayName || user.name || '';
		firstName = displayName.split(' ')[0];
	}

	useEffect(() => {
		// Prefetch versions
		fetchWithKey(`${API_BASE}/versions`)
			.then((res) => res.json())
			.then((data) => {
				// Store backend versions as-is for API calls
				localStorage.setItem('bible_versions', JSON.stringify(data));
				// Set default version if not present (use frontend ID)
				if (!localStorage.getItem('bible_version') && data.length > 0) {
					const transformedVersions = transformVersionsForFrontend(data);
					localStorage.setItem('bible_version', transformedVersions[0].id);
				}
			});
		// Prefetch books
		fetchWithKey(`${API_BASE}/books`)
			.then((res) => res.json())
			.then((data) => {
				localStorage.setItem('bible_books', JSON.stringify(data));
			});
	}, []);

	return (
		<div className="min-h-screen flex flex-col bg-[#FEFEFE] px-2 md:px-4">
			{/* Top header - match bible page */}
			<Header />

			{/* Main content */}
			<main className="flex-1 w-full pt-2 md:pt-6 pb-28">
				<div className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-xl space-y-4 md:space-y-6">
					{/* Greeting row */}
					<div className="flex items-center gap-3 md:gap-4 mb-2 md:mb-0">
						<button
							aria-label="new"
							className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-2xl"
						>
							<FaCross className="h-6 w-6" />
						</button>
						<div className="text-lg font-medium">
							{loading
								? "Shalom..."
								: user?.displayName
									? `Shalom, ${user.displayName.split(" ")[0]}`
									: "Shalom, Friend"}
						</div>
					</div>

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
