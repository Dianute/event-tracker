'use client';

import { useState, useEffect } from 'react';
import { Download, Upload } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

import EventModal from '@/components/event-modal';

export default function AdminPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("IDLE");
    const [customUrl, setCustomUrl] = useState("");
    const [targets, setTargets] = useState<any[]>([]);
    const [newTarget, setNewTarget] = useState({ name: "", url: "", city: "" });
    const [previewEvent, setPreviewEvent] = useState<any | null>(null);
    const [testError, setTestError] = useState<string | null>(null);
    const [testingId, setTestingId] = useState<string | null>(null);

    // Event Management State
    const [editingEvent, setEditingEvent] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchEvents = () => {
        fetch(`${API_URL}/events`)
            .then(res => res.json())
            .then(setEvents)
            .catch(console.error);
    };

    const fetchHistory = () => {
        setLoading(true);
        fetch(`${API_URL}/scout/history`)
            .then(res => res.json())
            .then(data => {
                setLogs(data);
                // Check if latest run is still effective
                if (data.length > 0 && data[0].status === 'RUNNING') {
                    setStatus("RUNNING");
                } else {
                    setStatus("IDLE");
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    const fetchTargets = () => {
        fetch(`${API_URL}/targets?_t=${Date.now()}`)
            .then(res => res.json())
            .then(setTargets)
            .catch(console.error);
    };

    const handleDeleteTarget = (id: string) => {
        if (!confirm("Are you sure?")) return;
        fetch(`${API_URL}/targets/${id}`, { method: 'DELETE' })
            .then(res => {
                if (!res.ok) return res.json().then(e => { throw new Error(e.error || 'Failed') });
                fetchTargets();
            })
            .catch(err => alert("Delete failed: " + err.message));
    };

    const handleDeleteEvent = (id: string) => {
        if (!confirm("Delete this event?")) return;
        fetch(`${API_URL}/events/${id}`, { method: 'DELETE' })
            .then(() => fetchEvents())
            .catch(err => alert("Failed to delete event"));
    };

    const handleUpdateEvent = (data: any) => {
        if (!editingEvent) return;
        fetch(`${API_URL}/events/${editingEvent.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
            .then(res => {
                if (res.ok) {
                    setEditingEvent(null);
                    fetchEvents();
                } else {
                    alert("Update failed");
                }
            })
            .catch(console.error);
    };

    const handleTestTarget = (url: string, id: string) => {
        setTestingId(id);
        fetch(`${API_URL}/scout/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.preview) {
                    setPreviewEvent(data.preview);
                } else {
                    setTestError(data.log || "Unknown error occurred during test.");
                }
            })
            .catch(err => setTestError("Network request failed: " + err.message))
            .finally(() => setTestingId(null));
    };

    const handleAddTarget = () => {
        if (!newTarget.name || !newTarget.url) return alert("Name and URL required");

        // Auto-detect selector
        let selector = "a[href*='/e/']";
        if (newTarget.url.includes('bilietai.lt')) selector = ".event_short";
        else if (newTarget.url.includes('kakava.lt')) selector = "a[href*='/renginys/']";

        fetch(`${API_URL}/targets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...newTarget, selector })
        }).then(() => {
            fetchTargets();
            setNewTarget({ name: "", url: "", city: "" });
        });
    };

    useEffect(() => {
        fetchHistory();
        fetchTargets();
        fetchEvents();
        // Poll every 5 seconds
        const interval = setInterval(fetchHistory, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleRunScout = () => {
        setLoading(true);
        const body = customUrl ? { url: customUrl } : {};

        fetch(`${API_URL}/scout/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
            .then(res => res.json())
            .then(() => {
                setStatus("RUNNING");
                setTimeout(fetchHistory, 1000); // Refresh list
                setCustomUrl(""); // Clear input
            })
            .catch(err => alert("Failed to start scout"))
            .finally(() => setLoading(false));
    };

    const filteredEvents = events.filter(e =>
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.venue?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <main className="min-h-screen bg-gray-900 text-white p-6 font-mono">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-cyan-500">
                        Admin Console 🛡️
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${status === 'RUNNING' ? 'bg-yellow-500/20 text-yellow-500 animate-pulse' : 'bg-green-500/20 text-green-500'}`}>
                            {status}
                        </div>
                        <a href="/" className="text-gray-400 hover:text-white text-sm">Back to Map</a>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Scraper Controls */}
                    <div className="space-y-8">
                        {/* Controls */}
                        <section className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                            <h2 className="text-xl font-bold mb-4">Scraper Control</h2>
                            <div className="flex flex-col gap-4">
                                <input
                                    type="text"
                                    placeholder="Scrape specific URL (Optional)"
                                    value={customUrl}
                                    onChange={(e) => setCustomUrl(e.target.value)}
                                    className="bg-gray-900 border border-gray-600 rounded px-4 py-2 text-white"
                                />
                                <button
                                    onClick={handleRunScout}
                                    disabled={loading || status === 'RUNNING'}
                                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 rounded-lg font-bold transition-all shadow-cyan-500/20 shadow-lg"
                                >
                                    {status === 'RUNNING' ? 'Scout Deployed...' : customUrl ? '🚀 Scout URL' : '🚀 Launch All Targets'}
                                </button>
                            </div>
                        </section>

                        {/* Recent Logs (Compact) */}
                        <section>
                            <h2 className="text-lg font-bold mb-2">Recent Scrape Logs</h2>
                            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden max-h-60 overflow-y-auto">
                                {logs.map(log => (
                                    <div key={log.id} className="p-3 border-b border-gray-700 text-xs flex justify-between">
                                        <span className={log.status === 'SUCCESS' ? 'text-green-400' : 'text-red-400'}>{log.status}</span>
                                        <span className="text-gray-400">{new Date(log.startTime).toLocaleTimeString()}</span>
                                        <span className="font-bold">{log.eventsFound || 0} events</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Event Management */}
                    <div className="space-y-8">
                        <section className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Event Database ({events.length})</h2>
                                <input
                                    type="text"
                                    placeholder="Search events..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-gray-900 border border-gray-600 rounded px-3 py-1 text-sm text-white w-48"
                                />
                            </div>

                            <div className="overflow-y-auto max-h-[600px] border border-gray-700 rounded-lg">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-900 text-gray-400 sticky top-0">
                                        <tr>
                                            <th className="p-3">Title</th>
                                            <th className="p-3">Date</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredEvents.map(ev => (
                                            <tr key={ev.id} className="border-t border-gray-700 hover:bg-white/5">
                                                <td className="p-3 font-medium truncate max-w-[200px]" title={ev.title}>{ev.title}</td>
                                                <td className="p-3 text-gray-400 whitespace-nowrap">
                                                    {new Date(ev.startTime).toLocaleDateString()}
                                                </td>
                                                <td className="p-3 text-right space-x-2">
                                                    <button
                                                        onClick={() => setEditingEvent(ev)}
                                                        className="text-cyan-400 hover:text-cyan-300 font-bold text-xs"
                                                    >
                                                        EDIT
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteEvent(ev.id)}
                                                        className="text-red-400 hover:text-red-300 font-bold text-xs"
                                                    >
                                                        DEL
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredEvents.length === 0 && (
                                            <tr><td colSpan={3} className="p-8 text-center text-gray-500">No events found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Full Width: Target Manager (Below) */}
                <section className="mt-8">
                    <h2 className="text-xl font-bold mb-4">Target Manager</h2>
                    {/* ... (Existing Target Manager Table Code preserved but simplified for this view if needed, 
                          but typically I replace the whole file content so I need to include it) ... */}
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mb-6">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-900/50 text-gray-400">
                                <tr>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">City</th>
                                    <th className="p-4">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {targets.map((t) => (
                                    <tr key={t.id} className="border-t border-gray-700 hover:bg-white/5">
                                        <td className="p-4 font-bold">
                                            {t.name}
                                            <div className="text-xs text-gray-500 truncate max-w-[300px]">{t.url}</div>
                                        </td>
                                        <td className="p-4">{t.city || '-'}</td>
                                        <td className="p-4 flex gap-2">
                                            <button onClick={() => handleDeleteTarget(t.id)} className="text-red-400 hover:text-red-300 font-bold text-xs uppercase">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Add Target Form Simplified */}
                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex gap-4">
                        <input className="bg-gray-900 border border-gray-600 rounded p-2 text-white flex-1" placeholder="Name" value={newTarget.name} onChange={e => setNewTarget({ ...newTarget, name: e.target.value })} />
                        <input className="bg-gray-900 border border-gray-600 rounded p-2 text-white flex-1" placeholder="URL" value={newTarget.url} onChange={e => setNewTarget({ ...newTarget, url: e.target.value })} />
                        <button onClick={handleAddTarget} className="px-6 py-2 bg-green-600 rounded font-bold">+ Add</button>
                    </div>
                </section>

                {/* Modals */}
                <EventModal
                    isOpen={!!editingEvent}
                    onClose={() => setEditingEvent(null)}
                    onSubmit={handleUpdateEvent}
                    initialLocation={null} // Editing mode ignores this
                    event={editingEvent}
                    theme="dark"
                />

                {/* Preview Event Modal (Preserved) */}
                {previewEvent && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-800 p-6 rounded-xl max-w-lg w-full border border-cyan-500/50 shadow-2xl">
                            <h3 className="text-xl font-bold mb-4 text-cyan-400">Target Parsed!</h3>
                            <pre className="text-xs text-gray-400 overflow-auto max-h-64">{JSON.stringify(previewEvent, null, 2)}</pre>
                            <button onClick={() => setPreviewEvent(null)} className="w-full mt-4 py-2 bg-cyan-600 rounded font-bold">Close</button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
