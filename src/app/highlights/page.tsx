import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/auth-helpers';
import HighlightsPage from '@/app/components/HighlightsPage';

export const metadata: Metadata = {
  title: 'Highlights',
  description: 'Your highlighted Bible verses.',
};

export default async function Page() {
  const session = await getUserSession();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return <HighlightsPage />;
}
