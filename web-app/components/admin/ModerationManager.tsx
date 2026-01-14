'use client';

import { useState, useEffect } from 'react';
import { Check, X, Clock, MapPin, ExternalLink } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type Event = {
    id: string;
    title: string;
    description: string;
    venue: string;
    status: string;
    createdAt: string;
    imageUrl?: string;
    userEmail: string;
};

export default function ModerationManager() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPending = () => {
        setLoading(true);
        const adminPass = localStorage.getItem('admin_secret') || '';

        fetch(`${API_URL}/events?status=pending`, {
            headers: { 'x-admin-password': adminPass }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setEvents(data);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
        const adminPass = localStorage.getItem('admin_secret') || '';
        try {
            const res = await fetch(`${API_URL}/api/events/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': adminPass
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                // Optimistic remove
                setEvents(prev => prev.filter(e => e.id !== id));
            } else {
                alert("Failed to update status");
            }
        } catch (e) {
            alert("Network error");
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-white mb-2">Pending Approval</h2>
                    <p className="text-gray-400">Review and approve events before they go live.</p>
                </div>
                <div className="bg-amber-500/10 text-amber-400 px-4 py-2 rounded-xl border border-amber-500/20 font-bold flex items-center gap-2">
                    <Clock size={16} />
                    {events.length} Pending
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {events.map(event => (
                    <div key={event.id} className="bg-gray-900/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm group flex flex-col">
                        <div className="relative h-48 bg-gray-800">
                            {event.imageUrl ? (
                                <img src={event.imageUrl} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-700 font-black text-4xl">NO IMG</div>
                            )}
                            <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded backdrop-blur text-xs font-mono text-gray-300">
                                {event.userEmail}
                            </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col">
                            <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{event.title}</h3>
                            <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                                <MapPin size={12} /> {event.venue || 'No Venue'}
                            </p>

                            <p className="text-gray-400 text-sm mb-6 line-clamp-3 leading-relaxed">
                                {event.description}
                            </p>

                            <div className="mt-auto grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => updateStatus(event.id, 'rejected')}
                                    className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all text-sm font-bold flex items-center justify-center gap-2 border border-red-500/20 hover:border-red-500"
                                >
                                    <X size={16} /> Reject
                                </button>
                                <button
                                    onClick={() => updateStatus(event.id, 'approved')}
                                    className="px-4 py-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-all text-sm font-bold flex items-center justify-center gap-2 border border-green-500/20 hover:border-green-500"
                                >
                                    <Check size={16} /> Approve
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {events.length === 0 && !loading && (
                <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/5 mx-auto max-w-lg">
                    <Check size={48} className="mx-auto text-green-500/50 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">All Caught Up!</h3>
                    <p className="text-gray-500">No pending events to review.</p>
                </div>
            )}
        </div>
    );
}
