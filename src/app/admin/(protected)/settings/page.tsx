import { adminAuth } from '@/lib/auth/admin';
import { UserRole } from '@/types/user';

export default async function AdminSettingsPage() {
    const session = await adminAuth();
    const isSuperAdmin = session?.user?.role === UserRole.SUPER_ADMIN;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">System Settings</h1>
                <p className="text-gray-400 mt-1">Configure global application parameters</p>
            </div>

            <div className="p-8 rounded-2xl bg-[#111] border border-white/5 space-y-8">
                <section>
                    <h3 className="text-lg font-bold mb-4">Security Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SettingItem label="Two-Factor Authentication" value="Disabled" action="Enable" />
                        <SettingItem label="Force Password Change" value="Every 90 days" action="Change" />
                        <SettingItem label="Minimum Password Length" value="8 characters" action="Change" />
                        <SettingItem label="Account Lock Duration" value="15 minutes" action="Change" />
                    </div>
                </section>

                <hr className="border-white/5" />

                <section>
                    <h3 className="text-lg font-bold mb-4">Notification Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SettingItem label="New User Alert" value="Email only" action="Edit" />
                        <SettingItem label="Failed Login Alert" value="Super Admin only" action="Edit" />
                    </div>
                </section>

                {!isSuperAdmin && (
                    <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-sm">
                        ℹ️ Some settings are restricted to Super Admins only.
                    </div>
                )}
            </div>
        </div>
    );
}

function SettingItem({ label, value, action }: { label: string; value: string; action: string }) {
    return (
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
            <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">{label}</p>
                <p className="text-white font-medium">{value}</p>
            </div>
            <button className="px-4 py-2 text-xs font-bold bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                {action}
            </button>
        </div>
    );
}
