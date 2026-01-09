'use client';

import { useState, useEffect } from 'react';
import { Edit, Trash2, ArrowLeft, ExternalLink, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import EventModal from '@/components/event-modal';
import VerifyAdminAuth from '@/components/VerifyAdminAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function AdminEventsPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');

    // Edit Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    // Import State
    const [importUrl, setImportUrl] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    const fetchEvents = () => {
        setLoading(true);
        fetch(`${API_URL}/events`)
            .then(res => res.json())
            .then(data => {
                const sorted = data.sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
                setEvents(sorted);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleDelete = (id: string, title: string) => {
        if (!confirm(`Permanently delete "${title}"?`)) return;

        fetch(`${API_URL}/events/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-password': localStorage.getItem('admin_secret') || ''
            }
        })
            .then(res => {
                if (res.ok) {
                    setEvents(prev => prev.filter(e => e.id !== id));
                } else {
                    alert("Failed to delete event");
                }
            })
            .catch(err => alert("Error: " + err.message));
    };

    const handleEdit = (event: any) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    const handleImport = async () => {
        if (!importUrl) return;
        setIsImporting(true);
        try {
            const res = await fetch(`${API_URL}/api/preview-link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': localStorage.getItem('admin_secret') || ''
                },
                body: JSON.stringify({ url: importUrl })
            });
            const data = await res.json();
            if (data.error) {
                alert("Import failed: " + data.error);
            } else {
                const previewEvent = {
                    title: data.title,
                    description: data.description || `Imported from ${data.sourceUrl}`,
                    imageUrl: data.imageUrl,
                    venue: data.location,
                    startTime: data.dateRaw ? new Date(data.dateRaw + 'T' + (data.timeRaw || '12:00')).toISOString() : new Date().toISOString(),
                    endTime: data.dateRaw ? new Date(data.dateRaw + 'T' + (data.timeRaw ? String(parseInt(data.timeRaw.split(':')[0]) + 2).padStart(2, '0') + ':00' : '14:00')).toISOString() : new Date().toISOString(),
                    type: 'social',
                    link: data.sourceUrl
                };
                setSelectedEvent(previewEvent);
                setIsModalOpen(true);
            }
        } catch (e) {
            alert("Import error");
        } finally {
            setIsImporting(false);
            setImportUrl('');
        }
    };

    const handleUpdate = (updatedData: any) => {
        const finalEvent = selectedEvent?.id ? { ...selectedEvent, ...updatedData } : updatedData;
        const method = selectedEvent?.id ? 'PUT' : 'POST';
        const url = selectedEvent?.id ? `${API_URL}/events/${selectedEvent.id}` : `${API_URL}/events`;

        fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-admin-password': localStorage.getItem('admin_secret') || ''
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

    const filteredEvents = events.filter(e => {
        const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.venue && e.venue.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesType = filterType === 'ALL' || e.type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <VerifyAdminAuth>
            <div className="min-h-screen p-6 pb-32 transition-colors duration-300 bg-[#050510]">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-700 pb-6">
                        <div>
                            <a href="/admin" className="inline-flex items-center gap-2 text-gray-400 hover:text-cyan-400 mb-2 transition-colors text-sm font-bold uppercase tracking-wider">
                                <ArrowLeft size={16} /> Back to Scout
                            </a>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500">
                                Event Manager 🎹
                            </h1>
                            <p className="text-gray-400 text-sm mt-1">
                                {events.length} active events in database
                            </p>
                        </div>

                        {/* Import Section */}
                        <div className="flex gap-2 items-center bg-gray-800 p-2 rounded-xl border border-gray-700">
                            <input
                                type="text"
                                placeholder="Paste Facebook Link..."
                                value={importUrl}
                                onChange={(e) => setImportUrl(e.target.value)}
                                className="bg-transparent text-sm w-48 px-2 outline-none text-white placeholder-gray-500"
                            />
                            <button
                                onClick={handleImport}
                                disabled={isImporting}
                                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {isImporting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ExternalLink size={14} />}
                                Import
                            </button>
                        </div>

                        <div className="w-full md:w-auto flex gap-2">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
                            >
                                <option value="ALL">All Categories</option>
                                <option value="social">🍻 Social</option>
                                <option value="food">🍔 Food</option>
                                <option value="music">🎵 Music</option>
                                <option value="arts">🎨 Arts</option>
                                <option value="sports">⚽ Sports</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full md:w-64 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                            />
                        </div>
                    </header>

                    {/* Event Table */}
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
                                        <th className="p-4 border-b border-gray-700 w-16">Image</th>
                                        <th className="p-4 border-b border-gray-700">Event Details</th>
                                        <th className="p-4 border-b border-gray-700">Date & Time</th>
                                        <th className="p-4 border-b border-gray-700">Venue</th>
                                        <th className="p-4 border-b border-gray-700 w-24">Source</th>
                                        <th className="p-4 border-b border-gray-700 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {loading ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-gray-500 animate-pulse">Loading events...</td></tr>
                                    ) : filteredEvents.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-gray-500">No events found matching "{searchTerm}"</td></tr>
                                    ) : (
                                        filteredEvents.map(event => (
                                            <tr key={event.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="p-4">
                                                    <div className="w-12 h-12 rounded bg-gray-700 overflow-hidden">
                                                        {event.imageUrl ? (
                                                            <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No Img</div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1" title={event.title}>
                                                        {event.title}
                                                    </div>
                                                    <div className="text-xs text-gray-500 line-clamp-1">{event.type}</div>
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 text-sm text-gray-300">
                                                        <CalendarIcon size={14} className="text-purple-500" />
                                                        {new Date(event.startTime).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-xs text-gray-500 pl-6">
                                                        {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-start gap-2 text-sm text-gray-300">
                                                        <MapPin size={14} className="mt-1 text-cyan-500 shrink-0" />
                                                        <span className="line-clamp-2">{event.venue || event.location || 'Online'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {event.link && event.link !== 'N/A' ? (
                                                        <a href={event.link} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white transition-colors block p-2 bg-gray-700/50 rounded hover:bg-gray-700">
                                                            <ExternalLink size={16} className="mx-auto" />
                                                        </a>
                                                    ) : <span className="text-xs text-gray-600">-</span>}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEdit(event)}
                                                            className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                                                            title="Edit Event"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(event.id, event.title)}
                                                            className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                            title="Delete Event"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
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
        </VerifyAdminAuth>
    );
}
