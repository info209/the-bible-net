import { Metadata } from 'next';
import HighlightsPage from '@/app/components/HighlightsPage';

export const metadata: Metadata = {
  title: "Highlights",
};

export default function Page() {
  return <HighlightsPage />;
}
