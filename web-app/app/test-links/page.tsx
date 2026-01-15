'use client';

import { useState, useEffect } from 'react';
import { Check, Copy, ExternalLink, Trash2, Globe, Link as LinkIcon, AlertCircle } from 'lucide-react';

interface LinkItem {
    id: string;
    url: string;
    checked: boolean;
    notes?: string;
}

export default function LinkTesterPage() {
    const [inputRaw, setInputRaw] = useState('');
    const [links, setLinks] = useState<LinkItem[]>([]);
    const [activeTab, setActiveTab] = useState<'input' | 'list'>('input');
    const [lastClickedId, setLastClickedId] = useState<string | null>(null);

    // Load from local storage on mount to save progress
    useEffect(() => {
        const saved = localStorage.getItem('link-tester-data');
        if (saved) {
            try {
                setLinks(JSON.parse(saved));
                setActiveTab('list');
            } catch (e) {
                console.error("Failed to load saved links");
            }
        }
    }, []);

    // Save to local storage whenever links change
    useEffect(() => {
        localStorage.setItem('link-tester-data', JSON.stringify(links));
    }, [links]);

    const processLinks = () => {
        if (!inputRaw.trim()) return;

        // Split by newlines or commas
        const newLinks = inputRaw
            .split(/[\n,]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .map(url => ({
                id: crypto.randomUUID(),
                url: url.startsWith('http') ? url : `https://${url}`,
                checked: false
            }));

        setLinks(prev => {
            const combined = [...prev, ...newLinks];
            return combined.sort((a, b) => Number(a.checked) - Number(b.checked));
        });
        setInputRaw('');
        setActiveTab('list');
    };

    const toggleCheck = (id: string) => {
        setLinks(prev => {
            const updated = prev.map(item =>
                item.id === id ? { ...item, checked: !item.checked } : item
            );
            // Sort: Unchecked on top (false < true)
            return updated.sort((a, b) => Number(a.checked) - Number(b.checked));
        });
    };

    const deleteLink = (id: string) => {
        setLinks(prev => prev.filter(item => item.id !== id));
    };

    const clearAll = () => {
        if (confirm("Clear all links?")) {
            setLinks([]);
            setActiveTab('input');
        }
    };

    const resetChecks = () => {
        if (confirm("Reset all checkmarks?")) {
            setLinks(prev => prev.map(l => ({ ...l, checked: false })));
        }
    };

    const stats = {
        total: links.length,
        checked: links.filter(l => l.checked).length,
        remaining: links.filter(l => !l.checked).length
    };

    const progress = stats.total > 0 ? (stats.checked / stats.total) * 100 : 0;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-6 md:p-12 font-sans">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">Link Checker</h1>
                        <p className="text-gray-500 font-medium">Bulk process and track your URL testing progress.</p>
                    </div>

                    {/* Progress Card */}
                    {links.length > 0 && (
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-6 min-w-[280px]">
                            <div className="flex-1 space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-500">
                                    <span>Progress</span>
                                    <span>{Math.round(progress)}%</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black text-gray-900">{stats.checked}<span className="text-gray-300">/</span>{stats.total}</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase">Done</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="grid md:grid-cols-3 gap-6">
                    {/* Left Column: Input */}
                    <div className="md:col-span-1 space-y-4">
                        <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex">
                            <button
                                onClick={() => setActiveTab('input')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'input' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                Input
                            </button>
                            <button
                                onClick={() => setActiveTab('list')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                List ({links.length})
                            </button>
                        </div>

                        <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-4 transition-all ${activeTab === 'input' ? 'ring-2 ring-blue-500/10' : 'opacity-70 grayscale'}`}>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Paste Links Below</label>
                            <textarea
                                value={inputRaw}
                                onChange={(e) => setInputRaw(e.target.value)}
                                placeholder="https://example.com&#10;https://google.com&#10;example.org"
                                className="w-full h-64 p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all font-mono text-xs resize-none text-gray-700"
                            />
                            <button
                                onClick={processLinks}
                                disabled={!inputRaw.trim()}
                                className="w-full mt-4 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg shadow-gray-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <LinkIcon size={16} />
                                Process Links
                            </button>
                        </div>

                        {links.length > 0 && (
                            <div className="space-y-2">
                                <button onClick={resetChecks} className="w-full py-3 bg-white border border-gray-200 shadow-sm rounded-xl text-xs font-bold text-gray-700 hover:text-blue-600 hover:border-blue-200 transition-all uppercase tracking-wider">
                                    Reset Progress
                                </button>
                                <button onClick={clearAll} className="w-full py-2 text-xs font-bold text-red-400 hover:text-red-500 transition-colors uppercase tracking-wider">
                                    Clear All Links
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Table List */}
                    <div className="md:col-span-2">
                        {links.length === 0 ? (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 gap-4 bg-gray-50/50">
                                <div className="p-4 bg-white rounded-full shadow-sm">
                                    <Globe size={32} className="text-gray-300" />
                                </div>
                                <p className="font-medium text-sm">No links added yet. Paste some on the left!</p>
                            </div>
                        ) : (
                            <div className={`space-y-3 ${activeTab === 'input' ? 'opacity-50 pointer-events-none' : ''}`}>
                                {links.map((link, index) => (
                                    <div
                                        key={link.id}
                                        onClick={() => toggleCheck(link.id)}
                                        className={`group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none
                        ${link.id === lastClickedId ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg bg-blue-50/10' : ''}
                        ${link.checked
                                                ? 'bg-green-50 border-green-200 shadow-sm'
                                                : (link.id !== lastClickedId ? 'bg-white border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-md' : '')}`}
                                    >
                                        {/* Check Toggle */}
                                        <div className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300
                          ${link.checked ? 'bg-green-500 border-green-500 scale-110' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                                            {link.checked && <Check size={18} className="text-white animate-in zoom-in spin-in-90 duration-300" />}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => { e.stopPropagation(); setLastClickedId(link.id); }}
                                                className={`font-mono text-sm truncate transition-colors hover:underline hover:text-blue-600 block ${link.checked ? 'text-green-800 line-through opacity-60' : 'text-gray-700 font-medium'}`}
                                            >
                                                {link.url}
                                            </a>
                                            {link.checked && <div className="text-[10px] font-bold text-green-600 uppercase tracking-wider mt-0.5">Completed</div>}
                                            {(!link.checked && link.id === lastClickedId) && <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mt-0.5 animate-pulse">Last Clicked</div>}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Open Link"
                                            >
                                                <ExternalLink size={18} />
                                            </a>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteLink(link.id); }}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Remove"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        {/* Status Stripe */}
                                        {link.checked && (
                                            <div className="absolute left-0 top-3 bottom-3 w-1 bg-green-500 rounded-r-full" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
