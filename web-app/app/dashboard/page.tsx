'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Edit, Trash2, ArrowLeft, Calendar as CalendarIcon, MapPin, Plus, Activity, BarChart3, CreditCard, Zap, Copy, LayoutTemplate, ExternalLink, LayoutDashboard, X, Maximize2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import EventModal from '@/components/event-modal';
import SavedLocationsPage from '@/components/saved-locations';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function DashboardPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'events' | 'locations' | 'history' | 'templates'>('events');
    const [historyEvents, setHistoryEvents] = useState<any[]>([]);
    const [menus, setMenus] = useState<any[]>([]);
    const [previewMenu, setPreviewMenu] = useState<any | null>(null);

    // Derived Stats
    const [totalViews, setTotalViews] = useState(0);
    const [totalClicks, setTotalClicks] = useState(0);

    // Fetch user's saved locations from API
    const [userLocations, setUserLocations] = useState<any[]>([]);

    const fetchLocations = () => {
        if (session?.user?.email) {
            fetch(`${API_URL}/api/user-locations`, {
                headers: { 'x-user-email': session.user.email }
            })
                .then(res => res.json())
                .then(data => setUserLocations(data))
                .catch(err => console.error('Failed to load locations:', err));
        }
    };

    const fetchMenus = () => {
        if (session?.user?.email) {
            fetch(`${API_URL}/api/menus`, {
                headers: { 'x-user-email': session.user.email }
            })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setMenus(data);
                })
                .catch(err => console.error('Failed to load menus:', err));
        }
    };

    useEffect(() => {
        fetchLocations();
        fetchMenus();
    }, [session]);

    const fetchEvents = () => {
        if (!session?.user?.email) return;
        setLoading(true);

        // 1. Fetch Active Events
        fetch(`${API_URL}/events`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const userEvents = data.filter((e: any) => e.userEmail === session.user?.email);
                    // Sort Ascending (Chronological) to match Event Manager
                    const sorted = userEvents.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                    setEvents(sorted);

                    const views = userEvents.reduce((acc: number, curr: any) => acc + (curr.views || 0), 0);
                    const clicks = userEvents.reduce((acc: number, curr: any) => acc + (curr.clicks || 0), 0);
                    setTotalViews(views);
                    setTotalClicks(clicks);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));

        // 2. Fetch History (Silent bg fetch)
        fetch(`${API_URL}/events?history=true`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const userHistory = data.filter((e: any) => e.userEmail === session.user?.email);
                    const sortedHist = userHistory.sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
                    setHistoryEvents(sortedHist);
                }
            })
            .catch(e => console.error("History fetch error:", e));
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

    const handleDuplicate = (event: any) => {
        // Calculate "Tomorrow" for the default date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(12, 0, 0, 0);

        const tomorrowEnd = new Date(tomorrow);
        tomorrowEnd.setHours(14, 0, 0, 0);

        // Clone event but reset specific fields
        const newEvent = {
            ...event,
            id: null,             // Ensure it's treated as a NEW event
            title: event.title,    // Keep title
            description: event.description, // Keep description
            venue: event.venue,    // Keep location
            lat: event.lat,
            lng: event.lng,
            imageUrl: '',          // Clear image (User wants to take new photo)
            startTime: tomorrow.toISOString(),
            endTime: tomorrowEnd.toISOString(),
            views: 0,
            clicks: 0
        };

        setSelectedEvent(newEvent);
        setIsModalOpen(true);
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

    const handleDeleteMenu = async (id: string, title: string) => {
        if (!confirm(`Delete template "${title}"?`)) return;

        try {
            const res = await fetch(`${API_URL}/api/menus/${id}`, {
                method: 'DELETE',
                headers: { 'x-user-email': session?.user?.email || '' }
            });
            if (res.ok) {
                setMenus(prev => prev.filter(m => m.id !== id));
            } else {
                alert("Failed to delete menu.");
            }
        } catch (e) {
            console.error("Delete menu error", e);
            alert("Network error");
        }
    };

    const handleUseTemplate = (menu: any) => {
        // Save template data to sessionStorage
        const templateData = {
            title: menu.title,
            description: menu.content,
            imageUrl: menu.imageUrl,
            isTemplate: true
        };
        sessionStorage.setItem('event_template', JSON.stringify(templateData));

        // Redirect to Map
        router.push('/');
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

    const simulatedReach = totalViews + (totalClicks * 5); // Simple formula: Views + 5x for Clicks

    return (
        <div className="min-h-screen p-6 pb-32 transition-colors duration-300 bg-[#050510] font-sans text-white">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10 border-b border-gray-800 pb-10">
                        <div className="space-y-4">
                            <div className="flex gap-3 mb-1">
                                <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors text-xs font-black uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full hover:bg-white/10 border border-white/5">
                                    <ArrowLeft size={14} /> Back to Map
                                </Link>
                                <Link href="/admin" className="inline-flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors text-xs font-black uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full hover:bg-white/10 border border-white/5">
                                    <LayoutDashboard size={14} /> Admin
                                </Link>
                            </div>

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
                            <Link
                                href="/menu-test"
                                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-black uppercase tracking-widest px-6 py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                <LayoutTemplate size={18} className="text-pink-400" />
                                <span>Menu Architect</span>
                            </Link>
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
                                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Impressions</span>
                            </div>
                            <div className="text-4xl font-black text-white">{totalViews}</div>
                        </div>

                        <div className="bg-gray-800/20 border border-white/5 p-6 rounded-3xl backdrop-blur-md relative overflow-hidden group hover:border-purple-500/30 transition-all">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl">
                                    <BarChart3 size={24} />
                                </div>
                                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Interactions</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <div className="text-4xl font-black text-white">{totalClicks}</div>
                                <span className="text-green-400 text-xs font-bold text-opacity-50">Clicks</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-4 mb-8 border-b border-white/5 pb-2">
                        <button
                            onClick={() => setActiveTab('events')}
                            className={`pb-2 px-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'events' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                        >
                            My Events
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`pb-2 px-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'history' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                        >
                            History (7 Days)
                        </button>
                        <button
                            onClick={() => setActiveTab('locations')}
                            className={`pb-2 px-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'locations' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                        >
                            Saved Locations
                        </button>
                        <button
                            onClick={() => setActiveTab('templates')}
                            className={`pb-2 px-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'templates' ? 'border-pink-500 text-pink-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                        >
                            Menu Templates
                        </button>
                    </div>

                    {activeTab === 'events' && (
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
                    )}
                </header>

                {
                    activeTab === 'events' && (
                        <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 overflow-hidden shadow-2xl backdrop-blur-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-900/60 text-gray-500 text-[10px] uppercase tracking-[0.1em] font-black">
                                            <th className="p-5 border-b border-gray-700/50">Thumbnail</th>
                                            <th className="p-5 border-b border-gray-700/50">Event Details</th>
                                            <th className="p-5 border-b border-gray-700/50">Scheduled</th>
                                            <th className="p-5 border-b border-gray-700/50">Performance</th>
                                            <th className="p-5 border-b border-gray-700/50">Venue</th>
                                            <th className="p-5 border-b border-gray-700/50 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/50">
                                        {filteredEvents.map((event, index) => {
                                            const currentDate = new Date(event.startTime).toLocaleDateString();
                                            const prevDate = index > 0 ? new Date(filteredEvents[index - 1].startTime).toLocaleDateString() : null;
                                            const isNewGroup = currentDate !== prevDate;

                                            return (
                                                <>
                                                    {isNewGroup && (
                                                        <tr key={`header-${currentDate}`} className="bg-gray-900/40 border-b border-gray-700/50">
                                                            <td colSpan={6} className="p-3 pl-4 text-xs font-bold text-cyan-500 uppercase tracking-widest sticky top-0 bg-gray-900/90 backdrop-blur-sm z-10">
                                                                {new Date(event.startTime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                            </td>
                                                        </tr>
                                                    )}
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
                                                                {' - '}
                                                                {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </td>
                                                        <td className="p-5">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                                                                    <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                                                                    {event.views || 0} Views
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                                                                    <div className="w-2 h-2 rounded-full bg-purple-500/50"></div>
                                                                    {event.clicks || 0} Clicks
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-5">
                                                            <div className="flex items-start gap-2 text-sm text-gray-400">
                                                                <MapPin size={14} className="mt-1 text-cyan-500 shrink-0" />
                                                                <span className="line-clamp-2 leading-relaxed">{event.venue || 'Online Event'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-5 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleDuplicate(event)}
                                                                    className="p-3 bg-white/5 hover:bg-green-500/20 text-green-400 rounded-xl transition-all active:scale-90 border border-white/5"
                                                                    title="Duplicate for Tomorrow"
                                                                >
                                                                    <Copy size={18} />
                                                                </button>
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
                                                </>
                                            );
                                        })}
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

                    )
                }

                {
                    activeTab === 'history' && (
                        <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 overflow-hidden shadow-2xl backdrop-blur-sm">
                            <div className="p-6 border-b border-white/5 flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Activity size={18} /></div>
                                <h3 className="font-bold text-gray-300">Past Week Events</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-900/60 text-gray-500 text-[10px] uppercase tracking-[0.1em] font-black">
                                            <th className="p-5 border-b border-gray-700/50">Details</th>
                                            <th className="p-5 border-b border-gray-700/50">Ended</th>
                                            <th className="p-5 border-b border-gray-700/50 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/50">
                                        {historyEvents.map(event => (
                                            <tr key={event.id} className="hover:bg-white/[0.02] transition-colors opacity-70 hover:opacity-100">
                                                <td className="p-5">
                                                    <div className="font-bold text-white mb-0.5">{event.title}</div>
                                                    <div className="text-xs text-gray-500">{event.venue}</div>
                                                </td>
                                                <td className="p-5 text-sm text-gray-400">
                                                    {new Date(event.endTime).toLocaleDateString()}
                                                </td>
                                                <td className="p-5 text-right">
                                                    <button
                                                        onClick={() => handleDuplicate(event)}
                                                        className="p-2 bg-white/5 hover:bg-green-500/20 text-green-400 rounded-lg transition-all active:scale-95 border border-white/5 text-xs font-bold uppercase tracking-wider px-4 py-2"
                                                    >
                                                        Repost
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {historyEvents.length === 0 && (
                                <div className="p-12 text-center text-gray-500 text-sm">No history found for the last 7 days.</div>
                            )}
                        </div>
                    )
                }

                {activeTab === 'locations' && <SavedLocationsPage locations={userLocations} onRefresh={fetchLocations} />}

                {
                    activeTab === 'templates' && (
                        <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 overflow-hidden shadow-2xl backdrop-blur-sm">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400"><LayoutTemplate size={18} /></div>
                                    <h3 className="font-bold text-gray-300">My Menu Templates</h3>
                                </div>
                                <Link href="/menu-test" className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                    Create New <ExternalLink size={12} />
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                                {menus.map(menu => (
                                    <div key={menu.id} className="bg-gray-900 border border-gray-700 hover:border-pink-500/50 rounded-xl overflow-hidden group transition-all hover:shadow-2xl hover:shadow-pink-900/20">
                                        <div className="h-40 bg-gray-800 relative overflow-hidden">
                                            {menu.imageUrl ? (
                                                <img src={menu.imageUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold uppercase tracking-widest text-xs">No Preview</div>
                                            )}
                                            <div className="absolute top-2 right-2 bg-black/50 backdrop-blur px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-pink-400 border border-pink-500/30">
                                                {menu.theme}
                                            </div>
                                            <div onClick={() => setPreviewMenu(menu)} className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors cursor-pointer flex items-center justify-center group/overlay">
                                                <Maximize2 className="text-white opacity-0 group-hover/overlay:opacity-100 transition-opacity drop-shadow-lg" size={32} />
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteMenu(menu.id, menu.title); }}
                                                className="absolute top-2 left-2 p-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg backdrop-blur transition-all opacity-0 group-hover:opacity-100"
                                                title="Delete Template"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="p-5">
                                            <h4 className="font-bold text-lg text-white mb-1 line-clamp-1">{menu.title}</h4>
                                            <p className="text-xs text-gray-500 mb-4">{new Date(menu.createdAt).toLocaleDateString()}</p>

                                            <button
                                                onClick={() => handleUseTemplate(menu)}
                                                className="w-full py-3 bg-white hover:bg-gray-200 text-black font-black text-xs uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                                            >
                                                <Zap size={14} className="fill-black" /> Use Template
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <Link href="/menu-test" className="flex flex-col items-center justify-center h-full min-h-[250px] border-2 border-dashed border-gray-700 hover:border-pink-500/50 rounded-xl group transition-colors bg-white/5 hover:bg-white/10">
                                    <div className="p-4 bg-gray-800 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                        <Plus size={24} className="text-gray-400 group-hover:text-pink-400" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-400 group-hover:text-white uppercase tracking-wider">Create New Template</span>
                                </Link>
                            </div>
                        </div>
                    )
                }
            </div >

            {/* Menu Preview Modal */}
            {previewMenu && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewMenu(null)}>
                    <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-gray-900/50">
                            <h3 className="font-bold text-white text-lg">{previewMenu.title}</h3>
                            <button onClick={() => setPreviewMenu(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-[#050505] flex justify-center">
                            {previewMenu.imageUrl ? (
                                <img src={previewMenu.imageUrl} alt={previewMenu.title} className="max-w-full h-auto rounded-lg shadow-lg border border-white/5" />
                            ) : (
                                <div className="text-gray-500 text-center py-20">
                                    <LayoutTemplate size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>No preview image available</p>
                                    <div className="mt-4 p-4 bg-white/5 rounded text-left text-xs font-mono whitespace-pre-wrap max-w-md mx-auto">
                                        {previewMenu.content}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-white/5 bg-gray-900/50 flex justify-end gap-3">
                            <button
                                onClick={() => setPreviewMenu(null)}
                                className="px-6 py-3 rounded-xl font-bold text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    handleUseTemplate(previewMenu);
                                    setPreviewMenu(null);
                                }}
                                className="px-8 py-3 bg-white hover:bg-gray-200 text-black font-black text-sm uppercase tracking-widest rounded-xl transition-transform active:scale-95 flex items-center gap-2 shadow-lg shadow-white/10"
                            >
                                <Zap size={16} className="fill-black" /> Use Template
                            </button>
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
                theme="dark"
                userLocations={userLocations}
            />
        </div >
    );
}
