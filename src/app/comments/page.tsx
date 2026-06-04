import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/auth-helpers';
import CommentsPage from '../components/CommentsPage';

export const metadata = {
  title: 'Comments | The Bible Net',
  description: 'Your comments on Bible verses and daily devotionals.',
};

export default async function Page() {
  const session = await getUserSession();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return <CommentsPage />;
}
