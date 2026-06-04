import { adminAuth } from '@/lib/auth/admin';
import { UserRole } from '@/types/user';
import { User } from '@/models/User';
import dbConnect from '@/lib/db';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Dashboard",
};

export default async function AdminDashboard() {
    await dbConnect();
    const session = await adminAuth();
    
    // Quick stats
    const totalUsers = await User.countDocuments({ role: UserRole.USER });
    const totalAdmins = await User.countDocuments({ role: { $in: [UserRole.SUPER_ADMIN, UserRole.SUB_ADMIN] } });
    const recentUsers = await User.find({ role: UserRole.USER }).sort({ createdAt: -1 }).limit(5);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
                <p className="text-gray-400 mt-2">Welcome back, {session?.user?.firstName || 'Admin'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Users" value={totalUsers} icon="👥" color="blue" />
                <StatCard title="Active Admins" value={totalAdmins} icon="🛡️" color="purple" />
                <StatCard title="Daily Active" value="--" icon="📈" color="green" />
                <StatCard title="System Health" value="Optimal" icon="✅" color="emerald" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-6 rounded-2xl bg-[#111] border border-white/5">
                    <h3 className="text-xl font-semibold mb-6">Recent User Signups</h3>
                    <div className="space-y-4">
                        {recentUsers.map(user => (
                            <div key={user.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                                        {user.firstName[0]}
                                    </div>
                                    <div>
                                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#111] border border-white/5">
                    <h3 className="text-xl font-semibold mb-6">System Activity</h3>
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-4">
                        <div className="text-4xl">🔍</div>
                        <p>No critical alerts found</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }: { title: string; value: any; icon: string; color: string }) {
    const colorClasses: any = {
        blue: 'from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/20',
        purple: 'from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/20',
        green: 'from-green-500/20 to-green-600/5 text-green-400 border-green-500/20',
        emerald: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/20',
    };

    return (
        <div className={`p-6 rounded-2xl bg-gradient-to-br border ${colorClasses[color]} shadow-xl backdrop-blur-sm`}>
            <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">{icon}</span>
                <span className="text-xs font-bold uppercase tracking-wider opacity-60">Live</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{value}</p>
            <p className="text-sm font-medium opacity-60">{title}</p>
        </div>
    );
}
