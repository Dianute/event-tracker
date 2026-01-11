'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Edit, Trash2, ArrowLeft, Calendar as CalendarIcon, MapPin, Plus, Activity, BarChart3, CreditCard, Zap } from 'lucide-react';
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

    const activeEventsCount = events.filter(ev => {
        if (!ev.endTime) return true;
        return new Date(ev.endTime) > new Date();
    }).length;

    const simulatedReach = (events.length * 42) + (activeEventsCount * 15);

    return (
        <div className="min-h-screen p-6 pb-32 transition-colors duration-300 bg-[#050510] font-sans text-white">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10 border-b border-gray-800 pb-10">
                        <div className="space-y-4">
                            <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-cyan-400 mb-1 transition-colors text-xs font-black uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full hover:bg-white/10 border border-white/5">
                                <ArrowLeft size={14} /> Back to Map
                            </Link>

                            <div className="flex items-center gap-4">
                                <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 animate-gradient-x leading-tight">
                                    Business Hub
                                </h1>
                                <div className="bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-500/30 px-3 py-1 rounded-lg flex items-center gap-2 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_#eab308]"></span>
                                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-tighter">Free Plan</span>
                                </div>
                            </div>

                            <p className="text-gray-400 text-base font-medium max-w-lg leading-relaxed">
                                Welcome back, <span className="text-white font-bold">{session?.user?.name || 'Partner'}</span>. Monitor your reach and manage your active promotions.
                            </p>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4">
                            <button
                                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-black uppercase tracking-widest px-6 py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                <CreditCard size={18} className="text-purple-400" />
                                <span>Go Pro</span>
                            </button>
                            <button
                                onClick={() => { setSelectedEvent(null); setIsModalOpen(true); }}
                                className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-xl shadow-blue-900/40 active:scale-95 flex items-center justify-center gap-3"
                            >
                                <Plus size={20} />
                                <span>Launch Event</span>
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        <div className="bg-gray-800/20 border border-white/5 p-6 rounded-3xl backdrop-blur-md relative overflow-hidden group hover:border-blue-500/30 transition-all">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl">
                                    <CalendarIcon size={24} />
                                </div>
                                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Total Events</span>
                            </div>
                            <div className="text-4xl font-black text-white">{events.length}</div>
                        </div>

                        <div className="bg-gray-800/20 border border-white/5 p-6 rounded-3xl backdrop-blur-md relative overflow-hidden group hover:border-green-500/30 transition-all">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-all"></div>
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3 bg-green-500/10 text-green-400 rounded-2xl">
                                    <Activity size={24} />
                                </div>
                                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Active Now</span>
                            </div>
                            <div className="text-4xl font-black text-white">{activeEventsCount}</div>
                        </div>

                        <div className="bg-gray-800/20 border border-white/5 p-6 rounded-3xl backdrop-blur-md relative overflow-hidden group hover:border-purple-500/30 transition-all">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl">
                                    <BarChart3 size={24} />
                                </div>
                                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Profile Reach</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <div className="text-4xl font-black text-white">{simulatedReach}</div>
                                <span className="text-green-400 text-xs font-bold">+12%</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-500 transition-colors">
                            <Zap size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Filter your events by title, venue, or category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-900 border border-white/5 rounded-2xl pl-12 pr-12 py-5 text-white focus:outline-none focus:border-blue-500/50 shadow-2xl transition-all font-medium placeholder:text-gray-600"
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
