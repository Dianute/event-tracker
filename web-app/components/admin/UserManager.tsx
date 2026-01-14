'use client';

import { useState, useEffect } from 'react';
import { Users, Shield, Ban, CheckCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function UserManager() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = () => {
        setLoading(true);
        const adminPass = localStorage.getItem('admin_secret') || '';

        fetch(`${API_URL}/api/users`, {
            headers: { 'x-admin-password': adminPass }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setUsers(data);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const toggleBlock = async (email: string, currentStatus: boolean) => {
        const adminPass = localStorage.getItem('admin_secret') || '';
        try {
            const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(email)}/block`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': adminPass
                },
                body: JSON.stringify({ isBlocked: !currentStatus })
            });
            if (res.ok) fetchUsers();
            else alert("Failed to update user");
        } catch (e) {
            alert("Network error");
        }
    };

    const toggleTrust = async (email: string, currentStatus: boolean) => {
        const adminPass = localStorage.getItem('admin_secret') || '';
        try {
            const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(email)}/trust`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': adminPass
                },
                body: JSON.stringify({ isTrusted: !currentStatus })
            });
            if (res.ok) fetchUsers();
            else alert("Failed to update trust");
        } catch (e) {
            alert("Network error");
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-white mb-2">User Management</h2>
                    <p className="text-gray-400">Monitor and manage user access.</p>
                </div>
                <div className="bg-blue-500/10 text-blue-400 px-4 py-2 rounded-xl border border-blue-500/20 font-bold">
                    {users.length} Total Users
                </div>
            </header>

            <div className="bg-gray-900/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-black/40 text-gray-500 text-xs uppercase tracking-wider font-bold">
                            <th className="p-4 border-b border-white/5">Email</th>
                            <th className="p-4 border-b border-white/5">Events</th>
                            <th className="p-4 border-b border-white/5">Trust Level</th>
                            <th className="p-4 border-b border-white/5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                        {users.map(user => (
                            <tr key={user.email} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 font-medium text-white">
                                    {user.email}
                                    {user.role === 'admin' && <span className="ml-2 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/20">ADMIN</span>}
                                </td>
                                <td className="p-4 text-gray-300">{user.eventCount || 0}</td>
                                <td className="p-4">
                                    <button
                                        onClick={() => toggleTrust(user.email, user.isTrusted)}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${user.isTrusted
                                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20'
                                                : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-gray-400'
                                            }`}
                                    >
                                        {user.isTrusted ? 'Trusted (Auto)' : 'Standard'}
                                    </button>
                                </td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={() => toggleBlock(user.email, user.isBlocked)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all inline-flex items-center gap-2 ${user.isBlocked
                                                ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-900/20'
                                                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
                                            }`}
                                    >
                                        {user.isBlocked ? (
                                            <><Ban size={12} /> Banned</>
                                        ) : (
                                            <><CheckCircle size={12} /> Active</>
                                        )}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {users.length === 0 && !loading && (
                    <div className="p-12 text-center text-gray-500">No users found.</div>
                )}
            </div>
        </div>
    );
}
