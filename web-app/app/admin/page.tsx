'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function AdminPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("IDLE");

    const fetchHistory = () => {
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
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchHistory();
        // Poll every 5 seconds
        const interval = setInterval(fetchHistory, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleRunScout = () => {
        setLoading(true);
        fetch(`${API_URL}/scout/run`, { method: 'POST' })
            .then(res => res.json())
            .then(() => {
                setStatus("RUNNING");
                setTimeout(fetchHistory, 1000); // Refresh list
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
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold mb-2">Manual Override</h2>
                            <p className="text-gray-400 text-sm">Force the agent to scan all targets immediately.</p>
                        </div>
                        <button
                            onClick={handleRunScout}
                            disabled={loading || status === 'RUNNING'}
                            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-bold transition-all shadow-cyan-500/20 shadow-lg"
                        >
                            {status === 'RUNNING' ? 'Scout Deployed...' : '🚀 Launch Scout Mission'}
                        </button>
                    </div>
                </section>

                {/* History Log */}
                <section>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span>Mission Log</span>
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">{logs.length} entries</span>
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
            </div>
        </main>
    );
}
