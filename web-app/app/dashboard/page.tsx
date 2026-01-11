'use client';

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Map as MapIcon, Calendar, User, LayoutDashboard, Edit, Trash2, Plus } from "lucide-react";
import EventModal from "@/components/event-modal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function UserDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [status, router]);

    // Fetch User Events
    const fetchUserEvents = () => {
        if (!session?.user?.email) return;

        setLoading(true);
        fetch(`${API_URL}/events`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Filter events by email
                    const myEvents = data.filter((e: any) => e.userEmail === session.user.email);
                    // Sort details: newest first
                    myEvents.sort((a: any, b: any) => new Date(b.createdAt || b.startTime).getTime() - new Date(a.createdAt || a.startTime).getTime());
                    setEvents(myEvents);
                }
            })
            .catch(err => console.error("Failed to load events:", err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (status === 'authenticated') {
            fetchUserEvents();
        }
    }, [status, session]);

    // Handlers
    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Permanently delete "${title}"?`)) return;

        try {
            const res = await fetch(`${API_URL}/events/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-email': session?.user?.email || ''
                }
            });

            if (res.ok) {
                setEvents(prev => prev.filter(e => e.id !== id));
            } else {
                const err = await res.json();
                alert("Failed to delete: " + (err.error || "Unauthorized"));
            }
        } catch (e) {
            alert("Network error");
        }
    };

    const handleCreateOrUpdate = async (data: any) => {
        const method = selectedEvent?.id ? 'PUT' : 'POST';
        const url = selectedEvent?.id ? `${API_URL}/events/${selectedEvent.id}` : `${API_URL}/events`;

        // Ensure userEmail is attached for creation, or header for update
        const payload = {
            ...data,
            userEmail: session?.user?.email // Backend uses this for new events
        };
        // For Update, we rely on Header Auth defined in server.js

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-email': session?.user?.email || ''
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setSelectedEvent(null);
                fetchUserEvents();
            } else {
                const err = await res.json();
                alert("Operation failed: " + (err.error || "Unknown"));
            }
        } catch (e) {
            alert("Network error");
        }
    };

    const openCreateModal = () => {
        setSelectedEvent(null);
        setIsModalOpen(true);
    };

    const openEditModal = (event: any) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-[#050510] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050510] text-white font-sans p-6 pb-24">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-gray-800 pb-8 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-500 shadow-lg shadow-blue-500/20">
                            {session?.user?.image ? (
                                <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-blue-600 flex items-center justify-center text-xl font-bold">
                                    {session?.user?.name?.[0] || 'U'}
                                </div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
                                {session?.user?.name}'s Dashboard
                            </h1>
                            <p className="text-gray-400 text-sm">Manage your events and profile</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={openCreateModal}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
                        >
                            <Plus size={16} /> New Event
                        </button>
                        <a href="/" className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold text-sm transition-all flex items-center gap-2 border border-gray-700">
                            <MapIcon size={16} /> Map
                        </a>
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold text-sm transition-all flex items-center gap-2 border border-red-500/20"
                        >
                            <LogOut size={16} /> Sign Out
                        </button>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl hover:border-blue-500/30 transition-all group">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                            <Calendar size={20} />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-1">{events.length}</h3>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">My Events</p>
                    </div>
                    {/* Placeholder Stats */}
                    <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl opacity-50">
                        <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 mb-4">
                            <User size={20} />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-1">-</h3>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Total Views</p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl opacity-50">
                        <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400 mb-4">
                            <LayoutDashboard size={20} />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-1">Free</h3>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Plan</p>
                    </div>
                </div>

                {/* My Events List */}
                <div className="bg-gray-900/30 border border-gray-800 rounded-3xl overflow-hidden">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">My Events</h2>
                    </div>

                    {loading ? (
                        <div className="p-10 text-center text-gray-500 animate-pulse">Loading your events...</div>
                    ) : events.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-gray-400 mb-4">You haven't created any events yet.</p>
                            <button onClick={openCreateModal} className="text-blue-400 font-bold hover:underline">Create your first event</button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 w-16">Img</th>
                                        <th className="p-4">Title</th>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Venue</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {events.map((event) => (
                                        <tr key={event.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-4">
                                                <div className="w-10 h-10 rounded bg-gray-800 overflow-hidden">
                                                    {event.imageUrl && <img src={event.imageUrl} className="w-full h-full object-cover" />}
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-white">{event.title}</td>
                                            <td className="p-4 text-sm text-gray-400">
                                                {new Date(event.startTime).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 text-sm text-gray-400 max-w-[150px] truncate">
                                                {event.venue || event.location || 'Online'}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => openEditModal(event)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors" title="Edit">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(event.id, event.title)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Delete">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Reuse EventModal */}
            <EventModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateOrUpdate}
                event={selectedEvent}
                theme="dark"
                userEmail={session?.user?.email} // Pass user email for safety
            />
        </div>
    );
}
