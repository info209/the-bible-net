import { Metadata } from 'next';
import HighlightsPage from '@/app/components/HighlightsPage';

export const metadata: Metadata = {
  title: 'Highlights',
  description: 'Your highlighted Bible verses.',
};

export default function Page() {
  return <HighlightsPage />;
}
