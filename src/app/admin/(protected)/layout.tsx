import { getAdminSession } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types/user';
import { SignOutButton } from './SignOutButton';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getAdminSession();

    if (!session) {
        redirect('/admin/login');
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="flex">
                {/* Sidebar */}
                <aside className="w-20 md:w-64 h-screen sticky top-0 bg-[#111] border-r border-white/5 p-4 md:p-6 flex flex-col z-50">
                    <div className="mb-10 px-2 flex justify-center md:justify-start">
                        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent hidden md:block">
                            Bible Net
                        </h2>
                        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent md:hidden">
                            BN
                        </h2>
                    </div>
                    
                    <nav className="space-y-2 flex-1">
                        <SidebarLink href="/admin/dashboard" label="Dashboard" icon="📊" />
                        <SidebarLink href="/admin/content" label="Content" icon="📝" />
                        <SidebarLink href="/admin/plans" label="Reading Plans" icon="📖" />
                        <SidebarLink href="/admin/legal" label="Legal CMS" icon="⚖️" />
                        <SidebarLink href="/admin/users" label="Users" icon="👥" />

                        <SidebarLink href="/admin/sub-admins" label="Sub Admins" icon="🛡️" />
                        <SidebarLink href="/admin/settings" label="Settings" icon="⚙️" />
                    </nav>
                    
                    <div className="mt-auto hidden md:block">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                            <div>
                                <p className="text-xs text-gray-400 mb-1">Logged in as</p>
                                <p className="text-sm font-medium truncate">{session.user.email}</p>
                            </div>
                            <SignOutButton />
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}

function SidebarLink({ href, label, icon }: { href: string; label: string; icon: string }) {
    return (
        <a 
            href={href} 
            title={label}
            className="flex items-center space-x-0 md:space-x-3 px-0 md:px-4 py-3 justify-center md:justify-start rounded-xl hover:bg-white/5 transition-colors text-gray-400 hover:text-white group"
        >
            <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
            <span className="hidden md:inline font-medium">{label}</span>
        </a>
    );
}
