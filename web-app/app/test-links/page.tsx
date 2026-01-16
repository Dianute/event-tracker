'use client';

import { useState, useEffect } from 'react';
import { Check, Copy, Trash2, Globe, Plus, X, Layout, Pencil, RefreshCw } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface LinkItem {
    id: string;
    url: string;
    status: 'unchecked' | 'ok' | 'error' | 'warning';
    lastChecked?: string;
    httpStatus?: number;
    errorMessage?: string;
}

interface Batch {
    id: string;
    name: string;
    itemCount: number;
    createdAt: string;
}

export default function LinkTesterPage() {
    const [inputRaw, setInputRaw] = useState('');
    const [activeTab, setActiveTab] = useState<'input' | 'list'>('input');

    // BATCH STATE
    const [batches, setBatches] = useState<Batch[]>([]);
    const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
    const [links, setLinks] = useState<LinkItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [lastClickedId, setLastClickedId] = useState<string | null>(null);

    // 1. Load Batches
    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/link-batches`);
            if (res.ok) {
                const data = await res.json();
                setBatches(data);
                if (data.length > 0 && !activeBatchId) {
                    setActiveBatchId(data[0].id);
                } else if (data.length === 0) {
                    // Check for migration
                    checkForMigration();
                }
            }
        } catch (err) {
            console.error("Failed to load batches", err);
        } finally {
            setLoading(false);
        }
    };

    // 2. Load Links for Active Batch
    useEffect(() => {
        if (activeBatchId) {
            fetchLinks(activeBatchId);
        } else {
            setLinks([]);
        }
    }, [activeBatchId]);

    const fetchLinks = async (batchId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/link-batches/${batchId}/items`);
            if (res.ok) {
                const data = await res.json();
                // Map backend fields to frontend interface if needed (actually they match mostly)
                setLinks(data.map((item: any) => ({
                    id: item.id,
                    url: item.url,
                    status: item.status, // unchecked, ok, error, warning
                    lastChecked: item.lastChecked,
                    httpStatus: item.httpStatus,
                    errorMessage: item.errorMessage
                })));
            }
        } catch (err) {
            console.error("Failed to load links", err);
        }
    };

    // --- MIGRATION LOGIC ---
    const checkForMigration = async () => {
        const savedBatches = localStorage.getItem('link-tester-batches');
        const legacy = localStorage.getItem('link-tester-data');

        if (!savedBatches && !legacy) return;

        if (confirm("Found local Link Checker data. Upload to Cloud?")) {
            setSyncing(true);
            try {
                // 1. Migrate Batches
                if (savedBatches) {
                    const parsed = JSON.parse(savedBatches);
                    for (const b of parsed) {
                        // Create Batch
                        const res = await fetch(`${API_URL}/api/link-batches`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: b.name })
                        });
                        const newBatch = await res.json();

                        // Add Items
                        const urls = b.links.map((l: any) => l.url);
                        if (urls.length > 0) {
                            await fetch(`${API_URL}/api/link-batches/${newBatch.id}/items`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ urls })
                            });
                        }
                    }
                    localStorage.removeItem('link-tester-batches');
                }

                // 2. Migrate Legacy Single Batch
                if (legacy) {
                    const parsed = JSON.parse(legacy);
                    const res = await fetch(`${API_URL}/api/link-batches`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: 'Imported Batch' })
                    });
                    const newBatch = await res.json();
                    const urls = parsed.map((l: any) => l.url);
                    if (urls.length > 0) {
                        await fetch(`${API_URL}/api/link-batches/${newBatch.id}/items`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ urls })
                        });
                    }
                    localStorage.removeItem('link-tester-data');
                }

                await fetchBatches(); // Reload
                alert("Migration Complete!");

            } catch (err) {
                alert("Migration Failed: " + err);
            } finally {
                setSyncing(false);
            }
        }
    };

    // --- ACTIONS ---

    const createBatch = async () => {
        const name = prompt("Batch Name:", `Batch #${batches.length + 1}`);
        if (!name) return;

        try {
            const res = await fetch(`${API_URL}/api/link-batches`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                const data = await res.json();
                setBatches(prev => [{ id: data.id, name: data.name, itemCount: 0, createdAt: new Date().toISOString() }, ...prev]);
                setActiveBatchId(data.id);
                setActiveTab('input');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const deleteBatch = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this batch permanently?")) return;

        try {
            await fetch(`${API_URL}/api/link-batches/${id}`, { method: 'DELETE' });
            const newBatches = batches.filter(b => b.id !== id);
            setBatches(newBatches);
            if (activeBatchId === id && newBatches.length > 0) setActiveBatchId(newBatches[0].id);
            else if (newBatches.length === 0) setActiveBatchId(null);
        } catch (err) {
            console.error(err);
        }
    };

    const renameBatch = async (id: string, oldName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newName = prompt("Enter new batch name:", oldName);
        if (newName && newName.trim()) {
            try {
                await fetch(`${API_URL}/api/link-batches/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName.trim() })
                });
                setBatches(prev => prev.map(b => b.id === id ? { ...b, name: newName.trim() } : b));
            } catch (err) {
                console.error(err);
            }
        }
    };

    const processLinks = async () => {
        if (!inputRaw.trim() || !activeBatchId) return;

        const urls = inputRaw
            .split(/[\n,]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .map(url => url.startsWith('http') ? url : `https://${url}`);

        if (urls.length === 0) return;

        try {
            const res = await fetch(`${API_URL}/api/link-batches/${activeBatchId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls })
            });
            if (res.ok) {
                await fetchLinks(activeBatchId);
                setInputRaw('');
                setActiveTab('list');
                // Update batch count locally for UI snapiness
                setBatches(prev => prev.map(b => b.id === activeBatchId ? { ...b, itemCount: b.itemCount + urls.length } : b));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const toggleCheck = async (id: string, currentStatus: string) => {
        // Simple toggle state locally is tricky because 'status' is multi-state now.
        // Let's assume clicking checkbox means "Manual OK" or "Reset"? 
        // Usage: User checks it to say "I've handled this".

        const newStatus = currentStatus === 'ok' ? 'unchecked' : 'ok';

        // Optimistic UI
        setLinks(prev => prev.map(l => l.id === id ? { ...l, status: newStatus as any } : l));

        try {
            await fetch(`${API_URL}/api/link-items/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
        } catch (err) {
            console.error(err);
            // Revert?
        }
    };

    const deleteLink = async (id: string) => {
        try {
            await fetch(`${API_URL}/api/link-items/${id}`, { method: 'DELETE' });
            setLinks(prev => prev.filter(l => l.id !== id));
            // Update batch count
            if (activeBatchId) {
                setBatches(prev => prev.map(b => b.id === activeBatchId ? { ...b, itemCount: Math.max(0, b.itemCount - 1) } : b));
            }
        } catch (err) {
            console.error(err);
        }
    };

    // --- CHECKER LOGIC ---
    const resetAll = async () => {
        if (!confirm("Reset all checkmarks for this list?")) return;

        // Optimistic UI update
        setLinks(prev => prev.map(l => ({ ...l, status: 'unchecked' })));

        for (const link of links) {
            if (link.status === 'unchecked') continue;

            // We can run these in parallel or sequentially. Sequential safer for rate limits / db connections if typical user has < 100 links.
            try {
                await updateLinkStatus(link.id, 'unchecked', 0);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const updateLinkStatus = async (id: string, status: 'ok' | 'error' | 'warning' | 'unchecked', httpStatus = 0, msg = '') => {
        setLinks(prev => prev.map(l => l.id === id ? { ...l, status, httpStatus, errorMessage: msg } : l));
        await fetch(`${API_URL}/api/link-items/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, httpStatus, errorMessage: msg })
        });
    };

    const setStatus = (id: string, status: any) => {
        // Helper for UI spinner if we had one
    };


    // Sort links: Unchecked/Error first, OK last
    const sortedLinks = [...links].sort((a, b) => {
        if (a.status === 'ok' && b.status !== 'ok') return 1;
        if (a.status !== 'ok' && b.status === 'ok') return -1;
        return 0; // Keep insert order otherwise (which is by created_at from DB)
    });

    return (
        <div className="min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-blue-500/30">
            {/* Header */}
            <header className="border-b border-white/10 bg-[#0a0a0a]/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-xl border border-blue-500/20 text-blue-400">
                            <RefreshCw size={20} className={syncing ? "animate-spin" : ""} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight">Link Checker <span className="text-blue-400 text-xs px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 ml-2">CLOUD</span></h1>
                            <p className="text-xs text-gray-500 font-mono">v2.0 • Sync Active</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => window.open('/', '_blank')} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white" title="Go Home">
                            <Globe size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">

                {/* Sidebar: Batches */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Your Batches</h2>
                        <button onClick={createBatch} className="p-1.5 hover:bg-white/10 rounded-lg text-blue-400 transition-colors" title="New Batch">
                            <Plus size={16} />
                        </button>
                    </div>

                    <div className="space-y-1">
                        {loading && batches.length === 0 && <div className="text-xs text-center p-4 text-gray-600">Loading...</div>}

                        {batches.map(batch => (
                            <div
                                key={batch.id}
                                onClick={() => { setActiveBatchId(batch.id); setActiveTab('list'); }}
                                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border
                                ${activeBatchId === batch.id
                                        ? 'bg-blue-600/10 border-blue-500/30 text-white shadow-[0_0_15px_rgba(37,99,235,0.1)]'
                                        : 'bg-[#111] border-transparent hover:bg-[#161616] text-gray-400 hover:text-gray-200'}`}
                            >
                                <div className="min-w-0">
                                    <div className="font-medium text-sm truncate">{batch.name}</div>
                                    <div className="text-[10px] text-gray-600">{batch.itemCount} links • {new Date(batch.createdAt).toLocaleDateString()}</div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => renameBatch(batch.id, batch.name, e)} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white">
                                        <Pencil size={12} />
                                    </button>
                                    <button onClick={(e) => deleteBatch(batch.id, e)} className="p-1.5 hover:bg-red-500/20 rounded-md text-gray-400 hover:text-red-400">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {!loading && batches.length === 0 && (
                            <div className="p-6 text-center border border-dashed border-white/10 rounded-xl text-gray-600 text-sm">
                                No batches yet.
                                <br />
                                <button onClick={createBatch} className="text-blue-400 hover:underline mt-2">Create one</button>
                            </div>
                        )}
                    </div>
                </div>


                {/* Main Content */}
                <div className="bg-[#0f0f0f] rounded-2xl border border-white/5 shadow-2xl overflow-hidden flex flex-col min-h-[600px]">
                    {!activeBatchId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                            <Layout size={48} className="mb-4 opacity-20" />
                            <p>Select or create a batch to get started.</p>
                        </div>
                    ) : (
                        <>
                            {/* Toolbar */}
                            <div className="p-4 border-b border-white/5 flex gap-4 bg-[#111]">
                                <button
                                    onClick={() => setActiveTab('input')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'input' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5 text-gray-400'}`}
                                >
                                    Add Links
                                </button>
                                <button
                                    onClick={() => setActiveTab('list')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'list' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5 text-gray-400'}`}
                                >
                                    Check List ({links.length})
                                </button>
                            </div>

                            {/* Input Mode */}
                            {activeTab === 'input' && (
                                <div className="flex-1 p-6 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <textarea
                                        autoFocus
                                        value={inputRaw}
                                        onChange={e => setInputRaw(e.target.value)}
                                        placeholder="Paste links here (one per line)..."
                                        className="flex-1 w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-4 text-sm font-mono text-gray-300 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none mb-4"
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            onClick={processLinks}
                                            disabled={!inputRaw.trim()}
                                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                                        >
                                            Process Links
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* List Mode */}
                            {activeTab === 'list' && (
                                <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">

                                    {/* Action Bar */}
                                    <div className="p-3 border-b border-white/5 flex justify-between items-center bg-[#111]">
                                        <div className="text-xs text-gray-500 px-2">
                                            {links.filter(l => l.status === 'ok').length} / {links.length} Checked
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={resetAll} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-gray-300 transition-colors">
                                                Reset Checks
                                            </button>
                                        </div>
                                    </div>

                                    {/* Scrollable List */}
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                        {sortedLinks.map((link) => (
                                            <div
                                                key={link.id}
                                                className={`group flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-white/10 relative overflow-hidden
                                                ${link.id === lastClickedId ? 'bg-blue-600/10 border-blue-500/30' :
                                                        link.status === 'ok' ? 'bg-green-500/5 border-green-500/10 opacity-60 hover:opacity-100' :
                                                            link.status === 'error' ? 'bg-red-500/5 border-red-500/20' :
                                                                'bg-[#131313] border-transparent'}`}
                                            >
                                                {/* Status Indicator / Checkbox */}
                                                <button
                                                    onClick={() => toggleCheck(link.id, link.status)}
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0
                                                    ${link.status === 'ok' ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]' :
                                                            link.status === 'error' ? 'bg-red-500/20 text-red-400' :
                                                                'bg-white/5 text-white/20 hover:bg-white/10'}`}
                                                >
                                                    {link.status === 'ok' ? <Check size={16} /> :
                                                        link.status === 'error' ? <X size={16} /> :
                                                            <div className="w-2 h-2 rounded-full bg-current" />}
                                                </button>

                                                <div className="flex-1 min-w-0">
                                                    <a
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => { e.stopPropagation(); setLastClickedId(link.id); }}
                                                        className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline truncate block"
                                                    >
                                                        {link.url}
                                                    </a>
                                                    {link.errorMessage && (
                                                        <div className="text-[10px] text-red-400 mt-0.5">{link.errorMessage} (Status: {link.httpStatus})</div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(link.url)}
                                                        className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                                                        title="Copy URL"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteLink(link.id)}
                                                        className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {links.length === 0 && (
                                            <div className="text-center py-20 text-gray-600 text-sm">
                                                List is empty. Add some links to get started.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
