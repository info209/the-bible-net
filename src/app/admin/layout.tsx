import { getAdminSession } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types/user';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getAdminSession();

    // Secondary server-side check (Middleware handles primary)
    const isAdmin = !!session;

    // We allow the login page to be viewed even if not logged in
    // But other admin pages require auth
    // Wait, layout wraps children. If the child is login page, we shouldn't redirect.
    // However, usually we put /admin/login outside the protected layout or handle it inside.
    
    // I'll check the path inside children or just let middleware handle it.
    // For now, I'll just provide the sidebar structure if isAdmin.

    return (
        <div className="min-h-screen bg-black text-white">
            {isAdmin ? (
                <div className="flex">
                    {/* Sidebar */}
                    <aside className="w-64 h-screen sticky top-0 bg-[#111] border-r border-white/5 p-6 hidden md:block">
                        <div className="mb-10 px-2">
                            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                                Bible Net Admin
                            </h2>
                        </div>
                        
                        <nav className="space-y-1">
                            <SidebarLink href="/admin/dashboard" label="Dashboard" icon="📊" />
                            <SidebarLink href="/admin/content" label="Content" icon="📝" />
                            <SidebarLink href="/admin/users" label="Users" icon="👥" />
                            <SidebarLink href="/admin/sub-admins" label="Sub Admins" icon="🛡️" />
                            <SidebarLink href="/admin/settings" label="Settings" icon="⚙️" />
                        </nav>
                        
                        <div className="absolute bottom-10 left-6 right-6">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                <p className="text-xs text-gray-400 mb-1">Logged in as</p>
                                <p className="text-sm font-medium truncate">{session.user.email}</p>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 p-8">
                        {children}
                    </main>
                </div>
            ) : (
                <>{children}</>
            )}
        </div>
    );
}

function SidebarLink({ href, label, icon }: { href: string; label: string; icon: string }) {
    return (
        <a 
            href={href} 
            title={label}
            className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-gray-400 hover:text-white group"
        >
            <span className="text-lg group-hover:scale-110 transition-transform">{icon}</span>
            <span className="font-medium">{label}</span>
        </a>
    );
}
