'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (eventData: { title: string; description: string; type: string; startTime: string; endTime: string; lat?: number; lng?: number; venue?: string }) => void;
    initialLocation: { lat: number; lng: number } | null;
    event?: any; // Event object for viewing
}

// Custom helper to format date range
const formatDateRange = (startStr: string, endStr: string) => {
    if (!startStr) return '';
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : null;

    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

    const dateText = start.toLocaleDateString([], dateOptions);
    const startTimeText = start.toLocaleTimeString([], timeOptions);

    if (end) {
        const endTimeText = end.toLocaleTimeString([], timeOptions);
        return `${dateText} • ${startTimeText} - ${endTimeText}`;
    }
    return `${dateText} • ${startTimeText}`;
};

import { Calendar, MapPin, Tag, ExternalLink, Clock } from 'lucide-react';

export default function EventModal({ isOpen, onClose, onSubmit, initialLocation, event }: EventModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('social');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [venue, setVenue] = useState('');
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Effect to reset or populate form
    useEffect(() => {
        if (isOpen) {
            if (event) {
                // VIEW MODE
                setTitle(event.title);
                setDescription(event.description);
                setType(event.type);
                setStartTime(event.startTime || '');
                setEndTime(event.endTime || '');
                setVenue(event.venue || event.location || '');
                setCurrentLocation({ lat: event.lat, lng: event.lng });
            } else {
                // CREATE MODE (Reset)
                setTitle('');
                setDescription('');
                setType('social');

                // Times
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                setStartTime(now.toISOString().slice(0, 16));
                setEndTime(new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16));

                if (initialLocation) {
                    setCurrentLocation(initialLocation);
                    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${initialLocation.lat}&lon=${initialLocation.lng}`)
                        .then(res => res.json())
                        .then(data => { if (data.display_name) setVenue(data.display_name); })
                        .catch(err => console.error("Reverse geocode failed", err));
                } else {
                    setVenue('');
                    setCurrentLocation(null);
                }
            }
        }
    }, [isOpen, event, initialLocation]);

    // Forward Geocode Effect
    useEffect(() => {
        if (event) return;

        const delayDebounceFn = setTimeout(async () => {
            if (venue.length > 2 && isSearching) {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(venue)}&limit=5`);
                    const data = await res.json();
                    setSuggestions(data);
                } catch (e) {
                    console.error("Search failed", e);
                }
            } else {
                setSuggestions([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [venue, isSearching, event]);

    if (!isOpen) return null;
    const isReadOnly = !!event;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly) return;
        if (!currentLocation) {
            alert("Please select a location from the search or click the map!");
            return;
        }
        onSubmit({ title, description, type, startTime, endTime, lat: currentLocation.lat, lng: currentLocation.lng, venue });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-[#121212] rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-white/10 flex flex-col max-h-[90vh]">

                {/* Header Image / Color Bar could go here, for now just a clean header */}
                <div className="flex items-start justify-between p-6 pb-2">
                    <div className="flex-1 pr-4">
                        {isReadOnly && (
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 border bg-opacity-10
                                ${type === 'music' ? 'text-pink-600 bg-pink-100 border-pink-200 dark:text-pink-400 dark:bg-pink-500/10 dark:border-pink-500/20' :
                                    type === 'food' ? 'text-orange-600 bg-orange-100 border-orange-200 dark:text-orange-400 dark:bg-orange-500/10 dark:border-orange-500/20' :
                                        type === 'sports' ? 'text-green-600 bg-green-100 border-green-200 dark:text-green-400 dark:bg-green-500/10 dark:border-green-500/20' :
                                            'text-blue-600 bg-blue-100 border-blue-200 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20'}`}>
                                <Tag size={10} /> {type}
                            </div>
                        )}
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                            {isReadOnly ? title : 'Create New Event'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 -mt-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10 rounded-full transition-all">
                        <X size={24} />
                    </button>
                </div>

                {isReadOnly ? (
                    // --- VIEW MODE ---
                    <div className="p-6 pt-2 overflow-y-auto space-y-6">

                        {/* Time & Location */}
                        <div className="space-y-3 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                                <Calendar className="text-blue-500 shrink-0" size={20} />
                                <div>
                                    <p className="font-semibold text-sm">Date & Time</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateRange(startTime, endTime)}</p>
                                </div>
                            </div>

                            <div className="w-full h-px bg-gray-200 dark:bg-white/10"></div>

                            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                                <MapPin className="text-red-500 shrink-0" size={20} />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate">{venue || 'Unknown Location'}</p>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${currentLocation?.lat},${currentLocation?.lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5"
                                    >
                                        Open in Maps <ExternalLink size={10} />
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                About Event
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {description || 'No description provided.'}
                            </p>
                        </div>

                        {/* Action Link */}
                        {event?.link && (
                            <a
                                href={event.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all transform active:scale-95 group"
                            >
                                <span>Get Tickets / Info</span>
                                <ExternalLink size={18} className="group-hover:translate-x-1 transition-transform" />
                            </a>
                        )}
                    </div>
                ) : (
                    // --- CREATE MODE (Existing Form) ---
                    <form onSubmit={handleSubmit} className="p-6 pt-2 overflow-y-auto space-y-4">
                        <div className="relative">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Where</label>
                            <input
                                type="text"
                                required
                                value={venue}
                                onChange={(e) => {
                                    setVenue(e.target.value);
                                    setIsSearching(true);
                                }}
                                placeholder="Search address or click on map..."
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all pl-10 text-sm text-zinc-900 dark:text-white placeholder-gray-400"
                            />
                            <MapPin className="absolute left-3.5 top-[34px] text-gray-400" size={16} />

                            {suggestions.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                    {suggestions.map((item, i) => (
                                        <div
                                            key={i}
                                            className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer text-sm truncate flex items-center gap-2 text-gray-700 dark:text-gray-200"
                                            onClick={() => {
                                                setVenue(item.display_name);
                                                setCurrentLocation({
                                                    lat: parseFloat(item.lat),
                                                    lng: parseFloat(item.lon)
                                                });
                                                setSuggestions([]);
                                                setIsSearching(false);
                                            }}
                                        >
                                            <MapPin size={12} className="text-gray-400" /> {item.display_name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">What</label>
                            <input
                                type="text"
                                required
                                value={title}
                                placeholder="Event Title"
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium text-zinc-900 dark:text-white placeholder-gray-400"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Details</label>
                            <textarea
                                required
                                value={description}
                                placeholder="Describe the event..."
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm resize-none text-zinc-900 dark:text-white placeholder-gray-400"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Start</label>
                                <div className="relative">
                                    <input
                                        type="datetime-local"
                                        required
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full px-3 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs text-zinc-900 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">End</label>
                                <div className="relative">
                                    <input
                                        type="datetime-local"
                                        required
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full px-3 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs text-zinc-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Category</label>
                            <div className="relative">
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm appearance-none text-zinc-900 dark:text-white"
                                >
                                    <option value="social">Social / Hangout</option>
                                    <option value="food">Food & Drink</option>
                                    <option value="music">Live Music / Party</option>
                                    <option value="arts">Arts & Culture</option>
                                    <option value="learning">Class / Workshop</option>
                                    <option value="sports">Sports / Activity</option>
                                </select>
                                <Tag className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all transform hover:scale-[1.01] active:scale-[0.98] mt-2"
                        >
                            Create Event
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
