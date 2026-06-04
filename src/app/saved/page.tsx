import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/auth-helpers';
import SavedPage from '@/app/components/SavedPage';

export const metadata = {
  title: 'Saved',
  description: 'Your bookmarked Bible chapters, journals, and reading plans.',
};

export default async function Page() {
  const session = await getUserSession();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return <SavedPage />;
}
