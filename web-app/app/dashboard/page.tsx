'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Edit, Trash2, ArrowLeft, Calendar as CalendarIcon, MapPin, Plus } from 'lucide-react';
import EventModal from '@/components/event-modal';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Edit Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    const fetchEvents = () => {
        if (!session?.user?.email) return;
        setLoading(true);
        fetch(`${API_URL}/events`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Filter by current user's email
                    const userEvents = data.filter((e: any) => e.userEmail === session.user?.email);
                    const sorted = userEvents.sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
                    setEvents(sorted);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (status === 'authenticated') {
            fetchEvents();
        }
    }, [status, session]);

    const handleDelete = (id: string, title: string) => {
        if (!confirm(`Permanently delete "${title}"?`)) return;

        // Note: For now, we still need the admin password because backend requires it.
        // We'll update the backend to allow deletion if userEmail matches.
        const adminPass = localStorage.getItem('admin_secret') || '';

        fetch(`${API_URL}/events/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-password': adminPass,
                'x-user-email': session?.user?.email || ''
            }
        })
            .then(res => {
                if (res.ok) {
                    setEvents(prev => prev.filter(e => e.id !== id));
                } else {
                    alert("Failed to delete event. Only admins or owners can do this.");
                }
            })
            .catch(err => alert("Error: " + err.message));
    };

    const handleEdit = (event: any) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    const handleUpdate = (updatedData: any) => {
        const finalEvent = selectedEvent?.id ? { ...selectedEvent, ...updatedData } : updatedData;
        const method = selectedEvent?.id ? 'PUT' : 'POST';
        const url = selectedEvent?.id ? `${API_URL}/events/${selectedEvent.id}` : `${API_URL}/events`;

        const adminPass = localStorage.getItem('admin_secret') || '';

        fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-admin-password': adminPass,
                'x-user-email': session?.user?.email || ''
            },
            body: JSON.stringify(finalEvent)
        })
            .then(async res => {
                if (res.ok) {
                    setIsModalOpen(false);
                    setSelectedEvent(null);
                    fetchEvents();
                } else {
                    const err = await res.json();
                    alert("Operation failed: " + err.error);
                }
            })
            .catch(e => alert("Network error: " + e.message));
    };

    const filteredEvents = events.filter(e =>
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.venue && e.venue.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (status === 'loading' || (status === 'authenticated' && loading)) {
        return (
            <div className="min-h-screen bg-[#050510] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    if (status === 'unauthenticated') {
        return (
            <div className="min-h-screen bg-[#050510] flex flex-col items-center justify-center p-6 text-white text-center">
                <h1 className="text-3xl font-black mb-4 text-red-400">Access Denied</h1>
                <p className="text-gray-400 mb-8 max-w-sm">Please sign in to access your dashboard and manage your events.</p>
                <Link href="/auth/signin" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-2xl shadow-lg transition-all active:scale-95">
                    Sign In
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 pb-32 transition-colors duration-300 bg-[#050510] font-sans text-white">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 border-b border-gray-800 pb-6">
                        <div>
                            <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-cyan-400 mb-3 transition-colors text-xs font-bold uppercase tracking-wider bg-white/5 px-3 py-1.5 rounded-full hover:bg-white/10">
                                <ArrowLeft size={14} /> Back to Map
                            </Link>
                            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 animate-gradient-x">
                                Business Dashboard 🚀
                            </h1>
                            <p className="text-gray-400 text-sm mt-2 font-medium">
                                Manage your active events and promotions
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setSelectedEvent(null); setIsModalOpen(true); }}
                                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex items-center gap-2"
                            >
                                <Plus size={16} /> Create Event
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search your events..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl pl-4 pr-12 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:bg-gray-800 transition-all font-medium placeholder:text-gray-600"
                        />
                    </div>
                </header>

                <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 overflow-hidden shadow-2xl backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-900/60 text-gray-500 text-[10px] uppercase tracking-[0.1em] font-black">
                                    <th className="p-5 border-b border-gray-700/50">Thumbnail</th>
                                    <th className="p-5 border-b border-gray-700/50">Event Details</th>
                                    <th className="p-5 border-b border-gray-700/50">Scheduled</th>
                                    <th className="p-5 border-b border-gray-700/50">Venue</th>
                                    <th className="p-5 border-b border-gray-700/50 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {filteredEvents.map(event => (
                                    <tr key={event.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-5">
                                            <div className="w-16 h-16 rounded-xl bg-gray-900 border border-white/5 overflow-hidden shadow-inner flex shrink-0">
                                                {event.imageUrl ? (
                                                    <img src={event.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-[10px] font-bold uppercase tracking-tighter">No Image</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="font-bold text-white group-hover:text-blue-400 transition-colors mb-0.5 line-clamp-1">
                                                {event.title}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wider border border-blue-500/20">{event.type}</span>
                                            </div>
                                        </td>
                                        <td className="p-5 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-sm text-gray-300 font-medium">
                                                <CalendarIcon size={14} className="text-blue-500" />
                                                {new Date(event.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                            <div className="text-xs text-gray-500 pl-6 mt-0.5">
                                                {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-start gap-2 text-sm text-gray-400">
                                                <MapPin size={14} className="mt-1 text-cyan-500 shrink-0" />
                                                <span className="line-clamp-2 leading-relaxed">{event.venue || 'Online Event'}</span>
                                            </div>
                                        </td>
                                        <td className="p-5 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <button
                                                    onClick={() => handleEdit(event)}
                                                    className="p-3 bg-white/5 hover:bg-blue-500/20 text-blue-400 rounded-xl transition-all active:scale-90 border border-white/5"
                                                    title="Edit"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(event.id, event.title)}
                                                    className="p-3 bg-white/5 hover:bg-red-500/20 text-red-400 rounded-xl transition-all active:scale-90 border border-white/5"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredEvents.length === 0 && (
                        <div className="p-20 text-center">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                                <CalendarIcon className="text-gray-600" size={32} />
                            </div>
                            <p className="text-gray-500 font-medium">No events found.</p>
                            <p className="text-xs text-gray-600 mt-1">Create your first event to get started.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            <EventModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleUpdate}
                initialLocation={selectedEvent ? { lat: selectedEvent.lat, lng: selectedEvent.lng } : null}
                event={selectedEvent}
                theme="dark"
            />
        </div>
    );
}
