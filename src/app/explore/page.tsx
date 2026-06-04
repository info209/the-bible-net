import { Metadata } from 'next';
import ExplorePageClient from './ExplorePageClient';

export const metadata: Metadata = {
  title: 'Explore — The Bible Net',
  description: 'Search every book, verse, and theme in the Bible. Find verses by emotion, exact reference, or book name.',
};

export default function Page() {
  return <ExplorePageClient />;
}
