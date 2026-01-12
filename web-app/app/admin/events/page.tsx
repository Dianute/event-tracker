'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Edit, Trash2, ArrowLeft, ExternalLink, Calendar as CalendarIcon, MapPin, Plus, Utensils } from 'lucide-react';
import EventModal from '@/components/event-modal';
import WeeklyMenuModal from '@/components/weekly-menu-modal';
import SavedLocationsPage from '@/components/saved-locations';
import VerifyAdminAuth from '@/components/VerifyAdminAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function AdminEventsPage() {
    const { data: session } = useSession();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [activeTab, setActiveTab] = useState<'active' | 'history' | 'locations'>('active');
    const [historyEvents, setHistoryEvents] = useState<any[]>([]);

    // Saved Locations
    const [userLocations, setUserLocations] = useState<any[]>([]);

    // Edit Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    // Weekly Menu Modal State
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);

    // Import State
    const [importUrl, setImportUrl] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    const fetchEvents = () => {
        setLoading(true);
        // 1. Fetch Active
        fetch(`${API_URL}/events`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Sort Ascending (Chronological: Monday -> Friday)
                    const sorted = data.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                    setEvents(sorted);
                } else {
                    console.error("Invalid API response:", data);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));

        // 2. Fetch History (Silent)
        fetch(`${API_URL}/events?history=true`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const sortedHist = data.sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
                    setHistoryEvents(sortedHist);
                }
            })
            .catch(e => console.error("History fetch error:", e));
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    // Fetch Locations (for Modal) - Updated to support Admin Override
    const fetchUserLocations = () => {
        const headers: any = {};
        if (session?.user?.email) {
            headers['x-user-email'] = session.user.email;
        } else {
            // Fallback: Use Admin Secret if available
            const adminPass = localStorage.getItem('admin_secret');
            if (adminPass) headers['x-admin-password'] = adminPass;
        }

        if (Object.keys(headers).length > 0) {
            fetch(`${API_URL}/api/user-locations`, { headers })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setUserLocations(data);
                })
                .catch(err => console.error("Location fetch error:", err));
        }
    };

    useEffect(() => {
        fetchUserLocations();
    }, [session]);

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
        setIsReadOnly(false);
        setIsModalOpen(true);
    };

    const handlePreview = (event: any) => {
        setSelectedEvent(event);
        setIsReadOnly(true);
        setIsModalOpen(true);
    };

    const handleCreateNew = () => {
        setSelectedEvent(null);
        setIsReadOnly(false);
        setIsModalOpen(true);
    };

    const handleBatchCreate = async (newEvents: any[]) => {
        // Send all events in parallel
        setLoading(true);
        try {
            const adminPass = localStorage.getItem('admin_secret') || '';

            // Promise.allSettled is safer, but for now Promise.all is okay
            const promises = newEvents.map(evt =>
                fetch(`${API_URL}/events`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-password': adminPass
                    },
                    body: JSON.stringify({
                        ...evt,
                        userEmail: session?.user?.email
                    })
                })
            );

            await Promise.all(promises);
            // Refresh
            fetchEvents();
            setIsMenuModalOpen(false);
        } catch (e) {
            console.error(e);
            alert("Error creating batch events");
            setLoading(false);
        }
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
                    // Also refresh locations if updated
                    fetchUserLocations();
                } else {
                    const err = await res.json();
                    alert("Operation failed: " + err.error);
                }
            })
            .catch(e => alert("Network error: " + e.message));
    };

    const currentList = activeTab === 'active' ? events : historyEvents;

    const filteredEvents = currentList.filter((e: any) => {
        const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.venue && e.venue.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesType = filterType === 'ALL' || e.type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <VerifyAdminAuth>
            <div className="min-h-screen p-6 pb-32 transition-colors duration-300 bg-[#050510] font-sans">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <header className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 border-b border-gray-800 pb-6">
                            <div>
                                <a href="/admin" className="inline-flex items-center gap-2 text-gray-400 hover:text-cyan-400 mb-3 transition-colors text-xs font-bold uppercase tracking-wider bg-white/5 px-3 py-1.5 rounded-full hover:bg-white/10">
                                    <ArrowLeft size={14} /> Back to Dashboard
                                </a>
                                <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 animate-gradient-x">
                                    Event Manager 🎹
                                </h1>
                                <button
                                    onClick={() => {
                                        alert("Testing Connection...");
                                        fetch(`${API_URL}/api/health-db`)
                                            .then(res => res.text())
                                            .then(txt => alert("DB Health: " + txt))
                                            .catch(err => alert("DB Health Error: " + err));

                                        fetch(`${API_URL}/events`)
                                            .then(res => alert("Events Endpoint: " + res.status + " " + res.statusText))
                                            .catch(err => alert("Events Endpoint Network Error: " + err));
                                    }}
                                    className="text-[10px] bg-red-900/50 text-red-200 px-2 py-1 rounded border border-red-500/30 hover:bg-red-900 mt-2"
                                >
                                    ⚠️ Test Connection
                                </button>
                                <p className="text-gray-400 text-sm mt-2 font-medium">
                                    Database contains <span className="text-white font-bold">{events.length}</span> active events
                                </p>

                                {/* Tabs */}
                                <div className="flex gap-4 mt-6 border-b border-gray-800">
                                    <button onClick={() => setActiveTab('active')} className={`pb-2 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'active' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                                        Active
                                    </button>
                                    <button onClick={() => setActiveTab('history')} className={`pb-2 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'history' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                                        History ({historyEvents.length})
                                    </button>
                                    <button onClick={() => setActiveTab('locations')} className={`pb-2 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'locations' ? 'border-green-500 text-green-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                                        Saved Locations
                                    </button>
                                </div>
                            </div>

                            {/* Right Side: Actions & Import */}
                            <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                                {/* Actions Group */}
                                <div className="flex flex-col md:flex-row items-stretch gap-3 w-full md:w-auto">
                                    <button
                                        onClick={handleCreateNew}
                                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95"
                                    >
                                        <Plus size={16} /> New Event
                                    </button>
                                    <button
                                        onClick={() => setIsMenuModalOpen(true)}
                                        className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-xs font-bold px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <Utensils size={16} className="text-orange-400" /> Add Weekly Menu
                                    </button>
                                </div>

                                {/* Import Section (Restored) */}
                                <div className="flex items-center gap-2 bg-gray-900/50 p-1.5 rounded-xl border border-gray-700/50 w-full md:w-auto">
                                    <input
                                        type="text"
                                        placeholder="Paste Facebook/Ticket Link..."
                                        value={importUrl}
                                        onChange={(e) => setImportUrl(e.target.value)}
                                        className="bg-transparent text-sm w-full md:w-48 px-3 py-1 outline-none text-white placeholder-gray-600 font-medium"
                                    />
                                    <button
                                        onClick={handleImport}
                                        disabled={isImporting || !importUrl}
                                        className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-[10px] font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-2 shrink-0"
                                    >
                                        {isImporting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ExternalLink size={12} />}
                                        Import
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Search events by title or venue..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl pl-4 pr-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:bg-gray-800 transition-all font-medium placeholder-gray-600"
                                />
                            </div>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="bg-gray-900/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-all cursor-pointer font-bold text-sm appearance-none min-w-[160px]"
                            >
                                <option value="ALL">All Categories</option>
                                <option value="social">🍻 Social</option>
                                <option value="food">🍔 Food</option>
                                <option value="music">🎵 Music</option>
                                <option value="arts">🎨 Arts</option>
                                <option value="sports">⚽ Sports</option>
                            </select>
                        </div>
                    </header>

                    {/* Event Table - Conditional Rendering */}
                    {activeTab === 'locations' ? (
                        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-2xl mt-6">
                            <SavedLocationsPage locations={userLocations} onRefresh={fetchUserLocations} />
                        </div>
                    ) : (
                        /* Event Table */
                        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
                                            <th className="p-4 border-b border-gray-700 w-16">Image</th>
                                            <th className="p-4 border-b border-gray-700">Event Details</th>
                                            <th className="p-4 border-b border-gray-700">Date & Time</th>
                                            <th className="p-4 border-b border-gray-700">Venue</th>
                                            <th className="p-4 border-b border-gray-700">Creator</th>
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
                                            filteredEvents.map((event, index) => {
                                                const currentDate = new Date(event.startTime).toLocaleDateString();
                                                const prevDate = index > 0 ? new Date(filteredEvents[index - 1].startTime).toLocaleDateString() : null;
                                                const isNewGroup = currentDate !== prevDate;

                                                return (
                                                    <>
                                                        {isNewGroup && (
                                                            <tr key={`header-${currentDate}`} className="bg-gray-800/80 border-b border-gray-700/50">
                                                                <td colSpan={7} className="p-3 pl-4 text-xs font-bold text-blue-400 uppercase tracking-widest sticky top-0">
                                                                    {new Date(event.startTime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                                </td>
                                                            </tr>
                                                        )}
                                                        <tr key={event.id} className="hover:bg-white/5 transition-colors group">
                                                            <td className="p-4 cursor-pointer" onClick={() => handlePreview(event)}>
                                                                <div className="w-12 h-12 rounded bg-gray-700 overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all">
                                                                    {event.imageUrl ? (
                                                                        <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No Img</div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="p-4 cursor-pointer" onClick={() => handlePreview(event)}>
                                                                <div className="font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1" title={event.title}>
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
                                                                    {' - '}
                                                                    {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex items-start gap-2 text-sm text-gray-300">
                                                                    <MapPin size={14} className="mt-1 text-cyan-500 shrink-0" />
                                                                    <span className="line-clamp-2">{event.venue || event.location || 'Online'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-xs text-gray-400 max-w-[150px] truncate" title={event.userEmail}>
                                                                {event.userEmail || '-'}
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
                                                    </>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                </div>
                )}

                {/* Edit Modal */}
                <EventModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={handleUpdate}
                    initialLocation={selectedEvent ? { lat: selectedEvent.lat, lng: selectedEvent.lng } : null}
                    event={selectedEvent}
                    readOnly={isReadOnly}
                    theme="dark"
                    userLocations={userLocations}
                    onLocationsChange={fetchUserLocations}
                />

                {/* Weekly Menu Modal */}
                <WeeklyMenuModal
                    isOpen={isMenuModalOpen}
                    onClose={() => setIsMenuModalOpen(false)}
                    onSubmit={handleBatchCreate}
                    userLocations={userLocations}
                />
            </div>
        </VerifyAdminAuth>
    );
}
