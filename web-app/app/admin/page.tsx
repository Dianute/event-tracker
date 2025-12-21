'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function AdminPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("IDLE");
    const [customUrl, setCustomUrl] = useState("");
    const [targets, setTargets] = useState<any[]>([]);
    const [newTarget, setNewTarget] = useState({ name: "", url: "", city: "" });
    const [previewEvent, setPreviewEvent] = useState<any | null>(null);
    const [testError, setTestError] = useState<string | null>(null);
    const [testingId, setTestingId] = useState<string | null>(null);

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
        else if (newTarget.url.includes('kakava.lt')) selector = "a.event-card";

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

    return (
        <main className="min-h-screen bg-gray-900 text-white p-6 font-mono">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-cyan-500">
                        Scout Command Center 🕵️‍♂️
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${status === 'RUNNING' ? 'bg-yellow-500/20 text-yellow-500 animate-pulse' : 'bg-green-500/20 text-green-500'}`}>
                            {status}
                        </div>
                        <a href="/" className="text-gray-400 hover:text-white text-sm">Back to Map</a>
                    </div>
                </header>

                {/* Controls */}
                <section className="mb-10 bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                        <div className="flex-1 w-full">
                            <h2 className="text-xl font-bold mb-2">Manual Override</h2>
                            <p className="text-gray-400 text-sm mb-4">Force the agent to scan specific targets immediately.</p>

                            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Target URL (Optional)</label>
                            <input
                                type="text"
                                placeholder="e.g. https://www.bilietai.lt/lit/renginiai/koncertai/kaunas"
                                value={customUrl}
                                onChange={(e) => setCustomUrl(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                            />
                        </div>
                        <button
                            onClick={handleRunScout}
                            disabled={loading || status === 'RUNNING'}
                            className="px-6 py-3 h-[46px] bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-bold transition-all shadow-cyan-500/20 shadow-lg whitespace-nowrap"
                        >
                            {status === 'RUNNING' ? 'Scout Deployed...' : customUrl ? '🚀 Scout URL' : '🚀 Launch All'}
                        </button>
                    </div>
                </section>

                {/* Target Manager */}
                <section className="mb-10">
                    <h2 className="text-xl font-bold mb-4">Target Manager</h2>
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mb-6">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-900/50 text-gray-400">
                                <tr>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">City</th>
                                    <th className="p-4">Last Scrape</th>
                                    <th className="p-4">URL</th>
                                    <th className="p-4">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {targets.map((t) => (
                                    <tr key={t.id} className="border-t border-gray-700 hover:bg-white/5">
                                        <td className="p-4 font-bold">{t.name}</td>
                                        <td className="p-4">{t.city || '-'}</td>
                                        <td className="p-4">
                                            {t.lastEventsFound !== undefined ? (
                                                <div>
                                                    <span className="font-bold text-cyan-300">{t.lastEventsFound} events</span>
                                                    <br />
                                                    <span className="text-xs text-gray-500">
                                                        {t.lastScrapedAt ? new Date(t.lastScrapedAt).toLocaleString() : ''}
                                                    </span>
                                                </div>
                                            ) : <span className="text-gray-600">-</span>}
                                        </td>
                                        <td className="p-4 text-gray-400 truncate max-w-[200px]" title={t.url}>{t.url}</td>
                                        <td className="p-4 flex gap-2">
                                            <button
                                                onClick={() => handleTestTarget(t.url, t.id)}
                                                disabled={!!testingId}
                                                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold disabled:opacity-50"
                                            >
                                                {testingId === t.id ? 'Testing...' : '▶ Test'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTarget(t.id)}
                                                className="text-red-400 hover:text-red-300 font-bold text-xs uppercase"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {targets.length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">No targets configured.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Add Target Form */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h3 className="text-lg font-bold mb-4">Add New Target</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <input
                                className="bg-gray-900 border border-gray-600 rounded p-2 text-white"
                                placeholder="Name (e.g. Bilietai Siauliai)"
                                value={newTarget.name}
                                onChange={e => setNewTarget({ ...newTarget, name: e.target.value })}
                            />
                            <select
                                className="bg-gray-900 border border-gray-600 rounded p-2 text-white"
                                value={newTarget.city}
                                onChange={e => setNewTarget({ ...newTarget, city: e.target.value })}
                            >
                                <option value="">Select City (Optional)</option>
                                <option value="Vilnius">Vilnius</option>
                                <option value="Kaunas">Kaunas</option>
                                <option value="Klaipėda">Klaipėda</option>
                                <option value="Šiauliai">Šiauliai</option>
                                <option value="Panevėžys">Panevėžys</option>
                                <option value="Palanga">Palanga</option>
                            </select>
                            <input
                                className="bg-gray-900 border border-gray-600 rounded p-2 text-white md:col-span-2"
                                placeholder="URL"
                                value={newTarget.url}
                                onChange={e => setNewTarget({ ...newTarget, url: e.target.value })}
                            />
                        </div>
                        <button
                            onClick={handleAddTarget}
                            className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded font-bold transition-colors"
                        >
                            + Add Target
                        </button>
                    </div>
                </section>

                {/* History Log */}
                <section>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span>Mission Log</span>
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">{logs.length} entries</span>
                        <button onClick={fetchHistory} className="ml-auto text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white transition-colors">
                            Refresh ↻
                        </button>
                    </h2>

                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-900/50 text-gray-400">
                                <tr>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Events Found</th>
                                    <th className="p-4">Start Time</th>
                                    <th className="p-4">Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id} className="border-t border-gray-700 hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold 
                        ${log.status === 'SUCCESS' ? 'text-green-400 bg-green-900/30' :
                                                    log.status === 'FAILED' ? 'text-red-400 bg-red-900/30' :
                                                        'text-yellow-400 bg-yellow-900/30'}`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold text-cyan-300">
                                            {log.eventsFound !== null ? log.eventsFound : '-'}
                                        </td>
                                        <td className="p-4 text-gray-400">
                                            {new Date(log.startTime).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-gray-500">
                                            {log.endTime ?
                                                `${((new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 1000).toFixed(1)}s`
                                                : '...'}
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-500">
                                            No missions recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
                {/* Preview Event Modal */}
                {previewEvent && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-800 p-6 rounded-xl max-w-lg w-full border border-cyan-500/50 shadow-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-cyan-400">
                                <span>🎉 Target Successfully Parsed!</span>
                            </h3>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Title</label>
                                    <p className="font-bold text-white text-lg">{previewEvent.title}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Start Time</label>
                                        <p className="text-sm text-gray-300">{new Date(previewEvent.startTime).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Venue</label>
                                        <p className="text-sm text-gray-300">{previewEvent.venue || previewEvent.location}</p>
                                    </div>
                                </div>
                                {previewEvent.lat && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Coordinates</label>
                                        <p className="text-sm text-gray-300 flex items-center gap-2">
                                            {previewEvent.lat.toFixed(6)}, {previewEvent.lng.toFixed(6)}
                                            <a
                                                href={`https://www.google.com/maps?q=${previewEvent.lat},${previewEvent.lng}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-cyan-500 hover:underline"
                                            >
                                                (View Map)
                                            </a>
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="bg-black/40 rounded p-3 mb-4">
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Raw Data</label>
                                <pre className="text-[10px] text-gray-400 overflow-x-auto">
                                    {JSON.stringify(previewEvent, null, 2)}
                                </pre>
                            </div>
                            <button
                                onClick={() => setPreviewEvent(null)}
                                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded font-bold transition-colors shadow-lg shadow-cyan-500/20"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                )}

                {/* Error Log Modal */}
                {testError && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-800 p-6 rounded-xl max-w-2xl w-full border border-red-500/50 shadow-2xl flex flex-col max-h-[90vh]">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-400">
                                <span>⚠️ Test Failed</span>
                            </h3>
                            <p className="text-sm text-gray-400 mb-2">Copy this log to debug the issue:</p>
                            <textarea
                                readOnly
                                value={testError}
                                className="w-full h-64 bg-black/50 border border-gray-700 rounded p-4 font-mono text-xs text-red-200 mb-4 focus:outline-none focus:border-red-500 resize-none"
                            />
                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(testError);
                                        alert("Copied to clipboard!");
                                    }}
                                    className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded font-bold transition-colors"
                                >
                                    Copy Log
                                </button>
                                <button
                                    onClick={() => setTestError(null)}
                                    className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded font-bold transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
