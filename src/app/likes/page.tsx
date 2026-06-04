import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/auth-helpers';
import LikesPage from '@/app/components/LikesPage';

export const metadata = {
  title: 'Likes',
  description: 'Your liked Bible verses and daily devotionals.',
};

export default async function Page() {
  const session = await getUserSession();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return <LikesPage />;
}
