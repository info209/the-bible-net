import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user';
import Link from 'next/link';

export default async function AdminContentPage() {
    const session = await auth();
    const canManageContent = session?.user?.role === UserRole.SUPER_ADMIN || session?.user?.role === UserRole.SUB_ADMIN;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Content Management</h1>
                <p className="text-gray-400 mt-1">Manage Bible versions, articles, and daily reflections</p>
            </div>

            {!canManageContent ? (
                <div className="p-10 text-center bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <p className="text-red-400 font-bold">Unauthorized</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ContentCard
                        title="Bible Versions"
                        description="Manage uploaded Bible translations and metadata"
                        icon="📖"
                        href="/admin/content/bible"
                    />
                    <ContentCard
                        title="Daily Reflections"
                        description="Edit and schedule daily devotionals"
                        icon="💡"
                        href="/admin/content/reflections"
                    />
                    <ContentCard
                        title="Articles"
                        description="Manage blog posts and educational content"
                        icon="📰"
                        href="/admin/content/articles"
                    />
                    <ContentCard
                        title="Media Gallery"
                        description="Manage images and audio files"
                        icon="🖼️"
                        href="/admin/content/media"
                    />
                </div>
            )}
        </div>
    );
}

function ContentCard({ title, description, icon, href }: { title: string; description: string; icon: string; href: string }) {
    return (
        <Link href={href} className="p-6 rounded-2xl bg-[#111] border border-white/5 hover:border-white/10 transition-all group block">
            <div className="flex items-start space-x-4">
                <div className="text-3xl group-hover:scale-110 transition-transform">{icon}</div>
                <div>
                    <h3 className="text-xl font-bold mb-1">{title}</h3>
                    <p className="text-sm text-gray-400">{description}</p>
                    <div className="mt-4 text-xs font-bold text-blue-400 uppercase tracking-widest group-hover:text-blue-300">
                        Manage Content →
                    </div>
                </div>
            </div>
        </Link>
    );
}

