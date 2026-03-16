"use client";

import { useState, useEffect } from 'react';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            const result = await res.json();
            if (result.success) {
                setUsers(result.data);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const deactivateUser = async (id: string) => {
        if (!confirm('Are you sure you want to deactivate this user?')) return;

        try {
            const res = await fetch(`/api/admin/users/${id}/deactivate`, {
                method: 'PUT',
            });
            const result = await res.json();
            if (res.ok) {
                alert('User deactivated');
                fetchUsers();
            } else {
                alert(result.error || 'Failed to deactivate');
            }
        } catch (err) {
            alert('Error performing action');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">User Management</h1>
                    <p className="text-gray-400 mt-1">Manage and audit your application users</p>
                </div>
            </div>

            <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                {loading ? (
                    <div className="p-20 text-center text-gray-500">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        Loading users...
                    </div>
                ) : error ? (
                    <div className="p-20 text-center text-red-400">
                        {error}
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-xs uppercase tracking-wider text-gray-400 font-bold border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Joined</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.map(user => (
                                <tr key={user._id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-white">{user.firstName} {user.lastName}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${user.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                            {user.isActive ? 'Active' : 'Deactivated'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 text-sm">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.isActive && (
                                            <button 
                                                onClick={() => deactivateUser(user._id)}
                                                className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-tighter"
                                            >
                                                Deactivate
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
