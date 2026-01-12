'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MapPin, Phone, Edit, Trash2, Plus, X } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function SavedLocationsPage({ locations, onRefresh }: { locations: any[], onRefresh: () => void }) {
    const { data: session } = useSession();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<any>(null);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return;

        const headers: any = {};
        if (session?.user?.email) headers['x-user-email'] = session.user.email;
        else {
            const adminPass = localStorage.getItem('admin_secret');
            if (adminPass) headers['x-admin-password'] = adminPass;
        }

        await fetch(`${API_URL}/api/user-locations/${id}`, {
            method: 'DELETE',
            headers
        });

        onRefresh(); // Refresh list
    };

    const handleEdit = (location: any) => {
        setEditingLocation(location);
        setIsEditModalOpen(true);
    };

    const handleSave = async (updatedLocation: any) => {
        const headers: any = { 'Content-Type': 'application/json' };
        if (session?.user?.email) headers['x-user-email'] = session.user.email;
        else {
            const adminPass = localStorage.getItem('admin_secret');
            if (adminPass) headers['x-admin-password'] = adminPass;
        }

        await fetch(`${API_URL}/api/user-locations`, {
            method: 'POST',
            headers,
            body: JSON.stringify(updatedLocation)
        });

        setIsEditModalOpen(false);
        onRefresh(); // Refresh list
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours} hours ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Saved Locations</h2>
                    <p className="text-gray-400 text-sm mt-1">Manage your frequently used addresses</p>
                </div>
                <button
                    onClick={() => {
                        setEditingLocation(null);
                        setIsEditModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl flex items-center gap-2 transition-all"
                >
                    <Plus size={20} />
                    Add Location
                </button>
            </div>

            {/* Locations List */}
            {locations.length === 0 ? (
                <div className="text-center py-12 bg-white/5 border border-white/10 rounded-xl">
                    <MapPin size={48} className="mx-auto text-gray-500 mb-4" />
                    <p className="text-gray-400">No saved locations yet</p>
                    <p className="text-gray-500 text-sm mt-1">Create an event or add a location manually</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {locations.map(loc => (
                        <div key={loc.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white mb-3">{loc.name}</h3>

                                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                                        <MapPin size={16} className="text-red-400" />
                                        <span>{loc.venue}</span>
                                    </div>

                                    {loc.phone && (
                                        <div className="flex items-center gap-2 text-gray-400 mb-3">
                                            <Phone size={16} className="text-green-400" />
                                            <a href={`tel:${loc.phone}`} className="hover:text-white transition-colors">
                                                {loc.phone}
                                            </a>
                                        </div>
                                    )}

                                    <div className="text-sm text-gray-500">
                                        Used: <span className="text-blue-400 font-bold">{loc.usageCount}</span> times • Last used: {formatDate(loc.lastUsed)}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(loc)}
                                        className="p-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl transition-all"
                                        title="Edit"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(loc.id, loc.name)}
                                        className="p-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <EditLocationModal
                    location={editingLocation}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

function EditLocationModal({ location, onClose, onSave }: any) {
    const [name, setName] = useState(location?.name || '');
    const [venue, setVenue] = useState(location?.venue || '');
    const [phone, setPhone] = useState(location?.phone || '');
    const [lat, setLat] = useState(location?.lat?.toString() || '');
    const [lng, setLng] = useState(location?.lng?.toString() || '');

    const handleSubmit = (e: any) => {
        e.preventDefault();
        onSave({
            id: location?.id,
            name,
            venue,
            phone,
            lat: lat ? parseFloat(lat) : undefined,
            lng: lng ? parseFloat(lng) : undefined
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-white/10">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">
                        {location ? 'Edit Location' : 'Add Location'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Downtown Bistro"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-blue-500 outline-none transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">Address</label>
                        <input
                            type="text"
                            value={venue}
                            onChange={(e) => setVenue(e.target.value)}
                            placeholder="123 Main St, Vilnius"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-blue-500 outline-none transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">Phone (Optional)</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+370 600 12345"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2">Latitude (Optional)</label>
                            <input
                                type="number"
                                step="any"
                                value={lat}
                                onChange={(e) => setLat(e.target.value)}
                                placeholder="54.6872"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2">Longitude (Optional)</label>
                            <input
                                type="number"
                                step="any"
                                value={lng}
                                onChange={(e) => setLng(e.target.value)}
                                placeholder="25.2797"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="submit"
                            className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-bold transition-all"
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-bold transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
