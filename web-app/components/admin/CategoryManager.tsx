'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, Edit2, Save, X, RefreshCw } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Predefined Tailwind Colors for easier selection
const COLOR_OPTIONS = [
    { name: 'Red', class: 'bg-red-500' },
    { name: 'Orange', class: 'bg-orange-500' },
    { name: 'Yellow', class: 'bg-yellow-500' },
    { name: 'Green', class: 'bg-green-500' },
    { name: 'Blue', class: 'bg-blue-600' },
    { name: 'Purple', class: 'bg-purple-500' },
    { name: 'Pink', class: 'bg-pink-500' },
    { name: 'Cyan', class: 'bg-cyan-500' },
    { name: 'Gray', class: 'bg-gray-600' },
    { name: 'Black', class: 'bg-black' },
];

export default function CategoryManager() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formId, setFormId] = useState('');
    const [formLabel, setFormLabel] = useState('');
    const [formEmoji, setFormEmoji] = useState('📌');
    const [formColor, setFormColor] = useState('bg-blue-600');
    const [formOrder, setFormOrder] = useState(0);

    const fetchCategories = () => {
        setLoading(true);
        fetch(`${API_URL}/categories`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setCategories(data);
                else setCategories([]);
            })
            .catch(err => {
                console.error(err);
                setError('Failed to load categories');
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const resetForm = () => {
        setEditingId(null);
        setFormId('');
        setFormLabel('');
        setFormEmoji('📌');
        setFormColor('bg-blue-600');
        setFormOrder(0);
    };

    const handleEdit = (cat: any) => {
        setEditingId(cat.id);
        setFormId(cat.id);
        setFormLabel(cat.label);
        setFormEmoji(cat.emoji);
        setFormColor(cat.color || 'bg-blue-600');
        setFormOrder(cat.sortOrder || 0);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const payload = {
            id: formId,
            label: formLabel,
            emoji: formEmoji,
            color: formColor,
            sortOrder: Number(formOrder)
        };

        try {
            const res = await fetch(`${API_URL}/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': localStorage.getItem('admin_secret') || ''
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                // Optimistic Update
                if (editingId) {
                    setCategories(prev => prev.map(c => c.id === editingId ? data.category : c));
                } else {
                    setCategories(prev => [...prev, data.category].sort((a, b) => a.sortOrder - b.sortOrder));
                }
                resetForm();
                fetchCategories(); // Refresh to be sure (esp sort order)
            } else {
                setError(data.error || 'Failed to save');
            }
        } catch (err: any) {
            setError(err.message || 'Network error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(`Delete category "${id}"? Events with this category may lose their styling.`)) return;

        try {
            const res = await fetch(`${API_URL}/categories/${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-password': localStorage.getItem('admin_secret') || '' }
            });
            if (res.ok) {
                setCategories(prev => prev.filter(c => c.id !== id));
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to delete');
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between pb-4 border-b border-gray-700">
                <div>
                    <h2 className="text-2xl font-black text-white">Categories</h2>
                    <p className="text-gray-400 text-xs">Manage event classification types</p>
                </div>
                <button onClick={fetchCategories} className="p-2 bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </header>

            {error && <div className="p-3 bg-red-900/50 border border-red-500/30 text-red-200 text-sm rounded-xl">{error}</div>}

            {/* Editor Area */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">{editingId ? 'Edit Category' : 'Create New Category'}</h3>

                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">ID (Key)</label>
                            <input
                                type="text"
                                required
                                disabled={!!editingId} // Cannot change ID once created (for simplicity logic)
                                value={formId}
                                onChange={e => setFormId(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                placeholder="e.g. food_trucks"
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white font-mono text-sm disabled:opacity-50"
                            />
                            <p className="text-[10px] text-gray-600 mt-1">Unique database identifier (lowercase, no spaces)</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Display Label</label>
                            <input
                                type="text"
                                required
                                value={formLabel}
                                onChange={e => setFormLabel(e.target.value)}
                                placeholder="e.g. Food Trucks"
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white font-bold text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Emoji</label>
                            <input
                                type="text"
                                value={formEmoji}
                                onChange={e => setFormEmoji(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-center text-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Order</label>
                            <input
                                type="number"
                                value={formOrder}
                                onChange={e => setFormOrder(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-center"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Color</label>
                            <div className="flex flex-wrap gap-2">
                                {COLOR_OPTIONS.map(opt => (
                                    <button
                                        key={opt.name}
                                        type="button"
                                        onClick={() => setFormColor(opt.class)}
                                        className={`w-6 h-6 rounded-full ${opt.class} ${formColor === opt.class ? 'ring-2 ring-white scale-110' : 'opacity-40 hover:opacity-100'}`}
                                        title={opt.name}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        {editingId && (
                            <button type="button" onClick={resetForm} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg text-sm transition-colors">
                                Cancel
                            </button>
                        )}
                        <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                            <Save size={16} /> {editingId ? 'Update Category' : 'Create Category'}
                        </button>
                    </div>
                </form>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 gap-2">
                {categories.map((cat) => (
                    <div key={cat.id} className="group flex items-center justify-between p-3 bg-gray-900/50 border border-gray-700/50 rounded-xl hover:bg-gray-800 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-lg ${cat.color}`}>
                                {cat.emoji}
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm">{cat.label}</h4>
                                <p className="text-[10px] text-gray-500 font-mono">ID: {cat.id} • Order: {cat.sortOrder}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(cat)} className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(cat.id)} className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
