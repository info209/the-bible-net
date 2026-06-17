"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/context/ToastContext';
import { UserRole } from '@/types/user';

export default function AdminSubAdminsPage() {
    const { data: session } = useSession();
    const [subAdmins, setSubAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
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
        try {
            const res = await fetch('/api/admin/sub-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setShowModal(false);
                fetchSubAdmins();
                setFormData({ firstName: '', lastName: '', email: '', password: '' });
                toast.success('Sub-admin created successfully!');
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to create sub-admin');
            }
        } catch (err) {
            toast.error('Error creating sub-admin');
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
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                    + Create Sub-Admin
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-gray-500">Loading sub-admins...</div>
                ) : subAdmins.map(admin => (
                    <div key={admin._id} className="p-6 rounded-2xl bg-[#111] border border-white/5 relative group">
                        <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xl mb-4">
                            {admin.firstName[0]}
                        </div>
                        <h3 className="text-lg font-bold">{admin.firstName} {admin.lastName}</h3>
                        <p className="text-sm text-gray-400">{admin.email}</p>
                        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded bg-blue-500/10 text-blue-400`}>
                                SUB_ADMIN
                            </span>
                            <span className="text-xs text-gray-500">
                                Joined {new Date(admin.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Simple Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#111] border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl">
                        <h2 className="text-2xl font-bold mb-6">Create New Sub-Admin</h2>
                        <form onSubmit={handleCreateSubAdmin} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input 
                                    placeholder="First Name"
                                    className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-white outline-none"
                                    value={formData.firstName}
                                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                                    required
                                />
                                <input 
                                    placeholder="Last Name"
                                    className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-white outline-none"
                                    value={formData.lastName}
                                    onChange={e => setFormData({...formData, lastName: e.target.value})}
                                    required
                                />
                            </div>
                            <input 
                                type="email"
                                placeholder="Email"
                                className="w-full bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-white outline-none"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                required
                            />
                            <input 
                                type="password"
                                placeholder="Temporary Password"
                                className="w-full bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-white outline-none"
                                value={formData.password}
                                onChange={e => setFormData({...formData, password: e.target.value})}
                                required
                            />
                            <div className="pt-4 flex space-x-3">
                                <button type="submit" className="flex-1 bg-blue-600 py-3 rounded-xl font-bold">Create</button>
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl bg-white/5 font-bold">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
