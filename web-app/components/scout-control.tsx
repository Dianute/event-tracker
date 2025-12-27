import { useState, useEffect } from 'react';
import { X, Search, Globe, Plus, Play } from 'lucide-react';

interface Target {
    id: string;
    name: string;
    url: string;
    selector?: string;
}

// Forcing local backend for development testing
const API_URL = 'http://localhost:8080';

export default function ScoutControl({ onClose }: { onClose: () => void }) {
    const [targets, setTargets] = useState<Target[]>([]);
    const [newUrl, setNewUrl] = useState('');
    const [newName, setNewName] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        fetch(`${API_URL}/targets`)
            .then(res => res.json())
            .then(setTargets)
            .catch(console.error);
    }, []);

    const handleAdd = () => {
        if (!newUrl) return;
        const target = { name: newName || 'New Site', url: newUrl, selector: "a[href*='/e/']" };

        fetch(`${API_URL}/targets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(target)
        }).then(() => {
            setTargets([...targets, { id: Date.now().toString(), ...target }]);
            setNewUrl('');
            setNewName('');
        });
    };

    const handleRun = () => {
        setIsRunning(true);
        setLogs(prev => [...prev, "🚀 Launching Agent..."]);

        fetch(`${API_URL}/scout/run`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                setLogs(prev => [...prev, "✅ Agent Started.", "Check console for details."]);
                setTimeout(() => setIsRunning(false), 5000);
            });
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl w-full max-w-lg p-6 shadow-[0_0_50px_rgba(0,255,255,0.1)]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
                        🕵️‍♂️ Scout Command
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X /></button>
                </div>

                {/* Target List */}
                <div className="space-y-3 mb-6 max-h-40 overflow-y-auto">
                    {targets.map(t => (
                        <div key={t.id} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-white/10">
                            <div className="flex items-center gap-3">
                                <Globe className="w-4 h-4 text-cyan-500" />
                                <div>
                                    <div className="text-sm font-bold text-white">{t.name}</div>
                                    <div className="text-xs text-gray-400 truncate max-w-[200px]">{t.url}</div>
                                </div>
                            </div>
                            <div className="text-xs font-mono text-gray-500 bg-black/30 px-2 py-1 rounded">Target Active</div>
                        </div>
                    ))}
                </div>

                {/* Add New */}
                <div className="bg-slate-800/30 p-4 rounded-xl mb-6 border border-white/5">
                    <div className="text-xs font-bold text-gray-400 mb-2 uppercase">Add New Target</div>
                    <div className="flex gap-2 mb-2">
                        <input
                            className="bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white flex-1 placeholder-gray-500"
                            placeholder="Site Name (e.g. My Venue)"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <input
                            className="bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white flex-[2] placeholder-gray-500"
                            placeholder="https://..."
                            value={newUrl}
                            onChange={e => setNewUrl(e.target.value)}
                        />
                        <button
                            onClick={handleAdd}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors"
                        >
                            <Plus size={16} /> Add
                        </button>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="flex justify-between items-center border-t border-white/10 pt-4">
                    <div className="text-xs text-gray-500 font-mono">
                        {logs.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                    <button
                        onClick={handleRun}
                        disabled={isRunning}
                        className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${isRunning ? 'bg-yellow-600 text-white cursor-wait' : 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]'}`}
                    >
                        {isRunning ? 'Running...' : <><Play size={18} /> Deploy Agent</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
