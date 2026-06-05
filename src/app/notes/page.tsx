import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/auth-helpers';
import NotesPage from '@/app/components/NotesPage';

export const metadata = {
  title: 'Notes',
  description: 'Your Bible study notes.',
};

export default async function Page() {
  const session = await getUserSession();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return <NotesPage />;
}
