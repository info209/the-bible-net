"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/context/ToastContext';
import { UserRole } from '@/types/user';
import { PasswordInput } from '@/components/ui/password-input';

export default function AdminSubAdminsPage() {
    const { data: session } = useSession();
    const [subAdmins, setSubAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '' });

    const isSuperAdmin = session?.user?.role === UserRole.SUPER_ADMIN;

    useEffect(() => {
        if (isSuperAdmin) fetchSubAdmins();
        else setLoading(false);
    }, [isSuperAdmin]);

    const fetchSubAdmins = async () => {
        try {
            const res = await fetch('/api/admin/sub-admin');
            const data = await res.json();
            if (res.ok) setSubAdmins(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSubAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/sub-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (res.ok) {
                setShowModal(false);
                fetchSubAdmins();
                setFormData({ firstName: '', lastName: '', email: '', password: '' });
                toast.success('Sub-admin created successfully!');
            } else {
                setFormError(data.error || 'Failed to create sub-admin');
                toast.error(data.error || 'Failed to create sub-admin');
            }
        } catch (err) {
            setFormError('Error creating sub-admin');
            toast.error('Error creating sub-admin');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeactivateSubAdmin = async (id: string, email: string) => {
        if (!confirm(`Are you sure you want to deactivate sub-admin ${email}?`)) return;
        try {
            const res = await fetch(`/api/admin/sub-admin/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                toast.success('Sub-admin deactivated successfully');
                fetchSubAdmins();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to deactivate sub-admin');
            }
        } catch (err) {
            toast.error('Error deactivating sub-admin');
        }
    };

    if (!isSuperAdmin) {
        return (
            <div className="p-10 text-center bg-red-500/10 border border-red-500/20 rounded-2xl">
                <p className="text-red-400 font-bold">Access Denied</p>
                <p className="text-sm text-gray-400 mt-2">Only Super Admins can manage other admins.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Sub-Admin Management</h1>
                    <p className="text-gray-400 mt-1">Assign and manage sub-administrator roles</p>
                </div>
                <button 
                    onClick={() => { setFormError(null); setShowModal(true); }}
                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                    + Create Sub-Admin
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-gray-500">Loading sub-admins...</div>
                ) : subAdmins.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-gray-400 border border-white/5 rounded-2xl">
                        No sub-admins found. Click "+ Create Sub-Admin" to add one.
                    </div>
                ) : subAdmins.map(admin => (
                    <div key={admin._id} className="p-6 rounded-2xl bg-[#111] border border-white/5 relative group flex flex-col justify-between space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xl">
                                    {admin.firstName?.[0] || 'A'}
                                </div>
                                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded ${
                                    admin.isActive !== false ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                }`}>
                                    {admin.isActive !== false ? 'ACTIVE' : 'DEACTIVATED'}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold">{admin.firstName} {admin.lastName}</h3>
                            <p className="text-sm text-gray-400">{admin.email}</p>
                        </div>
                        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                                Joined {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                            {admin.isActive !== false && (
                                <button
                                    onClick={() => handleDeactivateSubAdmin(admin._id, admin.email)}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium px-2 py-1 rounded hover:bg-red-500/10"
                                >
                                    Deactivate
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Sub-Admin Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#111] border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl">
                        <h2 className="text-2xl font-bold mb-4">Create New Sub-Admin</h2>

                        {formError && (
                            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleCreateSubAdmin} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <input 
                                        placeholder="First Name"
                                        className="w-full bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-white outline-none focus:border-blue-500/50"
                                        value={formData.firstName}
                                        onChange={e => setFormData({...formData, firstName: e.target.value})}
                                        required
                                    />
                                </div>
                                <div>
                                    <input 
                                        placeholder="Last Name"
                                        className="w-full bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-white outline-none focus:border-blue-500/50"
                                        value={formData.lastName}
                                        onChange={e => setFormData({...formData, lastName: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <input 
                                    type="email"
                                    placeholder="Email Address"
                                    className="w-full bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-white outline-none focus:border-blue-500/50"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <PasswordInput 
                                    placeholder="Temporary Password"
                                    className="w-full bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-white outline-none focus:border-blue-500/50 pr-12"
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                    required
                                    buttonClassName="hover:text-white text-gray-400"
                                />
                                <p className="text-[11px] text-gray-400 mt-1.5 leading-tight">
                                    Password must be at least 8 characters and include uppercase, lowercase, number, and special character.
                                </p>
                            </div>
                            <div className="pt-4 flex space-x-3">
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-3 rounded-xl font-bold transition-all"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create'}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => { setShowModal(false); setFormError(null); }}
                                    className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
