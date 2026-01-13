'use client';

import { useState, useEffect } from 'react';
import { Download, Upload } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function ScoutManager() {
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
        fetch(`${API_URL}/scout/history`, {
            headers: { 'x-admin-password': localStorage.getItem('admin_secret') || '' }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setLogs(data);
                    if (data.length > 0 && data[0].status === 'RUNNING') {
                        setStatus("RUNNING");
                    } else {
                        setStatus("IDLE");
                    }
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    const fetchTargets = () => {
        fetch(`${API_URL}/targets?_t=${Date.now()}`, {
            headers: { 'x-admin-password': localStorage.getItem('admin_secret') || '' }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setTargets(data);
            })
            .catch(console.error);
    };

    const handleDeleteTarget = (id: string) => {
        if (!confirm("Are you sure?")) return;
        fetch(`${API_URL}/targets/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-password': localStorage.getItem('admin_secret') || ''
            }
        })
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
            headers: {
                'Content-Type': 'application/json',
                'x-admin-password': localStorage.getItem('admin_secret') || ''
            },
            body: JSON.stringify({ url })
        })
            .then(res => {
                if (res.status === 401) throw new Error("Unauthorized");
                return res.json();
            })
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

        let selector = "a[href*='/e/']";
        if (newTarget.url.includes('bilietai.lt')) selector = ".event_short";
        else if (newTarget.url.includes('kakava.lt')) selector = "a.event-card";

        fetch(`${API_URL}/targets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-password': localStorage.getItem('admin_secret') || ''
            },
            body: JSON.stringify({ ...newTarget, selector })
        }).then((res) => {
            if (res.status === 401) return alert("Unauthorized");
            fetchTargets();
            setNewTarget({ name: "", url: "", city: "" });
        });
    };

    useEffect(() => {
        fetchHistory();
        fetchTargets();
        const interval = setInterval(fetchHistory, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleRunScout = () => {
        setLoading(true);
        const body = customUrl ? { url: customUrl } : {};

        fetch(`${API_URL}/scout/run`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-password': localStorage.getItem('admin_secret') || ''
            },
            body: JSON.stringify(body)
        })
            .then(res => {
                if (res.status === 401) throw new Error("Unauthorized");
                return res.json();
            })
            .then(() => {
                setStatus("RUNNING");
                setTimeout(fetchHistory, 1000);
                setCustomUrl("");
            })
            .catch(err => alert("Failed to start scout: " + err.message))
            .finally(() => setLoading(false));
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-700">
                <div>
                    <h2 className="text-3xl font-black text-white mb-2">Scout Command Center</h2>
                    <p className="text-gray-400">Manage scraping targets & monitor missions</p>
                </div>

                <div className="flex items-center gap-4 self-start md:self-auto bg-gray-800/50 p-2 rounded-xl border border-gray-700">
                    <div className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 ${status === 'RUNNING' ? 'bg-yellow-500/20 text-yellow-500 animate-pulse border border-yellow-500/30' : 'bg-green-500/20 text-green-500 border border-green-500/30'}`}>
                        <span className={`w-2 h-2 rounded-full ${status === 'RUNNING' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                        {status}
                    </div>
                </div>
            </header>

            {/* Controls */}
            <section className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 relative z-10">
                    <div className="flex-1 w-full">
                        <h2 className="text-xl font-bold mb-2 text-white">Manual Override</h2>
                        <p className="text-gray-400 text-sm mb-4">Force the agent to scan specific targets immediately.</p>

                        <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Target URL (Optional)</label>
                        <input
                            type="text"
                            placeholder="e.g. https://www.bilietai.lt/lit/renginiai/koncertai/kaunas"
                            value={customUrl}
                            onChange={(e) => setCustomUrl(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
                        />
                    </div>
                    <button
                        onClick={handleRunScout}
                        disabled={loading || status === 'RUNNING'}
                        className="px-8 py-3 h-[50px] bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-bold transition-all shadow-lg shadow-cyan-900/20 whitespace-nowrap flex items-center gap-2"
                    >
                        {status === 'RUNNING' ? (
                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Scout Deployed...</>
                        ) : customUrl ? '🚀 Scout URL' : '🚀 Launch All'}
                    </button>
                </div>
            </section>

            {/* Target Manager */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Target Manager</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                const link = document.createElement('a');
                                link.href = `${API_URL}/targets/export`;
                                link.download = 'targets_backup.json';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}
                            className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors"
                            title="Backup Targets"
                        >
                            <Download size={18} />
                        </button>
                        <label className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer" title="Restore Targets">
                            <Upload size={18} />
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = async (ev) => {
                                        try {
                                            const json = JSON.parse(ev.target?.result as string);
                                            const res = await fetch(`${API_URL}/targets/import`, {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'x-admin-password': localStorage.getItem('admin_secret') || ''
                                                },
                                                body: JSON.stringify(json)
                                            });
                                            if (res.ok) {
                                                alert("Targets restored successfully!");
                                                fetchTargets();
                                            } else {
                                                alert("Failed to restore targets.");
                                            }
                                        } catch (err) {
                                            alert("Invalid JSON file.");
                                        }
                                    };
                                    reader.readAsText(file);
                                }}
                            />
                        </label>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mb-6 shadow-xl">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="p-4">Name</th>
                                <th className="p-4">City</th>
                                <th className="p-4">Last Scrape</th>
                                <th className="p-4">URL</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {targets.map((t) => (
                                <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4 font-bold text-white">{t.name}</td>
                                    <td className="p-4 text-gray-300">{t.city || '-'}</td>
                                    <td className="p-4">
                                        {t.lastEventsFound !== undefined ? (
                                            <div>
                                                <span className="font-bold text-cyan-400">{t.lastEventsFound} events</span>
                                                <div className="text-[10px] text-gray-500 mt-0.5">
                                                    {t.lastScrapedAt ? new Date(t.lastScrapedAt).toLocaleString() : ''}
                                                </div>
                                            </div>
                                        ) : <span className="text-gray-600">-</span>}
                                    </td>
                                    <td className="p-4 text-gray-500 truncate max-w-[200px] font-mono text-xs" title={t.url}>{t.url}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleTestTarget(t.url, t.id)}
                                                disabled={!!testingId}
                                                className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded text-xs font-bold disabled:opacity-50 transition-colors"
                                            >
                                                {testingId === t.id ? 'Testing...' : 'Test'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTarget(t.id)}
                                                className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded text-xs font-bold transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {targets.length === 0 && (
                                <tr><td colSpan={5} className="p-12 text-center text-gray-500 italic">No targets configured.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Add Target Form */}
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                    <h3 className="text-sm font-bold uppercase text-gray-500 mb-4 tracking-wider">Add New Target</h3>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-4">
                            <input
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                placeholder="Name (e.g. Bilietai Siauliai)"
                                value={newTarget.name}
                                onChange={e => setNewTarget({ ...newTarget, name: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-3">
                            <select
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-colors appearance-none cursor-pointer"
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
                        </div>
                        <div className="md:col-span-5 flex gap-2">
                            <input
                                className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                placeholder="Target URL"
                                value={newTarget.url}
                                onChange={e => setNewTarget({ ...newTarget, url: e.target.value })}
                            />
                            <button
                                onClick={handleAddTarget}
                                className="px-6 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-green-900/20"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* History Log */}
            <section className="pt-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                    <span>Mission Log</span>
                    <span className="text-xs bg-gray-700 px-2 py-1 rounded-full text-gray-300 font-mono">{logs.length} entries</span>
                    <button onClick={fetchHistory} className="ml-auto text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-white transition-colors font-bold">
                        Refresh ↻
                    </button>
                </h2>

                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl max-h-[400px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-900/90 text-gray-400 text-xs uppercase sticky top-0 backdrop-blur-md">
                            <tr>
                                <th className="p-4">Status</th>
                                <th className="p-4">Events Found</th>
                                <th className="p-4">Start Time</th>
                                <th className="p-4">Duration</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {logs.map((log) => (
                                <tr key={log.id} className="border-t border-gray-700 hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                        ${log.status === 'SUCCESS' ? 'text-green-400 bg-green-900/30 border border-green-500/20' :
                                                log.status === 'FAILED' ? 'text-red-400 bg-red-900/30 border border-red-500/20' :
                                                    'text-yellow-400 bg-yellow-900/30 border border-yellow-500/20'}`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold text-cyan-300 font-mono">
                                        {log.eventsFound !== null ? log.eventsFound : '-'}
                                    </td>
                                    <td className="p-4 text-gray-400 text-xs">
                                        {new Date(log.startTime).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-gray-500 font-mono text-xs">
                                        {log.endTime ?
                                            `${((new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 1000).toFixed(1)}s`
                                            : '...'}
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-gray-500 italic">
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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-900 p-6 rounded-2xl max-w-lg w-full border border-cyan-500/50 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-cyan-400">
                                <span>🎉 Target Successfully Parsed!</span>
                            </h3>
                            <button onClick={() => setPreviewEvent(null)} className="text-gray-500 hover:text-white">✕</button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Title</label>
                                <p className="font-bold text-white text-lg leading-tight">{previewEvent.title}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Start Time</label>
                                    <p className="text-sm text-gray-300 font-mono">{new Date(previewEvent.startTime).toLocaleString()}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Venue</label>
                                    <p className="text-sm text-gray-300">{previewEvent.venue || previewEvent.location}</p>
                                </div>
                            </div>
                            {previewEvent.lat && (
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Coordinates</label>
                                    <p className="text-sm text-gray-300 flex items-center gap-2 font-mono">
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
                        <div className="bg-black/40 rounded-lg p-3 border border-gray-800">
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1 tracking-widest">Raw Data Preview</label>
                            <pre className="text-[10px] text-gray-400 overflow-x-auto custom-scrollbar">
                                {JSON.stringify(previewEvent, null, 2)}
                            </pre>
                        </div>
                        <button
                            onClick={() => setPreviewEvent(null)}
                            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold transition-colors shadow-lg shadow-cyan-500/20 mt-2"
                        >
                            Close Preview
                        </button>
                    </div>
                </div>
            )}

            {/* Error Log Modal */}
            {testError && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-900 p-6 rounded-2xl max-w-2xl w-full border border-red-500/50 shadow-2xl flex flex-col max-h-[90vh]">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-400">
                            <span>⚠️ Test Failed</span>
                        </h3>
                        <p className="text-sm text-gray-400 mb-2">Copy this log to debug the issue:</p>
                        <textarea
                            readOnly
                            value={testError}
                            className="w-full h-64 bg-black/50 border border-gray-800 rounded-lg p-4 font-mono text-xs text-red-200 mb-4 focus:outline-none focus:border-red-500 resize-none"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(testError);
                                    alert("Copied to clipboard!");
                                }}
                                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold transition-colors text-white"
                            >
                                Copy Log
                            </button>
                            <button
                                onClick={() => setTestError(null)}
                                className="px-8 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold transition-colors text-white shadow-lg shadow-red-900/20"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
